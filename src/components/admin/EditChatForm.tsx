"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import ConfirmButton from "@/components/admin/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { updateChat } from "@/app/[locale]/admin/actions";

type ActionResult = Awaited<ReturnType<typeof updateChat>>;

const initialState: ActionResult = { ok: false, error: "" };

type GroupRow = { id: string; name: string };
type FileRow = { id: string; name: string };
type ConnectorRow = { id: string; name: string; provider: string };

type Props = {
  locale: string;
  chatId: string;
  chatName: string;
  chatDescription: string;
  action: (formData: FormData) => Promise<ActionResult>;
  deleteAction: (formData: FormData) => Promise<void>;
  groupRows: GroupRow[];
  fileRows: FileRow[];
  connectorRows: ConnectorRow[];
  selectedGroupIds: string[];
  selectedFileIds: string[];
  selectedConnectorId: string;
  limitDay: string;
  limitWeek: string;
  limitMonth: string;
};

export default function EditChatForm({
  locale,
  chatId,
  chatName,
  chatDescription,
  action,
  deleteAction,
  groupRows,
  fileRows,
  connectorRows,
  selectedGroupIds,
  selectedFileIds,
  selectedConnectorId,
  limitDay,
  limitWeek,
  limitMonth,
}: Props) {
  const t = useTranslations("admin.chatsEdit");
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
            <Link href={`/${locale}/admin/chats`}>{t("backToList")}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const groupIdSet = new Set(selectedGroupIds);
  const fileIdSet = new Set(selectedFileIds);

  return (
    <Card className="space-y-4 p-6">
      <form action={formAction} className="space-y-4" onSubmit={() => setDismissed(false)}>
        <input type="hidden" name="id" value={chatId} />
        <Input name="name" defaultValue={chatName} required />
        <Textarea name="description" defaultValue={chatDescription} />
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-500">{t("fields.assignGroups")}</div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
            {groupRows.length === 0 ? (
              <div className="text-zinc-500">{t("fields.noGroups")}</div>
            ) : (
              groupRows.map((group) => (
                <label key={group.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    name="groupIds"
                    value={group.id}
                    defaultChecked={groupIdSet.has(group.id)}
                  />
                  <span className="text-zinc-700">{group.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-500">{t("fields.assignFiles")}</div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
            {fileRows.length === 0 ? (
              <div className="text-zinc-500">{t("fields.noFiles")}</div>
            ) : (
              fileRows.map((file) => (
                <label key={file.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    name="fileIds"
                    value={file.id}
                    defaultChecked={fileIdSet.has(file.id)}
                  />
                  <span className="text-zinc-700">{file.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-500">{t("fields.connector")}</div>
          <select
            name="connectorId"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
            defaultValue={selectedConnectorId}
          >
            <option value="">{t("fields.noConnector")}</option>
            {connectorRows.map((connector) => (
              <option key={connector.id} value={connector.id}>
                {connector.name} ({connector.provider})
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500">{t("limits.day")}</label>
            <Input name="limitDay" type="number" min="0" defaultValue={limitDay} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500">{t("limits.week")}</label>
            <Input name="limitWeek" type="number" min="0" defaultValue={limitWeek} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500">{t("limits.month")}</label>
            <Input name="limitMonth" type="number" min="0" defaultValue={limitMonth} />
          </div>
        </div>
        {state?.ok === false && state?.error ? (
          <p className="text-sm text-red-500">{state.error}</p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button type="submit">{t("save")}</Button>
          <ConfirmButton
            formAction={deleteAction}
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            confirmText={t("confirmDelete")}
          >
            {t("delete")}
          </ConfirmButton>
        </div>
      </form>
    </Card>
  );
}
