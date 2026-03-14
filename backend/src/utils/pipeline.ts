import pool from '../db/pool';
import { parseFile } from './pdfParser';
import { chunkText } from './chunker';
import { embedTexts } from './embeddings';
import { upsertChunks } from './chromaClient';

interface DocumentRecord {
  id: string;
  chat_id: string;
  original_name: string;
  storage_path: string;
  mime_type?: string;
}

/**
 * Full RAG pipeline for a single document:
 * 1. Parse file → plain text
 * 2. Chunk text
 * 3. Embed all chunks via Google text-embedding-004
 * 4. Upsert into ChromaDB
 * 5. Update embedding_status in Postgres
 */
export async function processDocument(doc: DocumentRecord): Promise<void> {
  console.log(`[pipeline] Starting processing for document ${doc.id} (${doc.original_name})`);

  try {
    // 1 — Parse
    const text = await parseFile(doc.storage_path, doc.mime_type ?? undefined);
    if (!text || text.trim().length === 0) {
      throw new Error('Document produced no extractable text');
    }
    console.log(`[pipeline] Extracted ${text.length} chars`);

    // 2 — Chunk
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error('Chunking produced no chunks');
    console.log(`[pipeline] Created ${chunks.length} chunks`);

    // 3 — Embed (batched)
    const contents = chunks.map((c) => c.content);
    const embeddings = await embedTexts(contents);
    console.log(`[pipeline] Obtained ${embeddings.length} embeddings`);

    // 4 — Upsert to ChromaDB
    const ids = chunks.map((c) => `${doc.id}::${c.index}`);
    const metadatas = chunks.map((c) => ({
      chat_id: doc.chat_id,
      document_id: doc.id,
      chunk_index: c.index,
      document_name: doc.original_name,
    }));

    await upsertChunks(ids, embeddings, contents, metadatas);
    console.log(`[pipeline] Upserted to ChromaDB`);

    // 5 — Mark as ready
    await pool.query(
      `UPDATE documents SET embedding_status = 'ready', chunk_count = $1 WHERE id = $2`,
      [chunks.length, doc.id]
    );

    console.log(`[pipeline] Document ${doc.id} processed successfully (${chunks.length} chunks)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[pipeline] Failed to process document ${doc.id}:`, message);

    await pool.query(
      `UPDATE documents SET embedding_status = 'failed' WHERE id = $1`,
      [doc.id]
    );
  }
}
