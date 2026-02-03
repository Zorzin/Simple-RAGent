import { clerkClient } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

import { getDb } from "@/db";
import { members, organizations } from "@/db/schema";
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
    .where(eq(organizations.clerkOrgId, orgId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });

  const [created] = await db
    .insert(organizations)
    .values({ clerkOrgId: orgId, name: org.name })
    .returning();

  return created;
}

export async function getOrCreateMember() {
  const db = getDb();
  const org = await getOrCreateOrganization();
  const user = await requireUser();
  const { orgId, orgRole } = await getActiveOrg();

  if (!org || !orgId) {
    throw new Error("ORG_NOT_ACTIVE");
  }

  const [existing] = await db
    .select()
    .from(members)
    .where(and(eq(members.clerkUserId, user.userId), eq(members.organizationId, org.id)))
    .limit(1);

  if (existing) {
    return { member: existing, organization: org };
  }

  const [created] = await db
    .insert(members)
    .values({
      organizationId: org.id,
      clerkUserId: user.userId,
      clerkOrgId: orgId,
      orgRole: orgRole ?? undefined,
      email: user.email ?? undefined,
      displayName: user.name ?? undefined,
      role: orgRole === "org:admin" ? "admin" : "member",
    })
    .returning();

  return { member: created, organization: org };
}
