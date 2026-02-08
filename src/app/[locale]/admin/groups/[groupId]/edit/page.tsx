import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import EditGroupForm from "@/components/admin/EditGroupForm";
import { getDb } from "@/db";
import { groupMembers, groups, members } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

import { deleteGroup, updateGroup } from "../../../actions";

type Props = {
  params: Promise<{ locale: string; groupId: string }>;
};

export default async function EditGroupPage({ params }: Props) {
  const { locale, groupId } = await params;
  const t = await getTranslations({ locale, namespace: "admin.groupsEdit" });
  const { organization } = await requireAdmin();
  const db = getDb();
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);

  if (!group) {
    notFound();
  }

  const [memberRows, groupMemberRows] = await Promise.all([
    db.select().from(members).where(eq(members.organizationId, organization.id)),
    db
      .select({ memberId: groupMembers.memberId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id)),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t("breadcrumbs.admin"), href: "/admin" },
          { label: t("breadcrumbs.groups"), href: "/admin/groups" },
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
            <Link href={`/${locale}/admin/groups`}>{t("back")}</Link>
          </Button>
        </div>
      </div>

      <EditGroupForm
        locale={locale}
        groupId={group.id}
        groupName={group.name}
        action={updateGroup}
        deleteAction={deleteGroup}
        memberRows={memberRows.map((m) => ({
          id: m.id,
          displayName: m.displayName,
          email: m.email,
          userId: m.userId,
        }))}
        selectedMemberIds={groupMemberRows.map((row) => row.memberId)}
      />
    </div>
  );
}
