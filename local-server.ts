import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Helper to wrap Vercel handlers
const wrap = (handlerPromise: Promise<any>) => async (req: any, res: any) => {
    try {
        const module = await handlerPromise;
        const handler = module.default;
        await handler(req, res);
    } catch (error) {
        console.error('Error in handler:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

// Lazy functions to import handlers only when needed
const auth = import('./api/auth.ts');
const data = import('./api/data.ts');
const social = import('./api/social.ts');
const ai = import('./api/ai.ts');

app.all('/api/auth-login', wrap(auth));
app.all('/api/auth-signup', wrap(auth));
app.all('/api/auth-verify-otp', wrap(auth));
app.all('/api/auth-me', wrap(auth));
app.all('/api/user-data', wrap(data));
app.all('/api/update-user-data', wrap(data));
app.all('/api/resolve-friend-code', wrap(social));
app.all('/api/update-friends', wrap(social));
app.all('/api/leaderboard', wrap(social));
app.all('/api/finz-chat', wrap(ai));
app.all('/api/finz-advice', wrap(ai));
app.all('/api/finz', wrap(ai));



app.listen(port, () => {
    console.log(`Local API server listening at http://localhost:${port}`);
});

