import { auth, currentUser } from "@clerk/nextjs/server";

export { auth };

export type SessionUser = {
  userId: string;
  email: string | null;
  name: string | null;
};

export async function requireUser(): Promise<SessionUser> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("AUTH_UNAUTHORIZED");
  }

  const user = await currentUser();

  return {
    userId,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
    name: user?.fullName ?? user?.firstName ?? user?.username ?? null,
  };
}

export async function getActiveOrg() {
  const { orgId, orgRole } = await auth();

  return { orgId, orgRole };
}
