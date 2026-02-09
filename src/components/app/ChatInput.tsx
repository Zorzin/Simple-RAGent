"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  connectorName?: string | null;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  connectorName,
}: ChatInputProps) {
  const t = useTranslations("app.chat");

  const canSend = value.trim().length > 0 && !isLoading;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <div style={{ flexShrink: 0, backgroundColor: "#09090b", padding: "8px 24px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <form onSubmit={onSubmit}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              borderRadius: 16,
              border: "1px solid #3f3f46",
              backgroundColor: "#18181b",
              padding: "10px 12px 10px 16px",
            }}
          >
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={t("placeholder")}
              style={{
                flex: 1,
                minHeight: 24,
                maxHeight: 144,
                resize: "none",
                border: "none",
                backgroundColor: "transparent",
                color: "#fafafa",
                fontSize: 14,
                lineHeight: "1.5",
                outline: "none",
                padding: 0,
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              disabled={!canSend}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "none",
                backgroundColor: canSend ? "#2563eb" : "#3f3f46",
                color: canSend ? "#fff" : "#71717a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: canSend ? "pointer" : "not-allowed",
                flexShrink: 0,
                padding: 0,
              }}
              aria-label="Send"
            >
              <ArrowUp size={16} strokeWidth={2} />
            </button>
          </div>
        </form>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 4px 0",
            fontSize: 11,
          }}
        >
          {connectorName && (
            <span
              style={{
                backgroundColor: "#27272a",
                borderRadius: 6,
                padding: "2px 8px",
                color: "#a1a1aa",
                fontWeight: 500,
              }}
            >
              {connectorName}
            </span>
          )}
          <span style={{ color: "#52525b" }}>{t("inputHelper")}</span>
        </div>
      </div>
    </div>
  );
}
