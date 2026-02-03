"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { inviteMember } from "@/app/[locale]/admin/actions";

type ActionResult = Awaited<ReturnType<typeof inviteMember>>;

const initialState: ActionResult = { ok: false };

type Props = {
  locale: string;
  action: (formData: FormData) => Promise<ActionResult>;
};

export default function InviteMemberForm({ locale, action }: Props) {
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
          <h2 className="text-lg font-semibold text-zinc-900">Invite sent</h2>
          <p className="mt-1 text-sm text-zinc-600">
            The invitation was sent successfully. Would you like to invite another member?
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              setFormKey((prev) => prev + 1);
              setDismissed(true);
            }}
          >
            Invite another
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/members`}>Back to list</Link>
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
        <Input name="emailAddress" placeholder="Email address" required />
        <select
          name="role"
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
          required
        >
          <option value="org:member">Member</option>
          <option value="org:admin">Admin</option>
        </select>
        {state?.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
        <Button type="submit">Send invite</Button>
      </form>
    </Card>
  );
}
