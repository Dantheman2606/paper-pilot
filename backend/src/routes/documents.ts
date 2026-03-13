import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Configure multer storage
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf', '.txt', '.md', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, TXT, MD, and DOCX files are supported'));
        }
    },
});

// GET /api/chats/:chatId/documents
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const chatResult = await query(
            'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
            [req.params.chatId, req.user!.userId]
        );

        if (chatResult.rows.length === 0) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        const docs = await query(
            `SELECT id, original_name, mime_type, size_bytes, embedding_status, chunk_count, created_at
       FROM documents WHERE chat_id = $1 ORDER BY created_at DESC`,
            [req.params.chatId]
        );

        res.json(docs.rows);
    } catch (err) {
        console.error('List documents error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/chats/:chatId/documents — upload document (RAG processing stub)
router.post('/', upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const chatResult = await query(
            'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
            [req.params.chatId, req.user!.userId]
        );

        if (chatResult.rows.length === 0) {
            // Clean up uploaded file if chat not found
            if (req.file) fs.unlinkSync(req.file.path);
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        const result = await query(
            `INSERT INTO documents (chat_id, user_id, original_name, storage_path, mime_type, size_bytes, embedding_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, original_name, mime_type, size_bytes, embedding_status, created_at`,
            [
                req.params.chatId,
                req.user!.userId,
                req.file.originalname,
                req.file.path,
                req.file.mimetype,
                req.file.size,
            ]
        );

        // TODO (RAG Phase 2): Dispatch async embedding job here
        // await embeddingQueue.add({ documentId: result.rows[0].id });

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Upload document error:', err);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/chats/:chatId/documents/:docId
router.delete('/:docId', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const chatResult = await query(
            'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
            [req.params.chatId, req.user!.userId]
        );

        if (chatResult.rows.length === 0) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        const docResult = await query(
            'DELETE FROM documents WHERE id = $1 AND chat_id = $2 RETURNING storage_path',
            [req.params.docId, req.params.chatId]
        );

        if (docResult.rows.length === 0) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }

        // Clean up file from disk
        const filePath = docResult.rows[0].storage_path;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ message: 'Document deleted' });
    } catch (err) {
        console.error('Delete document error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
