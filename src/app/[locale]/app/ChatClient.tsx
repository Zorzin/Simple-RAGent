"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ChatMessage = {
  id: string;
  role: string;
  content: string;
};

type Props = {
  sessionId: string;
  initialMessages: ChatMessage[];
};

export default function ChatClient({ sessionId, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInput("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, content: trimmed }),
    });

    if (!response.ok) {
      let errorMessage = "Unable to send message.";
      try {
        const data = (await response.json()) as { error?: string };
        if (data?.error) {
          errorMessage = data.error;
        }
      } catch {
        // ignore parsing error
      }

      setMessages((prev) =>
        prev.map((msg) => (msg.id === assistantId ? { ...msg, content: errorMessage } : msg)),
      );
      setIsSending(false);
      return;
    }

    if (!response.body) {
      setIsSending(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        const line = part.replace(/^data:\s?/, "");
        if (!line) continue;
        if (line === "[DONE]") {
          setIsSending(false);
          return;
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: `${msg.content}${line}` } : msg,
          ),
        );
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("chat-session-activity", { detail: { sessionId } }));
    }
    setIsSending(false);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="text-sm text-zinc-500">No messages yet.</div>
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
              <div className="text-xs uppercase text-zinc-400">{message.role}</div>
              <div className="mt-1 whitespace-pre-wrap text-zinc-800">{message.content}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-zinc-200 bg-white p-4">
        <div className="flex items-end gap-3">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question..."
            rows={3}
            className="flex-1"
          />
          <Button type="submit" disabled={isSending} className="h-10">
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
