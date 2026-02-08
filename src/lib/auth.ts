import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { members } from "@/db/schema";

export type SessionUser = {
  userId: string;
  email: string | null;
  name: string | null;
};

export async function auth() {
  return getServerSession(authOptions);
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("AUTH_UNAUTHORIZED");
  }

  return {
    userId,
    email: session?.user?.email ?? null,
    name: session?.user?.name ?? null,
  };
}

export async function getActiveOrg() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { orgId: null, orgRole: null };
  }

  const db = getDb();
  const [member] = await db
    .select({
      orgId: members.organizationId,
      role: members.role,
    })
    .from(members)
    .where(eq(members.userId, userId))
    .limit(1);

  return {
    orgId: member?.orgId ?? null,
    orgRole: member?.role ?? null,
  };
}
