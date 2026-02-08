import { generateText } from "ai";

import { getLanguageModel, type ProviderName } from "@/lib/ai-provider";

export async function generateResponse(params: {
  provider: ProviderName;
  model?: string | null;
  apiKey?: string | null;
  system: string;
  user: string;
  maxOutputTokens?: number;
}) {
  const { provider, model, apiKey, system, user, maxOutputTokens } = params;

  const { text } = await generateText({
    model: getLanguageModel({ provider, model, apiKey }),
    system,
    prompt: user,
    maxOutputTokens: maxOutputTokens ?? 800,
  });

  return text;
}
