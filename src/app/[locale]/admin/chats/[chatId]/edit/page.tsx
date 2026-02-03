import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import Breadcrumbs from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/db";
import { chats } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

import { deleteChat, updateChat } from "../../../actions";

type Props = {
  params: Promise<{ locale: string; chatId: string }>;
};

export default async function EditChatPage({ params }: Props) {
  const { locale, chatId } = await params;
  await requireAdmin();
  const db = getDb();
  const [chat] = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);

  if (!chat) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Chats", href: "/admin/chats" },
          { label: "Edit" },
        ]}
      />
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Edit chat</h1>
            <p className="mt-2 text-sm text-zinc-600">Update chat details.</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/admin/chats`}>Back</Link>
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <form action={updateChat} className="space-y-3">
          <input type="hidden" name="id" value={chat.id} />
          <Input name="name" defaultValue={chat.name} required />
          <Textarea name="description" defaultValue={chat.description ?? ""} />
          <div className="flex items-center gap-2">
            <Button type="submit">Save changes</Button>
            <Button formAction={deleteChat} type="submit" variant="destructive">
              Delete chat
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
