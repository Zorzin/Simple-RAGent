import Link from "next/link";
import { getTranslations } from "next-intl/server";

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
  const t = await getTranslations({ locale, namespace: "admin.membersInvite" });
  await requireAdmin();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t("breadcrumbs.admin"), href: "/admin" },
          { label: t("breadcrumbs.members"), href: "/admin/members" },
          { label: t("breadcrumbs.invite") },
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

      <InviteMemberForm locale={locale} action={inviteMember} />
    </div>
  );
}
