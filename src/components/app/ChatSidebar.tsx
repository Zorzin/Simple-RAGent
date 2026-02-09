"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

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
  userName?: string | null;
  userEmail?: string | null;
};

function groupSessionsByDate(sessions: SessionItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: { label: string; items: SessionItem[] }[] = [
    { label: "Today", items: [] },
    { label: "Last 7 Days", items: [] },
    { label: "Last 30 Days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const session of sessions) {
    const date = session.createdAt ? new Date(session.createdAt) : null;
    if (!date || date >= today) {
      groups[0].items.push(session);
    } else if (date >= sevenDaysAgo) {
      groups[1].items.push(session);
    } else if (date >= thirtyDaysAgo) {
      groups[2].items.push(session);
    } else {
      groups[3].items.push(session);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export default function ChatSidebar({ locale, chats, sessions, userName, userEmail }: Props) {
  const t = useTranslations("app.sidebar");
  const tErrors = useTranslations("app.errors");
  const pathname = usePathname();
  const router = useRouter();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(chats[0]?.id ?? "");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [sessionItems, setSessionItems] = useState(sessions);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSessionItems(sessions);
  }, [sessions]);

  useEffect(() => {
    function handleActivity(event: Event) {
      const detail = (event as CustomEvent<{ sessionId?: string; title?: string | null }>).detail;
      if (!detail?.sessionId) return;
      setSessionItems((prev) => {
        const idx = prev.findIndex((item) => item.id === detail.sessionId);
        if (idx === -1) return prev;
        const updated = [...prev];
        const [item] = updated.splice(idx, 1);
        if (detail.title) {
          item.title = detail.title;
        }
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
          id: data.sessionId!,
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

  const filteredSessions = searchQuery.trim()
    ? sessionItems.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sessionItems;

  const groupedSessions = useMemo(() => groupSessionsByDate(filteredSessions), [filteredSessions]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "16px 12px 12px",
      }}
    >
      {/* Brand */}
      <div style={{ padding: "0 4px 12px", fontSize: 14, fontWeight: 600, color: "#fafafa" }}>
        Simple Ragent
      </div>

      {/* New Chat button */}
      <button
        type="button"
        disabled={chats.length === 0}
        onClick={() => setIsPickerOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          padding: "10px 12px",
          marginBottom: 12,
          borderRadius: 10,
          border: "none",
          backgroundColor: "#2563eb",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: chats.length === 0 ? "not-allowed" : "pointer",
          opacity: chats.length === 0 ? 0.4 : 1,
        }}
      >
        <Plus size={16} strokeWidth={2} />
        {chats.length === 0 ? t("noChatsAvailable") : t("createChat")}
      </button>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search
          size={14}
          strokeWidth={1.5}
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#71717a",
          }}
        />
        <input
          type="text"
          placeholder={t("search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            height: 32,
            paddingLeft: 32,
            paddingRight: 12,
            borderRadius: 8,
            border: "1px solid #3f3f46",
            backgroundColor: "#27272a",
            color: "#d4d4d8",
            fontSize: 12,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: "auto", margin: "0 -4px" }}>
        {groupedSessions.length === 0 ? (
          <div style={{ padding: "24px 8px", textAlign: "center", fontSize: 12, color: "#71717a" }}>
            {sessionItems.length === 0 ? t("noChatsYet") : t("noResults")}
          </div>
        ) : (
          groupedSessions.map((group) => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <div
                style={{ padding: "12px 8px 4px", fontSize: 11, fontWeight: 500, color: "#71717a" }}
              >
                {group.label}
              </div>
              {group.items.map((session) => {
                const href = `/${locale}/app/sessions/${session.id}`;
                const isActive = pathname === href;
                return (
                  <Link
                    key={session.id}
                    href={href}
                    style={{
                      display: "block",
                      padding: "7px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      color: isActive ? "#fafafa" : "#a1a1aa",
                      backgroundColor: isActive ? "#27272a" : "transparent",
                      textDecoration: "none",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {session.title}
                  </Link>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* User info */}
      <div
        style={{
          borderTop: "1px solid #27272a",
          paddingTop: 12,
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {(userName ?? "U").charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#e4e4e7",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {userName ?? "User"}
          </div>
          {userEmail && (
            <div
              style={{
                fontSize: 11,
                color: "#71717a",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userEmail}
            </div>
          )}
        </div>
      </div>

      {/* Create chat modal */}
      {isPickerOpen && chats.length > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 16,
              border: "1px solid #3f3f46",
              backgroundColor: "#18181b",
              padding: 24,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600, color: "#fafafa" }}>
              {t("startNewChatTitle")}
            </div>
            <p style={{ marginTop: 4, fontSize: 14, color: "#a1a1aa" }}>
              {t("startNewChatDescription")}
            </p>
            <div style={{ marginTop: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#a1a1aa",
                  marginBottom: 6,
                }}
              >
                {t("chatType")}
              </label>
              <select
                value={selectedChat}
                onChange={(event) => setSelectedChat(event.target.value)}
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 8,
                  border: "1px solid #3f3f46",
                  backgroundColor: "#27272a",
                  color: "#e4e4e7",
                  padding: "0 12px",
                  fontSize: 14,
                }}
              >
                {chats.map((chat) => (
                  <option key={chat.id} value={chat.id}>
                    {chat.name}
                  </option>
                ))}
              </select>
            </div>
            {createError && (
              <p style={{ marginTop: 12, fontSize: 12, color: "#f87171" }}>{createError}</p>
            )}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #3f3f46",
                  backgroundColor: "transparent",
                  color: "#d4d4d8",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={isCreating}
                onClick={handleCreateChat}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: isCreating ? "not-allowed" : "pointer",
                  opacity: isCreating ? 0.5 : 1,
                }}
              >
                {isCreating ? t("creating") : t("startChat")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
