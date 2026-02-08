import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { getDb } from "@/db";
import { chatFiles, chatLlmConnectors, chatSessions, chats, llmConnectors } from "@/db/schema";
import { auth } from "@/lib/auth";
import { estimateTokens } from "@/lib/embeddings";
import { generateResponse } from "@/lib/llm";
import { getOrCreateMember } from "@/lib/organization";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { searchFileChunks } from "@/lib/retrieval";
import { getTokenLimitStatus } from "@/lib/token-limits";
import { safeInsertMessage } from "@/lib/messages";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ errorCode: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { sessionId?: string; content?: string; locale?: string };
  const locale = body.locale || "en";
  const tChat = await getTranslations({ locale, namespace: "app.chat" });
  const tPrompts = await getTranslations({ locale, namespace: "app.prompts" });

  if (!body.sessionId || !body.content) {
    return NextResponse.json({ errorCode: "invalidPayload" }, { status: 400 });
  }

  const db = getDb();
  const { organization, member } = await getOrCreateMember();

  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, body.sessionId))
    .limit(1);
  if (!session) {
    return NextResponse.json({ errorCode: "sessionNotFound" }, { status: 404 });
  }

  const [chat] = await db.select().from(chats).where(eq(chats.id, session.chatId)).limit(1);
  if (!chat || chat.organizationId !== organization.id) {
    return NextResponse.json({ errorCode: "chatNotFound" }, { status: 404 });
  }

  const fileRows = await db
    .select({ fileId: chatFiles.fileId })
    .from(chatFiles)
    .where(eq(chatFiles.chatId, chat.id));

  const fileIds = fileRows.map((row) => row.fileId);
  const retrieved = fileIds.length
    ? await searchFileChunks({ query: body.content, fileIds, limit: 5 })
    : [];

  const context = retrieved.map((chunk, index) => `#${index + 1}: ${chunk.content}`).join("\n\n");
  const contextText = context || tPrompts("noContext");

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

  const systemPrompt = tPrompts("system", { context: contextText });
  const maxOutputTokens = 800;
  const promptTokens = estimateTokens(`${systemPrompt}\n\n${body.content}`);

  const resolvedApiKey =
    connector?.provider === "anthropic"
      ? connector.apiKey || process.env.ANTHROPIC_API_KEY
      : connector?.provider === "openai"
        ? connector.apiKey || process.env.OPENAI_API_KEY
        : connector?.provider === "copilot"
          ? connector.apiKey || process.env.GITHUB_TOKEN
          : connector?.apiKey || null;

  if (connector?.provider && !resolvedApiKey) {
    return NextResponse.json(
      {
        errorCode: "missingApiKey",
      },
      { status: 400 },
    );
  }

  const limitStatus = await getTokenLimitStatus({
    organizationId: organization.id,
    memberId: member.id,
    chatId: chat.id,
    tokensToConsume: promptTokens + maxOutputTokens,
  });

  if (limitStatus.blocked) {
    return NextResponse.json(
      {
        errorCode: "tokenLimit",
        limits: limitStatus.items,
      },
      { status: 429 },
    );
  }

  await safeInsertMessage({
    chatId: chat.id,
    sessionId: session.id,
    memberId: member.id,
    role: "user",
    content: body.content,
    tokenCount: promptTokens,
  });

  const encoder = new TextEncoder();
  let finalText = "";
  const shouldGenerateTitle =
    !session.title || session.title.trim().length === 0 || session.title === chat.name;
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!connector?.provider) {
          const fallback = context
            ? tChat("fallbackWithContext", { context })
            : tChat("fallbackNoModel");
          finalText = fallback;
          controller.enqueue(encoder.encode(`data: ${fallback}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
          await safeInsertMessage({
            chatId: chat.id,
            sessionId: session.id,
            memberId: member.id,
            role: "assistant",
            content: finalText,
            tokenCount: estimateTokens(finalText),
          });
          return;
        }

        if (connector.provider === "anthropic") {
          const client = new Anthropic({
            apiKey: resolvedApiKey,
          });
          const streamResponse = await client.messages.create({
            model: connector.model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20240620",
            max_tokens: maxOutputTokens,
            system: systemPrompt,
            messages: [{ role: "user", content: body.content }],
            stream: true,
          });

          for await (const event of streamResponse) {
            if (event.type === "content_block_delta") {
              const delta = (event as { delta?: { text?: string } }).delta?.text;
              if (delta) {
                finalText += delta;
                controller.enqueue(encoder.encode(`data: ${delta}\n\n`));
              }
            }
          }
        } else if (connector.provider === "openai") {
          const client = new OpenAI({
            apiKey: resolvedApiKey,
          });
          const streamResponse = await client.responses.create({
            model: connector.model || process.env.OPENAI_MODEL || "gpt-4o-mini",
            input: [
              { role: "system", content: systemPrompt },
              { role: "user", content: body.content },
            ],
            max_output_tokens: maxOutputTokens,
            stream: true,
          });

          for await (const event of streamResponse) {
            if (event.type === "response.output_text.delta") {
              const delta = (event as { delta?: string }).delta;
              if (delta) {
                finalText += delta;
                controller.enqueue(encoder.encode(`data: ${delta}\n\n`));
              }
            }
          }
        } else if (connector.provider === "copilot") {
          const client = new OpenAI({
            apiKey: resolvedApiKey,
            baseURL: process.env.GITHUB_COPILOT_BASE_URL || "https://api.githubcopilot.com",
          });
          const streamResponse = await client.chat.completions.create({
            model: connector.model || process.env.GITHUB_COPILOT_MODEL || "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: body.content },
            ],
            max_tokens: maxOutputTokens,
            stream: true,
          });

          for await (const chunk of streamResponse) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              finalText += delta;
              controller.enqueue(encoder.encode(`data: ${delta}\n\n`));
            }
          }
        } else {
          const fallback = tChat("unsupportedProvider");
          finalText = fallback;
          controller.enqueue(encoder.encode(`data: ${fallback}\n\n`));
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();

        await safeInsertMessage({
          chatId: chat.id,
          sessionId: session.id,
          memberId: member.id,
          role: "assistant",
          content: finalText,
          tokenCount: estimateTokens(finalText),
        });

        if (shouldGenerateTitle && connector?.provider) {
          try {
            const titlePrompt = tPrompts("titlePrompt", {
              user: body.content,
              assistant: finalText,
            });
            const title = await generateResponse({
              provider: connector.provider,
              model: connector.model,
              apiKey: resolvedApiKey,
              system: tPrompts("titleSystem"),
              user: titlePrompt,
              maxOutputTokens: 20,
            });

            const cleaned = title
              .trim()
              .replace(/^\"|\"$/g, "")
              .slice(0, 80);
            if (cleaned) {
              await db
                .update(chatSessions)
                .set({ title: cleaned })
                .where(eq(chatSessions.id, session.id));
            }
          } catch {
            // Ignore title generation errors.
          }
        }
      } catch {
        controller.enqueue(encoder.encode(`data: [ERROR]\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
