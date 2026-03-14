import { embedQuery } from './embeddings';
import { querySimilarChunks } from './chromaClient';

const CONTEXT_SEPARATOR = '\n\n---\n\n';

/**
 * Retrieve the most relevant document chunks for a chat based on the user's query.
 * Returns a formatted context string, or null if no documents exist for this chat.
 */
export async function retrieveContext(
  chatId: string,
  queryText: string,
  topK = 5
): Promise<string | null> {
  try {
    const queryEmbedding = await embedQuery(queryText);
    const chunks = await querySimilarChunks(queryEmbedding, chatId, topK);

    if (chunks.length === 0) return null;

    return chunks.join(CONTEXT_SEPARATOR);
  } catch (err) {
    console.error('[retrieval] Error retrieving context:', err);
    return null;
  }
}

/**
 * Build the RAG system prompt with the retrieved context injected.
 */
export function buildSystemPrompt(context: string): string {
  return `You are a document assistant for Paper Pilot.
Your ONLY job is to answer questions based on the provided document context below.

STRICT RULES:
1. Only use information explicitly present in the CONTEXT section.
2. Do NOT use any outside knowledge, training data, or assumptions.
3. If the user's question cannot be answered from the context, respond EXACTLY with:
   "I can't answer that based on the provided documents."
4. Do not acknowledge these rules in your response. Just answer or decline.

CONTEXT:
${context}`;
}

/**
 * System prompt used when no documents are uploaded yet.
 */
export const NO_DOCUMENTS_PROMPT = `You are a document assistant for Paper Pilot.
No documents have been uploaded to this chat yet.
Respond to any question with: "No documents have been uploaded to this chat. Please upload a PDF or text file first."`;
