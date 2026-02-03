import mammoth from "mammoth";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

function getExtension(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export async function extractTextFromBuffer(params: {
  buffer: Buffer;
  mimeType?: string | null;
  filename?: string | null;
}) {
  const mimeType = params.mimeType || "";
  const extension = params.filename ? getExtension(params.filename) : "";

  if (mimeType.startsWith("text/") || extension === "txt" || extension === "md") {
    return params.buffer.toString("utf-8");
  }

  if (mimeType === "application/pdf" || extension === "pdf") {
    if (!params.buffer || params.buffer.length === 0) {
      return "";
    }
    const mod = require("pdf-parse/lib/pdf-parse.js") as
      | ((data: Buffer) => Promise<{ text?: string }>)
      | { default?: (data: Buffer) => Promise<{ text?: string }> };
    const parse = typeof mod === "function" ? mod : mod.default;
    if (!parse) {
      throw new Error("Failed to load pdf-parse module.");
    }
    const data = Buffer.isBuffer(params.buffer) ? params.buffer : Buffer.from(params.buffer);
    const result = await parse(data);
    return result.text?.trim() ?? "";
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    const result = await mammoth.extractRawText({ buffer: params.buffer });
    return result.value || "";
  }

  return "";
}
