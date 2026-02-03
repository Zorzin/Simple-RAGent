import Link from "next/link";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import InviteMemberForm from "@/components/admin/InviteMemberForm";
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

      <InviteMemberForm locale={locale} action={inviteMember} />
    </div>
  );
}
