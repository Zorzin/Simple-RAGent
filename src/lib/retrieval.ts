import { sql } from "drizzle-orm";

import { getDb } from "@/db";
import { embedText, toVectorLiteral } from "@/lib/embeddings";

export async function searchFileChunks(params: {
  query: string;
  limit?: number;
  fileIds?: string[];
  distanceThreshold?: number;
}) {
  const { query, limit = 8, fileIds, distanceThreshold = 0.5 } = params;
  const embedded = await embedText(query);
  if (!embedded || embedded.length === 0) {
    return [];
  }
  const vector = toVectorLiteral(embedded);
  const db = getDb();

  const fileFilter = fileIds?.length
    ? sql`and file_id in (${sql.join(
        fileIds.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql``;

  const rows = await db.execute(
    sql`
      select id, file_id, chunk_index, content, (embedding <=> ${vector}) as distance
      from file_chunks
      where (embedding <=> ${vector}) < ${distanceThreshold}
      ${fileFilter}
      order by embedding <=> ${vector}
      limit ${limit}
    `,
  );

  return rows.rows as Array<{
    id: string;
    file_id: string;
    chunk_index: number;
    content: string;
    distance: number;
  }>;
}
