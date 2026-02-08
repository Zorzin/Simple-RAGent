"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ConnectorFields from "@/components/admin/ConnectorFields";

import type { updateConnector } from "@/app/[locale]/admin/actions";

type ActionResult = Awaited<ReturnType<typeof updateConnector>>;

const initialState: ActionResult = { ok: false, error: "" };

type Props = {
  locale: string;
  connectorId: string;
  initialName: string;
  initialProvider: string;
  initialModel: string;
  initialAzureEndpoint: string | null;
  initialAzureApiVersion: string | null;
  action: (formData: FormData) => Promise<ActionResult>;
  deleteAction: (formData: FormData) => Promise<void>;
};

export default function EditConnectorForm({
  locale,
  connectorId,
  initialName,
  initialProvider,
  initialModel,
  initialAzureEndpoint,
  initialAzureApiVersion,
  action,
  deleteAction,
}: Props) {
  const t = useTranslations("admin.connectorsEdit");
  const [state, formAction] = useActionState(
    async (_prevState: ActionResult, formData: FormData) => action(formData),
    initialState,
  );
  const [dismissed, setDismissed] = useState(false);
  const showSuccess = Boolean(state?.ok) && !dismissed;

  if (showSuccess) {
    return (
      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{t("successTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t("successMessage")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/connectors`}>{t("backToList")}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-6">
      <form action={formAction} className="space-y-3" onSubmit={() => setDismissed(false)}>
        <input type="hidden" name="id" value={connectorId} />
        <ConnectorFields
          initialName={initialName}
          initialProvider={initialProvider}
          initialModel={initialModel}
          initialAzureEndpoint={initialAzureEndpoint}
          initialAzureApiVersion={initialAzureApiVersion}
        />
        {state?.ok === false && state?.error ? (
          <p className="text-sm text-red-500">{state.error}</p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button type="submit">{t("save")}</Button>
          <Button formAction={deleteAction} type="submit" variant="destructive">
            {t("delete")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
