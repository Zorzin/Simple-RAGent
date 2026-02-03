import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";

const quickLinks = [
  { href: "/admin/chats", title: "Chats", description: "Create and organize chat rooms." },
  { href: "/admin/files", title: "Files", description: "Upload and manage knowledge files." },
  { href: "/admin/groups", title: "Groups", description: "Control member access by groups." },
  { href: "/admin/members", title: "Members", description: "Invite and manage membership roles." },
  {
    href: "/admin/connectors",
    title: "Connectors",
    description: "Configure Claude, OpenAI, Copilot.",
  },
  { href: "/admin/limits", title: "Limits", description: "Set daily, weekly, monthly usage caps." },
  { href: "/admin/access", title: "Access", description: "Link chats to files, groups, models." },
];

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminOverview({ params }: Props) {
  const t = await getTranslations("home");
  const { locale } = await params;
  const { member } = await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("ctaSecondary")}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Welcome back, {member.displayName ?? member.email ?? "admin"}. Select a section to manage
          your workspace.
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
