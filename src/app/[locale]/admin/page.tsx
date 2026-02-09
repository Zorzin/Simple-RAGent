import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { getDashboardStats } from "@/lib/dashboard-stats";

type Props = {
  params: Promise<{ locale: string }>;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export default async function AdminOverview({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.overview" });
  const { member, organization } = await requireAdmin();
  const stats = await getDashboardStats(organization.id);

  const quickLinks = [
    { href: "/admin/chats", title: t("links.chats.title"), description: t("links.chats.desc") },
    { href: "/admin/files", title: t("links.files.title"), description: t("links.files.desc") },
    { href: "/admin/groups", title: t("links.groups.title"), description: t("links.groups.desc") },
    {
      href: "/admin/members",
      title: t("links.members.title"),
      description: t("links.members.desc"),
    },
    {
      href: "/admin/connectors",
      title: t("links.connectors.title"),
      description: t("links.connectors.desc"),
    },
    { href: "/admin/limits", title: t("links.limits.title"), description: t("links.limits.desc") },
  ];

  const statCards = [
    { label: t("stats.chats"), value: formatNumber(stats.totalChats) },
    { label: t("stats.members"), value: formatNumber(stats.totalMembers) },
    { label: t("stats.totalTokens"), value: formatNumber(stats.totalTokens) },
    { label: t("stats.activeUsers"), value: formatNumber(stats.activeMembers7d) },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {t("welcome", { name: member.displayName ?? member.email ?? t("fallbackName") })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="space-y-1 border-zinc-200 p-5">
            <div className="text-sm text-zinc-500">{card.label}</div>
            <div className="text-2xl font-semibold text-zinc-900">{card.value}</div>
          </Card>
        ))}
      </div>

      {/* File statistics + Activity */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-3 border-zinc-200 p-5">
          <div className="text-sm font-semibold text-zinc-900">{t("stats.filesTitle")}</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-zinc-500">{t("stats.fileCount")}</div>
              <div className="text-lg font-semibold text-zinc-900">
                {formatNumber(stats.fileStats.fileCount)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">{t("stats.totalSize")}</div>
              <div className="text-lg font-semibold text-zinc-900">
                {formatBytes(stats.fileStats.totalSizeBytes)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">{t("stats.chunkCount")}</div>
              <div className="text-lg font-semibold text-zinc-900">
                {formatNumber(stats.fileStats.chunkCount)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-3 border-zinc-200 p-5">
          <div className="text-sm font-semibold text-zinc-900">{t("stats.activityTitle")}</div>
          <div className="text-xs text-zinc-400">{t("stats.last7days")}</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-500">{t("stats.activeMembers")}</div>
              <div className="text-lg font-semibold text-zinc-900">
                {formatNumber(stats.activeMembers7d)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">{t("stats.activeSessions")}</div>
              <div className="text-lg font-semibold text-zinc-900">
                {formatNumber(stats.activeSessions7d)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Token usage tables */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Tokens per Chat */}
        <Card className="overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-zinc-900">{t("stats.tokensByChat")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table data-admin-table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">{t("stats.columns.name")}</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    {t("stats.columns.tokens")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.tokensPerChat.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-zinc-500" colSpan={3}>
                      {t("stats.noData")}
                    </td>
                  </tr>
                ) : (
                  stats.tokensPerChat.map((row, i) => (
                    <tr key={row.id} className="border-t border-zinc-200">
                      <td className="px-4 py-3 text-zinc-400">{i + 1}</td>
                      <td className="px-4 py-3 text-zinc-900">{row.name}</td>
                      <td className="px-4 py-3 text-right text-zinc-500">
                        {formatNumber(row.tokens)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Tokens per User */}
        <Card className="overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-zinc-900">{t("stats.tokensByUser")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table data-admin-table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">{t("stats.columns.user")}</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    {t("stats.columns.tokens")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.tokensPerUser.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-zinc-500" colSpan={3}>
                      {t("stats.noData")}
                    </td>
                  </tr>
                ) : (
                  stats.tokensPerUser.map((row, i) => (
                    <tr key={row.id} className="border-t border-zinc-200">
                      <td className="px-4 py-3 text-zinc-400">{i + 1}</td>
                      <td className="px-4 py-3 text-zinc-900">
                        {row.name || t("stats.anonymous")}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500">
                        {formatNumber(row.tokens)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Tokens per Group */}
        <Card className="overflow-hidden">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-zinc-900">{t("stats.tokensByGroup")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table data-admin-table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">{t("stats.columns.group")}</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    {t("stats.columns.tokens")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.tokensPerGroup.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-zinc-500" colSpan={3}>
                      {t("stats.noData")}
                    </td>
                  </tr>
                ) : (
                  stats.tokensPerGroup.map((row, i) => (
                    <tr key={row.id} className="border-t border-zinc-200">
                      <td className="px-4 py-3 text-zinc-400">{i + 1}</td>
                      <td className="px-4 py-3 text-zinc-900">{row.name}</td>
                      <td className="px-4 py-3 text-right text-zinc-500">
                        {formatNumber(row.tokens)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Quick Links */}
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
