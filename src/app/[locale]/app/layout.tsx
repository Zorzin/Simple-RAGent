import { auth } from "@clerk/nextjs/server";
import { desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import ChatSidebar from "@/components/app/ChatSidebar";
import { getDb } from "@/db";
import { chatSessions, chats, messages } from "@/db/schema";
import { getOrCreateMember } from "@/lib/organization";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;
  const { orgId } = await auth();
  if (!orgId) {
    redirect(`/${locale}/create-organization`);
  }

  const { organization, member } = await getOrCreateMember();
  const db = getDb();
  const [chatRows, sessionRows] = await Promise.all([
    db.select().from(chats).where(eq(chats.organizationId, organization.id)),
    db
      .select({
        id: chatSessions.id,
        chatId: chatSessions.chatId,
        title: chatSessions.title,
        createdAt: chatSessions.createdAt,
        chatName: chats.name,
        lastMessageAt: sql<Date | null>`max(${messages.createdAt})`,
      })
      .from(chatSessions)
      .leftJoin(chats, eq(chatSessions.chatId, chats.id))
      .leftJoin(messages, eq(messages.sessionId, chatSessions.id))
      .where(eq(chatSessions.memberId, member.id))
      .groupBy(chatSessions.id, chats.name)
      .orderBy(desc(sql`coalesce(max(${messages.createdAt}), ${chatSessions.createdAt})`)),
  ]);

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="w-80 shrink-0 border-r border-zinc-200 bg-white px-4 py-6">
        <ChatSidebar
          locale={locale}
          chats={chatRows.map((chat) => ({
            id: chat.id,
            name: chat.name,
            description: chat.description,
          }))}
          sessions={sessionRows.map((session) => ({
            id: session.id,
            chatId: session.chatId,
            title: session.title || session.chatName || "New chat",
            createdAt:
              session.lastMessageAt?.toISOString?.().slice(0, 10) ??
              session.createdAt?.toISOString?.().slice(0, 10) ??
              null,
          }))}
        />
      </aside>
      <main className="flex min-h-screen flex-1 flex-col">
        <div className="flex-1 px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
