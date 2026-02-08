"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface ChatMessageListProps {
  messages: UIMessage[];
  emptyText: string;
  isStreaming?: boolean;
  isSubmitted?: boolean;
  error?: string | null;
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function ThinkingIndicator() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "#71717a",
                animation: "chatPulse 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 13, color: "#71717a", marginLeft: 4 }}>Generating response...</span>
      </div>
    </div>
  );
}

function ErrorIndicator({ message }: { message: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div
        style={{
          borderRadius: 12,
          backgroundColor: "rgba(127, 29, 29, 0.3)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          padding: "10px 16px",
          maxWidth: "85%",
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: "#f87171" }}>
          Failed to get response: {message}
        </p>
      </div>
    </div>
  );
}

/* ---------- Markdown component overrides ---------- */

const codeBlockStyle: React.CSSProperties = {
  backgroundColor: "#1e1e2e",
  borderRadius: 8,
  padding: "12px 16px",
  overflowX: "auto",
  margin: "8px 0",
  fontSize: 13,
  lineHeight: 1.6,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  whiteSpace: "pre",
  color: "#d4d4d8",
};

const markdownComponents: Components = {
  pre: ({ children }) => (
    <pre style={codeBlockStyle}>{children}</pre>
  ),
  code: ({ children, className }) => {
    // Inside a <pre>, react-markdown still calls `code` — but the parent
    // <pre> already provides the block styling, so just render raw.
    if (className) {
      return <code>{children}</code>;
    }
    // Inline code
    return (
      <code
        style={{
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: 4,
          padding: "2px 5px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 13,
        }}
      >
        {children}
      </code>
    );
  },
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "underline" }}>
      {children}
    </a>
  ),
  ul: ({ children }) => <ul style={{ margin: "6px 0", paddingLeft: 20 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: "6px 0", paddingLeft: 20 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote
      style={{
        borderLeft: "3px solid #52525b",
        margin: "8px 0",
        paddingLeft: 12,
        color: "#a1a1aa",
      }}
    >
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: "auto", margin: "8px 0" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{ border: "1px solid #3f3f46", padding: "6px 10px", textAlign: "left", backgroundColor: "#27272a" }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ border: "1px solid #3f3f46", padding: "6px 10px" }}>{children}</td>
  ),
  p: ({ children }) => <p style={{ margin: "6px 0" }}>{children}</p>,
  h1: ({ children }) => <h1 style={{ fontSize: 20, fontWeight: 600, margin: "12px 0 6px" }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: 18, fontWeight: 600, margin: "10px 0 6px" }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: 16, fontWeight: 600, margin: "8px 0 4px" }}>{children}</h3>,
};

/* ---------- Helpers ---------- */

/** Close any unclosed ``` fence so ReactMarkdown doesn't break mid-stream.
 *  Only counts fences at the start of a line (how CommonMark defines them). */
function closeOpenFences(text: string): string {
  const fences = text.match(/(^|\n)\s*```/g);
  if (fences && fences.length % 2 !== 0) {
    return text + "\n```";
  }
  return text;
}

/* ---------- Smooth streaming assistant message ---------- */

function AssistantMessage({ text, isActivelyStreaming }: { text: string; isActivelyStreaming: boolean }) {
  const targetRef = useRef(text);
  const revealedRef = useRef(isActivelyStreaming ? "" : text);
  const [revealed, setRevealed] = useState(isActivelyStreaming ? "" : text);

  // Always keep target up-to-date (synchronous, no re-render)
  targetRef.current = text;

  useEffect(() => {
    if (!isActivelyStreaming) {
      // Streaming finished — show everything immediately
      revealedRef.current = targetRef.current;
      setRevealed(targetRef.current);
      return;
    }

    const interval = setInterval(() => {
      const target = targetRef.current;
      const current = revealedRef.current;
      if (current.length >= target.length) return;

      // Adaptive step: ease-out — fast when lots buffered, gentle when almost caught up
      const remaining = target.length - current.length;
      const step = Math.max(1, Math.ceil(remaining * 0.15));
      const next = target.slice(0, current.length + step);
      revealedRef.current = next;
      setRevealed(next);
    }, 25);

    return () => clearInterval(interval);
  }, [isActivelyStreaming]);

  const safeText = isActivelyStreaming ? closeOpenFences(revealed) : revealed;
  const displayText = safeText + (isActivelyStreaming ? " ▍" : "");

  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div style={{ maxWidth: "85%", wordBreak: "break-word", fontSize: 14, lineHeight: 1.7, color: "#d4d4d8" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {displayText}
        </ReactMarkdown>
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */

export default function ChatMessageList({ messages, emptyText, isStreaming, isSubmitted, error }: ChatMessageListProps) {
  const lastUserMsgRef = useRef<HTMLDivElement | null>(null);
  const prevMsgCountRef = useRef(messages.length);

  // Find the index of the last user message
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }

  // Only scroll when a NEW user message is added — pin it to the top of the viewport.
  // Do NOT scroll during AI streaming so the user can read from the beginning.
  useEffect(() => {
    const added = messages.length - prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;

    if (added <= 0) return;

    // Check if any of the newly added messages is a user message
    // (the SDK may batch-add user + empty assistant in one render)
    const hasNewUserMsg = messages.slice(-added).some((m) => m.role === "user");
    if (hasNewUserMsg && lastUserMsgRef.current) {
      lastUserMsgRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages.length]);

  // On mount (page refresh), scroll to the last user message instantly
  useEffect(() => {
    if (lastUserMsgRef.current) {
      lastUserMsgRef.current.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }, []);

  const isLoading = (isSubmitted || isStreaming) && !error;

  // Check if the AI has produced any visible text yet
  const lastMsg = messages[messages.length - 1];
  const aiHasContent = lastMsg?.role === "assistant" && getMessageText(lastMsg).length > 0;
  const showThinking = isLoading && !aiHasContent;

  return (
    <>
      <style>{`
        @keyframes chatPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.length === 0 && !showThinking && !error ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0", fontSize: 14, color: "#71717a" }}>
              {emptyText}
            </div>
          ) : (
            messages.map((m, i) => {
              const isUser = m.role === "user";
              const isLastUser = i === lastUserIdx;
              const text = getMessageText(m);
              // Hide AI messages that have no content yet (indicator shown instead)
              if (!isUser && text.length === 0) return null;

              const isLastAssistant = !isUser && i === messages.length - 1;
              const isMessageStreaming = isLastAssistant && !!isStreaming;

              return (
                <div key={m.id} ref={isLastUser ? lastUserMsgRef : undefined} style={isLastUser ? { scrollMarginTop: 24 } : undefined}>
                  {isUser ? (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div
                        style={{
                          maxWidth: "75%",
                          borderRadius: 16,
                          backgroundColor: "#27272a",
                          padding: "10px 16px",
                        }}
                      >
                        <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 14, lineHeight: 1.6, color: "#fafafa" }}>
                          {text}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <AssistantMessage text={text} isActivelyStreaming={isMessageStreaming} />
                  )}
                </div>
              );
            })
          )}

          {showThinking && <ThinkingIndicator />}

          {error && <ErrorIndicator message={error} />}

          {/* Spacer so the last user message can always be scrolled to the top */}
          <div style={{ minHeight: "60vh", flexShrink: 0 }} />
        </div>
      </div>
    </>
  );
}
