"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import OAuthButtons from "@/components/auth/OAuthButtons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type SignInClientProps = {
  locale: string;
  showGoogle?: boolean;
  showMicrosoft?: boolean;
};

export default function SignInClient({
  locale,
  showGoogle = true,
  showMicrosoft = true,
}: SignInClientProps) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? `/${locale}/app`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setIsSubmitting(false);
      return;
    }

    window.location.href = result?.url ?? callbackUrl;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <Card className="w-full max-w-md space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Use your work email and password, or continue with SSO.
          </p>
        </div>

        <OAuthButtons
          callbackUrl={callbackUrl}
          showGoogle={showGoogle}
          showMicrosoft={showMicrosoft}
        />

        <div className={`${showGoogle || showMicrosoft ? "border-t" : ""} border-zinc-200 pt-6`}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-zinc-500">
            Need an account?{" "}
            <a className="text-zinc-700 underline" href={`/${locale}/sign-up`}>
              Sign up
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
