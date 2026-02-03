import Link from "next/link";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ConnectorFields from "@/components/admin/ConnectorFields";
import { requireAdmin } from "@/lib/admin";

import { createConnector } from "../../actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewConnectorPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.connectorsNew" });
  await requireAdmin();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t("breadcrumbs.admin"), href: "/admin" },
          { label: t("breadcrumbs.connectors"), href: "/admin/connectors" },
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
            <Link href={`/${locale}/admin/connectors`}>{t("back")}</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <form action={createConnector} className="space-y-3">
          <ConnectorFields />
          <Button type="submit">{t("submit")}</Button>
        </form>
      </Card>
    </div>
  );
}
