import Link from "next/link";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/admin";

import { createConnector } from "../../actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewConnectorPage({ params }: Props) {
  const { locale } = await params;
  await requireAdmin();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Connectors", href: "/admin/connectors" },
          { label: "New" },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">New connector</h1>
            <p className="mt-2 text-sm text-zinc-600">Add a new model connector.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/connectors`}>Back</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <form action={createConnector} className="space-y-3">
          <Input name="name" placeholder="Connector name" required />
          <Input name="provider" placeholder="Provider (anthropic, openai, copilot)" required />
          <Input name="model" placeholder="Model (optional)" />
          <Input name="apiKey" placeholder="API key (optional)" />
          <Button type="submit">Add connector</Button>
        </form>
      </Card>
    </div>
  );
}
