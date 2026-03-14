import fs from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

/**
 * Extract plain text from a file on disk.
 * Supports PDF, TXT, and MD.
 */
export async function parseFile(filePath: string, mimeType?: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

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
