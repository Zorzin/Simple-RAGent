"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { uploadFile } from "@/app/[locale]/admin/actions";

type ActionResult = Awaited<ReturnType<typeof uploadFile>>;

const initialState: ActionResult = { ok: false };

type Props = {
  locale: string;
  action: (formData: FormData) => Promise<ActionResult>;
};

export default function UploadFilesForm({ locale, action }: Props) {
  const t = useTranslations("admin.upload");
  const [state, formAction] = useActionState(
    async (_prevState: ActionResult, formData: FormData) => action(formData),
    initialState,
  );
  const [formKey, setFormKey] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const showSuccess = Boolean(state?.ok) && !dismissed;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  function updateSelectedFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      setSelectedFiles([]);
      return;
    }
    setSelectedFiles(Array.from(files));
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      updateSelectedFiles(files);
      if (inputRef.current) {
        inputRef.current.files = files;
      }
    }
  }

  if (showSuccess) {
    const count = state.count ?? 0;
    const filesLabel = count === 1 ? t("fileSingular") : t("filePlural");
    return (
      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{t("successTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {t("successMessage", { count, files: filesLabel })}
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
            {t("uploadMore")}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/files`}>{t("backToList")}</Link>
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
        <div
          className={`flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
            isDragging ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="text-sm font-medium text-zinc-900">{t("dropzoneTitle")}</div>
          <div className="mt-2 text-xs text-zinc-500">
            {t("dropzoneHint")}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => inputRef.current?.click()}
          >
            {t("browse")}
          </Button>
          <Input
            ref={inputRef}
            name="files"
            type="file"
            multiple
            required
            className="hidden"
            onChange={(event) => updateSelectedFiles(event.target.files)}
            onClick={(event) => {
              (event.target as HTMLInputElement).value = "";
            }}
          />
        </div>
        {selectedFiles.length ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
            {t("selected", {
              count: selectedFiles.length,
              files: selectedFiles.length === 1 ? t("fileSingular") : t("filePlural"),
              names: selectedFiles.map((file) => file.name).join(", "),
            })}
          </div>
        ) : null}
        {state?.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
        <Button type="submit">{t("submit")}</Button>
      </form>
    </Card>
  );
}
