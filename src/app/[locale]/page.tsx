import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
              SR
            </div>
            <div className="text-lg font-semibold text-zinc-900">Simple Ragent</div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link className="text-zinc-600 hover:text-zinc-900" href="/en">
              EN
            </Link>
            <span className="text-zinc-300">/</span>
            <Link className="text-zinc-600 hover:text-zinc-900" href="/pl">
              PL
            </Link>
          </div>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-6">
            <Badge className="w-fit" variant="secondary">
              Private company AI chat
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight text-zinc-900 md:text-5xl">
              {t("title")}
            </h1>
            <p className="text-lg text-zinc-600 md:text-xl">{t("subtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={`/${locale}/app`}>{t("ctaPrimary")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`/${locale}/admin`}>{t("ctaSecondary")}</Link>
              </Button>
            </div>
          </div>

          <Card className="flex flex-col gap-4 border-zinc-200/70 bg-white/80 p-6 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">{t("sectionTitle")}</div>
            <ul className="space-y-3 text-sm text-zinc-600">
              <li>{t("feature1")}</li>
              <li>{t("feature2")}</li>
              <li>{t("feature3")}</li>
              <li>{t("feature4")}</li>
            </ul>
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
              {t("comingSoon")}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
