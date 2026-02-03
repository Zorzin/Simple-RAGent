import Link from "next/link";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { eq } from "drizzle-orm";

import { createGroup } from "../../actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewGroupPage({ params }: Props) {
  const { locale } = await params;
  const { organization } = await requireAdmin();
  const db = getDb();
  const memberRows = await db
    .select()
    .from(members)
    .where(eq(members.organizationId, organization.id));

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Groups", href: "/admin/groups" },
          { label: "New" },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">New group</h1>
            <p className="mt-2 text-sm text-zinc-600">Create a new member group.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/groups`}>Back</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <form action={createGroup} className="space-y-4">
          <Input name="name" placeholder="Group name" required />
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-500">Assign members</div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
              {memberRows.length === 0 ? (
                <div className="text-zinc-500">No members yet.</div>
              ) : (
                memberRows.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 py-1">
                    <input type="checkbox" name="memberIds" value={member.id} />
                    <span className="text-zinc-700">
                      {member.displayName ?? member.email ?? member.clerkUserId}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          <Button type="submit">Create group</Button>
        </form>
      </Card>
    </div>
  );
}
