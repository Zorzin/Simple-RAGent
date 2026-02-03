ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "session_id" uuid;
CREATE INDEX IF NOT EXISTS "messages_session_idx" ON "messages" USING btree ("session_id");

CREATE TABLE IF NOT EXISTS "chat_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" uuid NOT NULL REFERENCES "public"."chats"("id"),
  "member_id" uuid REFERENCES "public"."members"("id"),
  "title" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "chat_sessions_chat_idx" ON "chat_sessions" USING btree ("chat_id");
CREATE INDEX IF NOT EXISTS "chat_sessions_member_idx" ON "chat_sessions" USING btree ("member_id");
