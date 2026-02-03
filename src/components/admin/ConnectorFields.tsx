"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProviderOption = {
  value: string;
  label: string;
  helper?: string;
};

const PROVIDERS: ProviderOption[] = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI" },
  { value: "copilot", label: "GitHub Copilot" },
  { value: "azure_openai", label: "Azure OpenAI" },
  { value: "mistral", label: "Mistral" },
  { value: "custom", label: "Custom" },
];

type Props = {
  initialName?: string;
  initialProvider?: string;
  initialModel?: string | null;
  showApiKey?: boolean;
  apiKeyRequired?: boolean;
  apiKeyPlaceholder?: string;
};

export default function ConnectorFields({
  initialName,
  initialProvider,
  initialModel,
  showApiKey = true,
  apiKeyRequired = false,
  apiKeyPlaceholder,
}: Props) {
  const [provider, setProvider] = useState(initialProvider || "anthropic");
  const [apiKey, setApiKey] = useState("");
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(initialModel ?? "");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState("");
  const helper = useMemo(
    () => PROVIDERS.find((item) => item.value === provider)?.helper ?? "",
    [provider],
  );

  async function handleLoadModels() {
    if (!apiKey.trim()) {
      setModelError("Add an API key to load models.");
      return;
    }

    setIsLoadingModels(true);
    setModelError("");

    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });

      const data = (await response.json()) as { models?: string[]; error?: string };

      if (!response.ok) {
        setModelError(data.error || "Unable to load models.");
        setModelOptions([]);
        return;
      }

      setModelOptions(data.models ?? []);
      if (data.models?.length) {
        setSelectedModel(data.models[0]);
      }
    } catch {
      setModelError("Unable to load models.");
      setModelOptions([]);
    } finally {
      setIsLoadingModels(false);
    }
  }

  return (
    <div className="space-y-3">
      <Input name="name" defaultValue={initialName} placeholder="Connector name" required />
      <div className="space-y-1">
        <label className="text-xs font-semibold text-zinc-500">Provider</label>
        <select
          name="provider"
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
          value={provider}
          onChange={(event) => {
            setProvider(event.target.value);
            setModelOptions([]);
            setSelectedModel(initialModel ?? "");
            setModelError("");
          }}
          required
        >
          {PROVIDERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        {helper ? <p className="text-xs text-zinc-500">{helper}</p> : null}
      </div>
      {modelOptions.length ? (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">Model</label>
          <select
            name="model"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
          >
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <Input name="model" defaultValue={initialModel ?? ""} placeholder="Model (optional)" />
      )}
      {showApiKey ? (
        <div className="space-y-2">
          <Input
            name="apiKey"
            type="password"
            placeholder={
              apiKeyPlaceholder ||
              (provider === "copilot" ? "GitHub token (with Copilot access)" : "API key (optional)")
            }
            required={apiKeyRequired}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <Button type="button" variant="outline" onClick={handleLoadModels}>
              {isLoadingModels ? "Loading models..." : "Load models"}
            </Button>
            {modelError ? <span className="text-red-500">{modelError}</span> : null}
          </div>
          {provider === "copilot" ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <Button type="button" variant="outline" disabled>
                Authorize Copilot (coming soon)
              </Button>
              <span>For now paste a GitHub token with Copilot access.</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
