import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Keep fs for initial uploadDir check if needed, but not for file operations
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool'; // Changed from { query } to pool
import { authenticate, AuthRequest } from '../middleware/auth';
import { processDocument } from '../utils/pipeline';
import { deleteDocumentChunks } from '../utils/chromaClient';
import { minioClient, MINIO_BUCKET } from '../utils/minioClient'; // Added MinIO imports

const router = Router({ mergeParams: true });

router.use(authenticate);

// Configure multer storage
// Use memory storage for direct upload to MinIO
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024 },
    fileFilter: (_req, file, cb) => { // Changed req to _req as it's not used
        const allowedExtensions = ['.pdf', '.txt', '.md'];
        const ext = path.extname(file.originalname).toLowerCase();

        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, TXT, and MD files are allowed'));
        }
    },
});

// GET /api/chats/:chatId/documents
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const chatResult = await pool.query( // Changed query to pool.query
            'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
            [req.params.chatId, req.user!.userId]
        );

        if (chatResult.rows.length === 0) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        const docs = await pool.query( // Changed query to pool.query
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
        // Check if chat exists and belongs to user
        const chatCheck = await pool.query(
            `SELECT id FROM chats WHERE id = $1 AND user_id = $2`,
            [req.params.chatId, req.user!.userId] // Changed req.userId to req.user!.userId
        );

        if (chatCheck.rowCount === 0) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        // Generate unique object key for MinIO
        const ext = path.extname(req.file.originalname);
        const objectKey = `${req.params.chatId}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

        // Upload directly to MinIO from memory buffer
        await minioClient.putObject(
            MINIO_BUCKET,
            objectKey,
            req.file.buffer,
            req.file.size,
            { 'Content-Type': req.file.mimetype }
        );

        // Insert document record with status 'pending'
        const result = await pool.query( // Changed query to pool.query
            `INSERT INTO documents (chat_id, user_id, original_name, storage_path, mime_type, size_bytes, embedding_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, original_name, mime_type, size_bytes, embedding_status, chunk_count, created_at`, // Removed storage_path from RETURNING as it's not needed for the response
            [
                req.params.chatId,
                req.user!.userId, // Changed req.userId to req.user!.userId
                req.file.originalname,
                objectKey, // Storing MinIO object key here
                req.file.mimetype,
                req.file.size,
                'pending'
            ]
        );
        const doc = result.rows[0]; // Corrected assignment

        // Fire the RAG pipeline asynchronously (don't await — respond immediately)
        processDocument({
            id: doc.id,
            chat_id: req.params.chatId as string,
            original_name: doc.original_name,
            storage_path: objectKey, // Use the objectKey for pipeline
            mime_type: doc.mime_type, // Use doc.mime_type
        }).catch((err) => console.error('[documents] Pipeline error:', err));

        res.status(201).json(doc);
    } catch (err) {
        console.error('Upload document error:', err);
        // No need to unlink local file as we are using memory storage and MinIO
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/chats/:chatId/documents/:docId/status — poll embedding status
router.get('/:docId/status', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const result = await pool.query( // Changed query to pool.query
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
        const chatResult = await pool.query( // Changed query to pool.query
            'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
            [req.params.chatId, req.user!.userId]
        );

        if (chatResult.rows.length === 0) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        const docResult = await pool.query( // Changed query to pool.query
            'DELETE FROM documents WHERE id = $1 AND chat_id = $2 RETURNING id, storage_path',
            [req.params.docId, req.params.chatId]
        );

        if (docResult.rows.length === 0) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }

        const { id: docId, storage_path } = docResult.rows[0];

        // Delete file from MinIO
        try {
            if (storage_path) { // Use storage_path from the destructured object
                await minioClient.removeObject(MINIO_BUCKET, storage_path);
            }
        } catch (err) {
            console.error(`Failed to delete file ${storage_path} from MinIO:`, err);
        }

        // Delete related chunks from ChromaDB collection
        deleteDocumentChunks(docId).catch((err) => // Corrected call
            console.error('[documents] Failed to delete ChromaDB chunks:', err)
        );

        res.json({ message: 'Document deleted' });
    } catch (err) {
        console.error('Delete document error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
