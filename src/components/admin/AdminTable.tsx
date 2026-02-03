import Link from "next/link";

import { SortDir, toggleDir } from "@/lib/sorting";

type Column = {
  key: string;
  label: string;
};

type Props = {
  locale: string;
  basePath: string;
  columns: Column[];
  sort: string;
  dir: SortDir;
  query?: string;
};

export default function AdminTableHeader({ locale, basePath, columns, sort, dir, query }: Props) {
  return (
    <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
      <tr>
        {columns.map((column) => {
          const isActive = sort === column.key;
          const nextDir = isActive ? toggleDir(dir) : "asc";
          const queryParam = query ? `&q=${encodeURIComponent(query)}` : "";

          return (
            <th key={column.key} className="px-4 py-3 text-left font-semibold">
              <Link
                className="inline-flex items-center gap-1 hover:text-zinc-900"
                href={`/${locale}${basePath}?sort=${column.key}&dir=${nextDir}${queryParam}`}
              >
                {column.label}
                {isActive ? <span className="text-zinc-400">({dir})</span> : null}
              </Link>
            </th>
          );
        })}
        <th className="px-4 py-3 text-right font-semibold">Actions</th>
      </tr>
    </thead>
  );
}
