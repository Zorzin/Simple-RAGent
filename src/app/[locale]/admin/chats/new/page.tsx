import Link from "next/link";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

      <Card className="space-y-4 p-6">
        <form action={createChat} className="space-y-4">
          <Input name="name" placeholder={t("fields.namePlaceholder")} required />
          <Textarea name="description" placeholder={t("fields.descriptionPlaceholder")} />
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-500">{t("fields.assignGroups")}</div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
              {groupRows.length === 0 ? (
                <div className="text-zinc-500">{t("fields.noGroups")}</div>
              ) : (
                groupRows.map((group) => (
                  <label key={group.id} className="flex items-center gap-2 py-1">
                    <input type="checkbox" name="groupIds" value={group.id} />
                    <span className="text-zinc-700">{group.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-500">{t("fields.assignFiles")}</div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
              {fileRows.length === 0 ? (
                <div className="text-zinc-500">{t("fields.noFiles")}</div>
              ) : (
                fileRows.map((file) => (
                  <label key={file.id} className="flex items-center gap-2 py-1">
                    <input type="checkbox" name="fileIds" value={file.id} />
                    <span className="text-zinc-700">{file.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-500">{t("fields.connector")}</div>
            <select
              name="connectorId"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
            >
              <option value="">{t("fields.noConnector")}</option>
              {connectorRows.map((connector) => (
                <option key={connector.id} value={connector.id}>
                  {connector.name} ({connector.provider})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">{t("limits.day")}</label>
              <Input name="limitDay" type="number" min="0" placeholder={t("limits.example")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">{t("limits.week")}</label>
              <Input name="limitWeek" type="number" min="0" placeholder={t("limits.example")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">{t("limits.month")}</label>
              <Input name="limitMonth" type="number" min="0" placeholder={t("limits.example")} />
            </div>
          </div>
          <Button type="submit">{t("submit")}</Button>
        </form>
      </Card>
    </div>
  );
}
