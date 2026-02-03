"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Params = { locale?: string };

export default function AdminError({ error }: { error: Error }) {
  const params = useParams<Params>();
  const locale = params?.locale ?? "en";
  const t = useTranslations("admin.error");
  const message = error?.message ?? "";
  const isAccessError =
    message.toLowerCase().includes("forbidden") ||
    message.toLowerCase().includes("unauthorized") ||
    message.toLowerCase().includes("access");

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {isAccessError ? t("accessTitle") : t("genericTitle")}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {isAccessError ? t("accessDescription") : t("genericDescription")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAccessError ? (
            <Button asChild>
              <Link href={`/${locale}/sign-in`}>{t("signIn")}</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/${locale}/app`}>{t("goToWorkspace")}</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
