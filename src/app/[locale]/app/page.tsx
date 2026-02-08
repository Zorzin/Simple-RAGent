import { getTranslations } from "next-intl/server";
import { MessageCircleMore } from "lucide-react";

export default async function AppHome() {
  const t = await getTranslations("home");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: 48,
        textAlign: "center",
        backgroundColor: "#09090b",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: "#27272a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MessageCircleMore size={28} strokeWidth={1.5} color="#3b82f6" />
      </div>
      <h1 style={{ marginTop: 16, fontSize: 20, fontWeight: 600, color: "#fafafa" }}>{t("ctaPrimary")}</h1>
      <p style={{ marginTop: 8, maxWidth: 400, fontSize: 14, color: "#71717a" }}>
        Select a chat from the sidebar to get started, or create a new one.
      </p>
    </div>
  );
}
