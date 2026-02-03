import { sql } from "drizzle-orm";

import { getDb } from "@/db";
import { embedText, toVectorLiteral } from "@/lib/embeddings";

export async function searchFileChunks(params: {
  query: string;
  limit?: number;
  fileIds?: string[];
}) {
  const { query, limit = 8, fileIds } = params;
  const embedded = await embedText(query);
  if (!embedded || embedded.length === 0) {
    return [];
  }
  const vector = toVectorLiteral(embedded);
  const db = getDb();

  const whereClause = fileIds?.length
    ? sql`where file_id in (${sql.join(
        fileIds.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql``;

  const rows = await db.execute(
    sql`
      select file_id, content, (embedding <-> ${vector}) as distance
      from file_chunks
      ${whereClause}
      order by embedding <-> ${vector}
      limit ${limit}
    `,
  );

  return rows.rows as Array<{ file_id: string; content: string; distance: number }>;
}
