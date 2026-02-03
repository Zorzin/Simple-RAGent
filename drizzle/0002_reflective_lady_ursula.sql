ALTER TABLE "messages" ADD COLUMN "token_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "messages_member_idx" ON "messages" USING btree ("member_id");