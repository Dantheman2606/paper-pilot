import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import chatRoutes from './routes/chats';
import messageRoutes from './routes/messages';
import documentRoutes from './routes/documents';
import aiRoutes from './routes/ai';
import { initMinio } from './utils/minioClient';
import { errorHandler, notFound } from './middleware/errorHandler';
import { httpLogger } from './utils/logger';

const app = express();
const PORT = parseInt(process.env.PORT || '5000');

// Security middleware
app.use(helmet());

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    })
);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// AI rate limit (stricter)
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: { error: 'Too many AI requests, please slow down.' },
});

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Dev HTTP request logger (runs after body parsing so body is available)
app.use(httpLogger);

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/chats/:chatId/messages', messageRoutes);
app.use('/api/chats/:chatId/documents', documentRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);

// Handle unhandled routes
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
    await initMinio();
    
    app.listen(PORT, () => {
        console.log(`🚀 Paper Pilot API running on http://localhost:${PORT}`);
        console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

startServer();

export default app;
