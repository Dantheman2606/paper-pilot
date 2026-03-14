import { ChromaClient, Collection } from 'chromadb';

const COLLECTION_NAME = 'paper_pilot_chunks';

let client: ChromaClient | null = null;
let collection: Collection | null = null;

function getClient(): ChromaClient {
  if (!client) {
    client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });
  }
  return client;
}

/**
 * Returns the singleton ChromaDB collection, creating it if needed.
 * Metadata schema per chunk: { chat_id, document_id, chunk_index, document_name }
 */
export async function getCollection(): Promise<Collection> {
  if (!collection) {
    collection = await getClient().getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: { 'hnsw:space': 'cosine' },
    });
  }
  return collection;
}

/**
 * Upsert a batch of chunks into ChromaDB.
 */
export async function upsertChunks(
  ids: string[],
  embeddings: number[][],
  documents: string[],
  metadatas: Record<string, string | number>[]
): Promise<void> {
  const col = await getCollection();
  await col.upsert({ ids, embeddings, documents, metadatas });
}

/**
 * Delete all chunks belonging to a specific document.
 */
export async function deleteDocumentChunks(documentId: string): Promise<void> {
  const col = await getCollection();
  await col.delete({ where: { document_id: documentId } });
}

/**
 * Query for the most similar chunks within a specific chat.
 */
export async function querySimilarChunks(
  queryEmbedding: number[],
  chatId: string,
  topK = 5
): Promise<string[]> {
  const col = await getCollection();

  const results = await col.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    where: { chat_id: chatId },
  });

  return (results.documents?.[0] ?? []).filter((d): d is string => d !== null);
}
