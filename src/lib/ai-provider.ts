import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createOpenAI } from "@ai-sdk/openai";

export type ProviderName =
  | "anthropic"
  | "openai"
  | "mistral"
  | "azure_openai"
  | "copilot"
  | "custom";

const DEFAULT_MODELS: Partial<Record<ProviderName, string>> = {
  anthropic: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20240620",
  openai: process.env.OPENAI_MODEL || "gpt-4o-mini",
  copilot: process.env.GITHUB_COPILOT_MODEL || "gpt-4o",
};

export function getLanguageModel(params: {
  provider: ProviderName;
  model?: string | null;
  apiKey?: string | null;
  azureEndpoint?: string | null;
  azureApiVersion?: string | null;
}) {
  const { provider, model, apiKey, azureEndpoint, azureApiVersion } = params;
  const modelId = model || DEFAULT_MODELS[provider] || "gpt-4o-mini";

  switch (provider) {
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(modelId);
    }
    case "openai": {
      const openai = createOpenAI({
        apiKey: apiKey || process.env.OPENAI_API_KEY,
      });
      return openai(modelId);
    }
    case "azure_openai": {
      const endpoint = azureEndpoint || process.env.AZURE_OPENAI_ENDPOINT;
      if (!endpoint) {
        throw new Error("Azure OpenAI endpoint is required");
      }
      const azure = createAzure({
        apiKey: apiKey || process.env.AZURE_OPENAI_API_KEY,
        baseURL: `${endpoint.replace(/\/+$/, "")}/openai/deployments`,
        apiVersion: azureApiVersion || process.env.AZURE_OPENAI_API_VERSION || "2024-10-21",
      });
      return azure(modelId);
    }
    case "copilot": {
      const copilot = createOpenAI({
        apiKey: apiKey || process.env.GITHUB_TOKEN,
        baseURL: process.env.GITHUB_COPILOT_BASE_URL || "https://api.githubcopilot.com",
      });
      return copilot(modelId);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export function resolveApiKey(
  provider: ProviderName | undefined,
  connectorKey: string | null | undefined,
): string | null {
  if (!provider) return null;
  switch (provider) {
    case "anthropic":
      return connectorKey || process.env.ANTHROPIC_API_KEY || null;
    case "openai":
      return connectorKey || process.env.OPENAI_API_KEY || null;
    case "azure_openai":
      return connectorKey || process.env.AZURE_OPENAI_API_KEY || null;
    case "copilot":
      return connectorKey || process.env.GITHUB_TOKEN || null;
    default:
      return connectorKey || null;
  }
}
