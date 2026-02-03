import Link from "next/link";

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
          { label: "Admin", href: "/admin" },
          { label: "Chats", href: "/admin/chats" },
          { label: "New" },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">New chat</h1>
            <p className="mt-2 text-sm text-zinc-600">Create a new chat room.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/chats`}>Back</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <form action={createChat} className="space-y-4">
          <Input name="name" placeholder="Chat name" required />
          <Textarea name="description" placeholder="Description (optional)" />
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-500">Assign groups</div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
              {groupRows.length === 0 ? (
                <div className="text-zinc-500">No groups yet.</div>
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
            <div className="text-xs font-semibold text-zinc-500">Assign files</div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
              {fileRows.length === 0 ? (
                <div className="text-zinc-500">No files yet.</div>
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
            <div className="text-xs font-semibold text-zinc-500">Connector</div>
            <select
              name="connectorId"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
            >
              <option value="">No connector</option>
              {connectorRows.map((connector) => (
                <option key={connector.id} value={connector.id}>
                  {connector.name} ({connector.provider})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">Daily limit</label>
              <Input name="limitDay" type="number" min="0" placeholder="e.g. 20000" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">Weekly limit</label>
              <Input name="limitWeek" type="number" min="0" placeholder="e.g. 80000" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500">Monthly limit</label>
              <Input name="limitMonth" type="number" min="0" placeholder="e.g. 250000" />
            </div>
          </div>
          <Button type="submit">Create chat</Button>
        </form>
      </Card>
    </div>
  );
}
