"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ConnectorFields from "@/components/admin/ConnectorFields";

import type { createConnector } from "@/app/[locale]/admin/actions";

type ActionResult = Awaited<ReturnType<typeof createConnector>>;

const initialState: ActionResult = { ok: false, error: "" };

type Props = {
  locale: string;
  action: (formData: FormData) => Promise<ActionResult>;
};

export default function CreateConnectorForm({ locale, action }: Props) {
  const t = useTranslations("admin.connectorsNew");
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
            <Link href={`/${locale}/admin/connectors`}>{t("backToList")}</Link>
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
        <ConnectorFields />
        {state?.ok === false && state?.error ? (
          <p className="text-sm text-red-500">{state.error}</p>
        ) : null}
        <Button type="submit">{t("submit")}</Button>
      </form>
    </Card>
  );
}
