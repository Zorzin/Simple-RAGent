import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { chatSessions, chats } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getOrCreateMember } from "@/lib/organization";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { chatId?: string };
  if (!body.chatId) {
    return NextResponse.json({ error: "Chat is required" }, { status: 400 });
  }

  const db = getDb();
  const { organization, member } = await getOrCreateMember();

  const [chat] = await db.select().from(chats).where(eq(chats.id, body.chatId)).limit(1);
  if (!chat || chat.organizationId !== organization.id) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const [session] = await db
    .insert(chatSessions)
    .values({
      chatId: chat.id,
      memberId: member.id,
      title: null,
    })
    .returning();

  return NextResponse.json({
    sessionId: session.id,
    title: session.title ?? chat.name ?? "New chat",
    createdAt: session.createdAt?.toISOString?.() ?? null,
  });
}
