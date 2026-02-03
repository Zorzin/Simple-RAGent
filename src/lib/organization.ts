import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { members, organizations } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const DEFAULT_ORG_NAME = "Default Organization";

export async function getOrCreateOrganization() {
  const db = getDb();
  const [existing] = await db.select().from(organizations).limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(organizations)
    .values({ name: DEFAULT_ORG_NAME })
    .returning();

  return created;
}

export async function getOrCreateMember() {
  const db = getDb();
  const org = await getOrCreateOrganization();
  const user = await requireUser();

  const [existing] = await db
    .select()
    .from(members)
    .where(eq(members.clerkUserId, user.userId))
    .limit(1);

  if (existing) {
    return { member: existing, organization: org };
  }

  const [anyMember] = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.organizationId, org.id))
    .limit(1);

  const isFirst = !anyMember;

  const [created] = await db
    .insert(members)
    .values({
      organizationId: org.id,
      clerkUserId: user.userId,
      email: user.email ?? undefined,
      displayName: user.name ?? undefined,
      role: isFirst ? "admin" : "member",
    })
    .returning();

  return { member: created, organization: org };
}
