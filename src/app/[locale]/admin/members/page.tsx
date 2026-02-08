import Link from "next/link";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/admin";
import { fetchOrgInvitations, fetchOrgMemberships } from "@/lib/org-members";
import { buildPageHref, getPageParams, getTotalPages } from "@/lib/pagination";

import { deleteMemberRole, resendInvitation, revokeInvitation } from "../actions";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function MembersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.members" });
  const { page, limit, offset } = getPageParams((await searchParams).page);
  const query = (await searchParams).q?.trim().toLowerCase() ?? "";
  const { organization } = await requireAdmin();

  const [memberships, invitations] = await Promise.all([
    fetchOrgMemberships(organization.id),
    fetchOrgInvitations(organization.id),
  ]);

  const filteredMembers = query
    ? memberships.filter((member) => member.identifier.toLowerCase().includes(query))
    : memberships;

  const totalPages = getTotalPages(filteredMembers.length);
  const pagedMembers = filteredMembers.slice(offset, offset + limit);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[{ label: t("breadcrumbs.admin"), href: "/admin" }, { label: t("title") }]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{t("title")}</h1>
            <p className="mt-2 text-sm text-zinc-600">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex gap-2" method="get">
              <Input name="q" defaultValue={query} placeholder={t("searchPlaceholder")} />
              <Button type="submit" variant="outline">
                {t("search")}
              </Button>
            </form>
            <Button asChild>
              <Link href={`/${locale}/admin/members/invite`}>{t("invite")}</Link>
            </Button>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">{t("listTitle")}</h3>
        </div>
        <div className="overflow-x-auto">
          <table data-admin-table className="w-full border-collapse text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t("columns.member")}</th>
                <th className="px-4 py-3 text-left font-semibold">{t("columns.role")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {pagedMembers.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={3}>
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                pagedMembers.map((membership) => (
                  <tr key={membership.id} className="border-t border-zinc-200">
                    <td className="px-4 py-3 text-zinc-900">
                      {membership.identifier || t("anonymous")}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {membership.role === "admin" ? t("roles.admin") : t("roles.member")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/${locale}/admin/members/${membership.id}/edit`}
                          className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                        >
                          {t("actions.edit")}
                        </Link>
                        <form action={deleteMemberRole}>
                          <input type="hidden" name="membershipId" value={membership.id} />
                          <ConfirmButton
                            className="text-xs font-medium text-red-500 hover:text-red-600"
                            confirmText={t("actions.confirmRemove")}
                          >
                            {t("actions.remove")}
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-3 text-xs text-zinc-500">
            <span>{t("pagination.pageOf", { page, totalPages })}</span>
            <div className="flex items-center gap-2">
              <Link
                className="rounded-md border border-zinc-200 px-2 py-1"
                href={`/${locale}${buildPageHref("/admin/members", {
                  page: page > 1 ? String(page - 1) : undefined,
                  q: query || undefined,
                })}`}
              >
                {t("pagination.prev")}
              </Link>
              <Link
                className="rounded-md border border-zinc-200 px-2 py-1"
                href={`/${locale}${buildPageHref("/admin/members", {
                  page: page < totalPages ? String(page + 1) : String(page),
                  q: query || undefined,
                })}`}
              >
                {t("pagination.next")}
              </Link>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">{t("pendingTitle")}</h3>
        </div>
        <div className="space-y-2 px-6 py-4 text-sm text-zinc-600">
          {invitations.length === 0 ? (
            <div>{t("pendingEmpty")}</div>
          ) : (
            invitations.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-zinc-900">{invite.emailAddress}</div>
                  <div className="text-xs text-zinc-500">
                    {invite.role === "admin" ? t("roles.admin") : t("roles.member")}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span>{t("pendingStatus")}</span>
                  <form action={resendInvitation}>
                    <input type="hidden" name="invitationId" value={invite.id} />
                    <input type="hidden" name="emailAddress" value={invite.emailAddress} />
                    <input type="hidden" name="role" value={invite.role} />
                    <input type="hidden" name="locale" value={locale} />
                    <ConfirmButton
                      className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                      confirmText={t("actions.confirmResend")}
                    >
                      {t("actions.resend")}
                    </ConfirmButton>
                  </form>
                  <form action={revokeInvitation}>
                    <input type="hidden" name="invitationId" value={invite.id} />
                    <ConfirmButton
                      className="text-xs font-medium text-red-500 hover:text-red-600"
                      confirmText={t("actions.confirmRevoke")}
                    >
                      {t("actions.revoke")}
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
