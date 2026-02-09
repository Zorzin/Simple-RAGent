# Simple Ragent App Plan

## Vision

Private company AI chat with admin-managed scope, connectors, and usage limits. Members can chat about company files and projects; admins manage files, chats, groups, and model connections. Deployed on Vercel with free-tier SaaS services.

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui + Lucide icons
- NextAuth (Google, Microsoft, Credentials)
- Neon Postgres + Drizzle ORM + pgvector
- Cloudflare R2 (file storage)
- OpenAI embeddings (text-embedding-3-small, 1536 dims)
- Vercel AI SDK (streaming chat)
- next-intl (i18n: en + pl)
- Prettier + ESLint
- Server Actions (primary backend pattern)
- Nodemailer (SMTP email invitations)

## Completed Features

### Auth & Organization Model
- NextAuth with Google, Microsoft, and Credentials providers
- Organization-scoped data isolation
- Role-based access control (admin / member)
- Member invitation system with email (SMTP via Nodemailer)
- Invite accept flow with token-based links
- Organization creation during sign-up

### Chat Core
- Chat sessions with message persistence
- Real-time streaming responses via Vercel AI SDK (`/api/chat/stream`)
- Session management with automatic title generation
- Conversation history with sliding window + summary compression
- Multi-session support per chat
- Role-based chat access enforcement via groups

### File Ingestion + Retrieval (RAG)
- File upload to Cloudflare R2 (PDF, Word, Markdown, Text)
- Automatic text extraction (pdf-parse, mammoth)
- Chunking (1500 chars, 200 char overlap)
- OpenAI embeddings (text-embedding-3-small)
- pgvector similarity search (cosine distance, threshold 0.5)
- `search_documents` tool injected into chat when files attached
- File-to-chat linking via admin panel

### LLM Connectors
- Multi-provider abstraction: Anthropic Claude, OpenAI, Azure OpenAI, GitHub Copilot, Mistral
- Per-chat model selection via admin panel
- Encrypted API key storage per connector
- Dynamic model listing from provider APIs
- Fallback chain: Anthropic -> OpenAI -> Azure -> Others

### Token Limits & Governance
- Token usage tracking per message
- Daily / weekly / monthly limit enforcement
- Per-member and per-chat limits
- 429 response with reset time on limit exceeded
- Token estimation: `Math.ceil(text.length / 4)`

### Admin Panel
- Dashboard with real-time statistics:
  - Total chats, members, tokens, active users (7-day)
  - File stats (count, total size, chunks)
  - Activity metrics (active members, sessions)
  - Token usage breakdown: top 10 by chat, member, group
- Full CRUD for: chats, groups, connectors, files, limits
- Member management with role editing
- Chat linking: files, groups, connectors
- Pagination, sorting, confirm deletes

### Multi-Language Support
- English (en) and Polish (pl)
- Namespaced translations (home, app, admin sections)
- URL-based locale routing

## Work In Progress

- Copilot connector integration refinement (GitHub Copilot Extensions API)
- Mistral provider full implementation
- Admin UX polish as issues are found

## Planned / Future

- Vercel deployment guide and environment setup
- Custom connector support (bring your own endpoint)
- Advanced analytics and usage reports
- File preview in chat (inline document rendering)
- Bulk file upload and management
- Webhook notifications for admin events
- Audit log for admin actions

## Resolved Decisions

- Copilot product: GitHub Copilot (Extensions)
- Embeddings provider: OpenAI embeddings (text-embedding-3-small)
- Org model: NextAuth + custom organizations table
- Auth providers: Google OAuth, Microsoft Azure AD, Credentials
- Vector DB: pgvector extension on Neon Postgres
- Streaming: Vercel AI SDK with streamText()
- File storage: Cloudflare R2 via AWS SDK v3

## Database Schema (Tables)

| Table | Purpose |
|---|---|
| `users` | User accounts |
| `accounts` | OAuth provider linkage |
| `sessions` | NextAuth sessions |
| `verificationTokens` | Email verification |
| `organizations` | Company workspaces |
| `members` | User-org membership with roles |
| `groups` | User groups for access control |
| `groupMembers` | Group membership join table |
| `chats` | Chat definitions scoped to org |
| `chatSessions` | Individual user sessions within chats |
| `messages` | Message history with token counts |
| `chatGroups` | Chat-to-group access control |
| `chatLlmConnectors` | Chat-to-model binding |
| `files` | Uploaded documents metadata |
| `fileChunks` | Text chunks with vector embeddings |
| `chatFiles` | Chat-to-file association |
| `llmConnectors` | LLM provider credentials |
| `chatTokenLimits` | Per-chat token limits |
| `tokenLimits` | Per-member token limits |
| `memberInvites` | Pending invitation tokens |
