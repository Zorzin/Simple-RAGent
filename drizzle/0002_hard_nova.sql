ALTER TABLE "chat_sessions" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "summary_up_to_id" uuid;