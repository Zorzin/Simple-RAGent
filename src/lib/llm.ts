import { generateText } from "ai";

import { getLanguageModel, type ProviderName } from "@/lib/ai-provider";

export async function generateResponse(params: {
  provider: ProviderName;
  model?: string | null;
  apiKey?: string | null;
  azureEndpoint?: string | null;
  azureApiVersion?: string | null;
  system: string;
  user: string;
  maxOutputTokens?: number;
}) {
  const { provider, model, apiKey, azureEndpoint, azureApiVersion, system, user, maxOutputTokens } =
    params;

  const { text } = await generateText({
    model: getLanguageModel({ provider, model, apiKey, azureEndpoint, azureApiVersion }),
    system,
    prompt: user,
    maxOutputTokens: maxOutputTokens ?? 800,
  });

  return text;
}
