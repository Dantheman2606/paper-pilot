import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

const createChatSchema = z.object({
    title: z.string().min(1).max(500).optional().default('New Chat'),
    model: z
        .enum(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-lite', 'gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'])
        .optional()
        .default('gemini-2.5-flash'),
});

const updateChatSchema = z.object({
    title: z.string().min(1).max(500),
});

// GET /api/chats — list all chats for user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await query(
            `SELECT c.id, c.title, c.model, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) AS message_count
       FROM chats c
       WHERE c.user_id = $1
       ORDER BY c.updated_at DESC`,
            [req.user!.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('List chats error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/chats — create new chat
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parsed = createChatSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.issues[0].message });
            return;
        }

        const { title, model } = parsed.data;

        const result = await query(
            'INSERT INTO chats (user_id, title, model) VALUES ($1, $2, $3) RETURNING *',
            [req.user!.userId, title, model]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Create chat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/chats/:id — get single chat with messages
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const chatResult = await query(
            'SELECT * FROM chats WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user!.userId]
        );

        if (chatResult.rows.length === 0) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        res.json(chatResult.rows[0]);
    } catch (err) {
        console.error('Get chat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/chats/:id — rename chat
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parsed = updateChatSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.issues[0].message });
            return;
        }

        const result = await query(
            `UPDATE chats SET title = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
            [parsed.data.title, req.params.id, req.user!.userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Update chat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/chats/:id — delete chat (cascades to messages + documents)
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await query(
            'DELETE FROM chats WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user!.userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        res.json({ message: 'Chat deleted successfully' });
    } catch (err) {
        console.error('Delete chat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
