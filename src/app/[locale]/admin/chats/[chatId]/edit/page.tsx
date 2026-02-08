import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import EditChatForm from "@/components/admin/EditChatForm";
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

  const selectedGroupIds = linkedGroups.map((row) => row.groupId);
  const selectedFileIds = linkedFiles.map((row) => row.fileId);
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

      <EditChatForm
        locale={locale}
        chatId={chat.id}
        chatName={chat.name}
        chatDescription={chat.description ?? ""}
        action={updateChat}
        deleteAction={deleteChat}
        groupRows={groupRows.map((g) => ({ id: g.id, name: g.name }))}
        fileRows={fileRows.map((f) => ({ id: f.id, name: f.name }))}
        connectorRows={connectorRows.map((c) => ({ id: c.id, name: c.name, provider: c.provider }))}
        selectedGroupIds={selectedGroupIds}
        selectedFileIds={selectedFileIds}
        selectedConnectorId={connectorId}
        limitDay={limitDay}
        limitWeek={limitWeek}
        limitMonth={limitMonth}
      />
    </div>
  );
}
