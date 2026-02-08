"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { members, organizations, users } from "@/db/schema";

const organizationSchema = z.object({
  name: z.string().min(2),
});

export type CreateOrganizationResult = { ok: boolean; error?: string };

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createOrganization(formData: FormData): Promise<CreateOrganizationResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "You must be signed in." };
  }

  const data = organizationSchema.parse({
    name: formData.get("name"),
  });

  const db = getDb();
  const [existingMembership] = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.userId, userId))
    .limit(1);
  if (existingMembership) {
    return { ok: false, error: "You already belong to an organization." };
  }

  const baseSlug = toSlug(data.name) || `org-${userId.slice(0, 6)}`;
  let slug = baseSlug;
  const [slugExists] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  if (slugExists) {
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const [createdOrg] = await db
    .insert(organizations)
    .values({
      name: data.name,
      slug,
      createdByUserId: userId,
    })
    .returning();

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  await db.insert(members).values({
    organizationId: createdOrg.id,
    userId,
    email: user?.email ?? null,
    displayName: user?.name ?? null,
    role: "admin",
  });

  return { ok: true };
}
