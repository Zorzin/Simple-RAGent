import Link from "next/link";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import EditMemberForm from "@/components/admin/EditMemberForm";
import { requireAdmin } from "@/lib/admin";
import { fetchOrgMemberships } from "@/lib/org-members";

import { deleteMemberRole, updateMemberRole } from "../../../actions";

type Props = {
  params: Promise<{ locale: string; membershipId: string }>;
};

export default async function EditMemberPage({ params }: Props) {
  const { locale, membershipId } = await params;
  const t = await getTranslations({ locale, namespace: "admin.membersEdit" });
  const { organization } = await requireAdmin();
  const memberships = await fetchOrgMemberships(organization.id);
  const member = memberships.find((item) => item.id === membershipId);

  if (!member) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">{t("notFound")}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t("breadcrumbs.admin"), href: "/admin" },
          { label: t("breadcrumbs.members"), href: "/admin/members" },
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
            <Link href={`/${locale}/admin/members`}>{t("back")}</Link>
          </Button>
        </div>
      </div>

      <EditMemberForm
        locale={locale}
        membershipId={member.id}
        identifier={member.identifier || ""}
        userId={member.userId}
        currentRole={member.role}
        action={updateMemberRole}
        deleteAction={deleteMemberRole}
      />
    </div>
  );
}
