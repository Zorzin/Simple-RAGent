"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export type OAuthButtonsProps = {
  callbackUrl: string;
  showGoogle?: boolean;
  showMicrosoft?: boolean;
};

export default function OAuthButtons({
  callbackUrl,
  showGoogle = true,
  showMicrosoft = true,
}: OAuthButtonsProps) {
  if (!showGoogle && !showMicrosoft) {
    return null;
  }

  return (
    <div className="space-y-3">
      {showGoogle ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl })}
        >
          Continue with Google
        </Button>
      ) : null}
      {showMicrosoft ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn("azure-ad", { callbackUrl })}
        >
          Continue with Microsoft
        </Button>
      ) : null}
    </div>
  );
}
