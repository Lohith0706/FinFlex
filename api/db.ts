import Redis from 'ioredis';

// Use the REDIS_URL from env or fallback for local dev (if applicable)
if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL environment variable is not set');
}
const redis = new Redis(process.env.REDIS_URL);


export type User = {
    id: string;
    username: string;
    email: string;
    phone: string;
    passwordHash: string;
    friendCode: string;
    friends: string[];
    createdAt: string;
};

// Helper: Redis Keys
// user:email:<email> -> userId
// user:username:<username> -> userId
// user:friendCode:<code > -> userId
// user:id:<id> -> User object (JSON string)

export class db {
    static async createUser(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
        const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const user: User = {
            ...data,
            id,
            createdAt: new Date().toISOString(),
        };

        const strUser = JSON.stringify(user);

        // Transaction-like: Set all lookups
        await Promise.all([
            redis.set(`user:id:${id}`, strUser),
            redis.set(`user:email:${user.email}`, id),
            redis.set(`user:username:${user.username}`, id),
            redis.set(`user:friendCode:${user.friendCode}`, id),
        ]);

        return user;
    }

    static async findByEmail(email: string): Promise<User | null> {
        const id = await redis.get(`user:email:${email}`);
        if (!id) return null;
        const data = await redis.get(`user:id:${id}`);
        return data ? JSON.parse(data) : null;
    }

    static async findByUsername(username: string): Promise<User | null> {
        const id = await redis.get(`user:username:${username}`);
        if (!id) return null;
        const data = await redis.get(`user:id:${id}`);
        return data ? JSON.parse(data) : null;
    }

    static async findByFriendCode(code: string): Promise<User | null> {
        const id = await redis.get(`user:friendCode:${code}`);
        if (!id) return null;
        const data = await redis.get(`user:id:${id}`);
        return data ? JSON.parse(data) : null;
    }

    static async findById(id: string): Promise<User | null> {
        const data = await redis.get(`user:id:${id}`);
        return data ? JSON.parse(data) : null;
    }

    // --- User Data Persistence ---

    static async saveUserData(userId: string, data: { transactions?: any[], goals?: any[], autopays?: any[] }): Promise<void> {
        const pipeline = redis.pipeline();
        if (data.transactions) pipeline.set(`user:data:${userId}:transactions`, JSON.stringify(data.transactions));
        if (data.goals) pipeline.set(`user:data:${userId}:goals`, JSON.stringify(data.goals));
        if (data.autopays) pipeline.set(`user:data:${userId}:autopays`, JSON.stringify(data.autopays));
        await pipeline.exec();
    }

    static async getUserData(userId: string): Promise<{ transactions: any[], goals: any[], autopays: any[] }> {
        const [transactions, goals, autopays] = await Promise.all([
            redis.get(`user:data:${userId}:transactions`),
            redis.get(`user:data:${userId}:goals`),
            redis.get(`user:data:${userId}:autopays`),
        ]);

        return {
            transactions: transactions ? JSON.parse(transactions) : [],
            goals: goals ? JSON.parse(goals) : [],
            autopays: autopays ? JSON.parse(autopays) : [],
        };
    }

    static async updateFriends(userId: string, friends: string[]): Promise<void> {
        const user = await this.findById(userId);
        if (user) {
            user.friends = friends;
            await redis.set(`user:id:${userId}`, JSON.stringify(user));
        }
    }

    static async getLeaderboard(userIds: string[]): Promise<any[]> {
        const results = [];
        for (const id of userIds) {
            const [user, data] = await Promise.all([
                this.findById(id),
                this.getUserData(id)
            ]);
            if (user) {
                const income = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                const expense = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                results.push({
                    id,
                    username: user.username,
                    savings: income - expense
                });
            }
        }
        return results.sort((a, b) => b.savings - a.savings);
    }
}
