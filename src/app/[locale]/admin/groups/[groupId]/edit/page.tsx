import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db";
import { groups } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

import { deleteGroup, updateGroup } from "../../../actions";

type Props = {
  params: Promise<{ locale: string; groupId: string }>;
};

export default async function EditGroupPage({ params }: Props) {
  const { locale, groupId } = await params;
  await requireAdmin();
  const db = getDb();
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);

  if (!group) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Groups", href: "/admin/groups" },
          { label: "Edit" },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Edit group</h1>
            <p className="mt-2 text-sm text-zinc-600">Update group details.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/groups`}>Back</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <form action={updateGroup} className="space-y-3">
          <input type="hidden" name="id" value={group.id} />
          <Input name="name" defaultValue={group.name} required />
          <div className="flex items-center gap-2">
            <Button type="submit">Save changes</Button>
            <Button formAction={deleteGroup} type="submit" variant="destructive">
              Delete group
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
