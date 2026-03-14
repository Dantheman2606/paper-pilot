import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logAIRequest } from '../utils/logger';

const router = Router();

router.use(authenticate);

const chatRequestSchema = z.object({
    chatId: z.string().uuid(),
    message: z.string().min(1).max(10000),
    model: z
        .enum(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-lite', 'gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'])
        .default('gemini-2.5-flash'),
});

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-lite'];
const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'];

// POST /api/ai/chat
// Design notes for RAG Phase 2:
//   1. After saving user message, fetch relevant document chunks (vector search)
//   2. Inject chunks as system context before history
//   3. Return streaming response
router.post('/chat', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parsed = chatRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.issues[0].message });
            return;
        }

        const { chatId, message, model } = parsed.data;

        // Verify chat ownership
        const chatResult = await query(
            'SELECT * FROM chats WHERE id = $1 AND user_id = $2',
            [chatId, req.user!.userId]
        );

        if (chatResult.rows.length === 0) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        // Fetch conversation history
        const historyResult = await query(
            'SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
            [chatId]
        );

        // Save user message
        await query(
            'INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)',
            [chatId, 'user', message]
        );

        // -----------------------------------------------------------------------
        // RAG Phase 2 hook — inject retrieved context here:
        // const ragContext = await retrieveRelevantChunks(chatId, message);
        // const systemPrompt = buildSystemPrompt(ragContext);
        // -----------------------------------------------------------------------

        let assistantContent = '';

        if (GEMINI_MODELS.includes(model)) {
            assistantContent = await callGemini(model, historyResult.rows, message, {
                userId: req.user!.userId,
                chatId,
            });
        } else if (OPENAI_MODELS.includes(model)) {
            assistantContent = await callOpenAI(model, historyResult.rows, message, {
                userId: req.user!.userId,
                chatId,
            });
        } else {
            res.status(400).json({ error: 'Unknown model' });
            return;
        }

        // Save assistant message
        await query(
            'INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)',
            [chatId, 'assistant', assistantContent]
        );

        // Update chat timestamp
        await query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [chatId]);

        // Auto-title chat on first message
        const chat = chatResult.rows[0];
        if (chat.title === 'New Chat') {
            const autoTitle = message.slice(0, 60) + (message.length > 60 ? '...' : '');
            await query('UPDATE chats SET title = $1 WHERE id = $2', [autoTitle, chatId]);
        }

        res.json({
            message: {
                role: 'assistant',
                content: assistantContent,
            },
        });
    } catch (err: unknown) {
        const error = err as Error;
        console.error('AI chat error:', error.message);
        res.status(500).json({ error: error.message || 'AI request failed' });
    }
});

// --- Gemini API call ---
async function callGemini(
    model: string,
    history: { role: string; content: string }[],
    userMessage: string,
    ctx?: { userId: string; chatId: string }
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not configured');

    const contents = [
        ...history.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        })),
        { role: 'user', parts: [{ text: userMessage }] },
    ];

    const payload = {
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    };

    logAIRequest({
        timestamp: new Date().toISOString(),
        userId: ctx?.userId ?? 'unknown',
        chatId: ctx?.chatId ?? 'unknown',
        model,
        userMessage,
        history,
        sentPayload: payload,
    });

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }
    );

    if (!response.ok) {
        const err = await response.json() as { error?: { message?: string } };
        throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json() as {
        candidates: { content: { parts: { text: string }[] } }[];
    };
    return data.candidates[0]?.content?.parts[0]?.text || '';
}

// --- OpenAI API call ---
async function callOpenAI(
    model: string,
    history: { role: string; content: string }[],
    userMessage: string,
    ctx?: { userId: string; chatId: string }
): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const messages = [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
    ];

    const payload = { model, messages, temperature: 0.7, max_tokens: 2048 };

    logAIRequest({
        timestamp: new Date().toISOString(),
        userId: ctx?.userId ?? 'unknown',
        chatId: ctx?.chatId ?? 'unknown',
        model,
        userMessage,
        history,
        sentPayload: payload,
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const err = await response.json() as { error?: { message?: string } };
        throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as {
        choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content || '';
}

export default router;
