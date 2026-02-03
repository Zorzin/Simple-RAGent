CREATE TABLE IF NOT EXISTS "chat_token_limits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" uuid NOT NULL REFERENCES "public"."chats"("id"),
  "interval" token_interval NOT NULL,
  "limit_tokens" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "chat_token_limits_chat_idx" ON "chat_token_limits" USING btree ("chat_id");
