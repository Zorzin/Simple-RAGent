CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS file_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES files(id),
  chunk_index integer NOT NULL,
  content text NOT NULL,
  token_count integer NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS file_chunks_file_idx ON file_chunks(file_id);
CREATE INDEX IF NOT EXISTS file_chunks_embedding_idx ON file_chunks USING hnsw (embedding vector_l2_ops);
