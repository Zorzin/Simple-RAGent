import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { chatSessions, chats, messages } from "@/db/schema";
import { getOrCreateMember } from "@/lib/organization";

import ChatClient from "../../ChatClient";

type Props = {
  params: Promise<{ locale: string; sessionId: string }>;
};

export default async function ChatSessionPage({ params }: Props) {
  const { sessionId } = await params;
  const { organization } = await getOrCreateMember();
  const db = getDb();

  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session) {
    notFound();
  }

  const [chat] = await db.select().from(chats).where(eq(chats.id, session.chatId)).limit(1);
  if (!chat || chat.organizationId !== organization.id) {
    notFound();
  }

  const chatMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, session.id))
    .orderBy(messages.createdAt);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{chat.name}</h1>
          <p className="mt-1 text-sm text-zinc-600">{chat.description ?? ""}</p>
        </div>
      </div>

      <ChatClient
        sessionId={session.id}
        initialMessages={chatMessages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        }))}
      />
    </div>
  );
}
