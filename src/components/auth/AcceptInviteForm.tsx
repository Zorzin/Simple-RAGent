"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { acceptInvite, type AcceptInviteResult } from "@/app/[locale]/invite/[token]/actions";

export type AcceptInviteFormProps = {
  token: string;
  locale: string;
};

const initialState: AcceptInviteResult = { ok: false };

export default function AcceptInviteForm({ token, locale }: AcceptInviteFormProps) {
  const [state, formAction] = useActionState(
    async (_prev: AcceptInviteResult, formData: FormData) => acceptInvite(formData),
    initialState,
  );

  return (
    <Card className="space-y-4 p-6">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="locale" value={locale} />
        {state?.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
        <Button type="submit" className="w-full">
          Accept invite
        </Button>
      </form>
    </Card>
  );
}
