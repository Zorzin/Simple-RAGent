"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProviderOption = {
  value: string;
  label: string;
  helper?: string;
};

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
  const t = useTranslations("admin.connectorFields");
  const providers = useMemo<ProviderOption[]>(
    () => [
      { value: "anthropic", label: t("providers.anthropic") },
      { value: "openai", label: t("providers.openai") },
      { value: "copilot", label: t("providers.copilot") },
      { value: "azure_openai", label: t("providers.azureOpenai") },
      { value: "mistral", label: t("providers.mistral") },
      { value: "custom", label: t("providers.custom") },
    ],
    [t],
  );
  const [provider, setProvider] = useState(initialProvider || "anthropic");
  const [apiKey, setApiKey] = useState("");
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(initialModel ?? "");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState("");
  const helper = useMemo(
    () => providers.find((item) => item.value === provider)?.helper ?? "",
    [provider, providers],
  );

  async function handleLoadModels() {
    if (!apiKey.trim()) {
      setModelError(t("modelErrors.missingKey"));
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
        setModelError(data.error || t("modelErrors.loadFailed"));
        setModelOptions([]);
        return;
      }

      setModelOptions(data.models ?? []);
      if (data.models?.length) {
        setSelectedModel(data.models[0]);
      }
    } catch {
      setModelError(t("modelErrors.loadFailed"));
      setModelOptions([]);
    } finally {
      setIsLoadingModels(false);
    }
  }

  return (
    <div className="space-y-3">
      <Input
        name="name"
        defaultValue={initialName}
        placeholder={t("fields.namePlaceholder")}
        required
      />
      <div className="space-y-1">
        <label className="text-xs font-semibold text-zinc-500">{t("fields.providerLabel")}</label>
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
          {providers.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        {helper ? <p className="text-xs text-zinc-500">{helper}</p> : null}
      </div>
      {modelOptions.length ? (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">{t("fields.modelLabel")}</label>
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
        <Input
          name="model"
          defaultValue={initialModel ?? ""}
          placeholder={t("fields.modelPlaceholder")}
        />
      )}
      {showApiKey ? (
        <div className="space-y-2">
          <Input
            name="apiKey"
            type="password"
            placeholder={
              apiKeyPlaceholder ||
              (provider === "copilot" ? t("fields.copilotToken") : t("fields.apiKeyPlaceholder"))
            }
            required={apiKeyRequired}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <Button type="button" variant="outline" onClick={handleLoadModels}>
              {isLoadingModels ? t("actions.loadingModels") : t("actions.loadModels")}
            </Button>
            {modelError ? <span className="text-red-500">{modelError}</span> : null}
          </div>
          {provider === "copilot" ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <Button type="button" variant="outline" disabled>
                {t("copilot.authorize")}
              </Button>
              <span>{t("copilot.helper")}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
