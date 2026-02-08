"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { memberInvites, members, users } from "@/db/schema";

export type AcceptInviteResult = { ok: boolean; error?: string };

export async function acceptInvite(formData: FormData): Promise<AcceptInviteResult> {
  const token = String(formData.get("token") || "");
  const locale = formData.get("locale") === "pl" ? "pl" : "en";
  if (!token) {
    return { ok: false, error: "Invite token is missing." };
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Please sign in to accept the invite." };
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.email) {
    return { ok: false, error: "Your account is missing an email address." };
  }

  const [invite] = await db
    .select()
    .from(memberInvites)
    .where(
      and(
        eq(memberInvites.token, token),
        isNull(memberInvites.acceptedAt),
        isNull(memberInvites.revokedAt),
        gt(memberInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!invite) {
    return { ok: false, error: "Invite link is invalid or expired." };
  }
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, error: "Invite email does not match your account." };
  }

  const [existingMember] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.organizationId, invite.organizationId), eq(members.userId, userId)))
    .limit(1);

  if (!existingMember) {
    await db.insert(members).values({
      organizationId: invite.organizationId,
      userId,
      email: user.email,
      displayName: user.name ?? null,
      role: invite.role,
    });
  }

  await db
    .update(memberInvites)
    .set({ acceptedAt: new Date(), acceptedByUserId: userId })
    .where(eq(memberInvites.id, invite.id));

  redirect(`/${locale}/app`);
}
