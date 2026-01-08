import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

import nodemailer from 'nodemailer';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendOTP(email: string, otp: string) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[AUTH-MOCK] OTP for ${email}: ${otp} (Setup EMAIL_USER/PASS for real emails)`);
        return;
    }

    try {
        await transporter.sendMail({
            from: `"FinFlex" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'FinFlex Verification Code',
            html: `
                <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 20px; border-radius: 20px; background: #0A0D14; border: 1px solid #1C222E; color: white;">
                    <h2 style="color: #22D3EE; margin-bottom: 8px;">FinFlex</h2>
                    <p style="color: #94A3B8; font-size: 14px; margin-bottom: 24px;">Level Up Your Money</p>
                    <p style="color: #CBD5E1; margin-bottom: 8px;">Here is your login code:</p>
                    <h1 style="font-size: 40px; font-weight: 900; letter-spacing: 4px; margin: 0; color: white; display: inline-block;">${otp}</h1>
                    <div style="margin-top: 32px; border-top: 1px solid #1C222E; padding-top: 16px;">
                        <p style="color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">This code will expire in 5 minutes.</p>
                    </div>
                </div>
            `
        });
        console.log(`[AUTH] Real email sent to ${email} (Code: ${otp})`);
    } catch (error) {
        console.error('[AUTH] Failed to send email via Nodemailer:', error);
        // Fallback to console for internal testing if needed
        console.log(`[AUTH-FALLBACK] OTP for ${email}: ${otp}`);
    }
}

function generateFriendCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

            const otp = generateOTP();
            await sendOTP(email, otp);
            await db.saveOTP(email, otp);

            return res.status(200).json({
                success: true,
                otpRequired: true,
                email,
                message: 'OTP sent to your email'
            });
        }

        if (endpoint === 'auth-login' && req.method === 'POST') {
            const { emailOrUsername, password } = req.body;
            if (!emailOrUsername || !password) return res.status(400).json({ error: 'Email/Username and password are required' });

            let user = await db.findByEmail(emailOrUsername) || await db.findByUsername(emailOrUsername);
            if (!user) return res.status(401).json({ error: 'Invalid credentials' });

            const isMatch = await bcrypt.compare(password, user.passwordHash);
            if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

            const otp = generateOTP();
            await sendOTP(user.email, otp);
            await db.saveOTP(user.email, otp);

            return res.status(200).json({
                success: true,
                otpRequired: true,
                email: user.email,
                message: 'OTP sent to your email'
            });
        }

        if (endpoint === 'auth-verify-otp' && req.method === 'POST') {
            const { email, otp, isSignup, signupData } = req.body;
            if (!email || !otp) return res.status(400).json({ error: 'OTP and email are required' });

            const isValid = await db.verifyOTP(email, otp);
            if (!isValid) return res.status(400).json({ error: 'Invalid or expired OTP' });

            let user;
            if (isSignup && signupData) {
                const { username, phone, password } = signupData;
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(password, salt);

                let friendCode = generateFriendCode();
                while (await db.findByFriendCode(friendCode)) {
                    friendCode = generateFriendCode();
                }

                user = await db.createUser({ username, email, phone, passwordHash, friendCode, friends: [] });
            } else {
                user = await db.findByEmail(email);
            }

            if (!user) return res.status(404).json({ error: 'User not found' });

            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({
                success: true,
                token,
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

