import path from 'path';
import { minioClient, MINIO_BUCKET } from './minioClient';
import { Readable } from 'stream';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Extract plain text from a file stored in MinIO.
 * Supports PDF, TXT, and MD.
 */
export async function parseFile(objectKey: string, mimeType?: string): Promise<string> {
  const ext = path.extname(objectKey).toLowerCase();
  
  const dataStream = await minioClient.getObject(MINIO_BUCKET, objectKey);
  const buffer = await streamToBuffer(dataStream);

  if (ext === '.pdf' || mimeType === 'application/pdf') {
    const fn = typeof pdfParse === 'function' ? pdfParse : (pdfParse.PDFParse || pdfParse.default);
    
    if (typeof fn !== 'function') {
      throw new Error(`pdf-parse module did not export a function/class. Exported keys: ${Object.keys(pdfParse).join(', ')}`);
    }

    try {
      // For older versions returning a direct function
      const data = await fn(buffer);
      if (data && data.text) return String(data.text);
    } catch {
      // For v2.4.5+ where PDFParse is a class requiring 'new'
      const uint8Array = new Uint8Array(buffer);
      const instance = new fn(uint8Array);
      await instance.load();
      const extracted = await instance.getText();
      
      if (typeof extracted === 'string') return extracted;
      if (extracted && typeof extracted === 'object' && 'text' in extracted) {
         return String(extracted.text);
      }
      return String(extracted);
    }
  }

  // Plain text / markdown
  return buffer.toString('utf-8');
}
