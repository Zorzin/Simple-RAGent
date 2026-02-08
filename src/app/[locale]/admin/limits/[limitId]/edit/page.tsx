import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

      <Card className="space-y-4 p-6">
        <form action={updateTokenLimit} className="space-y-3">
          <input type="hidden" name="id" value={limitRow.id} />
          <div className="text-xs text-zinc-500">
            {t("user", { id: limitRow.displayName ?? limitRow.email ?? limitRow.memberId })}
          </div>
          <div className="text-xs text-zinc-500">
            {t("intervalLabel", { interval: t(`interval.${limitRow.interval}`) })}
          </div>
          <Input name="limitTokens" defaultValue={limitRow.limitTokens} />
          <div className="flex items-center gap-2">
            <Button type="submit">{t("save")}</Button>
            <Button formAction={deleteTokenLimit} type="submit" variant="destructive">
              {t("delete")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
