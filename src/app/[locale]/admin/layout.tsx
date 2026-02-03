import type { ReactNode } from "react";

import AdminNav from "@/components/admin/AdminNav";

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
          <div className="sticky top-6">
            <AdminNav locale={locale} items={navItems} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
