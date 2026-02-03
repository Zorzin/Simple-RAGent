import Link from "next/link";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db";
import { files } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { buildPageHref, getPageParams, getTotalPages } from "@/lib/pagination";
import { getSortParams } from "@/lib/sorting";

import { deleteFile } from "../actions";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string; sort?: string; dir?: string }>;
};

export default async function FilesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page, limit, offset } = getPageParams((await searchParams).page);
  const query = (await searchParams).q?.trim() ?? "";
  const { sort, dir } = getSortParams((await searchParams).sort, (await searchParams).dir, "name");
  const { organization } = await requireAdmin();
  const db = getDb();

  const whereClause = query
    ? and(eq(files.organizationId, organization.id), ilike(files.name, `%${query}%`))
    : eq(files.organizationId, organization.id);

  const orderByClause =
    sort === "createdAt"
      ? dir === "asc"
        ? asc(files.createdAt)
        : desc(files.createdAt)
      : dir === "asc"
        ? asc(files.name)
        : desc(files.name);

  const [rows, totalRows] = await Promise.all([
    db.select().from(files).where(whereClause).orderBy(orderByClause).limit(limit).offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(whereClause),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const totalPages = getTotalPages(total);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[{ label: "Admin", href: "/admin" }, { label: "Files" }]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Files</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Upload files that will be used for chat context and retrieval.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex gap-2" method="get">
              <Input name="q" defaultValue={query} placeholder="Search files" />
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
            <Button asChild>
              <Link href={`/${locale}/admin/files/new`}>New file</Link>
            </Button>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">Files list</h3>
        </div>
        <div className="overflow-x-auto">
          <table data-admin-table className="w-full border-collapse text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">
                  <Link
                    className="hover:text-zinc-900"
                    href={`/${locale}/admin/files?sort=name&dir=${
                      sort === "name" && dir === "asc" ? "desc" : "asc"
                    }${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                  >
                    Name
                  </Link>
                </th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">
                  <Link
                    className="hover:text-zinc-900"
                    href={`/${locale}/admin/files?sort=createdAt&dir=${
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
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={4}>
                    No files uploaded.
                  </td>
                </tr>
              ) : (
                rows.map((file) => (
                  <tr key={file.id} className="border-t border-zinc-200">
                    <td className="px-4 py-3 text-zinc-900">{file.name}</td>
                    <td className="px-4 py-3 text-zinc-500">{file.mimeType ?? "unknown"}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {file.createdAt?.toISOString?.().slice(0, 10) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/${locale}/admin/files/${file.id}/edit`}
                          className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                        >
                          Edit
                        </Link>
                        <form action={deleteFile}>
                          <input type="hidden" name="id" value={file.id} />
                          <ConfirmButton
                            className="text-xs font-medium text-red-500 hover:text-red-600"
                            confirmText="Delete this file?"
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
                href={`/${locale}${buildPageHref("/admin/files", {
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
                href={`/${locale}${buildPageHref("/admin/files", {
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
