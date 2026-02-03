import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import AdminNav from "@/components/admin/AdminNav";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.layout" });
  const navItems = [
    { href: "/admin", label: t("nav.overview") },
    { href: "/admin/chats", label: t("nav.chats") },
    { href: "/admin/files", label: t("nav.files") },
    { href: "/admin/groups", label: t("nav.groups") },
    { href: "/admin/members", label: t("nav.members") },
    { href: "/admin/connectors", label: t("nav.connectors") },
    { href: "/admin/limits", label: t("nav.limits") },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="flex w-full items-center justify-between px-10 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
              SR
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900">{t("title")}</div>
              <div className="text-xs text-zinc-500">{t("subtitle")}</div>
            </div>
          </div>
          <div className="text-xs text-zinc-500">{t("singleOrg")}</div>
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
