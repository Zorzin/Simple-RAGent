import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import EditLimitForm from "@/components/admin/EditLimitForm";
import { getDb } from "@/db";
import { members, tokenLimits } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

import { deleteTokenLimit, updateTokenLimit } from "../../../actions";

type Props = {
  params: Promise<{ locale: string; limitId: string }>;
};

export default async function EditLimitPage({ params }: Props) {
  const { locale, limitId } = await params;
  const t = await getTranslations({ locale, namespace: "admin.limitsEdit" });
  await requireAdmin();
  const db = getDb();
  const [limitRow] = await db
    .select({
      id: tokenLimits.id,
      memberId: tokenLimits.memberId,
      interval: tokenLimits.interval,
      limitTokens: tokenLimits.limitTokens,
      displayName: members.displayName,
      email: members.email,
    })
    .from(tokenLimits)
    .leftJoin(members, eq(members.id, tokenLimits.memberId))
    .where(eq(tokenLimits.id, limitId))
    .limit(1);

  if (!limitRow) {
    notFound();
  }

  const userLabel = t("user", { id: limitRow.displayName ?? limitRow.email ?? limitRow.memberId });
  const intervalLabel = t("intervalLabel", { interval: t(`interval.${limitRow.interval}`) });

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t("breadcrumbs.admin"), href: "/admin" },
          { label: t("breadcrumbs.limits"), href: "/admin/limits" },
          { label: t("breadcrumbs.edit") },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{t("title")}</h1>
            <p className="mt-2 text-sm text-zinc-600">{t("subtitle")}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/limits`}>{t("back")}</Link>
          </Button>
        </div>
      </div>

      <EditLimitForm
        locale={locale}
        limitId={limitRow.id}
        userLabel={userLabel}
        intervalLabel={intervalLabel}
        limitTokens={limitRow.limitTokens}
        action={updateTokenLimit}
        deleteAction={deleteTokenLimit}
      />
    </div>
  );
}
