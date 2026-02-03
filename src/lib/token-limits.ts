import { and, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { messages, tokenLimits } from "@/db/schema";

export type TokenInterval = "day" | "week" | "month";

export type TokenLimitStatus = {
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
  tokensToConsume: number;
}) {
  const { organizationId, clerkUserId, memberId, tokensToConsume } = params;
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

  if (limits.length === 0) {
    return { blocked: false, items: [] as TokenLimitStatus[] };
  }

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
        interval: limit.interval,
        limitTokens: limit.limitTokens,
        usedTokens,
        remainingTokens,
        wouldExceed: remainingTokens < tokensToConsume,
      } as TokenLimitStatus;
    }),
  );

  const blocked = items.some((item) => item.wouldExceed);
  return { blocked, items };
}
