import { auth, currentUser } from "@clerk/nextjs/server";

export type SessionUser = {
  userId: string;
  email: string | null;
  name: string | null;
};

export async function requireUser(): Promise<SessionUser> {
  const { userId } = auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await currentUser();

  return {
    userId,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
    name: user?.fullName ?? user?.firstName ?? user?.username ?? null,
  };
}
