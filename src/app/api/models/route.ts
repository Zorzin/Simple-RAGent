import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const SUPPORTED_PROVIDERS = [
  "openai",
  "anthropic",
  "copilot",
  "azure_openai",
  "mistral",
  "custom",
] as const;

type Provider = (typeof SUPPORTED_PROVIDERS)[number];

type Payload = {
  provider?: Provider;
  apiKey?: string;
  azureEndpoint?: string;
  azureApiVersion?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Payload;

  if (!body.provider || !SUPPORTED_PROVIDERS.includes(body.provider)) {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  }

  if (!body.apiKey) {
    return NextResponse.json({ error: "API key is required." }, { status: 400 });
  }

  try {
    if (body.provider === "openai") {
      const client = new OpenAI({ apiKey: body.apiKey });
      const models = await client.models.list();
      return NextResponse.json({
        models: models.data.map((model) => model.id).sort(),
      });
    }

    if (body.provider === "copilot") {
      const client = new OpenAI({
        apiKey: body.apiKey,
        baseURL: process.env.GITHUB_COPILOT_BASE_URL || "https://api.githubcopilot.com",
      });
      const models = await client.models.list();
      return NextResponse.json({
        models: models.data.map((model) => model.id).sort(),
      });
    }

    if (body.provider === "anthropic") {
      const client = new Anthropic({ apiKey: body.apiKey });
      const response = await client.models.list();
      const models = response.data?.map((model) => model.id).sort() ?? [];
      return NextResponse.json({ models });
    }

    if (body.provider === "azure_openai") {
      if (!body.azureEndpoint) {
        return NextResponse.json(
          { error: "Azure endpoint is required to list deployments." },
          { status: 400 },
        );
      }
      const endpoint = body.azureEndpoint.replace(/\/+$/, "");
      const apiVersion = body.azureApiVersion || "2024-10-21";
      const url = `${endpoint}/openai/deployments?api-version=${apiVersion}`;
      const response = await fetch(url, {
        headers: { "api-key": body.apiKey },
      });
      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json(
          { error: text || "Failed to list Azure deployments." },
          { status: 400 },
        );
      }
      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const models = data.data?.map((d) => d.id).sort() ?? [];
      return NextResponse.json({ models });
    }

    return NextResponse.json({
      models: [],
      error: "Model listing not available for this provider yet.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load models.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
