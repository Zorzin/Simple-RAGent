import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/admin";
import { fetchOrgMemberships } from "@/lib/clerk-org";

import { setTokenLimit } from "../../actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewLimitPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.limitsNew" });
  await requireAdmin();
  const { orgId } = await auth();
  const memberships = orgId ? await fetchOrgMemberships(orgId) : [];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t("breadcrumbs.admin"), href: "/admin" },
          { label: t("breadcrumbs.limits"), href: "/admin/limits" },
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
            <Link href={`/${locale}/admin/limits`}>{t("back")}</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <form action={setTokenLimit} className="space-y-3">
          <select
            name="clerkUserId"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
            required
          >
            {memberships.map((membership) => (
              <option key={membership.id} value={membership.userId}>
                {membership.identifier || t("anonymous")}
              </option>
            ))}
          </select>
          <select
            name="interval"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
            required
          >
            <option value="day">{t("interval.day")}</option>
            <option value="week">{t("interval.week")}</option>
            <option value="month">{t("interval.month")}</option>
          </select>
          <Input name="limitTokens" type="number" placeholder={t("limitPlaceholder")} required />
          <Button type="submit">{t("submit")}</Button>
        </form>
      </Card>
    </div>
  );
}
