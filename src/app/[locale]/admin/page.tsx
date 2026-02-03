import { eq } from "drizzle-orm";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/db";
import { chats, files, groups, llmConnectors, members, tokenLimits } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

import {
  createChat,
  linkChatToConnector,
  linkChatToFile,
  linkChatToGroup,
  uploadFile,
  createConnector,
  createGroup,
  setTokenLimit,
} from "./actions";

export default async function AdminHome() {
  const t = useTranslations("home");
  const { organization, member } = await requireAdmin();
  const db = getDb();

  const [chatRows, groupRows, connectorRows, memberRows, limitRows, fileRows] =
    await Promise.all([
      db.select().from(chats).where(eq(chats.organizationId, organization.id)),
      db.select().from(groups).where(eq(groups.organizationId, organization.id)),
      db
        .select()
        .from(llmConnectors)
        .where(eq(llmConnectors.organizationId, organization.id)),
      db.select().from(members).where(eq(members.organizationId, organization.id)),
      db
        .select()
        .from(tokenLimits)
        .where(eq(tokenLimits.memberId, member.id)),
      db.select().from(files).where(eq(files.organizationId, organization.id)),
    ]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-zinc-900">{t("ctaSecondary")}</h1>
        <p className="text-zinc-600">
          Manage chats, groups, model connectors, and token limits. Signed in as{" "}
          {member.displayName ?? member.email ?? "member"}.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Create a chat</h2>
          <form action={createChat} className="space-y-3">
            <Input name="name" placeholder="Chat name" required />
            <Textarea name="description" placeholder="Description (optional)" />
            <Button type="submit">Create chat</Button>
          </form>
          <ul className="space-y-2 text-sm text-zinc-600">
            {chatRows.map((chat) => (
              <li key={chat.id}>
                {chat.name}
                {chat.isGeneral ? " (general)" : ""}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Create a group</h2>
          <form action={createGroup} className="space-y-3">
            <Input name="name" placeholder="Group name" required />
            <Button type="submit">Create group</Button>
          </form>
          <ul className="space-y-2 text-sm text-zinc-600">
            {groupRows.map((group) => (
              <li key={group.id}>{group.name}</li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Invite members</h2>
          <p className="text-sm text-zinc-600">
            Invites are managed through Clerk for now. We can wire a first-party invite
            flow next.
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Connect an LLM</h2>
          <form action={createConnector} className="space-y-3">
            <Input name="name" placeholder="Connector name" required />
            <Input name="provider" placeholder="Provider (openai, copilot, ...)" required />
            <Input name="model" placeholder="Model (optional)" />
            <Input name="apiKey" placeholder="API key (optional)" />
            <Button type="submit">Add connector</Button>
          </form>
          <ul className="space-y-2 text-sm text-zinc-600">
            {connectorRows.map((connector) => (
              <li key={connector.id}>
                {connector.name} · {connector.provider}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Token limits</h2>
          <form action={setTokenLimit} className="space-y-3">
            <Input name="memberId" placeholder="Member ID" required />
            <Input name="interval" placeholder="day, week, month" required />
            <Input name="limitTokens" type="number" placeholder="Limit tokens" required />
            <Button type="submit">Set limit</Button>
          </form>
          <div className="space-y-2 text-sm text-zinc-600">
            <div className="font-medium text-zinc-900">Members</div>
            {memberRows.map((memberRow) => (
              <div key={memberRow.id}>
                {memberRow.displayName ?? memberRow.email ?? memberRow.clerkUserId} · {" "}
                {memberRow.role}
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm text-zinc-600">
            <div className="font-medium text-zinc-900">Your limits</div>
            {limitRows.map((limit) => (
              <div key={limit.id}>
                {limit.interval}: {limit.limitTokens}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Upload files</h2>
          <form action={uploadFile} className="space-y-3">
            <Input name="file" type="file" required />
            <Button type="submit">Upload to blob</Button>
          </form>
          <ul className="space-y-2 text-sm text-zinc-600">
            {fileRows.map((file) => (
              <li key={file.id}>{file.name}</li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Attach files to chats</h2>
          <form action={linkChatToFile} className="space-y-3">
            <Input name="chatId" placeholder="Chat ID" required />
            <Input name="fileId" placeholder="File ID" required />
            <Button type="submit">Attach file</Button>
          </form>
          <div className="space-y-2 text-sm text-zinc-600">
            <div className="font-medium text-zinc-900">Chats</div>
            {chatRows.map((chat) => (
              <div key={chat.id}>{chat.name}</div>
            ))}
            <div className="font-medium text-zinc-900">Files</div>
            {fileRows.map((file) => (
              <div key={file.id}>{file.name}</div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Link chats to groups</h2>
          <form action={linkChatToGroup} className="space-y-3">
            <Input name="chatId" placeholder="Chat ID" required />
            <Input name="groupId" placeholder="Group ID" required />
            <Button type="submit">Link group</Button>
          </form>
          <div className="space-y-2 text-sm text-zinc-600">
            <div className="font-medium text-zinc-900">Groups</div>
            {groupRows.map((group) => (
              <div key={group.id}>{group.name}</div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Link chats to LLMs</h2>
          <form action={linkChatToConnector} className="space-y-3">
            <Input name="chatId" placeholder="Chat ID" required />
            <Input name="connectorId" placeholder="Connector ID" required />
            <Button type="submit">Link connector</Button>
          </form>
          <div className="space-y-2 text-sm text-zinc-600">
            <div className="font-medium text-zinc-900">Connectors</div>
            {connectorRows.map((connector) => (
              <div key={connector.id}>{connector.name}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
