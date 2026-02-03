import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/db";
import {
  chatFiles,
  chatGroups,
  chatLlmConnectors,
  chatTokenLimits,
  chats,
  files,
  groups,
  llmConnectors,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

import { deleteChat, updateChat } from "../../../actions";

type Props = {
  params: Promise<{ locale: string; chatId: string }>;
};

export default async function EditChatPage({ params }: Props) {
  const { locale, chatId } = await params;
  const t = await getTranslations({ locale, namespace: "admin.chatsEdit" });
  const { organization } = await requireAdmin();
  const db = getDb();
  const [chat] = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);

  if (!chat) {
    notFound();
  }

  const [groupRows, fileRows, connectorRows, linkedGroups, linkedFiles, linkedConnectors, limits] =
    await Promise.all([
      db.select().from(groups).where(eq(groups.organizationId, organization.id)),
      db.select().from(files).where(eq(files.organizationId, organization.id)),
      db.select().from(llmConnectors).where(eq(llmConnectors.organizationId, organization.id)),
      db
        .select({ groupId: chatGroups.groupId })
        .from(chatGroups)
        .where(eq(chatGroups.chatId, chat.id)),
      db.select({ fileId: chatFiles.fileId }).from(chatFiles).where(eq(chatFiles.chatId, chat.id)),
      db
        .select({ connectorId: chatLlmConnectors.connectorId })
        .from(chatLlmConnectors)
        .where(eq(chatLlmConnectors.chatId, chat.id)),
      db.select().from(chatTokenLimits).where(eq(chatTokenLimits.chatId, chat.id)),
    ]);

  const groupIds = new Set(linkedGroups.map((row) => row.groupId));
  const fileIds = new Set(linkedFiles.map((row) => row.fileId));
  const connectorId = linkedConnectors[0]?.connectorId ?? "";
  const limitDay = limits.find((limit) => limit.interval === "day")?.limitTokens?.toString() ?? "";
  const limitWeek =
    limits.find((limit) => limit.interval === "week")?.limitTokens?.toString() ?? "";
  const limitMonth =
    limits.find((limit) => limit.interval === "month")?.limitTokens?.toString() ?? "";

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t("breadcrumbs.admin"), href: "/admin" },
          { label: t("breadcrumbs.chats"), href: "/admin/chats" },
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
            <Link href={`/${locale}/admin/chats`}>{t("back")}</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <form action={updateChat} className="space-y-4">
          <input type="hidden" name="id" value={chat.id} />
          <Input name="name" defaultValue={chat.name} required />
          <Textarea name="description" defaultValue={chat.description ?? ""} />
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-500">{t("fields.assignGroups")}</div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
              {groupRows.length === 0 ? (
                <div className="text-zinc-500">{t("fields.noGroups")}</div>
              ) : (
                groupRows.map((group) => (
                  <label key={group.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      name="groupIds"
                      value={group.id}
                      defaultChecked={groupIds.has(group.id)}
                    />
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
                    <input
                      type="checkbox"
                      name="fileIds"
                      value={file.id}
                      defaultChecked={fileIds.has(file.id)}
                    />
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
              defaultValue={connectorId}
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
              <Input name="limitDay" type="number" min="0" defaultValue={limitDay} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">{t("limits.week")}</label>
              <Input name="limitWeek" type="number" min="0" defaultValue={limitWeek} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">{t("limits.month")}</label>
              <Input name="limitMonth" type="number" min="0" defaultValue={limitMonth} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit">{t("save")}</Button>
            <Button formAction={deleteChat} type="submit" variant="destructive">
              {t("delete")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
