import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { chatSessions, chats } from "@/db/schema";
import { getOrCreateMember } from "@/lib/organization";

type Props = {
  params: Promise<{ locale: string; chatId: string }>;
};

export default async function ChatDetailPage({ params }: Props) {
  const { locale, chatId } = await params;
  const { organization, member } = await getOrCreateMember();
  const db = getDb();

  const [chat] = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
  if (!chat || chat.organizationId !== organization.id) {
    redirect(`/${locale}/app`);
  }

  const [session] = await db
    .insert(chatSessions)
    .values({
      chatId: chat.id,
      memberId: member.id,
      title: chat.name,
    })
    .returning();

  redirect(`/${locale}/app/sessions/${session.id}`);
}
