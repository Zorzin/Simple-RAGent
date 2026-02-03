import { and, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { chatTokenLimits, messages, tokenLimits } from "@/db/schema";

export type TokenInterval = "day" | "week" | "month";

export type TokenLimitStatus = {
  scope: "member" | "chat";
  interval: TokenInterval;
  limitTokens: number;
  usedTokens: number;
  remainingTokens: number;
  wouldExceed: boolean;
};

function startOfInterval(date: Date, interval: TokenInterval) {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDate = date.getUTCDate();

  if (interval === "day") {
    return new Date(Date.UTC(utcYear, utcMonth, utcDate));
  }

  if (interval === "week") {
    const day = date.getUTCDay();
    const mondayOffset = (day + 6) % 7;
    return new Date(Date.UTC(utcYear, utcMonth, utcDate - mondayOffset));
  }

  return new Date(Date.UTC(utcYear, utcMonth, 1));
}

export async function getTokenLimitStatus(params: {
  organizationId: string;
  clerkUserId: string;
  memberId: string;
  chatId?: string;
  tokensToConsume: number;
}) {
  const { organizationId, clerkUserId, memberId, chatId, tokensToConsume } = params;
  const db = getDb();
  const limits = await db
    .select({
      interval: tokenLimits.interval,
      limitTokens: tokenLimits.limitTokens,
    })
    .from(tokenLimits)
    .where(
      and(eq(tokenLimits.organizationId, organizationId), eq(tokenLimits.clerkUserId, clerkUserId)),
    );

  const now = new Date();
  const items = await Promise.all(
    limits.map(async (limit) => {
      const start = startOfInterval(now, limit.interval);
      const [row] = await db
        .select({ used: sql<number>`coalesce(sum(${messages.tokenCount}), 0)` })
        .from(messages)
        .where(and(eq(messages.memberId, memberId), gte(messages.createdAt, start)));

      const usedTokens = Number(row?.used ?? 0);
      const remainingTokens = Math.max(0, limit.limitTokens - usedTokens);

      return {
        scope: "member",
        interval: limit.interval,
        limitTokens: limit.limitTokens,
        usedTokens,
        remainingTokens,
        wouldExceed: remainingTokens < tokensToConsume,
      } as TokenLimitStatus;
    }),
  );

  if (chatId) {
    const chatLimits = await db
      .select({
        interval: chatTokenLimits.interval,
        limitTokens: chatTokenLimits.limitTokens,
      })
      .from(chatTokenLimits)
      .where(eq(chatTokenLimits.chatId, chatId));

    const chatItems = await Promise.all(
      chatLimits.map(async (limit) => {
        const start = startOfInterval(now, limit.interval);
        const [row] = await db
          .select({ used: sql<number>`coalesce(sum(${messages.tokenCount}), 0)` })
          .from(messages)
          .where(
            and(
              eq(messages.memberId, memberId),
              eq(messages.chatId, chatId),
              gte(messages.createdAt, start),
            ),
          );

        const usedTokens = Number(row?.used ?? 0);
        const remainingTokens = Math.max(0, limit.limitTokens - usedTokens);

        return {
          scope: "chat",
          interval: limit.interval,
          limitTokens: limit.limitTokens,
          usedTokens,
          remainingTokens,
          wouldExceed: remainingTokens < tokensToConsume,
        } as TokenLimitStatus;
      }),
    );

    items.push(...chatItems);
  }

  const blocked = items.some((item) => item.wouldExceed);
  return { blocked, items };
}
