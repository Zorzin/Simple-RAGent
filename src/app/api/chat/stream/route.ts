import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { chatFiles, chatLlmConnectors, chats, llmConnectors, messages } from "@/db/schema";
import { auth } from "@/lib/auth";
import { estimateTokens } from "@/lib/embeddings";
import { getOrCreateMember } from "@/lib/organization";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { searchFileChunks } from "@/lib/retrieval";
import { getTokenLimitStatus } from "@/lib/token-limits";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { chatId?: string; content?: string };
  if (!body.chatId || !body.content) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getDb();
  const { organization, member } = await getOrCreateMember();

  const [chat] = await db.select().from(chats).where(eq(chats.id, body.chatId)).limit(1);
  if (!chat || chat.organizationId !== organization.id) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
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
        error: "Selected connector is missing an API key.",
      },
      { status: 400 },
    );
  }

  const limitStatus = await getTokenLimitStatus({
    organizationId: organization.id,
    clerkUserId: member.clerkUserId,
    memberId: member.id,
    chatId: chat.id,
    tokensToConsume: promptTokens + maxOutputTokens,
  });

  if (limitStatus.blocked) {
    return NextResponse.json(
      {
        error: "Token limit exceeded",
        limits: limitStatus.items,
      },
      { status: 429 },
    );
  }

  await db.insert(messages).values({
    chatId: chat.id,
    memberId: member.id,
    role: "user",
    content: body.content,
    tokenCount: promptTokens,
  });

  const encoder = new TextEncoder();
  let finalText = "";
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!connector?.provider) {
          const fallback = context
            ? `I found relevant context:\n\n${context}\n\nConnect a model to get a full answer.`
            : "No model connected yet. Connect a model to reply.";
          finalText = fallback;
          controller.enqueue(encoder.encode(`data: ${fallback}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
          await db.insert(messages).values({
            chatId: chat.id,
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
          const fallback = "Connected provider is not supported for streaming yet.";
          finalText = fallback;
          controller.enqueue(encoder.encode(`data: ${fallback}\n\n`));
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();

        await db.insert(messages).values({
          chatId: chat.id,
          memberId: member.id,
          role: "assistant",
          content: finalText,
          tokenCount: estimateTokens(finalText),
        });
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
