import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { chatLlmConnectors, chatSessions, chats, llmConnectors, messages } from "@/db/schema";
import { getOrCreateMember } from "@/lib/organization";

import ChatClient from "../../ChatClient";

type Props = {
  params: Promise<{ locale: string; sessionId: string }>;
};

export default async function ChatSessionPage({ params }: Props) {
  const { locale, sessionId } = await params;
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

  const [chatMessages, connectorRows] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, session.id))
      .orderBy(messages.createdAt),
    db
      .select({ name: llmConnectors.name, model: llmConnectors.model })
      .from(chatLlmConnectors)
      .innerJoin(llmConnectors, eq(chatLlmConnectors.connectorId, llmConnectors.id))
      .where(eq(chatLlmConnectors.chatId, chat.id))
      .limit(1),
  ]);

  const connector = connectorRows[0];
  const connectorLabel = connector
    ? connector.model
      ? `${connector.name} (${connector.model})`
      : connector.name
    : null;

  return (
    <ChatClient
      sessionId={session.id}
      locale={locale}
      chatName={chat.name}
      chatDescription={chat.description}
      connectorName={connectorLabel}
      initialSessionTitle={session.title}
      initialMessages={chatMessages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
      }))}
    />
  );
}
