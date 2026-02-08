-- Add summary fields to chat_sessions
ALTER TABLE "chat_sessions" ADD COLUMN "summary" text;
ALTER TABLE "chat_sessions" ADD COLUMN "summary_up_to_id" uuid;

-- Create HNSW index for cosine similarity on file_chunks
CREATE INDEX IF NOT EXISTS "file_chunks_embedding_cosine_idx"
  ON "file_chunks"
  USING hnsw (embedding vector_cosine_ops);
