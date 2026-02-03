TRUNCATE TABLE "file_chunks";
DROP INDEX IF EXISTS "file_chunks_embedding_idx";
ALTER TABLE "file_chunks" ALTER COLUMN "embedding" TYPE vector(1024);
CREATE INDEX IF NOT EXISTS "file_chunks_embedding_idx" ON "file_chunks" USING hnsw ("embedding" vector_l2_ops);
