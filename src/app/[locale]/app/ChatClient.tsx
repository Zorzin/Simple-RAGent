"use client";

import { useMemo, useState } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";

import ChatHeader from "@/components/app/ChatHeader";
import ChatMessageList from "@/components/app/ChatMessageList";
import ChatInput from "@/components/app/ChatInput";
import { getSessionTitle } from "./actions";

export type ChatMessage = {
  id: string;
  role: string;
  content: string;
  createdAt?: string;
};

type Props = {
  sessionId: string;
  locale: string;
  initialMessages: ChatMessage[];
  chatName: string;
  chatDescription?: string | null;
  connectorName?: string | null;
  initialSessionTitle?: string | null;
};

function parseApiJson(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    // not JSON
  }
  return null;
}

const errorCodeTranslationKeys: Record<string, string> = {
  tokenLimit: "tokenLimitExceeded",
  missingApiKey: "fallbackNoModel",
  unauthorized: "sendError",
};

export default function ChatClient({
  sessionId,
  locale,
  initialMessages,
  chatName,
  chatDescription,
  connectorName,
  initialSessionTitle,
}: Props) {
  const t = useTranslations("app.chat");

  function parseApiError(raw: string): string | null {
    const json = parseApiJson(raw);
    if (!json) return null;
    const code = typeof json.errorCode === "string" ? json.errorCode : null;
    if (!code || !errorCodeTranslationKeys[code]) return null;

    let message = t(errorCodeTranslationKeys[code]);

    if (code === "tokenLimit" && typeof json.resetsAt === "string") {
      const resetsAt = new Date(json.resetsAt);
      if (!isNaN(resetsAt.getTime())) {
        message +=
          " " +
          t("limitResetsAt", {
            time: resetsAt.toLocaleString(locale, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          });
      }
    }

    return message;
  }
  const [input, setInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState(initialSessionTitle || chatName);

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
        ...(m.createdAt ? { createdAt: new Date(m.createdAt) } : {}),
      }),
    ),
    onError: (err) => {
      setSubmitError(parseApiError(err.message) || t("sendError"));
    },
    onFinish: async () => {
      setSubmitError(null);
      // Server generates the title asynchronously after the stream ends,
      // so we need to retry with a delay to wait for it.
      let title: string | null = null;
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        title = await getSessionTitle(sessionId);
        if (title) break;
      }
      if (title) setSessionTitle(title);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chat-session-activity", { detail: { sessionId, title } }),
        );
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setSubmitError(null);
    setInput("");
    try {
      await sendMessage({ text: trimmed });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setSubmitError(parseApiError(raw) || t("sendError"));
    }
  }

  async function handleRetry(text: string) {
    if (isLoading) return;
    setSubmitError(null);
    try {
      await sendMessage({ text });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setSubmitError(parseApiError(raw) || t("sendError"));
    }
  }

  const displayError =
    submitError || (error ? parseApiError(error.message) || t("sendError") : null);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "#09090b",
      }}
    >
      <ChatHeader title={sessionTitle} description={chatDescription} />

      <ChatMessageList
        messages={messages}
        emptyText={t("empty")}
        emptyResponseText={t("emptyResponse")}
        isStreaming={status === "streaming"}
        isSubmitted={status === "submitted"}
        error={displayError}
        locale={locale}
        onRetry={handleRetry}
        isLoading={isLoading}
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        connectorName={connectorName}
      />
    </div>
  );
}
