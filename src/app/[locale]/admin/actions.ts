"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  chatFiles,
  chatGroups,
  chatLlmConnectors,
  chats,
  fileChunks,
  files,
  groups,
  llmConnectors,
  tokenLimits,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { chunkText, embedTexts, estimateTokens } from "@/lib/embeddings";
import { deleteFromR2, uploadToR2 } from "@/lib/storage/r2";

const chatSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  description: z.string().optional(),
});

const chatUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Name is too short"),
  description: z.string().optional(),
});

const groupSchema = z.object({
  name: z.string().min(2, "Name is too short"),
});

const groupUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Name is too short"),
});

const connectorSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  provider: z.enum(["openai", "anthropic", "mistral", "azure_openai", "copilot", "custom"]),
  model: z.string().optional(),
  apiKey: z.string().optional(),
});

const connectorUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Name is too short"),
  provider: z.enum(["openai", "anthropic", "mistral", "azure_openai", "copilot", "custom"]),
  model: z.string().optional(),
});

const tokenLimitSchema = z.object({
  clerkUserId: z.string(),
  interval: z.enum(["day", "week", "month"]),
  limitTokens: z.coerce.number().int().positive(),
});

const tokenLimitUpdateSchema = z.object({
  id: z.string().uuid(),
  limitTokens: z.coerce.number().int().positive(),
});

const fileRenameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
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

const inviteSchema = z.object({
  emailAddress: z.string().email(),
  role: z.enum(["org:admin", "org:member"]),
});

const revokeInviteSchema = z.object({
  invitationId: z.string().min(1),
});

const resendInviteSchema = z.object({
  invitationId: z.string().min(1),
  emailAddress: z.string().email(),
  role: z.enum(["org:admin", "org:member"]),
});

const memberRoleSchema = z.object({
  membershipId: z.string(),
  role: z.enum(["org:admin", "org:member"]),
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

  revalidatePath("/admin/chats");
}

export async function updateChat(formData: FormData) {
  const data = chatUpdateSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  const db = getDb();
  await db
    .update(chats)
    .set({ name: data.name, description: data.description })
    .where(eq(chats.id, data.id));

  revalidatePath("/admin/chats");
}

export async function deleteChat(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const db = getDb();
  await db.delete(chats).where(eq(chats.id, id));
  revalidatePath("/admin/chats");
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

  revalidatePath("/admin/groups");
}

export async function updateGroup(formData: FormData) {
  const data = groupUpdateSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
  });

  const db = getDb();
  await db.update(groups).set({ name: data.name }).where(eq(groups.id, data.id));
  revalidatePath("/admin/groups");
}

export async function deleteGroup(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const db = getDb();
  await db.delete(groups).where(eq(groups.id, id));
  revalidatePath("/admin/groups");
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

  revalidatePath("/admin/connectors");
}

export async function updateConnector(formData: FormData) {
  const data = connectorUpdateSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    provider: formData.get("provider"),
    model: formData.get("model") || undefined,
  });

  const db = getDb();
  await db
    .update(llmConnectors)
    .set({ name: data.name, provider: data.provider, model: data.model })
    .where(eq(llmConnectors.id, data.id));

  revalidatePath("/admin/connectors");
}

export async function deleteConnector(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const db = getDb();
  await db.delete(llmConnectors).where(eq(llmConnectors.id, id));
  revalidatePath("/admin/connectors");
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
  const { organization } = await requireAdmin();
  const [existing] = await db
    .select()
    .from(tokenLimits)
    .where(
      and(
        eq(tokenLimits.organizationId, organization.id),
        eq(tokenLimits.clerkUserId, data.clerkUserId),
        eq(tokenLimits.interval, data.interval),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(tokenLimits)
      .set({ limitTokens: data.limitTokens })
      .where(eq(tokenLimits.id, existing.id));
  } else {
    await db.insert(tokenLimits).values({
      organizationId: organization.id,
      clerkUserId: data.clerkUserId,
      interval: data.interval,
      limitTokens: data.limitTokens,
    });
  }

  revalidatePath("/admin/limits");
}

export async function updateTokenLimit(formData: FormData) {
  const data = tokenLimitUpdateSchema.parse({
    id: formData.get("id"),
    limitTokens: formData.get("limitTokens"),
  });

  const db = getDb();
  await db
    .update(tokenLimits)
    .set({ limitTokens: data.limitTokens })
    .where(eq(tokenLimits.id, data.id));

  revalidatePath("/admin/limits");
}

export async function deleteTokenLimit(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const db = getDb();
  await db.delete(tokenLimits).where(eq(tokenLimits.id, id));
  revalidatePath("/admin/limits");
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

  const [storedFile] = await db
    .insert(files)
    .values({
      organizationId: organization.id,
      name: file.name,
      storageProvider: "r2",
      storageKey: key,
      mimeType: file.type,
      size: file.size,
      metadata: null,
    })
    .returning();

  if (file.type.startsWith("text/")) {
    const text = await file.text();
    const chunks = chunkText(text);
    if (chunks.length) {
      const embeddings = await embedTexts(chunks);
      const values = chunks.map((content, index) => ({
        fileId: storedFile.id,
        chunkIndex: index,
        content,
        tokenCount: estimateTokens(content),
        embedding: embeddings[index],
      }));
      await db.insert(fileChunks).values(values);
    }
  }

  revalidatePath("/admin/files");
}

export async function renameFile(formData: FormData) {
  const data = fileRenameSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
  });

  const db = getDb();
  await db.update(files).set({ name: data.name }).where(eq(files.id, data.id));
  revalidatePath("/admin/files");
}

export async function deleteFile(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const db = getDb();
  const [file] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (file?.storageKey) {
    await deleteFromR2(file.storageKey);
  }
  await db.delete(fileChunks).where(eq(fileChunks.fileId, id));
  await db.delete(files).where(eq(files.id, id));
  revalidatePath("/admin/files");
}

export async function linkChatToFile(formData: FormData) {
  const data = chatFileSchema.parse({
    chatId: formData.get("chatId"),
    fileId: formData.get("fileId"),
  });

  const db = getDb();
  await db.insert(chatFiles).values(data);

  revalidatePath("/admin/access");
}

export async function unlinkChatFromFile(formData: FormData) {
  const data = chatFileSchema.parse({
    chatId: formData.get("chatId"),
    fileId: formData.get("fileId"),
  });

  const db = getDb();
  await db
    .delete(chatFiles)
    .where(and(eq(chatFiles.chatId, data.chatId), eq(chatFiles.fileId, data.fileId)));

  revalidatePath("/admin/access");
}

export async function linkChatToGroup(formData: FormData) {
  const data = chatGroupSchema.parse({
    chatId: formData.get("chatId"),
    groupId: formData.get("groupId"),
  });

  const db = getDb();
  await db.insert(chatGroups).values(data);

  revalidatePath("/admin/access");
}

export async function unlinkChatFromGroup(formData: FormData) {
  const data = chatGroupSchema.parse({
    chatId: formData.get("chatId"),
    groupId: formData.get("groupId"),
  });

  const db = getDb();
  await db
    .delete(chatGroups)
    .where(and(eq(chatGroups.chatId, data.chatId), eq(chatGroups.groupId, data.groupId)));

  revalidatePath("/admin/access");
}

export async function linkChatToConnector(formData: FormData) {
  const data = chatConnectorSchema.parse({
    chatId: formData.get("chatId"),
    connectorId: formData.get("connectorId"),
  });

  const db = getDb();
  await db.insert(chatLlmConnectors).values(data);

  revalidatePath("/admin/access");
}

export async function unlinkChatFromConnector(formData: FormData) {
  const data = chatConnectorSchema.parse({
    chatId: formData.get("chatId"),
    connectorId: formData.get("connectorId"),
  });

  const db = getDb();
  await db
    .delete(chatLlmConnectors)
    .where(
      and(
        eq(chatLlmConnectors.chatId, data.chatId),
        eq(chatLlmConnectors.connectorId, data.connectorId),
      ),
    );

  revalidatePath("/admin/access");
}

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

  await clerkClient.organizations.createOrganizationInvitation({
    organizationId: orgId,
    inviterUserId: userId,
    emailAddress: data.emailAddress,
    role: data.role,
  });

  revalidatePath("/admin/members");
}

export async function revokeInvitation(formData: FormData) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    throw new Error("Organization required");
  }
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }

  const data = revokeInviteSchema.parse({
    invitationId: formData.get("invitationId"),
  });

  await clerkClient.organizations.revokeOrganizationInvitation({
    organizationId: orgId,
    invitationId: data.invitationId,
    requestingUserId: userId,
  });

  revalidatePath("/admin/members");
}

export async function resendInvitation(formData: FormData) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    throw new Error("Organization required");
  }
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }

  const data = resendInviteSchema.parse({
    invitationId: formData.get("invitationId"),
    emailAddress: formData.get("emailAddress"),
    role: formData.get("role"),
  });

  await clerkClient.organizations.revokeOrganizationInvitation({
    organizationId: orgId,
    invitationId: data.invitationId,
    requestingUserId: userId,
  });

  await clerkClient.organizations.createOrganizationInvitation({
    organizationId: orgId,
    inviterUserId: userId,
    emailAddress: data.emailAddress,
    role: data.role,
  });

  revalidatePath("/admin/members");
}

export async function updateMemberRole(formData: FormData) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Organization required");
  }
  const data = memberRoleSchema.parse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
  });

  await clerkClient.organizations.updateOrganizationMembership({
    organizationId: orgId,
    membershipId: data.membershipId,
    role: data.role,
  });

  revalidatePath("/admin/members");
}

export async function deleteMemberRole(formData: FormData) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Organization required");
  }
  const membershipId = z.string().parse(formData.get("membershipId"));

  await clerkClient.organizations.deleteOrganizationMembership({
    organizationId: orgId,
    membershipId,
  });

  revalidatePath("/admin/members");
}
