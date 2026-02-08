"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { setTokenLimit } from "@/app/[locale]/admin/actions";

type ActionResult = Awaited<ReturnType<typeof setTokenLimit>>;

const initialState: ActionResult = { ok: false, error: "" };

type MembershipRow = {
  id: string;
  displayName: string | null;
  email: string | null;
};

type Props = {
  locale: string;
  action: (formData: FormData) => Promise<ActionResult>;
  memberships: MembershipRow[];
};

export default function CreateLimitForm({ locale, action, memberships }: Props) {
  const t = useTranslations("admin.limitsNew");
  const [state, formAction] = useActionState(
    async (_prevState: ActionResult, formData: FormData) => action(formData),
    initialState,
  );
  const [formKey, setFormKey] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const showSuccess = Boolean(state?.ok) && !dismissed;

  if (showSuccess) {
    return (
      <Card className="space-y-4 p-6" key={`success-${formKey}`}>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{t("successTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t("successMessage")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              setFormKey((prev) => prev + 1);
              setDismissed(true);
            }}
          >
            {t("createAnother")}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/limits`}>{t("backToList")}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-6">
      <form
        action={formAction}
        key={formKey}
        className="space-y-3"
        onSubmit={() => setDismissed(false)}
      >
        <select
          name="memberId"
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
          required
        >
          {memberships.map((membership) => (
            <option key={membership.id} value={membership.id}>
              {membership.displayName ?? membership.email ?? t("anonymous")}
            </option>
          ))}
        </select>
        <select
          name="interval"
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
          required
        >
          <option value="day">{t("interval.day")}</option>
          <option value="week">{t("interval.week")}</option>
          <option value="month">{t("interval.month")}</option>
        </select>
        <Input name="limitTokens" type="number" placeholder={t("limitPlaceholder")} required />
        {state?.ok === false && state?.error ? (
          <p className="text-sm text-red-500">{state.error}</p>
        ) : null}
        <Button type="submit">{t("submit")}</Button>
      </form>
    </Card>
  );
}
