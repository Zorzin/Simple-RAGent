import Link from "next/link";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/admin";

import { inviteMember } from "../../actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function InviteMemberPage({ params }: Props) {
  const { locale } = await params;
  await requireAdmin();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Members", href: "/admin/members" },
          { label: "Invite" },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Invite member</h1>
            <p className="mt-2 text-sm text-zinc-600">Send an organization invite.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/members`}>Back</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
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
      </Card>
    </div>
  );
}
