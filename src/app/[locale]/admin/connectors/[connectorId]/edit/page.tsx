import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ConnectorFields from "@/components/admin/ConnectorFields";
import { getDb } from "@/db";
import { llmConnectors } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

import { deleteConnector, updateConnector } from "../../../actions";

type Props = {
  params: Promise<{ locale: string; connectorId: string }>;
};

export default async function EditConnectorPage({ params }: Props) {
  const { locale, connectorId } = await params;
  await requireAdmin();
  const db = getDb();
  const [connector] = await db
    .select()
    .from(llmConnectors)
    .where(eq(llmConnectors.id, connectorId))
    .limit(1);

  if (!connector) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Connectors", href: "/admin/connectors" },
          { label: "Edit" },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Edit connector</h1>
            <p className="mt-2 text-sm text-zinc-600">Update connector details.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/connectors`}>Back</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <form action={updateConnector} className="space-y-3">
          <input type="hidden" name="id" value={connector.id} />
          <ConnectorFields
            initialName={connector.name}
            initialProvider={connector.provider}
            initialModel={connector.model ?? ""}
          />
          <div className="flex items-center gap-2">
            <Button type="submit">Save changes</Button>
            <Button formAction={deleteConnector} type="submit" variant="destructive">
              Delete connector
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
