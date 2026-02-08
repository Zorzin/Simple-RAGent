"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type ChatItem = {
  id: string;
  name: string;
  description?: string | null;
};

type SessionItem = {
  id: string;
  chatId: string;
  title: string;
  createdAt?: string | null;
};

type Props = {
  locale: string;
  chats: ChatItem[];
  sessions: SessionItem[];
};

export default function ChatSidebar({ locale, chats, sessions }: Props) {
  const t = useTranslations("app.sidebar");
  const tErrors = useTranslations("app.errors");
  const pathname = usePathname();
  const router = useRouter();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(chats[0]?.id ?? "");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [sessionItems, setSessionItems] = useState(sessions);

  useEffect(() => {
    setSessionItems(sessions);
  }, [sessions]);

  useEffect(() => {
    function handleActivity(event: Event) {
      const detail = (event as CustomEvent<{ sessionId?: string }>).detail;
      if (!detail?.sessionId) return;
      setSessionItems((prev) => {
        const idx = prev.findIndex((item) => item.id === detail.sessionId);
        if (idx === -1) return prev;
        const updated = [...prev];
        const [item] = updated.splice(idx, 1);
        return [item, ...updated];
      });
    }

    window.addEventListener("chat-session-activity", handleActivity as EventListener);
    return () =>
      window.removeEventListener("chat-session-activity", handleActivity as EventListener);
  }, []);

  async function handleCreateChat() {
    if (!selectedChat) return;
    setIsCreating(true);
    setCreateError("");
    try {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: selectedChat, locale }),
      });
      const data = (await response.json()) as {
        sessionId?: string;
        title?: string;
        createdAt?: string | null;
        errorCode?: string;
      };
      if (!response.ok || !data.sessionId) {
        setCreateError(data.errorCode ? tErrors(data.errorCode) : t("createError"));
        return;
      }
      setSessionItems((prev) => [
        {
          id: data.sessionId,
          chatId: selectedChat,
          title: data.title ?? t("newChatTitle"),
          createdAt: data.createdAt ?? null,
        },
        ...prev,
      ]);
      router.push(`/${locale}/app/sessions/${data.sessionId}`);
      setIsPickerOpen(false);
    } catch {
      setCreateError(t("createError"));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {t("workspace")}
        </div>
        <Button
          type="button"
          className="w-full"
          variant="outline"
          disabled={chats.length === 0}
          onClick={() => setIsPickerOpen(true)}
        >
          {chats.length === 0 ? t("noChatsAvailable") : t("createChat")}
        </Button>
        {isPickerOpen && chats.length > 0 ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
              <div className="text-lg font-semibold text-zinc-900">{t("startNewChatTitle")}</div>
              <p className="mt-1 text-sm text-zinc-600">{t("startNewChatDescription")}</p>
              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold text-zinc-500">{t("chatType")}</label>
                <select
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                  value={selectedChat}
                  onChange={(event) => setSelectedChat(event.target.value)}
                >
                  {chats.map((chat) => (
                    <option key={chat.id} value={chat.id}>
                      {chat.name}
                    </option>
                  ))}
                </select>
              </div>
              {createError ? <p className="mt-3 text-xs text-red-500">{createError}</p> : null}
              <div className="mt-6 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsPickerOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="button" disabled={isCreating} onClick={handleCreateChat}>
                  {isCreating ? t("creating") : t("startChat")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {t("history")}
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto">
        {sessionItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500">
            {t("noChatsYet")}
          </div>
        ) : (
          sessionItems.map((session) => {
            const href = `/${locale}/app/sessions/${session.id}`;
            const isActive = pathname === href;
            return (
              <Link
                key={session.id}
                href={href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <div className="font-medium">{session.title}</div>
                {session.createdAt ? (
                  <div className="mt-1 text-xs text-zinc-400">{session.createdAt}</div>
                ) : null}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
