"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { updateGroup } from "@/app/[locale]/admin/actions";

type ActionResult = Awaited<ReturnType<typeof updateGroup>>;

const initialState: ActionResult = { ok: false, error: "" };

type MemberRow = { id: string; displayName: string | null; email: string | null; userId: string };

type Props = {
  locale: string;
  groupId: string;
  groupName: string;
  action: (formData: FormData) => Promise<ActionResult>;
  deleteAction: (formData: FormData) => Promise<void>;
  memberRows: MemberRow[];
  selectedMemberIds: string[];
};

export default function EditGroupForm({
  locale,
  groupId,
  groupName,
  action,
  deleteAction,
  memberRows,
  selectedMemberIds,
}: Props) {
  const t = useTranslations("admin.groupsEdit");
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
            <Link href={`/${locale}/admin/groups`}>{t("backToList")}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const memberIdSet = new Set(selectedMemberIds);

  return (
    <Card className="space-y-4 p-6">
      <form action={formAction} className="space-y-4" onSubmit={() => setDismissed(false)}>
        <input type="hidden" name="id" value={groupId} />
        <Input name="name" defaultValue={groupName} required />
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-500">{t("assignMembers")}</div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
            {memberRows.length === 0 ? (
              <div className="text-zinc-500">{t("noMembers")}</div>
            ) : (
              memberRows.map((member) => (
                <label key={member.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={member.id}
                    defaultChecked={memberIdSet.has(member.id)}
                  />
                  <span className="text-zinc-700">
                    {member.displayName ?? member.email ?? member.userId}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
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
