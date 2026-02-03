"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { uploadToR2 } from "@/lib/storage/r2";

import { getDb } from "@/db";

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
  clerkUserId: z.string(),
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
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Organization required");
  }
  const data = tokenLimitSchema.parse({
    clerkUserId: formData.get("clerkUserId"),
    interval: formData.get("interval"),
    limitTokens: formData.get("limitTokens"),
  });

  const db = getDb();
  await db.insert(tokenLimits).values({
    organizationId: (await requireAdmin()).organization.id,
    clerkUserId: data.clerkUserId,
    interval: data.interval,
    limitTokens: data.limitTokens,
  });

  revalidatePath("/admin");
}

export async function uploadFile(formData: FormData) {
  const { organization } = await requireAdmin();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    throw new Error("File is required");
  }

  const db = getDb();
  const key = `org-${organization.id}/${Date.now()}-${file.name}`;
  await uploadToR2({
    key,
    body: file,
    contentType: file.type,
  });

  await db.insert(files).values({
    organizationId: organization.id,
    name: file.name,
    storageProvider: "r2",
    storageKey: key,
    mimeType: file.type,
    size: file.size,
    metadata: null,
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

const inviteSchema = z.object({
  emailAddress: z.string().email(),
  role: z.enum(["org:admin", "org:member"]),
});

export async function inviteMember(formData: FormData) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    throw new Error("Organization required");
  }
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }

  const data = inviteSchema.parse({
    emailAddress: formData.get("emailAddress"),
    role: formData.get("role"),
  });

  const client = await clerkClient();
  await client.organizations.createOrganizationInvitation({
    organizationId: orgId,
    inviterUserId: userId,
    emailAddress: data.emailAddress,
    role: data.role,
  });

  revalidatePath("/admin");
}
