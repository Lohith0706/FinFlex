import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);
    const endpoint = pathname.split('/').pop();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        if (endpoint === 'user-data' && req.method === 'GET') {
            const userData = await db.getUserData(decoded.userId);
            return res.status(200).json({ success: true, ...userData });
        }

        if (endpoint === 'update-user-data' && req.method === 'POST') {
            const { transactions, goals, autopays } = req.body;
            await db.saveUserData(decoded.userId, { transactions, goals, autopays });
            return res.status(200).json({ success: true, message: 'Data saved successfully' });
        }

        return res.status(404).json({ error: 'Endpoint not found' });
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
}
