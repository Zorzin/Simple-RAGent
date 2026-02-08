"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  chatFiles,
  chatGroups,
  chatLlmConnectors,
  chatSessions,
  chatTokenLimits,
  chats,
  fileChunks,
  files,
  groupMembers,
  groups,
  llmConnectors,
  messages,
  memberInvites,
  members,
  tokenLimits,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { chunkText, embedTexts, estimateTokens } from "@/lib/embeddings";
import { sendInviteEmail } from "@/lib/email";
import { extractTextFromBuffer } from "@/lib/file-text";
import { deleteFromR2, downloadFromR2, uploadToR2 } from "@/lib/storage/r2";
import { getAppUrl } from "@/lib/url";

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
  azureEndpoint: z.string().url().optional(),
  azureApiVersion: z.string().optional(),
});

const connectorUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Name is too short"),
  provider: z.enum(["openai", "anthropic", "mistral", "azure_openai", "copilot", "custom"]),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  azureEndpoint: z.string().url().optional(),
  azureApiVersion: z.string().optional(),
});

const tokenLimitSchema = z.object({
  memberId: z.string().uuid(),
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
  emailAddress: z.string().trim().email(),
  role: z.enum(["admin", "member"]),
});

const revokeInviteSchema = z.object({
  invitationId: z.string().min(1),
});

const resendInviteSchema = z.object({
  invitationId: z.string().min(1),
  emailAddress: z.string().trim().email(),
  role: z.enum(["admin", "member"]),
});

const memberRoleSchema = z.object({
  membershipId: z.string(),
  role: z.enum(["admin", "member"]),
});

export async function createChat(formData: FormData) {
  try {
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
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to create chat." };
  }
}

export async function updateChat(formData: FormData) {
  try {
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
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to update chat." };
  }
}

export async function deleteChat(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const db = getDb();
  await db.delete(chatFiles).where(eq(chatFiles.chatId, id));
  await db.delete(chatGroups).where(eq(chatGroups.chatId, id));
  await db.delete(chatLlmConnectors).where(eq(chatLlmConnectors.chatId, id));
  await db.delete(chatTokenLimits).where(eq(chatTokenLimits.chatId, id));
  await db.delete(chatSessions).where(eq(chatSessions.chatId, id));
  await db.delete(messages).where(eq(messages.chatId, id));
  await db.delete(chats).where(eq(chats.id, id));
  revalidatePath("/admin/chats");
  redirect("/admin/chats");
}

export async function createGroup(formData: FormData) {
  try {
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
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to create group." };
  }
}

export async function updateGroup(formData: FormData) {
  try {
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
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to update group." };
  }
}

export async function deleteGroup(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const db = getDb();
  await db.delete(groups).where(eq(groups.id, id));
  revalidatePath("/admin/groups");
  redirect("/admin/groups");
}

export async function createConnector(formData: FormData) {
  try {
    const { organization } = await requireAdmin();
    const data = connectorSchema.parse({
      name: formData.get("name"),
      provider: formData.get("provider"),
      model: formData.get("model") || undefined,
      apiKey: formData.get("apiKey") || undefined,
      azureEndpoint: formData.get("azureEndpoint") || undefined,
      azureApiVersion: formData.get("azureApiVersion") || undefined,
    });

    const db = getDb();
    await db.insert(llmConnectors).values({
      organizationId: organization.id,
      name: data.name,
      provider: data.provider,
      model: data.model,
      apiKeyEncrypted: data.apiKey,
      azureEndpoint: data.azureEndpoint,
      azureApiVersion: data.azureApiVersion,
    });

    revalidatePath("/admin/connectors");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to create connector." };
  }
}

export async function updateConnector(formData: FormData) {
  try {
    const data = connectorUpdateSchema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
      provider: formData.get("provider"),
      model: formData.get("model") || undefined,
      apiKey: formData.get("apiKey") || undefined,
      azureEndpoint: formData.get("azureEndpoint") || undefined,
      azureApiVersion: formData.get("azureApiVersion") || undefined,
    });

    const db = getDb();
    const updateValues: {
      name: string;
      provider: typeof data.provider;
      model?: string;
      apiKeyEncrypted?: string;
      azureEndpoint?: string | null;
      azureApiVersion?: string | null;
    } = {
      name: data.name,
      provider: data.provider,
      model: data.model,
      azureEndpoint: data.azureEndpoint ?? null,
      azureApiVersion: data.azureApiVersion ?? null,
    };

    if (data.apiKey) {
      updateValues.apiKeyEncrypted = data.apiKey;
    }

    await db.update(llmConnectors).set(updateValues).where(eq(llmConnectors.id, data.id));

    revalidatePath("/admin/connectors");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to update connector." };
  }
}

export async function deleteConnector(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const db = getDb();
  await db.delete(llmConnectors).where(eq(llmConnectors.id, id));
  revalidatePath("/admin/connectors");
  redirect("/admin/connectors");
}

export async function setTokenLimit(formData: FormData) {
  try {
    const data = tokenLimitSchema.parse({
      memberId: formData.get("memberId"),
      interval: formData.get("interval"),
      limitTokens: formData.get("limitTokens"),
    });

    const db = getDb();
    const { organization } = await requireAdmin();
    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, data.memberId), eq(members.organizationId, organization.id)))
      .limit(1);
    if (!member) {
      return { ok: false as const, error: "Member not found" };
    }
    const [existing] = await db
      .select()
      .from(tokenLimits)
      .where(
        and(
          eq(tokenLimits.organizationId, organization.id),
          eq(tokenLimits.memberId, data.memberId),
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
        memberId: data.memberId,
        interval: data.interval,
        limitTokens: data.limitTokens,
      });
    }

    revalidatePath("/admin/limits");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to set token limit." };
  }
}

export async function updateTokenLimit(formData: FormData) {
  try {
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
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to update token limit." };
  }
}

export async function deleteTokenLimit(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const db = getDb();
  await db.delete(tokenLimits).where(eq(tokenLimits.id, id));
  revalidatePath("/admin/limits");
  redirect("/admin/limits");
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromBuffer({
      buffer,
      mimeType: file.type,
      filename: file.name,
    });
    if (text) {
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

export async function embedFile(formData: FormData) {
  const { organization } = await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const db = getDb();
  const [file] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!file || file.organizationId !== organization.id) {
    throw new Error("File not found");
  }

  if (!file.storageKey) {
    throw new Error("File storage key missing");
  }

  const buffer = await downloadFromR2(file.storageKey);
  const text = await extractTextFromBuffer({
    buffer,
    mimeType: file.mimeType,
    filename: file.name,
  });

  await db.delete(fileChunks).where(eq(fileChunks.fileId, file.id));

  if (!text) {
    revalidatePath("/admin/files");
    return;
  }

  const chunks = chunkText(text);
  if (chunks.length) {
    const embeddings = await embedTexts(chunks);
    if (embeddings.length) {
      const values = chunks.map((content, index) => ({
        fileId: file.id,
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
  try {
    const data = fileRenameSchema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
    });

    const db = getDb();
    await db.update(files).set({ name: data.name }).where(eq(files.id, data.id));
    revalidatePath("/admin/files");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to rename file." };
  }
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
  redirect("/admin/files");
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
  const { organization, member } = await requireAdmin();
  const data = inviteSchema.parse({
    emailAddress: formData.get("emailAddress"),
    role: formData.get("role"),
  });
  const locale = formData.get("locale") === "pl" ? "pl" : "en";

  const db = getDb();
  const normalizedEmail = data.emailAddress.toLowerCase();
  const [existingMember] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.organizationId, organization.id), eq(members.email, normalizedEmail)))
    .limit(1);

  if (existingMember) {
    return { ok: false, error: "Member already exists." };
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(memberInvites).values({
    organizationId: organization.id,
    email: normalizedEmail,
    role: data.role,
    token,
    createdByUserId: member.userId,
    expiresAt,
  });

  const inviteUrl = `${getAppUrl()}/${locale}/invite/${token}`;
  try {
    await sendInviteEmail({
      to: normalizedEmail,
      organizationName: organization.name,
      inviterName: member.displayName ?? member.email ?? "Admin",
      inviteUrl,
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invite email failed." };
  }

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function revokeInvitation(formData: FormData) {
  const { organization } = await requireAdmin();
  const data = revokeInviteSchema.parse({
    invitationId: formData.get("invitationId"),
  });

  const db = getDb();
  await db
    .update(memberInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(memberInvites.id, data.invitationId),
        eq(memberInvites.organizationId, organization.id),
      ),
    );

  revalidatePath("/admin/members");
}

export async function resendInvitation(formData: FormData) {
  const { organization, member } = await requireAdmin();
  const data = resendInviteSchema.parse({
    invitationId: formData.get("invitationId"),
    emailAddress: formData.get("emailAddress"),
    role: formData.get("role"),
  });
  const locale = formData.get("locale") === "pl" ? "pl" : "en";

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const db = getDb();
  await db
    .update(memberInvites)
    .set({
      token,
      expiresAt,
      revokedAt: null,
      acceptedAt: null,
      acceptedByUserId: null,
    })
    .where(
      and(
        eq(memberInvites.id, data.invitationId),
        eq(memberInvites.organizationId, organization.id),
      ),
    );

  const inviteUrl = `${getAppUrl()}/${locale}/invite/${token}`;
  await sendInviteEmail({
    to: data.emailAddress,
    organizationName: organization.name,
    inviterName: member.displayName ?? member.email ?? "Admin",
    inviteUrl,
  });

  revalidatePath("/admin/members");
}

export async function updateMemberRole(formData: FormData) {
  try {
    const data = memberRoleSchema.parse({
      membershipId: formData.get("membershipId"),
      role: formData.get("role"),
    });

    const { organization } = await requireAdmin();
    const db = getDb();
    await db
      .update(members)
      .set({ role: data.role })
      .where(and(eq(members.id, data.membershipId), eq(members.organizationId, organization.id)));

    revalidatePath("/admin/members");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Failed to update member role." };
  }
}

export async function deleteMemberRole(formData: FormData) {
  const { organization } = await requireAdmin();
  const membershipId = z.string().parse(formData.get("membershipId"));

  const db = getDb();
  await db
    .delete(members)
    .where(and(eq(members.id, membershipId), eq(members.organizationId, organization.id)));

  revalidatePath("/admin/members");
  redirect("/admin/members");
}
