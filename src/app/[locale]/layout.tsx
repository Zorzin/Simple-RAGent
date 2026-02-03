import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  params: { locale: "en" | "pl" };
};

export default async function LocaleLayout({ children, params }: Props) {
  const messages = await getMessages();

  return (
    <ClerkProvider>
      <NextIntlClientProvider locale={params.locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </ClerkProvider>
  );
}

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "pl" }];
}
