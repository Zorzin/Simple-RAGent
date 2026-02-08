import Link from "next/link";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import CreateChatForm from "@/components/admin/CreateChatForm";
import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/db";
import { files, groups, llmConnectors } from "@/db/schema";
import { eq } from "drizzle-orm";

import { createChat } from "../../actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewChatPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.chatsNew" });
  const { organization } = await requireAdmin();
  const db = getDb();

  const [groupRows, fileRows, connectorRows] = await Promise.all([
    db.select().from(groups).where(eq(groups.organizationId, organization.id)),
    db.select().from(files).where(eq(files.organizationId, organization.id)),
    db.select().from(llmConnectors).where(eq(llmConnectors.organizationId, organization.id)),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t("breadcrumbs.admin"), href: "/admin" },
          { label: t("breadcrumbs.chats"), href: "/admin/chats" },
          { label: t("breadcrumbs.new") },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{t("title")}</h1>
            <p className="mt-2 text-sm text-zinc-600">{t("subtitle")}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/chats`}>{t("back")}</Link>
          </Button>
        </div>
      </div>

      <CreateChatForm
        locale={locale}
        action={createChat}
        groupRows={groupRows.map((g) => ({ id: g.id, name: g.name }))}
        fileRows={fileRows.map((f) => ({ id: f.id, name: f.name }))}
        connectorRows={connectorRows.map((c) => ({ id: c.id, name: c.name, provider: c.provider }))}
      />
    </div>
  );
}
