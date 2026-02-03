import { OrganizationSwitcher } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getDb } from "@/db";
import { chats } from "@/db/schema";
import { getOrCreateMember } from "@/lib/organization";

export default async function AppHome({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations("home");
  const { orgId } = await auth();
  if (!orgId) {
    const { locale } = await params;
    redirect(`/${locale}/create-organization`);
  }
  const { organization } = await getOrCreateMember();
  const db = getDb();
  const chatRows = await db.select().from(chats).where(eq(chats.organizationId, organization.id));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-zinc-900">{t("ctaPrimary")}</h1>
          <p className="text-zinc-600">
            This is the member workspace. Chats will be scoped to files, projects, and group access.
          </p>
        </div>
        <OrganizationSwitcher />
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {chatRows.map((chat) => (
          <Card key={chat.id} className="space-y-2 p-4">
            <div className="text-lg font-semibold text-zinc-900">{chat.name}</div>
            <div className="text-sm text-zinc-600">{chat.description}</div>
          </Card>
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
