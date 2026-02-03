"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { put } from "@vercel/blob";

import {
  chatFiles,
  chatGroups,
  chatLlmConnectors,
  chats,
  files,
  groups,
  llmConnectors,
  tokenLimits,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

const chatSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  description: z.string().optional(),
});

const groupSchema = z.object({
  name: z.string().min(2, "Name is too short"),
});

const connectorSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  provider: z.enum(["openai", "anthropic", "mistral", "azure_openai", "copilot", "custom"]),
  model: z.string().optional(),
  apiKey: z.string().optional(),
});

const tokenLimitSchema = z.object({
  memberId: z.string().uuid(),
  interval: z.enum(["day", "week", "month"]),
  limitTokens: z.coerce.number().int().positive(),
});

const chatFileSchema = z.object({
  chatId: z.string().uuid(),
  fileId: z.string().uuid(),
});

const chatGroupSchema = z.object({
  chatId: z.string().uuid(),
  groupId: z.string().uuid(),
});

const chatConnectorSchema = z.object({
  chatId: z.string().uuid(),
  connectorId: z.string().uuid(),
});

export async function createChat(formData: FormData) {
  const { organization } = await requireAdmin();
  const data = chatSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  const db = getDb();
  await db.insert(chats).values({
    organizationId: organization.id,
    name: data.name,
    description: data.description,
  });

  revalidatePath("/admin");
}

export async function createGroup(formData: FormData) {
  const { organization } = await requireAdmin();
  const data = groupSchema.parse({
    name: formData.get("name"),
  });

  const db = getDb();
  await db.insert(groups).values({
    organizationId: organization.id,
    name: data.name,
  });

  revalidatePath("/admin");
}

export async function createConnector(formData: FormData) {
  const { organization } = await requireAdmin();
  const data = connectorSchema.parse({
    name: formData.get("name"),
    provider: formData.get("provider"),
    model: formData.get("model") || undefined,
    apiKey: formData.get("apiKey") || undefined,
  });

  const db = getDb();
  await db.insert(llmConnectors).values({
    organizationId: organization.id,
    name: data.name,
    provider: data.provider,
    model: data.model,
    apiKeyEncrypted: data.apiKey,
  });

  revalidatePath("/admin");
}

export async function setTokenLimit(formData: FormData) {
  const data = tokenLimitSchema.parse({
    memberId: formData.get("memberId"),
    interval: formData.get("interval"),
    limitTokens: formData.get("limitTokens"),
  });

  const db = getDb();
  await db.insert(tokenLimits).values(data);

  revalidatePath("/admin");
}

export async function uploadFile(formData: FormData) {
  const { organization } = await requireAdmin();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    throw new Error("File is required");
  }

  const db = getDb();
  const blob = await put(`org-${organization.id}/${file.name}`, file, {
    access: "private",
  });

  await db.insert(files).values({
    organizationId: organization.id,
    name: file.name,
    blobUrl: blob.url,
    mimeType: file.type,
    size: file.size,
    metadata: { pathname: blob.pathname },
  });

  revalidatePath("/admin");
}

export async function linkChatToFile(formData: FormData) {
  const data = chatFileSchema.parse({
    chatId: formData.get("chatId"),
    fileId: formData.get("fileId"),
  });

  const db = getDb();
  await db.insert(chatFiles).values(data);

  revalidatePath("/admin");
}

export async function linkChatToGroup(formData: FormData) {
  const data = chatGroupSchema.parse({
    chatId: formData.get("chatId"),
    groupId: formData.get("groupId"),
  });

  const db = getDb();
  await db.insert(chatGroups).values(data);

  revalidatePath("/admin");
}

export async function linkChatToConnector(formData: FormData) {
  const data = chatConnectorSchema.parse({
    chatId: formData.get("chatId"),
    connectorId: formData.get("connectorId"),
  });

  const db = getDb();
  await db.insert(chatLlmConnectors).values(data);

  revalidatePath("/admin");
}
