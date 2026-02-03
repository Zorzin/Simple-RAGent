ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "token_count" integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "messages_member_idx" ON "messages" USING btree ("member_id");
