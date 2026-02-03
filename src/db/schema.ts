import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";

export const memberRole = pgEnum("member_role", ["admin", "member"]);
export const tokenInterval = pgEnum("token_interval", ["day", "week", "month"]);
export const llmProvider = pgEnum("llm_provider", [
  "openai",
  "anthropic",
  "mistral",
  "azure_openai",
  "copilot",
  "custom",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkOrgId: text("clerk_org_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clerkOrgIdx: uniqueIndex("organizations_clerk_org_idx").on(table.clerkOrgId),
  }),
);

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    clerkUserId: text("clerk_user_id").notNull(),
    clerkOrgId: text("clerk_org_id").notNull(),
    orgRole: text("org_role"),
    email: text("email"),
    displayName: text("display_name"),
    role: memberRole("role").default("member").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("members_org_idx").on(table.organizationId),
    clerkIdx: index("members_clerk_idx").on(table.clerkUserId),
    clerkOrgIdx: index("members_clerk_org_idx").on(table.clerkOrgId),
  }),
);

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("groups_org_idx").on(table.organizationId),
  }),
);

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .references(() => groups.id)
      .notNull(),
    memberId: uuid("member_id")
      .references(() => members.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    groupIdx: index("group_members_group_idx").on(table.groupId),
    memberIdx: index("group_members_member_idx").on(table.memberId),
  }),
);

export const chats = pgTable(
  "chats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isGeneral: boolean("is_general").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("chats_org_idx").on(table.organizationId),
  }),
);

export const files = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    name: text("name").notNull(),
    storageProvider: text("storage_provider").notNull().default("r2"),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type"),
    size: integer("size"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("files_org_idx").on(table.organizationId),
  }),
);

const VECTOR_DIMENSION = 1536;

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return `vector(${VECTOR_DIMENSION})`;
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    if (Array.isArray(value)) {
      return value as number[];
    }
    if (typeof value === "string") {
      return value
        .replace(/[\\[\\]\\s]/g, "")
        .split(",")
        .filter(Boolean)
        .map((part) => Number(part));
    }
    return [] as number[];
  },
});

export const fileChunks = pgTable(
  "file_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fileId: uuid("file_id")
      .references(() => files.id)
      .notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count").notNull(),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    fileIdx: index("file_chunks_file_idx").on(table.fileId),
  }),
);

export const chatFiles = pgTable(
  "chat_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chat_id")
      .references(() => chats.id)
      .notNull(),
    fileId: uuid("file_id")
      .references(() => files.id)
      .notNull(),
  },
  (table) => ({
    chatIdx: index("chat_files_chat_idx").on(table.chatId),
    fileIdx: index("chat_files_file_idx").on(table.fileId),
  }),
);

export const chatGroups = pgTable(
  "chat_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chat_id")
      .references(() => chats.id)
      .notNull(),
    groupId: uuid("group_id")
      .references(() => groups.id)
      .notNull(),
  },
  (table) => ({
    chatIdx: index("chat_groups_chat_idx").on(table.chatId),
    groupIdx: index("chat_groups_group_idx").on(table.groupId),
  }),
);

export const llmConnectors = pgTable(
  "llm_connectors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    name: text("name").notNull(),
    provider: llmProvider("provider").notNull(),
    model: text("model"),
    apiKeyEncrypted: text("api_key_encrypted"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("llm_connectors_org_idx").on(table.organizationId),
  }),
);

export const chatLlmConnectors = pgTable(
  "chat_llm_connectors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chat_id")
      .references(() => chats.id)
      .notNull(),
    connectorId: uuid("connector_id")
      .references(() => llmConnectors.id)
      .notNull(),
  },
  (table) => ({
    chatIdx: index("chat_llm_chat_idx").on(table.chatId),
    connectorIdx: index("chat_llm_connector_idx").on(table.connectorId),
  }),
);

export const chatTokenLimits = pgTable(
  "chat_token_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chat_id")
      .references(() => chats.id)
      .notNull(),
    interval: tokenInterval("interval").notNull(),
    limitTokens: integer("limit_tokens").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    chatIdx: index("chat_token_limits_chat_idx").on(table.chatId),
  }),
);

export const tokenLimits = pgTable(
  "token_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    clerkUserId: text("clerk_user_id").notNull(),
    interval: tokenInterval("interval").notNull(),
    limitTokens: integer("limit_tokens").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    memberIdx: index("token_limits_member_idx").on(table.clerkUserId),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chat_id")
      .references(() => chats.id)
      .notNull(),
    sessionId: uuid("session_id"),
    memberId: uuid("member_id").references(() => members.id),
    role: text("role").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    chatIdx: index("messages_chat_idx").on(table.chatId),
    memberIdx: index("messages_member_idx").on(table.memberId),
    sessionIdx: index("messages_session_idx").on(table.sessionId),
  }),
);

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chat_id")
      .references(() => chats.id)
      .notNull(),
    memberId: uuid("member_id").references(() => members.id),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    chatIdx: index("chat_sessions_chat_idx").on(table.chatId),
    memberIdx: index("chat_sessions_member_idx").on(table.memberId),
  }),
);
