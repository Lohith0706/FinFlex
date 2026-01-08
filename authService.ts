// Helper to handle local persistence for hackathon demo
const GET_LOCAL_USERS = () => JSON.parse(localStorage.getItem('finflex_users') || '[]');
const SAVE_LOCAL_USER = (user: any) => {
    const users = GET_LOCAL_USERS();
    users.push(user);
    localStorage.setItem('finflex_users', JSON.stringify(users));
};

// Generate unique 6-character friend code
const generateFriendCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export type AuthUser = {
    id: string;
    username: string;
    email: string;
    phone: string;
    friendCode?: string;
    friends?: string[];
};

export type AuthResponse = {
    success: boolean;
    token?: string;
    user?: AuthUser;
    error?: string;
    otpRequired?: boolean;
    email?: string;
    message?: string;
};

export async function signup(data: any): Promise<AuthResponse> {
    try {
        const res = await fetch('/api/auth-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return await res.json();
    } catch (e) {
        return { success: false, error: 'Connection error' };
    }
}

export async function login(data: any): Promise<AuthResponse> {
    try {
        const res = await fetch('/api/auth-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return await res.json();
    } catch (e) {
        return { success: false, error: 'Connection error' };
    }
}

export async function verifyOTP(data: { email: string; otp: string; isSignup?: boolean; signupData?: any }): Promise<AuthResponse> {
    try {
        const res = await fetch('/api/auth-verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return await res.json();
    } catch (e) {
        return { success: false, error: 'Connection error' };
    }
}


export async function getCurrentUser(token: string): Promise<AuthResponse> {
    try {
        const res = await fetch('/api/auth-me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        return await res.json();
    } catch (e) {
        return { success: false, error: 'Session expired' };
    }
}
