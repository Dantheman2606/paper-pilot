import { Router, Response } from 'express';
import { query } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate);

// GET /api/chats/:chatId/messages
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Verify chat belongs to user
        const chatResult = await query(
            'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
            [req.params.chatId, req.user!.userId]
        );

        if (chatResult.rows.length === 0) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        const messagesResult = await query(
            'SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
            [req.params.chatId]
        );

        res.json(messagesResult.rows);
    } catch (err) {
        console.error('List messages error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
