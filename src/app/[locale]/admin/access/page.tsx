import { eq } from "drizzle-orm";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDb } from "@/db";
import {
  chatFiles,
  chatGroups,
  chatLlmConnectors,
  chats,
  files,
  groups,
  llmConnectors,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

import {
  linkChatToConnector,
  linkChatToFile,
  linkChatToGroup,
  unlinkChatFromConnector,
  unlinkChatFromFile,
  unlinkChatFromGroup,
} from "../actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccessPage({ params }: Props) {
  const { locale } = await params;
  const { organization } = await requireAdmin();
  const db = getDb();

  const [
    chatRows,
    groupRows,
    connectorRows,
    fileRows,
    chatFileRows,
    chatGroupRows,
    chatConnectorRows,
  ] = await Promise.all([
    db.select().from(chats).where(eq(chats.organizationId, organization.id)),
    db.select().from(groups).where(eq(groups.organizationId, organization.id)),
    db.select().from(llmConnectors).where(eq(llmConnectors.organizationId, organization.id)),
    db.select().from(files).where(eq(files.organizationId, organization.id)),
    db
      .select({
        chatId: chatFiles.chatId,
        fileId: chatFiles.fileId,
        chatName: chats.name,
        fileName: files.name,
      })
      .from(chatFiles)
      .leftJoin(chats, eq(chatFiles.chatId, chats.id))
      .leftJoin(files, eq(chatFiles.fileId, files.id)),
    db
      .select({
        chatId: chatGroups.chatId,
        groupId: chatGroups.groupId,
        chatName: chats.name,
        groupName: groups.name,
      })
      .from(chatGroups)
      .leftJoin(chats, eq(chatGroups.chatId, chats.id))
      .leftJoin(groups, eq(chatGroups.groupId, groups.id)),
    db
      .select({
        chatId: chatLlmConnectors.chatId,
        connectorId: chatLlmConnectors.connectorId,
        chatName: chats.name,
        connectorName: llmConnectors.name,
      })
      .from(chatLlmConnectors)
      .leftJoin(chats, eq(chatLlmConnectors.chatId, chats.id))
      .leftJoin(llmConnectors, eq(chatLlmConnectors.connectorId, llmConnectors.id)),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[{ label: "Admin", href: "/admin" }, { label: "Access" }]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Access rules</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Connect chats with groups, files, and model connectors.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Attach files to chats</h2>
          <form action={linkChatToFile} className="space-y-3">
            <select
              name="chatId"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
              required
            >
              {chatRows.map((chat) => (
                <option key={chat.id} value={chat.id}>
                  {chat.name}
                </option>
              ))}
            </select>
            <select
              name="fileId"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
              required
            >
              {fileRows.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </select>
            <Button type="submit">Attach file</Button>
          </form>
          <div className="space-y-2 text-sm text-zinc-600">
            {chatFileRows.length === 0 ? (
              <div>No file links yet.</div>
            ) : (
              chatFileRows.map((row, index) => (
                <form key={`${row.chatId}-${row.fileId}-${index}`} action={unlinkChatFromFile}>
                  <input type="hidden" name="chatId" value={row.chatId ?? ""} />
                  <input type="hidden" name="fileId" value={row.fileId ?? ""} />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      {row.chatName ?? "Chat"} → {row.fileName ?? "File"}
                    </div>
                    <ConfirmButton
                      type="submit"
                      className="text-xs text-zinc-500 hover:text-zinc-900"
                      confirmText="Remove this file link?"
                    >
                      Remove
                    </ConfirmButton>
                  </div>
                </form>
              ))
            )}
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Link chats to groups</h2>
          <form action={linkChatToGroup} className="space-y-3">
            <select
              name="chatId"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
              required
            >
              {chatRows.map((chat) => (
                <option key={chat.id} value={chat.id}>
                  {chat.name}
                </option>
              ))}
            </select>
            <select
              name="groupId"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
              required
            >
              {groupRows.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <Button type="submit">Link group</Button>
          </form>
          <div className="space-y-2 text-sm text-zinc-600">
            {chatGroupRows.length === 0 ? (
              <div>No group links yet.</div>
            ) : (
              chatGroupRows.map((row, index) => (
                <form key={`${row.chatId}-${row.groupId}-${index}`} action={unlinkChatFromGroup}>
                  <input type="hidden" name="chatId" value={row.chatId ?? ""} />
                  <input type="hidden" name="groupId" value={row.groupId ?? ""} />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      {row.chatName ?? "Chat"} → {row.groupName ?? "Group"}
                    </div>
                    <ConfirmButton
                      type="submit"
                      className="text-xs text-zinc-500 hover:text-zinc-900"
                      confirmText="Remove this group link?"
                    >
                      Remove
                    </ConfirmButton>
                  </div>
                </form>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Link chats to connectors</h2>
        <form action={linkChatToConnector} className="space-y-3">
          <select
            name="chatId"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
            required
          >
            {chatRows.map((chat) => (
              <option key={chat.id} value={chat.id}>
                {chat.name}
              </option>
            ))}
          </select>
          <select
            name="connectorId"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
            required
          >
            {connectorRows.map((connector) => (
              <option key={connector.id} value={connector.id}>
                {connector.name}
              </option>
            ))}
          </select>
          <Button type="submit">Link connector</Button>
        </form>
        <div className="space-y-2 text-sm text-zinc-600">
          {chatConnectorRows.length === 0 ? (
            <div>No connector links yet.</div>
          ) : (
            chatConnectorRows.map((row, index) => (
              <form
                key={`${row.chatId}-${row.connectorId}-${index}`}
                action={unlinkChatFromConnector}
              >
                <input type="hidden" name="chatId" value={row.chatId ?? ""} />
                <input type="hidden" name="connectorId" value={row.connectorId ?? ""} />
                <div className="flex items-center justify-between gap-2">
                  <div>
                    {row.chatName ?? "Chat"} → {row.connectorName ?? "Connector"}
                  </div>
                  <ConfirmButton
                    type="submit"
                    className="text-xs text-zinc-500 hover:text-zinc-900"
                    confirmText="Remove this connector link?"
                  >
                    Remove
                  </ConfirmButton>
                </div>
              </form>
            ))
          )}
        </div>
      </Card>

      <div className="text-xs text-zinc-400">Active locale: {locale}</div>
    </div>
  );
}
