import { eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  chats,
  chatSessions,
  fileChunks,
  files,
  groupMembers,
  groups,
  members,
  messages,
} from "@/db/schema";

export type DashboardStats = {
  totalChats: number;
  totalMembers: number;
  totalTokens: number;
  activeMembers7d: number;
  activeSessions7d: number;
  fileStats: { fileCount: number; totalSizeBytes: number; chunkCount: number };
  tokensPerChat: { id: string; name: string; tokens: number }[];
  tokensPerUser: { id: string; name: string; tokens: number }[];
  tokensPerGroup: { id: string; name: string; tokens: number }[];
};

export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  const db = getDb();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    [chatCount],
    [memberCount],
    [tokenSum],
    [activeMemberCount],
    [activeSessionCount],
    [fileCount],
    [chunkCount],
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(chats)
      .where(eq(chats.organizationId, organizationId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(members)
      .where(eq(members.organizationId, organizationId)),
    db
      .select({ total: sql<number>`coalesce(sum(${messages.tokenCount}), 0)` })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(eq(chats.organizationId, organizationId)),
    db
      .select({ count: sql<number>`count(distinct ${messages.memberId})` })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(
        sql`${chats.organizationId} = ${organizationId} AND ${messages.createdAt} >= ${sevenDaysAgo}`,
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(chatSessions)
      .innerJoin(chats, eq(chatSessions.chatId, chats.id))
      .where(
        sql`${chats.organizationId} = ${organizationId} AND ${chatSessions.createdAt} >= ${sevenDaysAgo}`,
      ),
    db
      .select({
        count: sql<number>`count(*)`,
        totalSize: sql<number>`coalesce(sum(${files.size}), 0)`,
      })
      .from(files)
      .where(eq(files.organizationId, organizationId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(fileChunks)
      .innerJoin(files, eq(fileChunks.fileId, files.id))
      .where(eq(files.organizationId, organizationId)),
  ]);

  const [tokensPerChat, tokensPerUser, tokensPerGroup] = await Promise.all([
    db
      .select({
        id: chats.id,
        name: chats.name,
        tokens: sql<number>`coalesce(sum(${messages.tokenCount}), 0)`,
      })
      .from(chats)
      .leftJoin(messages, eq(messages.chatId, chats.id))
      .where(eq(chats.organizationId, organizationId))
      .groupBy(chats.id, chats.name)
      .orderBy(sql`coalesce(sum(${messages.tokenCount}), 0) desc`)
      .limit(10),
    db
      .select({
        id: members.id,
        name: sql<string>`coalesce(${members.displayName}, ${members.email})`,
        tokens: sql<number>`coalesce(sum(${messages.tokenCount}), 0)`,
      })
      .from(members)
      .leftJoin(messages, eq(messages.memberId, members.id))
      .where(eq(members.organizationId, organizationId))
      .groupBy(members.id, members.displayName, members.email)
      .orderBy(sql`coalesce(sum(${messages.tokenCount}), 0) desc`)
      .limit(10),
    db
      .select({
        id: groups.id,
        name: groups.name,
        tokens: sql<number>`coalesce(sum(${messages.tokenCount}), 0)`,
      })
      .from(groups)
      .leftJoin(groupMembers, eq(groupMembers.groupId, groups.id))
      .leftJoin(messages, eq(messages.memberId, groupMembers.memberId))
      .where(eq(groups.organizationId, organizationId))
      .groupBy(groups.id, groups.name)
      .orderBy(sql`coalesce(sum(${messages.tokenCount}), 0) desc`)
      .limit(10),
  ]);

  return {
    totalChats: Number(chatCount?.count ?? 0),
    totalMembers: Number(memberCount?.count ?? 0),
    totalTokens: Number(tokenSum?.total ?? 0),
    activeMembers7d: Number(activeMemberCount?.count ?? 0),
    activeSessions7d: Number(activeSessionCount?.count ?? 0),
    fileStats: {
      fileCount: Number(fileCount?.count ?? 0),
      totalSizeBytes: Number((fileCount as { totalSize?: number })?.totalSize ?? 0),
      chunkCount: Number(chunkCount?.count ?? 0),
    },
    tokensPerChat: tokensPerChat.map((r) => ({
      id: r.id,
      name: r.name,
      tokens: Number(r.tokens),
    })),
    tokensPerUser: tokensPerUser.map((r) => ({
      id: r.id,
      name: r.name ?? "",
      tokens: Number(r.tokens),
    })),
    tokensPerGroup: tokensPerGroup.map((r) => ({
      id: r.id,
      name: r.name,
      tokens: Number(r.tokens),
    })),
  };
}
