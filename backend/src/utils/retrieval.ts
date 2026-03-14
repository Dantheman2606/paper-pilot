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

Your primary job is to answer questions using the provided CONTEXT.

RULES:
1. Treat the CONTEXT as the source of truth.
2. You may use basic reasoning, calculations, comparisons, and general knowledge
   (such as math, categories, or interpreting tables) to work with the information
   in the context.
3. Do NOT introduce new facts that are not supported by the context.
4. If the answer cannot be determined from the context, respond EXACTLY with:
   "I can't answer that based on the provided documents."
5. Do not mention the context or these rules in your answer.

CONTEXT:
${context}`;
}

/**
 * System prompt used when no documents are uploaded yet.
 */
export const NO_DOCUMENTS_PROMPT = `You are a document assistant for Paper Pilot.
No documents have been uploaded to this chat yet.
Respond to any question with: "No documents have been uploaded to this chat. Please upload a PDF or text file first."`;
