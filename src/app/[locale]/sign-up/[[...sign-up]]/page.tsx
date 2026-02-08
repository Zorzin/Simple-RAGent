import OAuthButtons from "@/components/auth/OAuthButtons";
import SignUpForm from "@/components/auth/SignUpForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SignUpPage({ params }: Props) {
  const { locale } = await params;
  const showGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const showMicrosoft = Boolean(
    process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET,
  );
  const callbackUrl = `/${locale}/app`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Create your account</h1>
          <p className="mt-2 text-sm text-zinc-600">Use your work email, or continue with SSO.</p>
        </div>

        <OAuthButtons
          callbackUrl={callbackUrl}
          showGoogle={showGoogle}
          showMicrosoft={showMicrosoft}
        />

        <div className={`${showGoogle || showMicrosoft ? "border-t" : ""} border-zinc-200 pt-6`}>
          <SignUpForm locale={locale} />
        </div>
      </div>
    </div>
  );
}
