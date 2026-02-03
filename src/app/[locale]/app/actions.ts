"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { chatFiles, chatLlmConnectors, chatSessions, chats, llmConnectors } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { estimateTokens } from "@/lib/embeddings";
import { generateResponse } from "@/lib/llm";
import { safeInsertMessage } from "@/lib/messages";
import { getOrCreateMember } from "@/lib/organization";
import { searchFileChunks } from "@/lib/retrieval";
import { getTokenLimitStatus } from "@/lib/token-limits";

const sendSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1),
});

export async function sendMessage(formData: FormData) {
  const data = sendSchema.parse({
    sessionId: formData.get("sessionId"),
    content: formData.get("content"),
  });

  const db = getDb();
  const { organization, member } = await getOrCreateMember();
  await requireUser();

  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, data.sessionId))
    .limit(1);

  if (!session) {
    throw new Error("Chat session not found");
  }

  const [chat] = await db.select().from(chats).where(eq(chats.id, session.chatId));

  if (!chat || chat.organizationId !== organization.id) {
    throw new Error("Chat not found");
  }

  const fileRows = await db
    .select({ fileId: chatFiles.fileId })
    .from(chatFiles)
    .where(eq(chatFiles.chatId, chat.id));

  const fileIds = fileRows.map((row) => row.fileId);
  const retrieved = fileIds.length
    ? await searchFileChunks({ query: data.content, fileIds, limit: 5 })
    : [];

  const context = retrieved.map((chunk, index) => `#${index + 1}: ${chunk.content}`).join("\n\n");

  const connectorRows = await db
    .select({
      provider: llmConnectors.provider,
      model: llmConnectors.model,
      apiKey: llmConnectors.apiKeyEncrypted,
    })
    .from(chatLlmConnectors)
    .leftJoin(llmConnectors, eq(chatLlmConnectors.connectorId, llmConnectors.id))
    .where(eq(chatLlmConnectors.chatId, chat.id));

  const availableConnectors = connectorRows.filter(
    (
      row,
    ): row is {
      provider: "anthropic" | "openai" | "mistral" | "azure_openai" | "copilot" | "custom";
      model: string | null;
      apiKey: string | null;
    } => Boolean(row.provider),
  );

  const connector =
    availableConnectors.find((row) => row.provider === "anthropic") ||
    availableConnectors.find((row) => row.provider === "openai") ||
    availableConnectors.find((row) => row.provider === "copilot") ||
    availableConnectors[0];

  const systemPrompt = `You are a company assistant. Use the provided context when relevant. If context is missing, answer normally and mention uncertainty.\n\nContext:\n${context || "No relevant context."}`;
  const maxOutputTokens = 800;
  const promptTokens = estimateTokens(`${systemPrompt}\n\n${data.content}`);

  const resolvedApiKey =
    connector?.provider === "anthropic"
      ? (connector.apiKey ?? process.env.ANTHROPIC_API_KEY)
      : connector?.provider === "openai"
        ? (connector.apiKey ?? process.env.OPENAI_API_KEY)
        : connector?.provider === "copilot"
          ? (connector.apiKey ?? process.env.GITHUB_TOKEN)
          : (connector?.apiKey ?? null);

  if (connector?.provider && !resolvedApiKey) {
    throw new Error("Selected connector is missing an API key.");
  }

  const limitStatus = await getTokenLimitStatus({
    organizationId: organization.id,
    clerkUserId: member.clerkUserId,
    memberId: member.id,
    chatId: chat.id,
    tokensToConsume: promptTokens + maxOutputTokens,
  });

  if (limitStatus.blocked) {
    throw new Error("Token limit exceeded");
  }

  const assistantReply = connector?.provider
    ? await generateResponse({
        provider: connector.provider,
        model: connector.model,
        apiKey: connector.apiKey ?? undefined,
        system: systemPrompt,
        user: data.content,
        maxOutputTokens,
      })
    : context
      ? `I found relevant context:\n\n${context}\n\nConnect a model to get a full answer.`
      : "No model connected yet. Connect a model to reply.";

  await safeInsertMessage({
    chatId: chat.id,
    sessionId: session.id,
    memberId: member.id,
    role: "user",
    content: data.content,
    tokenCount: promptTokens,
  });

  await safeInsertMessage({
    chatId: chat.id,
    sessionId: session.id,
    memberId: member.id,
    role: "assistant",
    content: assistantReply,
    tokenCount: estimateTokens(assistantReply),
  });

  revalidatePath(`/app/sessions/${session.id}`);
}
