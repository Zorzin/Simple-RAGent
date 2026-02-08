import { desc, eq, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import ChatSidebar from "@/components/app/ChatSidebar";
import { getDb } from "@/db";
import { chatSessions, chats, messages } from "@/db/schema";
import { auth, getActiveOrg } from "@/lib/auth";
import { getOrCreateMember } from "@/lib/organization";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app.sidebar" });
  const { orgId } = await getActiveOrg();
  if (!orgId) {
    redirect(`/${locale}/create-organization`);
  }

  const session = await auth();
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
    <div
      className="chat-dark"
      style={{ height: "100dvh", width: "100%", display: "flex", overflow: "hidden" }}
    >
      {/* Sidebar */}
      <nav
        style={{
          width: 280,
          minWidth: 280,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#18181b",
          borderRight: "1px solid #27272a",
        }}
      >
        <ChatSidebar
          locale={locale}
          chats={chatRows.map((chat) => ({
            id: chat.id,
            name: chat.name,
            description: chat.description,
          }))}
          sessions={sessionRows.map((s) => ({
            id: s.id,
            chatId: s.chatId,
            title: s.title || s.chatName || t("newChatTitle"),
            createdAt:
              s.lastMessageAt?.toISOString?.().slice(0, 10) ??
              s.createdAt?.toISOString?.().slice(0, 10) ??
              null,
          }))}
          userName={session?.user?.name ?? null}
          userEmail={session?.user?.email ?? null}
        />
      </nav>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#09090b",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
