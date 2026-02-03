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
  chatTokenLimits,
  chats,
  fileChunks,
  files,
  groupMembers,
  groups,
  llmConnectors,
  tokenLimits,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { chunkText, embedTexts, estimateTokens } from "@/lib/embeddings";
import { deleteFromR2, uploadToR2 } from "@/lib/storage/r2";

function getClerkErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "errors" in error) {
    const err = error as { errors?: Array<{ longMessage?: string; message?: string }> };
    const first = err.errors?.[0];
    if (first?.longMessage) {
      return first.longMessage;
    }
    if (first?.message) {
      return first.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Clerk request failed.";
}

const chatSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  description: z.string().optional(),
  groupIds: z.array(z.string().uuid()).optional(),
  fileIds: z.array(z.string().uuid()).optional(),
  connectorId: z.string().uuid().optional(),
  limitDay: z.string().optional(),
  limitWeek: z.string().optional(),
  limitMonth: z.string().optional(),
});

const chatUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Name is too short"),
  description: z.string().optional(),
  groupIds: z.array(z.string().uuid()).optional(),
  fileIds: z.array(z.string().uuid()).optional(),
  connectorId: z.string().uuid().optional(),
  limitDay: z.string().optional(),
  limitWeek: z.string().optional(),
  limitMonth: z.string().optional(),
});

const groupSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  memberIds: z.array(z.string().uuid()).optional(),
});

const groupUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Name is too short"),
  memberIds: z.array(z.string().uuid()).optional(),
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
  apiKey: z.string().optional(),
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
    groupIds: formData.getAll("groupIds").filter((id): id is string => typeof id === "string"),
    fileIds: formData.getAll("fileIds").filter((id): id is string => typeof id === "string"),
    connectorId: formData.get("connectorId") || undefined,
    limitDay: formData.get("limitDay")?.toString() || undefined,
    limitWeek: formData.get("limitWeek")?.toString() || undefined,
    limitMonth: formData.get("limitMonth")?.toString() || undefined,
  });

  const db = getDb();
  const [created] = await db
    .insert(chats)
    .values({
      organizationId: organization.id,
      name: data.name,
      description: data.description,
    })
    .returning();

  if (data.groupIds?.length) {
    await db.insert(chatGroups).values(
      data.groupIds.map((groupId) => ({
        chatId: created.id,
        groupId,
      })),
    );
  }

  if (data.fileIds?.length) {
    await db.insert(chatFiles).values(
      data.fileIds.map((fileId) => ({
        chatId: created.id,
        fileId,
      })),
    );
  }

  if (data.connectorId) {
    await db.insert(chatLlmConnectors).values({
      chatId: created.id,
      connectorId: data.connectorId,
    });
  }

  const limitRows = [
    { interval: "day", value: data.limitDay },
    { interval: "week", value: data.limitWeek },
    { interval: "month", value: data.limitMonth },
  ]
    .map((entry) => ({
      interval: entry.interval,
      limitTokens: entry.value ? Number(entry.value) : null,
    }))
    .filter(
      (entry): entry is { interval: "day" | "week" | "month"; limitTokens: number } =>
        Number.isFinite(entry.limitTokens) && (entry.limitTokens ?? 0) > 0,
    );

  if (limitRows.length) {
    await db.insert(chatTokenLimits).values(
      limitRows.map((limit) => ({
        chatId: created.id,
        interval: limit.interval,
        limitTokens: limit.limitTokens,
      })),
    );
  }

  revalidatePath("/admin/chats");
}

export async function updateChat(formData: FormData) {
  const data = chatUpdateSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    groupIds: formData.getAll("groupIds").filter((id): id is string => typeof id === "string"),
    fileIds: formData.getAll("fileIds").filter((id): id is string => typeof id === "string"),
    connectorId: formData.get("connectorId") || undefined,
    limitDay: formData.get("limitDay")?.toString() || undefined,
    limitWeek: formData.get("limitWeek")?.toString() || undefined,
    limitMonth: formData.get("limitMonth")?.toString() || undefined,
  });

  const db = getDb();
  await db
    .update(chats)
    .set({ name: data.name, description: data.description })
    .where(eq(chats.id, data.id));

  await db.delete(chatGroups).where(eq(chatGroups.chatId, data.id));
  if (data.groupIds?.length) {
    await db.insert(chatGroups).values(
      data.groupIds.map((groupId) => ({
        chatId: data.id,
        groupId,
      })),
    );
  }

  await db.delete(chatFiles).where(eq(chatFiles.chatId, data.id));
  if (data.fileIds?.length) {
    await db.insert(chatFiles).values(
      data.fileIds.map((fileId) => ({
        chatId: data.id,
        fileId,
      })),
    );
  }

  await db.delete(chatLlmConnectors).where(eq(chatLlmConnectors.chatId, data.id));
  if (data.connectorId) {
    await db.insert(chatLlmConnectors).values({
      chatId: data.id,
      connectorId: data.connectorId,
    });
  }

  await db.delete(chatTokenLimits).where(eq(chatTokenLimits.chatId, data.id));
  const limitRows = [
    { interval: "day", value: data.limitDay },
    { interval: "week", value: data.limitWeek },
    { interval: "month", value: data.limitMonth },
  ]
    .map((entry) => ({
      interval: entry.interval,
      limitTokens: entry.value ? Number(entry.value) : null,
    }))
    .filter(
      (entry): entry is { interval: "day" | "week" | "month"; limitTokens: number } =>
        Number.isFinite(entry.limitTokens) && (entry.limitTokens ?? 0) > 0,
    );

  if (limitRows.length) {
    await db.insert(chatTokenLimits).values(
      limitRows.map((limit) => ({
        chatId: data.id,
        interval: limit.interval,
        limitTokens: limit.limitTokens,
      })),
    );
  }

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
    memberIds: formData.getAll("memberIds").filter((id): id is string => typeof id === "string"),
  });

  const db = getDb();
  const [created] = await db
    .insert(groups)
    .values({
      organizationId: organization.id,
      name: data.name,
    })
    .returning();

  if (data.memberIds?.length) {
    await db.insert(groupMembers).values(
      data.memberIds.map((memberId) => ({
        groupId: created.id,
        memberId,
      })),
    );
  }

  revalidatePath("/admin/groups");
}

export async function updateGroup(formData: FormData) {
  const data = groupUpdateSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    memberIds: formData.getAll("memberIds").filter((id): id is string => typeof id === "string"),
  });

  const db = getDb();
  await db.update(groups).set({ name: data.name }).where(eq(groups.id, data.id));
  await db.delete(groupMembers).where(eq(groupMembers.groupId, data.id));
  if (data.memberIds?.length) {
    await db.insert(groupMembers).values(
      data.memberIds.map((memberId) => ({
        groupId: data.id,
        memberId,
      })),
    );
  }
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
    apiKey: formData.get("apiKey") || undefined,
  });

  const db = getDb();
  const updateValues: {
    name: string;
    provider: typeof data.provider;
    model?: string;
    apiKeyEncrypted?: string;
  } = {
    name: data.name,
    provider: data.provider,
    model: data.model,
  };

  if (data.apiKey) {
    updateValues.apiKeyEncrypted = data.apiKey;
  }

  await db.update(llmConnectors).set(updateValues).where(eq(llmConnectors.id, data.id));

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
  const filesInput = formData.getAll("files");
  const filesToUpload = filesInput.filter((entry): entry is File => entry instanceof File);

  if (filesToUpload.length === 0) {
    return { ok: false, error: "At least one file is required." };
  }

  const db = getDb();
  const uploaded: string[] = [];

  for (const file of filesToUpload) {
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

    uploaded.push(file.name);

    if (file.type.startsWith("text/")) {
      const text = await file.text();
      const chunks = chunkText(text);
      if (chunks.length) {
        const embeddings = await embedTexts(chunks);
        if (embeddings.length) {
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
    }
  }

  revalidatePath("/admin/files");
  return { ok: true, count: uploaded.length, names: uploaded };
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
    return { ok: false, error: "Organization required" };
  }
  if (!process.env.CLERK_SECRET_KEY) {
    return { ok: false, error: "CLERK_SECRET_KEY is not configured" };
  }

  const client = await clerkClient();
  const data = inviteSchema.parse({
    emailAddress: formData.get("emailAddress"),
    role: formData.get("role"),
  });

  try {
    await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId: userId,
      emailAddress: data.emailAddress,
      role: data.role,
    });
  } catch (error) {
    return { ok: false, error: getClerkErrorMessage(error) };
  }

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function revokeInvitation(formData: FormData) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    throw new Error("Organization required");
  }
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }

  const client = await clerkClient();
  const data = revokeInviteSchema.parse({
    invitationId: formData.get("invitationId"),
  });

  try {
    await client.organizations.revokeOrganizationInvitation({
      organizationId: orgId,
      invitationId: data.invitationId,
      requestingUserId: userId,
    });
  } catch (error) {
    throw new Error(getClerkErrorMessage(error));
  }

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

  const client = await clerkClient();
  const data = resendInviteSchema.parse({
    invitationId: formData.get("invitationId"),
    emailAddress: formData.get("emailAddress"),
    role: formData.get("role"),
  });

  try {
    await client.organizations.revokeOrganizationInvitation({
      organizationId: orgId,
      invitationId: data.invitationId,
      requestingUserId: userId,
    });

    await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId: userId,
      emailAddress: data.emailAddress,
      role: data.role,
    });
  } catch (error) {
    throw new Error(getClerkErrorMessage(error));
  }

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

  const client = await clerkClient();
  try {
    await client.organizations.updateOrganizationMembership({
      organizationId: orgId,
      membershipId: data.membershipId,
      role: data.role,
    });
  } catch (error) {
    throw new Error(getClerkErrorMessage(error));
  }

  revalidatePath("/admin/members");
}

export async function deleteMemberRole(formData: FormData) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Organization required");
  }
  const membershipId = z.string().parse(formData.get("membershipId"));

  const client = await clerkClient();
  try {
    await client.organizations.deleteOrganizationMembership({
      organizationId: orgId,
      membershipId,
    });
  } catch (error) {
    throw new Error(getClerkErrorMessage(error));
  }

  revalidatePath("/admin/members");
}
