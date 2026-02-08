import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { streamText, stepCountIs } from "ai";

import { getDb } from "@/db";
import { chatFiles, chatLlmConnectors, chatSessions, chats, llmConnectors } from "@/db/schema";
import { auth } from "@/lib/auth";
import { estimateTokens } from "@/lib/embeddings";
import { getOrCreateMember } from "@/lib/organization";
import { getTokenLimitStatus } from "@/lib/token-limits";
import { safeInsertMessage } from "@/lib/messages";
import { getLanguageModel, resolveApiKey, type ProviderName } from "@/lib/ai-provider";
import { generateResponse } from "@/lib/llm";
import { createSearchDocumentsTool } from "@/lib/tools/search-documents";
import { loadSessionWithSummary, summarizeOlderMessages } from "@/lib/chat-history";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ errorCode: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Support both custom format { sessionId, content, locale }
  // and useChat format { messages: [...], sessionId, locale }
  const sessionId: string | undefined = body.sessionId;
  const locale: string = body.locale || "en";
  const userContent: string | undefined =
    body.content ||
    (() => {
      // Extract last user message from useChat format
      if (Array.isArray(body.messages)) {
        const lastUserMsg = [...body.messages].reverse().find((m: { role: string }) => m.role === "user");
        if (lastUserMsg) {
          // UIMessage format: has parts array
          if (Array.isArray(lastUserMsg.parts)) {
            const textPart = lastUserMsg.parts.find((p: { type: string }) => p.type === "text");
            return textPart?.text;
          }
          // Simple format: has content string
          return lastUserMsg.content;
        }
      }
      return undefined;
    })();

  const tChat = await getTranslations({ locale, namespace: "app.chat" });
  const tPrompts = await getTranslations({ locale, namespace: "app.prompts" });

  if (!sessionId || !userContent) {
    return NextResponse.json({ errorCode: "invalidPayload" }, { status: 400 });
  }

  const db = getDb();
  const { organization, member } = await getOrCreateMember();

  const [chatSession] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);
  if (!chatSession) {
    return NextResponse.json({ errorCode: "sessionNotFound" }, { status: 404 });
  }

  const [chat] = await db.select().from(chats).where(eq(chats.id, chatSession.chatId)).limit(1);
  if (!chat || chat.organizationId !== organization.id) {
    return NextResponse.json({ errorCode: "chatNotFound" }, { status: 404 });
  }

  // Get file IDs attached to this chat
  const fileRows = await db
    .select({ fileId: chatFiles.fileId })
    .from(chatFiles)
    .where(eq(chatFiles.chatId, chat.id));
  const fileIds = fileRows.map((row) => row.fileId);

  // Get LLM connector
  const connectorRows = await db
    .select({
      provider: llmConnectors.provider,
      model: llmConnectors.model,
      apiKey: llmConnectors.apiKeyEncrypted,
      azureEndpoint: llmConnectors.azureEndpoint,
      azureApiVersion: llmConnectors.azureApiVersion,
    })
    .from(chatLlmConnectors)
    .leftJoin(llmConnectors, eq(chatLlmConnectors.connectorId, llmConnectors.id))
    .where(eq(chatLlmConnectors.chatId, chat.id));

  const availableConnectors = connectorRows.filter(
    (
      row,
    ): row is {
      provider: ProviderName;
      model: string | null;
      apiKey: string | null;
      azureEndpoint: string | null;
      azureApiVersion: string | null;
    } => Boolean(row.provider),
  );

  const connector =
    availableConnectors.find((row) => row.provider === "anthropic") ||
    availableConnectors.find((row) => row.provider === "openai") ||
    availableConnectors.find((row) => row.provider === "azure_openai") ||
    availableConnectors.find((row) => row.provider === "copilot") ||
    availableConnectors[0];

  const resolvedKey = resolveApiKey(connector?.provider, connector?.apiKey);

  if (connector?.provider && !resolvedKey) {
    return NextResponse.json({ errorCode: "missingApiKey" }, { status: 400 });
  }

  // System prompt: with or without files
  const systemPrompt = fileIds.length > 0 ? tPrompts("systemWithFiles") : tPrompts("system");

  const maxOutputTokens = 4096;
  const promptTokens = estimateTokens(`${systemPrompt}\n\n${userContent}`);

  // Token limit check
  const limitStatus = await getTokenLimitStatus({
    organizationId: organization.id,
    memberId: member.id,
    chatId: chat.id,
    tokensToConsume: promptTokens + maxOutputTokens,
  });

  if (limitStatus.blocked) {
    return NextResponse.json(
      { errorCode: "tokenLimit", limits: limitStatus.items },
      { status: 429 },
    );
  }

  // Load conversation history BEFORE saving the user message,
  // so the new message isn't duplicated in the history.
  const history = await loadSessionWithSummary({
    sessionId: chatSession.id,
    maxTokens: 6000,
    maxMessages: 50,
  });

  // Save user message
  await safeInsertMessage({
    chatId: chat.id,
    sessionId: chatSession.id,
    memberId: member.id,
    role: "user",
    content: userContent,
    tokenCount: promptTokens,
  });

  // No connector: fallback response
  if (!connector?.provider) {
    const fallbackText = tChat("fallbackNoModel");
    await safeInsertMessage({
      chatId: chat.id,
      sessionId: chatSession.id,
      memberId: member.id,
      role: "assistant",
      content: fallbackText,
      tokenCount: estimateTokens(fallbackText),
    });
    return NextResponse.json({ role: "assistant", content: fallbackText });
  }

  // Build tools (only if files are attached)
  const tools =
    fileIds.length > 0 ? { search_documents: createSearchDocumentsTool(fileIds) } : undefined;

  const shouldGenerateTitle =
    !chatSession.title ||
    chatSession.title.trim().length === 0 ||
    chatSession.title === chat.name;

  const provider = connector.provider;
  const connectorModel = connector.model;
  const connectorAzureEndpoint = connector.azureEndpoint;
  const connectorAzureApiVersion = connector.azureApiVersion;

  const result = streamText({
    model: getLanguageModel({
      provider,
      model: connectorModel,
      apiKey: resolvedKey,
      azureEndpoint: connectorAzureEndpoint,
      azureApiVersion: connectorAzureApiVersion,
    }),
    system: systemPrompt,
    messages: [...history, { role: "user" as const, content: userContent }],
    tools,
    stopWhen: stepCountIs(3),
    maxOutputTokens,
    onFinish: async ({ text }) => {
      console.log("[chat/stream] LLM response:", text);

      // Save assistant message
      await safeInsertMessage({
        chatId: chat.id,
        sessionId: chatSession.id,
        memberId: member.id,
        role: "assistant",
        content: text,
        tokenCount: estimateTokens(text),
      });

      // Generate title if needed
      if (shouldGenerateTitle) {
        try {
          const titlePrompt = tPrompts("titlePrompt", {
            user: userContent,
            assistant: text,
          });
          const title = await generateResponse({
            provider,
            model: connectorModel,
            apiKey: resolvedKey,
            azureEndpoint: connectorAzureEndpoint,
            azureApiVersion: connectorAzureApiVersion,
            system: tPrompts("titleSystem"),
            user: titlePrompt,
            maxOutputTokens: 20,
          });

          const cleaned = title
            .trim()
            .replace(/^"|"$/g, "")
            .slice(0, 80);
          if (cleaned) {
            await db
              .update(chatSessions)
              .set({ title: cleaned })
              .where(eq(chatSessions.id, chatSession.id));
          }
        } catch {
          // Ignore title generation errors
        }
      }

      // Deferred summarization (non-blocking)
      summarizeOlderMessages({
        sessionId: chatSession.id,
        provider,
        model: connectorModel,
        apiKey: resolvedKey,
        azureEndpoint: connectorAzureEndpoint,
        azureApiVersion: connectorAzureApiVersion,
      }).catch(() => {});
    },
  });

  return result.toUIMessageStreamResponse();
}
