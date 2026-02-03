import { OrganizationSwitcher } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/db";
import { chats, files, groups, llmConnectors, tokenLimits } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

import {
  createChat,
  createConnector,
  createGroup,
  inviteMember,
  linkChatToConnector,
  linkChatToFile,
  linkChatToGroup,
  setTokenLimit,
  uploadFile,
} from "./actions";
export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations("home");
  const { orgId } = await auth();
  if (!orgId) {
    const { locale } = await params;
    redirect(`/${locale}/create-organization`);
  }
  const { organization, member } = await requireAdmin();
  const db = getDb();

  const [chatRows, groupRows, connectorRows, limitRows, fileRows, memberships, invitations] =
    await Promise.all([
      db.select().from(chats).where(eq(chats.organizationId, organization.id)),
      db.select().from(groups).where(eq(groups.organizationId, organization.id)),
      db.select().from(llmConnectors).where(eq(llmConnectors.organizationId, organization.id)),
      db.select().from(tokenLimits).where(eq(tokenLimits.organizationId, organization.id)),
      db.select().from(files).where(eq(files.organizationId, organization.id)),
      orgId ? fetchOrgMemberships(orgId) : Promise.resolve([]),
      orgId ? fetchOrgInvitations(orgId) : Promise.resolve([]),
    ]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-zinc-900">{t("ctaSecondary")}</h1>
          <p className="text-zinc-600">
            Manage chats, groups, model connectors, and token limits. Signed in as{" "}
            {member.displayName ?? member.email ?? "member"}.
          </p>
        </div>
        <OrganizationSwitcher />
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
          <form action={inviteMember} className="space-y-3">
            <Input name="emailAddress" placeholder="Email address" required />
            <select
              name="role"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
              required
            >
              <option value="org:member">Member</option>
              <option value="org:admin">Admin</option>
            </select>
            <Button type="submit">Send invite</Button>
          </form>
          <div className="space-y-2 text-sm text-zinc-600">
            <div className="font-medium text-zinc-900">Pending invites</div>
            {invitations.length === 0 ? (
              <div>No pending invites</div>
            ) : (
              invitations.map((invite) => (
                <div key={invite.id}>
                  {invite.emailAddress} · {invite.role}
                </div>
              ))
            )}
          </div>
        </Card>

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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Token limits</h2>
          <form action={setTokenLimit} className="space-y-3">
            <select
              name="clerkUserId"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
              required
            >
              {memberships.map((membership) => (
                <option key={membership.id} value={membership.userId}>
                  {membership.identifier}
                </option>
              ))}
            </select>
            <select
              name="interval"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
              required
            >
              <option value="day">Per day</option>
              <option value="week">Per week</option>
              <option value="month">Per month</option>
            </select>
            <Input name="limitTokens" type="number" placeholder="Limit tokens" required />
            <Button type="submit">Set limit</Button>
          </form>
          <div className="space-y-2 text-sm text-zinc-600">
            <div className="font-medium text-zinc-900">Members</div>
            {memberships.map((membership) => (
              <div key={membership.id}>
                {membership.identifier} · {membership.role}
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
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Link chats to LLMs</h2>
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
        </Card>
      </div>
    </div>
  );
}

type MembershipItem = {
  id: string;
  userId: string;
  identifier: string;
  role: string;
};

type InvitationItem = {
  id: string;
  emailAddress: string;
  role: string;
};

async function fetchOrgMemberships(orgId: string): Promise<MembershipItem[]> {
  if (!process.env.CLERK_SECRET_KEY) {
    return [];
  }
  const response = await fetch(`https://api.clerk.com/v1/organizations/${orgId}/memberships`, {
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as {
    data?: Array<{
      id: string;
      role: string;
      public_user_data?: { user_id?: string; identifier?: string };
    }>;
  };
  return (
    json.data?.map((item) => ({
      id: item.id,
      userId: item.public_user_data?.user_id ?? "",
      identifier: item.public_user_data?.identifier ?? "Member",
      role: item.role,
    })) ?? []
  );
}

async function fetchOrgInvitations(orgId: string): Promise<InvitationItem[]> {
  if (!process.env.CLERK_SECRET_KEY) {
    return [];
  }
  const response = await fetch(`https://api.clerk.com/v1/organizations/${orgId}/invitations`, {
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as {
    data?: Array<{
      id: string;
      role: string;
      email_address?: string;
    }>;
  };
  return (
    json.data?.map((item) => ({
      id: item.id,
      emailAddress: item.email_address ?? "",
      role: item.role,
    })) ?? []
  );
}
