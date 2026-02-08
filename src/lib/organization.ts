import { eq, and } from "drizzle-orm";

import { getDb } from "@/db";
import { members, organizations, users } from "@/db/schema";
import { getActiveOrg, requireUser } from "@/lib/auth";

export async function getOrCreateOrganization() {
  const { orgId } = await getActiveOrg();
  if (!orgId) {
    return null;
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  return existing ?? null;
}

export async function getOrCreateMember() {
  const db = getDb();
  const org = await getOrCreateOrganization();
  const user = await requireUser();
  const { orgId } = await getActiveOrg();

  if (!org || !orgId) {
    throw new Error("ORG_NOT_ACTIVE");
  }

  const [userRow] = await db.select().from(users).where(eq(users.id, user.userId)).limit(1);
  const [existing] = await db
    .select()
    .from(members)
    .where(and(eq(members.userId, user.userId), eq(members.organizationId, org.id)))
    .limit(1);

  if (existing) {
    return { member: existing, organization: org };
  }

  const [created] = await db
    .insert(members)
    .values({
      organizationId: org.id,
      userId: user.userId,
      email: user.email ?? userRow?.email ?? undefined,
      displayName: user.name ?? userRow?.name ?? undefined,
      role: "member",
    })
    .returning();

  return { member: created, organization: org };
}
