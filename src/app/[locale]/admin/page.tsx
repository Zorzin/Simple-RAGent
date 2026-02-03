import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminOverview({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.overview" });
  const { member } = await requireAdmin();
  const quickLinks = [
    { href: "/admin/chats", title: t("links.chats.title"), description: t("links.chats.desc") },
    { href: "/admin/files", title: t("links.files.title"), description: t("links.files.desc") },
    { href: "/admin/groups", title: t("links.groups.title"), description: t("links.groups.desc") },
    { href: "/admin/members", title: t("links.members.title"), description: t("links.members.desc") },
    {
      href: "/admin/connectors",
      title: t("links.connectors.title"),
      description: t("links.connectors.desc"),
    },
    { href: "/admin/limits", title: t("links.limits.title"), description: t("links.limits.desc") },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t("welcome", { name: member.displayName ?? member.email ?? t("fallbackName") })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {quickLinks.map((item) => (
          <Link key={item.href} href={`/${locale}${item.href}`}>
            <Card className="h-full space-y-2 border-zinc-200 p-5 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md">
              <div className="text-base font-semibold text-zinc-900">{item.title}</div>
              <div className="text-sm text-zinc-600">{item.description}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
