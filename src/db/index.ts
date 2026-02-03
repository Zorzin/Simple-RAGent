import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

let cachedDb: ReturnType<typeof drizzle> | null = null;

export const getDb = () => {
  if (cachedDb) {
    return cachedDb;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL_MISSING");
  }

  const sql = neon(databaseUrl);
  cachedDb = drizzle(sql, { schema });

  return cachedDb;
};
