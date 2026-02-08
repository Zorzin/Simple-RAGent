import OpenAI from "openai";

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDINGS_MODEL || "text-embedding-3-small";
export const EMBEDDING_DIM = Number(process.env.OPENAI_EMBEDDINGS_DIM || 1536);

export function chunkText(input: string, maxChars = 1500, overlap = 200) {
  const cleaned = input.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  let index = 0;

  while (index < cleaned.length) {
    const end = Math.min(index + maxChars, cleaned.length);
    const chunk = cleaned.slice(index, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    index += maxChars - overlap;
  }

  return chunks;
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function embedTexts(texts: string[]) {
  const client = getOpenAIClient();
  if (!client) {
    console.warn("OPENAI_API_KEY is not configured. Skipping embeddings.");
    return [] as number[][];
  }

  if (texts.length === 0) {
    return [] as number[][];
  }

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIM,
  });

  return response.data.map((item) => item.embedding);
}

export async function embedText(text: string) {
  const [vector] = await embedTexts([text]);
  return vector;
}

export function toVectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`;
}

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}
