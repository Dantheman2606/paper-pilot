const GEMINI_EMBED_MODEL = 'gemini-embedding-001';
const BATCH_SIZE = 100; // Google allows up to 100 per batch request

interface EmbedContentRequest {
  model: string;
  content: { parts: { text: string }[] };
}

interface BatchEmbedResponse {
  embeddings: { values: number[] }[];
}

/**
 * Embed multiple texts using Google text-embedding-004.
 * Automatically batches to stay within API limits.
 * Returns one 768-dimensional vector per input text.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const requests: EmbedContentRequest[] = batch.map((text) => ({
      model: `models/${GEMINI_EMBED_MODEL}`,
      content: { parts: [{ text }] },
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:batchEmbedContents?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      }
    );

    if (!response.ok) {
      const err = await response.json() as { error?: { message?: string } };
      throw new Error(err.error?.message || `Embedding API error: ${response.status}`);
    }

    const data = await response.json() as BatchEmbedResponse;
    allEmbeddings.push(...data.embeddings.map((e) => e.values));
  }

  return allEmbeddings;
}

/**
 * Embed a single query string.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const results = await embedTexts([text]);
  return results[0];
}
