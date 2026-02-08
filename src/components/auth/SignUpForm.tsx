"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { registerUser, type RegisterResult } from "@/app/[locale]/sign-up/[[...sign-up]]/actions";

export type SignUpFormProps = {
  locale: string;
  inviteToken?: string;
  defaultEmail?: string;
};

const initialState: RegisterResult = { ok: false };

export default function SignUpForm({ locale, inviteToken, defaultEmail }: SignUpFormProps) {
  const [state, formAction] = useActionState(
    async (_prev: RegisterResult, formData: FormData) => registerUser(formData),
    initialState,
  );
  const [emailValue, setEmailValue] = useState(defaultEmail ?? "");

  if (state.ok) {
    return (
      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Account created</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Your account is ready. You can sign in to continue.
          </p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/sign-in`}>Go to sign in</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-6">
      <form action={formAction} className="space-y-3">
        {inviteToken ? <input type="hidden" name="inviteToken" value={inviteToken} /> : null}
        <Input name="name" placeholder="Full name" />
        <Input
          name="email"
          type="email"
          placeholder="Email"
          required
          value={emailValue}
          readOnly={Boolean(defaultEmail)}
          onChange={(event) => setEmailValue(event.target.value)}
        />
        <Input name="password" type="password" placeholder="Password" required />
        {state?.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>
    </Card>
  );
}
