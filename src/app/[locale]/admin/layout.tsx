import Link from "next/link";

import type { ReactNode } from "react";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/chats", label: "Chats" },
  { href: "/admin/files", label: "Files" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/connectors", label: "Connectors" },
  { href: "/admin/limits", label: "Limits" },
  { href: "/admin/access", label: "Access" },
];

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="flex w-full items-center justify-between px-10 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
              SR
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900">Admin Panel</div>
              <div className="text-xs text-zinc-500">Manage your company workspace</div>
            </div>
          </div>
          <div className="text-xs text-zinc-500">Single organization mode</div>
        </div>
      </header>

      <div className="flex w-full gap-6 px-10 py-6">
        <aside className="w-60 shrink-0">
          <nav className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={`/${locale}${item.href}`}
                className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
