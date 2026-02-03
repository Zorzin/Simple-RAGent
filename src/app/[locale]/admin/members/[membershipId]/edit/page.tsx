import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { fetchOrgMemberships } from "@/lib/clerk-org";

import { deleteMemberRole, updateMemberRole } from "../../../actions";

type Props = {
  params: Promise<{ locale: string; membershipId: string }>;
};

export default async function EditMemberPage({ params }: Props) {
  const { locale, membershipId } = await params;
  await requireAdmin();
  const { orgId } = await auth();
  const memberships = orgId ? await fetchOrgMemberships(orgId) : [];
  const member = memberships.find((item) => item.id === membershipId);

  if (!member) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Member not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Members", href: "/admin/members" },
          { label: "Edit" },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Edit member</h1>
            <p className="mt-2 text-sm text-zinc-600">Update member role.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/members`}>Back</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <div>
          <div className="text-sm font-medium text-zinc-900">{member.identifier}</div>
          <div className="text-xs text-zinc-500">{member.userId}</div>
        </div>
        <form action={updateMemberRole} className="space-y-3">
          <input type="hidden" name="membershipId" value={member.id} />
          <select
            name="role"
            defaultValue={member.role}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
          >
            <option value="org:member">Member</option>
            <option value="org:admin">Admin</option>
          </select>
          <div className="flex items-center gap-2">
            <Button type="submit">Update role</Button>
            <Button formAction={deleteMemberRole} type="submit" variant="destructive">
              Remove member
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
