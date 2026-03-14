import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const AI_LOG_FILE = path.join(LOG_DIR, 'ai_requests.log');
const HTTP_LOG_FILE = path.join(LOG_DIR, 'http_requests.log');

// Ensure logs/ directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export interface AIRequestLog {
  timestamp: string;
  userId: string;
  chatId: string;
  model: string;
  userMessage: string;
  history: { role: string; content: string }[];
  /** The full payload actually sent to the model API */
  sentPayload: unknown;
}

export function logAIRequest(entry: AIRequestLog): void {
  if (process.env.NODE_ENV === 'production') return;

  const line =
    '─'.repeat(80) +
    '\n' +
    `[${entry.timestamp}]  user=${entry.userId}  chat=${entry.chatId}  model=${entry.model}\n` +
    `USER MESSAGE:\n${entry.userMessage}\n\n` +
    `HISTORY (${entry.history.length} msgs):\n` +
    entry.history
      .map((m, i) => `  [${i + 1}] ${m.role.toUpperCase()}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '…' : ''}`)
      .join('\n') +
    '\n\nFULL PAYLOAD SENT TO API:\n' +
    JSON.stringify(entry.sentPayload, null, 2) +
    '\n';

  fs.appendFile(AI_LOG_FILE, line, (err) => {
    if (err) console.error('[logger] Failed to write AI log:', err.message);
  });
}

// ---------------------------------------------------------------------------
// Generic HTTP request logger middleware
// ---------------------------------------------------------------------------
export function httpLogger(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production') { next(); return; }

  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Capture body snapshot early (before stream is consumed)
  const bodySnapshot = req.body ? JSON.stringify(req.body, null, 2) : '(empty)';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = (req as AuthRequest).user?.userId ?? 'unauthenticated';

    const line =
      '─'.repeat(80) + '\n' +
      `[${timestamp}]  ${req.method} ${req.originalUrl}  →  ${res.statusCode}  (${duration}ms)\n` +
      `user=${userId}\n` +
      `HEADERS: ${JSON.stringify({
        'content-type': req.headers['content-type'],
        authorization: req.headers['authorization']
          ? req.headers['authorization'].replace(/Bearer .+/, 'Bearer [REDACTED]')
          : undefined,
      })}\n` +
      `BODY:\n${bodySnapshot}\n`;

    fs.appendFile(HTTP_LOG_FILE, line, (err) => {
      if (err) console.error('[logger] Failed to write HTTP log:', err.message);
    });
  });

  next();
}
