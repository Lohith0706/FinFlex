import { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);
    const endpoint = pathname.split('/').pop()?.split('?')[0];

    const groqKey = process.env.GROQ_API_KEY || "";
    const geminiKey = process.env.GEMINI_API_KEY || "";

    try {
        const { message, transactions, goals } = req.body;

        if (endpoint === 'finz-chat' || endpoint === 'finz') {
            if (geminiKey && endpoint === 'finz') {
                const ai = new GoogleGenAI({ apiKey: geminiKey });
                const context = `You are "FinZ AI", a smart financial wingman for Indian students (Gen Z). Only answer finance-related questions. Use the user's data when possible.\n\nTransactions: ${JSON.stringify(transactions)}\nGoals: ${JSON.stringify(goals)}`;
                const chat = ai.chats.create({ model: "gemini-2.0-flash-exp", config: { systemInstruction: context } });
                const reply = await chat.sendMessage({ message });
                return res.status(200).json({ reply: reply.text });
            } else if (groqKey) {
                const systemPrompt = `You are "FinZ AI", a smart financial wingman for Indian students (Gen Z). Only answer financial-related questions. Use the user's specific data.\n\nTransactions: ${JSON.stringify(transactions)}\nGoals: ${JSON.stringify(goals)}`;
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
                        temperature: 0.7,
                        max_tokens: 1024,
                    }),
                });
                const data = await response.json();
                return res.status(200).json({ reply: data.choices[0]?.message?.content || "Sorry, I couldn't process that." });
            } else {
                return res.status(500).json({ error: "AI API keys not configured." });
            }
        }

        if (endpoint === 'finz-advice') {
            if (!groqKey) return res.status(500).json({ error: "GROQ_API_KEY not configured." });
            const prompt = `Based on the user's financial data below, provide exactly 3 concise, punchy advice items in JSON format.\n\nTransactions: ${JSON.stringify(transactions)}\nGoals: ${JSON.stringify(goals)}\n\nReturn an array of objects: [{ "type": "warning" | "tip" | "flex", "message": "string" }]`;
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "system", content: "You are a financial advisor. Always return JSON." }, { role: "user", content: prompt }],
                    response_format: { type: "json_object" },
                    temperature: 0.5,
                }),
            });
            const data = await response.json();
            const content = JSON.parse(data.choices[0]?.message?.content);
            const advice = content.advice || content.items || (Array.isArray(content) ? content : [content]);
            return res.status(200).json(advice);
        }

        return res.status(404).json({ error: "Endpoint not found" });
    } catch (err: any) {
        console.error("AI handler error:", err);
        return res.status(500).json({ error: err.message || "AI error" });
    }
}
