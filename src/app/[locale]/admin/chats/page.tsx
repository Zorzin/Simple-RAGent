import Link from "next/link";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db";
import { chats } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { buildPageHref, getPageParams, getTotalPages } from "@/lib/pagination";
import { getSortParams } from "@/lib/sorting";

import { deleteChat } from "../actions";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string; sort?: string; dir?: string }>;
};

export default async function ChatsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.chats" });
  const { page, limit, offset } = getPageParams((await searchParams).page);
  const query = (await searchParams).q?.trim() ?? "";
  const { sort, dir } = getSortParams((await searchParams).sort, (await searchParams).dir, "name");
  const { organization } = await requireAdmin();
  const db = getDb();

  const whereClause = query
    ? and(eq(chats.organizationId, organization.id), ilike(chats.name, `%${query}%`))
    : eq(chats.organizationId, organization.id);

  const orderByClause =
    sort === "createdAt"
      ? dir === "asc"
        ? asc(chats.createdAt)
        : desc(chats.createdAt)
      : dir === "asc"
        ? asc(chats.name)
        : desc(chats.name);

  const [rows, totalRows] = await Promise.all([
    db.select().from(chats).where(whereClause).orderBy(orderByClause).limit(limit).offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(chats)
      .where(whereClause),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const totalPages = getTotalPages(total);

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
            <p className="mt-2 text-sm text-zinc-600">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex gap-2" method="get">
              <Input name="q" defaultValue={query} placeholder={t("searchPlaceholder")} />
              <Button type="submit" variant="outline">
                {t("search")}
              </Button>
            </form>
            <Button asChild>
              <Link href={`/${locale}/admin/chats/new`}>{t("new")}</Link>
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
                <th className="px-4 py-3 text-left font-semibold">
                  <Link
                    className="hover:text-zinc-900"
                    href={`/${locale}/admin/chats?sort=name&dir=${
                      sort === "name" && dir === "asc" ? "desc" : "asc"
                    }${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                  >
                    {t("columns.name")}
                  </Link>
                </th>
                <th className="px-4 py-3 text-left font-semibold">{t("columns.description")}</th>
                <th className="px-4 py-3 text-left font-semibold">
                  <Link
                    className="hover:text-zinc-900"
                    href={`/${locale}/admin/chats?sort=createdAt&dir=${
                      sort === "createdAt" && dir === "asc" ? "desc" : "asc"
                    }${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                  >
                    {t("columns.created")}
                  </Link>
                </th>
                <th className="px-4 py-3 text-right font-semibold">{t("columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={4}>
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                rows.map((chat) => (
                  <tr key={chat.id} className="border-t border-zinc-200">
                    <td className="px-4 py-3 text-zinc-900">{chat.name}</td>
                    <td className="px-4 py-3 text-zinc-500">{chat.description ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {chat.createdAt?.toISOString?.().slice(0, 10) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/${locale}/admin/chats/${chat.id}/edit`}
                          className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                        >
                          {t("actions.edit")}
                        </Link>
                        <form action={deleteChat}>
                          <input type="hidden" name="id" value={chat.id} />
                          <ConfirmButton
                            className="text-xs font-medium text-red-500 hover:text-red-600"
                            confirmText={t("actions.confirmDelete")}
                          >
                            {t("actions.delete")}
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
              {t("pagination.pageOf", { page, totalPages })}
            </span>
            <div className="flex items-center gap-2">
              <Link
                className="rounded-md border border-zinc-200 px-2 py-1"
                href={`/${locale}${buildPageHref("/admin/chats", {
                  page: page > 1 ? String(page - 1) : undefined,
                  q: query || undefined,
                  sort,
                  dir,
                })}`}
              >
                {t("pagination.prev")}
              </Link>
              <Link
                className="rounded-md border border-zinc-200 px-2 py-1"
                href={`/${locale}${buildPageHref("/admin/chats", {
                  page: page < totalPages ? String(page + 1) : String(page),
                  q: query || undefined,
                  sort,
                  dir,
                })}`}
              >
                {t("pagination.next")}
              </Link>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
