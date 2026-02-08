import { tool } from "ai";
import { z } from "zod";

import { searchFileChunks } from "@/lib/retrieval";

export function createSearchDocumentsTool(fileIds: string[]) {
  return tool({
    description:
      "Search uploaded company documents for relevant information. " +
      "Use this when the user asks factual questions about documents, policies, files, or specific topics that may be covered in the uploaded files. " +
      "Do NOT use this for greetings, follow-up questions about your previous answers, or general knowledge questions.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant document chunks. Be specific and concise."),
    }),
    execute: async ({ query }) => {
      const results = await searchFileChunks({ query, fileIds, limit: 5 });
      if (results.length === 0) {
        return { found: false as const, chunks: [] as never[] };
      }
      return {
        found: true as const,
        chunks: results.map((r) => ({
          content: r.content,
          distance: r.distance,
          fileId: r.file_id,
          chunkId: r.id,
        })),
      };
    },
  });
}
