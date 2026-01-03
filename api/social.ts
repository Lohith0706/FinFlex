import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);
    const endpoint = pathname.split('/').pop()?.split('?')[0];

    try {
        if (endpoint === 'resolve-friend-code' && req.method === 'GET') {
            const { code } = req.query;
            if (!code || typeof code !== 'string') return res.status(400).json({ success: false, error: 'Friend code is required' });

            const user = await db.findByFriendCode(code.toUpperCase());
            if (!user) return res.status(404).json({ success: false, error: 'Friend code not found' });

            return res.status(200).json({ success: true, user: { id: user.id, username: user.username, friendCode: user.friendCode } });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        if (endpoint === 'update-friends' && req.method === 'POST') {
            const { friends } = req.body;
            if (!Array.isArray(friends)) return res.status(400).json({ success: false, error: 'Friends must be an array' });
            await db.updateFriends(decoded.userId, friends);
            return res.status(200).json({ success: true, message: 'Friends updated successfully' });
        }

        if (endpoint === 'leaderboard' && req.method === 'GET') {
            const user = await db.findById(decoded.userId);
            if (!user) return res.status(404).json({ success: false, error: 'User not found' });
            const friendIds = [user.id, ...(user.friends || [])];
            const leaderboard = await db.getLeaderboard(friendIds);
            return res.status(200).json({ success: true, leaderboard });
        }

        return res.status(404).json({ error: 'Endpoint not found' });
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
}
