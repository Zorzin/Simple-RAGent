import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { getDb } from "@/db";
import { chats } from "@/db/schema";
import { getOrCreateMember } from "@/lib/organization";

export default async function AppHome({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations("home");
  const { locale } = await params;
  const { orgId } = await auth();
  if (!orgId) {
    redirect(`/${locale}/create-organization`);
  }
  const { organization } = await getOrCreateMember();
  const db = getDb();
  const chatRows = await db.select().from(chats).where(eq(chats.organizationId, organization.id));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-zinc-900">{t("ctaPrimary")}</h1>
        <p className="text-zinc-600">
          This is the member workspace. Chats will be scoped to files, projects, and group access.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {chatRows.map((chat) => (
          <Link key={chat.id} href={`/${locale}/app/chats/${chat.id}`}>
            <Card className="space-y-2 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-lg font-semibold text-zinc-900">{chat.name}</div>
              <div className="text-sm text-zinc-600">{chat.description}</div>
            </Card>
          </Link>
        ))}
        {chatRows.length === 0 ? (
          <Card className="p-4 text-sm text-zinc-600">
            No chats yet. Admins can create one from the admin panel.
          </Card>
        ) : null}
      </div>
    </div>
  );
}
