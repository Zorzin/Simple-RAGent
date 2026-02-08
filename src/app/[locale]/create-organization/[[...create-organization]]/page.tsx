import CreateOrganizationForm from "@/components/auth/CreateOrganizationForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CreateOrganizationPage({ params }: Props) {
  const { locale } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Create organization</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Set up your workspace to start inviting teammates.
          </p>
        </div>
        <CreateOrganizationForm locale={locale} />
      </div>
    </div>
  );
}
