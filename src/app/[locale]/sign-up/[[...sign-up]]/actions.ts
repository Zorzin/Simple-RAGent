"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { memberInvites, members, users } from "@/db/schema";

const signUpSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email(),
  password: z.string().min(8),
  inviteToken: z.string().optional(),
});

export type RegisterResult = { ok: boolean; error?: string };

export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const data = signUpSchema.parse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    inviteToken: formData.get("inviteToken") || undefined,
  });

  const db = getDb();
  const normalizedEmail = data.email.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing) {
    return { ok: false, error: "Email is already registered." };
  }

  let invite: typeof memberInvites.$inferSelect | undefined;
  if (data.inviteToken) {
    const [inviteRow] = await db
      .select()
      .from(memberInvites)
      .where(
        and(
          eq(memberInvites.token, data.inviteToken),
          isNull(memberInvites.acceptedAt),
          isNull(memberInvites.revokedAt),
          gt(memberInvites.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!inviteRow) {
      return { ok: false, error: "Invite link is invalid or expired." };
    }
    if (inviteRow.email.toLowerCase() !== normalizedEmail) {
      return { ok: false, error: "Invite email does not match." };
    }
    invite = inviteRow;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const now = new Date();
  const [createdUser] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      name: data.name ?? null,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (invite) {
    await db.insert(members).values({
      organizationId: invite.organizationId,
      userId: createdUser.id,
      email: normalizedEmail,
      displayName: data.name ?? null,
      role: invite.role,
    });

    await db
      .update(memberInvites)
      .set({ acceptedAt: new Date(), acceptedByUserId: createdUser.id })
      .where(eq(memberInvites.id, invite.id));
  }

  return { ok: true };
}
