"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  createOrganization,
  type CreateOrganizationResult,
} from "@/app/[locale]/create-organization/[[...create-organization]]/actions";

export type CreateOrganizationFormProps = {
  locale: string;
};

const initialState: CreateOrganizationResult = { ok: false };

export default function CreateOrganizationForm({ locale }: CreateOrganizationFormProps) {
  const [state, formAction] = useActionState(
    async (_prev: CreateOrganizationResult, formData: FormData) => createOrganization(formData),
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      window.location.href = `/${locale}/app`;
    }
  }, [state.ok, locale]);

  return (
    <Card className="space-y-4 p-6">
      <form action={formAction} className="space-y-3">
        <Input name="name" placeholder="Organization name" required />
        {state?.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
        <Button type="submit" className="w-full">
          Create organization
        </Button>
      </form>
    </Card>
  );
}
