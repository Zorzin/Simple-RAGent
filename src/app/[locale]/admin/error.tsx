"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Params = { locale?: string };

export default function AdminError({ error }: { error: Error }) {
  const params = useParams<Params>();
  const locale = params?.locale ?? "en";
  const message = error?.message ?? "Something went wrong.";
  const isAccessError =
    message.toLowerCase().includes("forbidden") ||
    message.toLowerCase().includes("unauthorized") ||
    message.toLowerCase().includes("access");

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {isAccessError ? "Admin access required" : "Something went wrong"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {isAccessError
              ? "You don’t have permission to view this page."
              : "Please try again or return to the workspace."}{" "}
            {message}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAccessError ? (
            <Button asChild>
              <Link href={`/${locale}/sign-in`}>Sign in with another account</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/${locale}/app`}>Go to workspace</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
