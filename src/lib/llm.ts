import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20240620";
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEFAULT_COPILOT_MODEL = process.env.GITHUB_COPILOT_MODEL || "gpt-4o";
const DEFAULT_COPILOT_BASE_URL =
  process.env.GITHUB_COPILOT_BASE_URL || "https://api.githubcopilot.com";
type Provider = "anthropic" | "openai" | "mistral" | "azure_openai" | "copilot" | "custom";

export async function generateResponse(params: {
  provider: Provider;
  model?: string | null;
  apiKey?: string | null;
  system: string;
  user: string;
  maxOutputTokens?: number;
}) {
  const { provider, model, apiKey, system, user, maxOutputTokens } = params;
  const outputTokens = maxOutputTokens ?? 800;

  if (provider === "anthropic") {
    const client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    if (!client.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const response = await client.messages.create({
      model: model || DEFAULT_ANTHROPIC_MODEL,
      max_tokens: outputTokens,
      system,
      messages: [{ role: "user", content: user }],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return text || "";
  }

  if (provider === "openai") {
    const client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
    if (!client.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const response = await client.responses.create({
      model: model || DEFAULT_OPENAI_MODEL,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_output_tokens: outputTokens,
    });

    return response.output_text || "";
  }

  if (provider === "copilot") {
    const client = new OpenAI({
      apiKey: apiKey || process.env.GITHUB_TOKEN,
      baseURL: DEFAULT_COPILOT_BASE_URL,
    });
    if (!client.apiKey) {
      throw new Error("GitHub Copilot token is not configured");
    }

    const response = await client.chat.completions.create({
      model: model || DEFAULT_COPILOT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: outputTokens,
    });

    return response.choices?.[0]?.message?.content ?? "";
  }

  return "";
}
