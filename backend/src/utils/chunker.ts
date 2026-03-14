const CHUNK_SIZE = 1800;   // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between consecutive chunks

export interface TextChunk {
  index: number;
  content: string;
}

/**
 * Split text into overlapping fixed-size chunks.
 * Tries to break on sentence/paragraph boundaries within a tolerance window.
 */
export function chunkText(text: string): TextChunk[] {
  // Normalise whitespace
  const normalised = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (normalised.length === 0) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < normalised.length) {
    let end = start + CHUNK_SIZE;

    if (end < normalised.length) {
      // Try to break on a paragraph boundary within 300 chars of end
      const searchWindow = normalised.slice(end - 300, end + 300);
      const paraBreak = searchWindow.lastIndexOf('\n\n');
      if (paraBreak !== -1) {
        end = end - 300 + paraBreak + 2;
      } else {
        // Fall back to sentence boundary
        const sentBreak = searchWindow.lastIndexOf('. ');
        if (sentBreak !== -1) {
          end = end - 300 + sentBreak + 2;
        }
      }
    }

    const content = normalised.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({ index, content });
      index++;
    }

    start = end - CHUNK_OVERLAP;
    if (start >= normalised.length) break;
  }

  return chunks;
}
