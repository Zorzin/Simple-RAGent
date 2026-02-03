import Link from "next/link";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import UploadFilesForm from "@/components/admin/UploadFilesForm";
import { requireAdmin } from "@/lib/admin";

import { uploadFile } from "../../actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewFilePage({ params }: Props) {
  const { locale } = await params;
  await requireAdmin();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Files", href: "/admin/files" },
          { label: "New" },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">New file</h1>
            <p className="mt-2 text-sm text-zinc-600">Upload a new file.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/files`}>Back</Link>
          </Button>
        </div>
      </div>

      <UploadFilesForm locale={locale} action={uploadFile} />
    </div>
  );
}
