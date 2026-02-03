import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDb } from "@/db";
import { files } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

import { deleteFile, renameFile } from "../../../actions";

type Props = {
  params: Promise<{ locale: string; fileId: string }>;
};

export default async function EditFilePage({ params }: Props) {
  const { locale, fileId } = await params;
  await requireAdmin();
  const db = getDb();
  const [file] = await db.select().from(files).where(eq(files.id, fileId)).limit(1);

  if (!file) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Files", href: "/admin/files" },
          { label: "Edit" },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Edit file</h1>
            <p className="mt-2 text-sm text-zinc-600">Rename or remove this file.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/files`}>Back</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <form action={renameFile} className="space-y-3">
          <input type="hidden" name="id" value={file.id} />
          <Input name="name" defaultValue={file.name} />
          <div className="text-xs text-zinc-500">
            {file.mimeType ?? "unknown"} · {file.size ?? 0} bytes · {file.storageKey}
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit">Save changes</Button>
            <Button formAction={deleteFile} type="submit" variant="destructive">
              Delete file
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
