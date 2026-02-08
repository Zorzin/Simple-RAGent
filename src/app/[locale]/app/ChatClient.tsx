"use client";

import { useMemo, useState } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ChatMessage = {
  id: string;
  role: string;
  content: string;
};

type Props = {
  sessionId: string;
  locale: string;
  initialMessages: ChatMessage[];
};

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export default function ChatClient({ sessionId, locale, initialMessages }: Props) {
  const t = useTranslations("app.chat");
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat/stream",
        body: { sessionId, locale },
      }),
    [sessionId, locale],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: `chat-${sessionId}`,
    transport,
    messages: initialMessages.map(
      (m): UIMessage => ({
        id: m.id,
        role: m.role as UIMessage["role"],
        parts: [{ type: "text", text: m.content }],
      }),
    ),
    onFinish: () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chat-session-activity", { detail: { sessionId } }),
        );
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    await sendMessage({ text: trimmed });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="text-sm text-zinc-500">{t("empty")}</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "rounded-lg bg-zinc-100 p-3 text-sm"
                  : "rounded-lg border border-zinc-200 bg-white p-3 text-sm"
              }
            >
              <div className="text-xs uppercase text-zinc-400">
                {message.role === "user" ? t("roleUser") : t("roleAssistant")}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-zinc-800">
                {getMessageText(message)}
              </div>
            </div>
          ))
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {t("sendError")}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-zinc-200 bg-white p-4">
        <div className="flex items-end gap-3">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("placeholder")}
            rows={3}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading} className="h-10">
            {isLoading ? t("sending") : t("send")}
          </Button>
        </div>
      </form>
    </div>
  );
}
