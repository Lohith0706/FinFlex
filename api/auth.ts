import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
}

function generateFriendCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);
    const endpoint = pathname.split('/').pop();

    try {
        if (endpoint === 'auth-signup' && req.method === 'POST') {
            const { username, email, phone, password } = req.body;
            if (!username || !email || !phone || !password) return res.status(400).json({ error: 'All fields are required' });

            const existingEmail = await db.findByEmail(email);
            if (existingEmail) return res.status(400).json({ error: 'Email already in use' });

            const existingUsername = await db.findByUsername(username);
            if (existingUsername) return res.status(400).json({ error: 'Username already taken' });

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            let friendCode = generateFriendCode();
            while (await db.findByFriendCode(friendCode)) {
                friendCode = generateFriendCode();
            }

            const user = await db.createUser({ username, email, phone, passwordHash, friendCode, friends: [] });
            return res.status(201).json({
                success: true,
                user: { id: user.id, username: user.username, email: user.email, phone: user.phone, friendCode: user.friendCode, friends: user.friends }
            });
        }

        if (endpoint === 'auth-login' && req.method === 'POST') {
            const { emailOrUsername, password } = req.body;
            if (!emailOrUsername || !password) return res.status(400).json({ error: 'Email/Username and password are required' });

            let user = await db.findByEmail(emailOrUsername) || await db.findByUsername(emailOrUsername);
            if (!user) return res.status(401).json({ error: 'Invalid credentials' });

            const isMatch = await bcrypt.compare(password, user.passwordHash);
            if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({
                success: true, token,
                user: { id: user.id, username: user.username, email: user.email, phone: user.phone, friendCode: user.friendCode, friends: user.friends }
            });
        }

        if (endpoint === 'auth-me' && req.method === 'GET') {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
            const user = await db.findById(decoded.userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            return res.status(200).json({
                success: true,
                user: { id: user.id, username: user.username, email: user.email, phone: user.phone, friendCode: user.friendCode, friends: user.friends }
            });
        }

        return res.status(404).json({ error: 'Endpoint not found' });
    } catch (error: any) {
        console.error(`Auth Error (${endpoint}):`, error);
        return res.status(error.name === 'JsonWebTokenError' ? 401 : 500).json({ error: error.message || 'Internal server error' });
    }
}
