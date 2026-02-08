import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { memberInvites, members, users } from "@/db/schema";

type MembershipItem = {
  id: string;
  userId: string;
  identifier: string;
  role: string;
};

type InvitationItem = {
  id: string;
  emailAddress: string;
  role: string;
};

export async function fetchOrgMemberships(orgId: string): Promise<MembershipItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: members.id,
      userId: members.userId,
      role: members.role,
      displayName: members.displayName,
      email: members.email,
      userName: users.name,
      userEmail: users.email,
    })
    .from(members)
    .leftJoin(users, eq(users.id, members.userId))
    .where(eq(members.organizationId, orgId));

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    identifier: row.displayName ?? row.email ?? row.userName ?? row.userEmail ?? row.userId,
    role: row.role,
  }));
}

export async function fetchOrgInvitations(orgId: string): Promise<InvitationItem[]> {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({
      id: memberInvites.id,
      emailAddress: memberInvites.email,
      role: memberInvites.role,
    })
    .from(memberInvites)
    .where(
      and(
        eq(memberInvites.organizationId, orgId),
        isNull(memberInvites.acceptedAt),
        isNull(memberInvites.revokedAt),
        gt(memberInvites.expiresAt, now),
      ),
    );

  return rows;
}
