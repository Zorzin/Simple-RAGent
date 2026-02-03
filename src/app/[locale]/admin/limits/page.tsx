import Link from "next/link";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db";
import { members, tokenLimits } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { buildPageHref, getPageParams, getTotalPages } from "@/lib/pagination";
import { getSortParams } from "@/lib/sorting";

import { deleteTokenLimit } from "../actions";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string; sort?: string; dir?: string }>;
};

export default async function LimitsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page, limit, offset } = getPageParams((await searchParams).page);
  const query = (await searchParams).q?.trim() ?? "";
  const { sort, dir } = getSortParams(
    (await searchParams).sort,
    (await searchParams).dir,
    "createdAt",
  );
  const { organization } = await requireAdmin();
  const db = getDb();

  const whereClause = query
    ? and(
        eq(tokenLimits.organizationId, organization.id),
        ilike(
          sql`coalesce(${members.displayName}, ${members.email}, ${members.clerkUserId})`,
          `%${query}%`,
        ),
      )
    : eq(tokenLimits.organizationId, organization.id);

  const orderByClause =
    sort === "limitTokens"
      ? dir === "asc"
        ? asc(tokenLimits.limitTokens)
        : desc(tokenLimits.limitTokens)
      : dir === "asc"
        ? asc(tokenLimits.createdAt)
        : desc(tokenLimits.createdAt);

  const [limitRows, totalRows] = await Promise.all([
    db
      .select({
        id: tokenLimits.id,
        clerkUserId: tokenLimits.clerkUserId,
        interval: tokenLimits.interval,
        limitTokens: tokenLimits.limitTokens,
        createdAt: tokenLimits.createdAt,
        displayName: members.displayName,
        email: members.email,
      })
      .from(tokenLimits)
      .leftJoin(members, eq(members.clerkUserId, tokenLimits.clerkUserId))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tokenLimits)
      .leftJoin(members, eq(members.clerkUserId, tokenLimits.clerkUserId))
      .where(whereClause),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const totalPages = getTotalPages(total);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[{ label: "Admin", href: "/admin" }, { label: "Limits" }]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Token limits</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Define daily, weekly, or monthly caps for each member.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex gap-2" method="get">
              <Input name="q" defaultValue={query} placeholder="Search member name" />
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
            <Button asChild>
              <Link href={`/${locale}/admin/limits/new`}>New limit</Link>
            </Button>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">Existing limits</h3>
        </div>
        <div className="overflow-x-auto">
          <table data-admin-table className="w-full border-collapse text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">User</th>
                <th className="px-4 py-3 text-left font-semibold">Interval</th>
                <th className="px-4 py-3 text-left font-semibold">
                  <Link
                    className="hover:text-zinc-900"
                    href={`/${locale}/admin/limits?sort=limitTokens&dir=${
                      sort === "limitTokens" && dir === "asc" ? "desc" : "asc"
                    }${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                  >
                    Limit
                  </Link>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <Link
                    className="hover:text-zinc-900"
                    href={`/${locale}/admin/limits?sort=createdAt&dir=${
                      sort === "createdAt" && dir === "asc" ? "desc" : "asc"
                    }${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                  >
                    Created
                  </Link>
                </th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {limitRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                    No limits configured.
                  </td>
                </tr>
              ) : (
                limitRows.map((limitRow) => (
                  <tr key={limitRow.id} className="border-t border-zinc-200">
                    <td className="px-4 py-3 text-zinc-900">
                      {limitRow.displayName ?? limitRow.email ?? limitRow.clerkUserId}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{limitRow.interval}</td>
                    <td className="px-4 py-3 text-zinc-500">{limitRow.limitTokens}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {limitRow.createdAt?.toISOString?.().slice(0, 10) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/${locale}/admin/limits/${limitRow.id}/edit`}
                          className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                        >
                          Edit
                        </Link>
                        <form action={deleteTokenLimit}>
                          <input type="hidden" name="id" value={limitRow.id} />
                          <ConfirmButton
                            className="text-xs font-medium text-red-500 hover:text-red-600"
                            confirmText="Delete this limit?"
                          >
                            Delete
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
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Link
                className="rounded-md border border-zinc-200 px-2 py-1"
                href={`/${locale}${buildPageHref("/admin/limits", {
                  page: page > 1 ? String(page - 1) : undefined,
                  q: query || undefined,
                  sort,
                  dir,
                })}`}
              >
                Prev
              </Link>
              <Link
                className="rounded-md border border-zinc-200 px-2 py-1"
                href={`/${locale}${buildPageHref("/admin/limits", {
                  page: page < totalPages ? String(page + 1) : String(page),
                  q: query || undefined,
                  sort,
                  dir,
                })}`}
              >
                Next
              </Link>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
