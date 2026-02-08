import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import EditFileForm from "@/components/admin/EditFileForm";
import { getDb } from "@/db";
import { files } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

import { deleteFile, renameFile } from "../../../actions";

type Props = {
  params: Promise<{ locale: string; fileId: string }>;
};

export default async function EditFilePage({ params }: Props) {
  const { locale, fileId } = await params;
  const t = await getTranslations({ locale, namespace: "admin.filesEdit" });
  await requireAdmin();
  const db = getDb();
  const [file] = await db.select().from(files).where(eq(files.id, fileId)).limit(1);

  if (!file) {
    notFound();
  }

  const fileMeta = `${file.mimeType ?? t("unknownType")} · ${file.size ?? 0} ${t("bytes")} · ${file.storageKey}`;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t("breadcrumbs.admin"), href: "/admin" },
          { label: t("breadcrumbs.files"), href: "/admin/files" },
          { label: t("breadcrumbs.edit") },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{t("title")}</h1>
            <p className="mt-2 text-sm text-zinc-600">{t("subtitle")}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/files`}>{t("back")}</Link>
          </Button>
        </div>
      </div>

      <EditFileForm
        locale={locale}
        fileId={file.id}
        fileName={file.name}
        fileMeta={fileMeta}
        action={renameFile}
        deleteAction={deleteFile}
      />
    </div>
  );
}
