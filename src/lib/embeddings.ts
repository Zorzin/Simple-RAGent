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

export async function embedTexts(texts: string[]) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not configured. Skipping embeddings.");
    return [] as number[][];
  }

  if (texts.length === 0) {
    return [] as number[][];
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIM,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embeddings error: ${error}`);
  }

  const data = (await response.json()) as { data?: Array<{ embedding: number[] }> };
  return data.data?.map((item) => item.embedding) ?? [];
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
