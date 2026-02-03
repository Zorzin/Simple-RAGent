import { getTranslations } from "next-intl/server";

export default async function AppHome() {
  const t = await getTranslations("home");

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white p-12 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">{t("ctaPrimary")}</h1>
      <p className="mt-3 max-w-xl text-sm text-zinc-600">
        Select a chat from the left sidebar to get started. Your chat history and available
        workspaces will show up there.
      </p>
    </div>
  );
}
