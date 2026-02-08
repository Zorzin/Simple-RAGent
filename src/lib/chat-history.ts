import { asc, eq } from "drizzle-orm";
import { generateText } from "ai";
import type { ModelMessage } from "ai";

import { getDb } from "@/db";
import { chatSessions, messages } from "@/db/schema";
import { estimateTokens } from "@/lib/embeddings";
import { getLanguageModel, type ProviderName } from "@/lib/ai-provider";

export async function loadSessionHistory(params: {
  sessionId: string;
  maxTokens?: number;
  maxMessages?: number;
}): Promise<{ messages: ModelMessage[]; hasOlderMessages: boolean }> {
  const { sessionId, maxTokens = 6000, maxMessages = 50 } = params;
  const db = getDb();

  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
    })
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt))
    .limit(maxMessages);

  if (rows.length === 0) {
    return { messages: [], hasOlderMessages: false };
  }

  // Sliding window: walk backwards and accumulate until token budget
  let tokenCount = 0;
  let cutoffIndex = rows.length;

  for (let i = rows.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(rows[i].content);
    if (tokenCount + msgTokens > maxTokens) {
      cutoffIndex = i + 1;
      break;
    }
    tokenCount += msgTokens;
    if (i === 0) cutoffIndex = 0;
  }

  const windowedRows = rows.slice(cutoffIndex);
  const hasOlderMessages = cutoffIndex > 0;

  const modelMessages: ModelMessage[] = windowedRows.map((row) => ({
    role: row.role === "user" ? ("user" as const) : ("assistant" as const),
    content: row.content,
  }));

  return { messages: modelMessages, hasOlderMessages };
}

export async function loadSessionWithSummary(params: {
  sessionId: string;
  maxTokens?: number;
  maxMessages?: number;
}): Promise<ModelMessage[]> {
  const { sessionId, maxTokens = 6000, maxMessages = 50 } = params;
  const db = getDb();

  // Load existing summary
  const [session] = await db
    .select({ summary: chatSessions.summary, summaryUpToId: chatSessions.summaryUpToId })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  const { messages: recentMessages, hasOlderMessages } = await loadSessionHistory({
    sessionId,
    maxTokens,
    maxMessages,
  });

  const result: ModelMessage[] = [];

  // Prepend summary if we have one and there are older messages not in the window
  if (session?.summary && hasOlderMessages) {
    result.push({
      role: "user" as const,
      content: `[Previous conversation summary: ${session.summary}]`,
    });
    result.push({
      role: "assistant" as const,
      content: "Understood. I have context from our earlier conversation.",
    });
  }

  result.push(...recentMessages);
  return result;
}

export async function summarizeOlderMessages(params: {
  sessionId: string;
  provider: ProviderName;
  model?: string | null;
  apiKey?: string | null;
  azureEndpoint?: string | null;
  azureApiVersion?: string | null;
  maxTokens?: number;
}) {
  const { sessionId, provider, model, apiKey, azureEndpoint, azureApiVersion, maxTokens = 6000 } =
    params;
  const db = getDb();

  const [session] = await db
    .select({ summaryUpToId: chatSessions.summaryUpToId })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  // Load all messages for the session
  const allMessages = await db
    .select({ id: messages.id, role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));

  if (allMessages.length <= 10) {
    // Not enough messages to warrant summarization
    return;
  }

  // Find messages outside the token window (older ones)
  let tokenCount = 0;
  let cutoffIndex = allMessages.length;

  for (let i = allMessages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(allMessages[i].content);
    if (tokenCount + msgTokens > maxTokens) {
      cutoffIndex = i + 1;
      break;
    }
    tokenCount += msgTokens;
    if (i === 0) cutoffIndex = 0;
  }

  if (cutoffIndex === 0) {
    // All messages fit in the window, no summarization needed
    return;
  }

  const olderMessages = allMessages.slice(0, cutoffIndex);
  const lastOlderId = olderMessages[olderMessages.length - 1]?.id;

  // Skip if we already summarized up to this point
  if (session?.summaryUpToId === lastOlderId) {
    return;
  }

  const conversationText = olderMessages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  try {
    const { text: summary } = await generateText({
      model: getLanguageModel({ provider, model, apiKey, azureEndpoint, azureApiVersion }),
      system:
        "Summarize the following conversation into a concise paragraph. " +
        "Capture the key topics discussed, any decisions made, and important facts mentioned. " +
        "Keep it under 200 words.",
      prompt: conversationText,
      maxOutputTokens: 300,
    });

    if (summary) {
      await db
        .update(chatSessions)
        .set({ summary, summaryUpToId: lastOlderId })
        .where(eq(chatSessions.id, sessionId));
    }
  } catch {
    // Non-critical: don't fail the request if summarization fails
  }
}
