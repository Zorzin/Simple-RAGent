"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type { updateMemberRole } from "@/app/[locale]/admin/actions";

type ActionResult = Awaited<ReturnType<typeof updateMemberRole>>;

const initialState: ActionResult = { ok: false, error: "" };

type Props = {
  locale: string;
  membershipId: string;
  identifier: string;
  userId: string;
  currentRole: string;
  action: (formData: FormData) => Promise<ActionResult>;
  deleteAction: (formData: FormData) => Promise<void>;
};

export default function EditMemberForm({
  locale,
  membershipId,
  identifier,
  userId,
  currentRole,
  action,
  deleteAction,
}: Props) {
  const t = useTranslations("admin.membersEdit");
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
            <Link href={`/${locale}/admin/members`}>{t("backToList")}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-6">
      <div>
        <div className="text-sm font-medium text-zinc-900">
          {identifier || t("anonymous")}
        </div>
        <div className="text-xs text-zinc-500">{userId}</div>
      </div>
      <form action={formAction} className="space-y-3" onSubmit={() => setDismissed(false)}>
        <input type="hidden" name="membershipId" value={membershipId} />
        <select
          name="role"
          defaultValue={currentRole}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
        >
          <option value="member">{t("roles.member")}</option>
          <option value="admin">{t("roles.admin")}</option>
        </select>
        {state?.ok === false && state?.error ? (
          <p className="text-sm text-red-500">{state.error}</p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button type="submit">{t("updateRole")}</Button>
          <Button formAction={deleteAction} type="submit" variant="destructive">
            {t("remove")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
