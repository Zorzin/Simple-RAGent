import Link from "next/link";
import { and, eq, gt, isNull } from "drizzle-orm";

import { auth } from "@/lib/auth";
import AcceptInviteForm from "@/components/auth/AcceptInviteForm";
import OAuthButtons from "@/components/auth/OAuthButtons";
import SignUpForm from "@/components/auth/SignUpForm";
import { Card } from "@/components/ui/card";
import { getDb } from "@/db";
import { memberInvites, organizations } from "@/db/schema";

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export default async function InvitePage({ params }: Props) {
  const { locale, token } = await params;
  const db = getDb();
  const [invite] = await db
    .select({
      id: memberInvites.id,
      email: memberInvites.email,
      role: memberInvites.role,
      organizationName: organizations.name,
      expiresAt: memberInvites.expiresAt,
    })
    .from(memberInvites)
    .leftJoin(organizations, eq(organizations.id, memberInvites.organizationId))
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
        <Card className="w-full max-w-md space-y-2 p-6 text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Invite not found</h1>
          <p className="text-sm text-zinc-600">This invite link is invalid or expired.</p>
          <Link className="text-sm text-zinc-700 underline" href={`/${locale}/sign-in`}>
            Go to sign in
          </Link>
        </Card>
      </div>
    );
  }

  const session = await auth();
  const showGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const showMicrosoft = Boolean(
    process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET,
  );
  const callbackUrl = `/${locale}/invite/${token}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">You&apos;re invited</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Join {invite.organizationName ?? "your organization"} as {invite.role}.
          </p>
        </div>

        {session?.user ? (
          <AcceptInviteForm token={token} locale={locale} />
        ) : (
          <>
            <OAuthButtons
              callbackUrl={callbackUrl}
              showGoogle={showGoogle}
              showMicrosoft={showMicrosoft}
            />
            <div
              className={`${showGoogle || showMicrosoft ? "border-t" : ""} border-zinc-200 pt-6`}
            >
              <SignUpForm locale={locale} inviteToken={token} defaultEmail={invite.email} />
            </div>
            <div className="text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link className="text-zinc-700 underline" href={`/${locale}/sign-in`}>
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
