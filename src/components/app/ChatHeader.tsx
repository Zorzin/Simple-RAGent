"use client";

interface ChatHeaderProps {
  title: string;
  description?: string | null;
}

export default function ChatHeader({ title, description }: ChatHeaderProps) {
  return (
    <div
      style={{
        flexShrink: 0,
        borderBottom: "1px solid #27272a",
        backgroundColor: "#09090b",
        padding: "12px 24px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#d4d4d8" }}>{title}</div>
        {description && (
          <div style={{ marginTop: 2, fontSize: 12, color: "#71717a" }}>{description}</div>
        )}
      </div>
    </div>
  );
}
