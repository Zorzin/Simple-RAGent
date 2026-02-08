import Link from "next/link";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import CreateGroupForm from "@/components/admin/CreateGroupForm";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { eq } from "drizzle-orm";

import { createGroup } from "../../actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewGroupPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.groupsNew" });
  const { organization } = await requireAdmin();
  const db = getDb();
  const memberRows = await db
    .select()
    .from(members)
    .where(eq(members.organizationId, organization.id));

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t("breadcrumbs.admin"), href: "/admin" },
          { label: t("breadcrumbs.groups"), href: "/admin/groups" },
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
            <Link href={`/${locale}/admin/groups`}>{t("back")}</Link>
          </Button>
        </div>
      </div>

      <CreateGroupForm
        locale={locale}
        action={createGroup}
        memberRows={memberRows.map((m) => ({
          id: m.id,
          displayName: m.displayName,
          email: m.email,
          userId: m.userId,
        }))}
      />
    </div>
  );
}
