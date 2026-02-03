import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/admin";
import { fetchOrgInvitations, fetchOrgMemberships } from "@/lib/clerk-org";
import { buildPageHref, getPageParams, getTotalPages } from "@/lib/pagination";

import { deleteMemberRole } from "../actions";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function MembersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page, limit, offset } = getPageParams((await searchParams).page);
  const query = (await searchParams).q?.trim().toLowerCase() ?? "";
  await requireAdmin();
  const { orgId } = await auth();

  const [memberships, invitations] = await Promise.all([
    orgId ? fetchOrgMemberships(orgId) : Promise.resolve([]),
    orgId ? fetchOrgInvitations(orgId) : Promise.resolve([]),
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
        items={[{ label: "Admin", href: "/admin" }, { label: "Members" }]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Members</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Invite teammates and manage their organization role.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex gap-2" method="get">
              <Input name="q" defaultValue={query} placeholder="Search members" />
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
            <Button asChild>
              <Link href={`/${locale}/admin/members/invite`}>Invite member</Link>
            </Button>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">Members list</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Member</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedMembers.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={3}>
                    No members yet.
                  </td>
                </tr>
              ) : (
                pagedMembers.map((membership) => (
                  <tr key={membership.id} className="border-t border-zinc-200">
                    <td className="px-4 py-3 text-zinc-900">{membership.identifier}</td>
                    <td className="px-4 py-3 text-zinc-500">{membership.role}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/${locale}/admin/members/${membership.id}/edit`}
                          className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                        >
                          Edit
                        </Link>
                        <form action={deleteMemberRole}>
                          <input type="hidden" name="membershipId" value={membership.id} />
                          <ConfirmButton
                            className="text-xs font-medium text-red-500 hover:text-red-600"
                            confirmText="Remove this member?"
                          >
                            Remove
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
        <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-3 text-xs text-zinc-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Link
              className="rounded-md border border-zinc-200 px-2 py-1"
              href={`/${locale}${buildPageHref("/admin/members", {
                page: page > 1 ? String(page - 1) : undefined,
                q: query || undefined,
              })}`}
            >
              Prev
            </Link>
            <Link
              className="rounded-md border border-zinc-200 px-2 py-1"
              href={`/${locale}${buildPageHref("/admin/members", {
                page: page < totalPages ? String(page + 1) : String(page),
                q: query || undefined,
              })}`}
            >
              Next
            </Link>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">Pending invitations</h3>
        </div>
        <div className="space-y-2 px-6 py-4 text-sm text-zinc-600">
          {invitations.length === 0 ? (
            <div>No pending invites.</div>
          ) : (
            invitations.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-zinc-900">{invite.emailAddress}</div>
                  <div className="text-xs text-zinc-500">{invite.role}</div>
                </div>
                <div className="text-xs text-zinc-400">Pending</div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
