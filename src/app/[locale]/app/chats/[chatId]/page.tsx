import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { chats, messages } from "@/db/schema";
import { getOrCreateMember } from "@/lib/organization";

import ChatClient from "../../ChatClient";

type Props = {
  params: Promise<{ locale: string; chatId: string }>;
};

export default async function ChatDetailPage({ params }: Props) {
  const { locale, chatId } = await params;
  const { organization } = await getOrCreateMember();
  const db = getDb();

  const [chat] = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
  if (!chat || chat.organizationId !== organization.id) {
    notFound();
  }

  const chatMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chat.id))
    .orderBy(messages.createdAt);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{chat.name}</h1>
            <p className="mt-2 text-sm text-zinc-600">{chat.description ?? ""}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/app`}>Back</Link>
          </Button>
        </div>
      </div>

      <ChatClient
        chatId={chat.id}
        initialMessages={chatMessages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        }))}
      />
    </div>
  );
}
