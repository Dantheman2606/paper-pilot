import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';
import { processDocument } from '../utils/pipeline';
import { deleteDocumentChunks } from '../utils/chromaClient';

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
        const allowed = ['.pdf', '.txt', '.md'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, TXT, and MD files are supported'));
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

// POST /api/chats/:chatId/documents — upload + trigger RAG pipeline
router.post('/', upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const chatResult = await query(
            'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
            [req.params.chatId, req.user!.userId]
        );

        if (chatResult.rows.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        // Insert document record with status 'processing'
        const result = await query(
            `INSERT INTO documents (chat_id, user_id, original_name, storage_path, mime_type, size_bytes, embedding_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'processing')
       RETURNING id, original_name, mime_type, size_bytes, embedding_status, chunk_count, created_at`,
            [
                req.params.chatId,
                req.user!.userId,
                req.file.originalname,
                req.file.path,
                req.file.mimetype,
                req.file.size,
            ]
        );

        const doc = result.rows[0];

        // Fire the RAG pipeline asynchronously (don't await — respond immediately)
        processDocument({
            id: doc.id,
            chat_id: req.params.chatId as string,
            original_name: doc.original_name,
            storage_path: req.file.path,
            mime_type: req.file.mimetype,
        }).catch((err) => console.error('[documents] Pipeline error:', err));

        res.status(201).json(doc);
    } catch (err) {
        console.error('Upload document error:', err);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/chats/:chatId/documents/:docId/status — poll embedding status
router.get('/:docId/status', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await query(
            `SELECT id, embedding_status, chunk_count
       FROM documents
       WHERE id = $1 AND chat_id = $2`,
            [req.params.docId, req.params.chatId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Status check error:', err);
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
            'DELETE FROM documents WHERE id = $1 AND chat_id = $2 RETURNING id, storage_path',
            [req.params.docId, req.params.chatId]
        );

        if (docResult.rows.length === 0) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }

        const { id: docId, storage_path } = docResult.rows[0];

        // Delete file from disk
        if (fs.existsSync(storage_path)) {
            fs.unlinkSync(storage_path);
        }

        // Delete chunks from ChromaDB
        deleteDocumentChunks(docId).catch((err) =>
            console.error('[documents] Failed to delete ChromaDB chunks:', err)
        );

        res.json({ message: 'Document deleted' });
    } catch (err) {
        console.error('Delete document error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
