# AI Instructions

- Read this file at the start of each session.

## Project overview

Private, company-only AI chat with admin-managed context, access control, and usage limits. Organization-scoped RAG platform where admins manage files, chats, groups, LLM connectors, and token budgets. Members interact with AI through streaming chat with document retrieval.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui + Lucide icons
- NextAuth (Google, Microsoft, Credentials)
- next-intl (en + pl)
- Neon Postgres + Drizzle ORM + pgvector
- Cloudflare R2 (file storage)
- OpenAI embeddings (text-embedding-3-small, 1536 dims)
- Vercel AI SDK (streaming chat)
- LLM providers: Anthropic Claude, OpenAI, Azure OpenAI, GitHub Copilot, Mistral
- Nodemailer (SMTP email for invitations)

## Development Commands

### Build and server start:

_Note - Do not run these commands if not asked otherwise._

```bash
# Development server with Turbopack
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start
```

### Linting and formatting:

_Note - Run these commands at the end of every finished job._

```bash
# Linting
pnpm lint

# Format
pnpm format
```

### Database:

_Note - Run these commands only if needed by making changes in db schema._

```bash
# Generate Drizzle migrations:
pnpm db:generate

# Run migrations:
pnpm db:migrate
```

## Key directories

```
src/
├── app/[locale]/         # All routes (app, admin, auth pages + server actions)
├── app/api/              # API routes (chat/stream, chat/sessions, models, auth)
├── components/admin/     # Admin panel components
├── components/app/       # Chat UI components (ChatClient, ChatInput, ChatSidebar, etc.)
├── components/auth/      # Auth forms (SignIn, SignUp, OAuth, CreateOrg, AcceptInvite)
├── components/ui/        # shadcn/ui base components
├── db/schema.ts          # Drizzle schema (all tables and relations)
├── db/index.ts           # Database client
├── lib/ai-provider.ts    # Multi-LLM provider abstraction
├── lib/embeddings.ts     # OpenAI embedding generation
├── lib/retrieval.ts      # pgvector similarity search
├── lib/chat-history.ts   # Conversation history + summarization
├── lib/token-limits.ts   # Token limit checking + enforcement
├── lib/messages.ts       # Message persistence
├── lib/storage/r2.ts     # Cloudflare R2 file operations
├── lib/tools/            # AI tools (search_documents for RAG)
├── lib/email.ts          # SMTP email service
├── lib/file-text.ts      # Text extraction (PDF, Word, Markdown, Text)
├── messages/             # Translation files (en.json, pl.json)
└── i18n/                 # next-intl configuration
```

## Architecture design

### Frontend

- Use TailwindCSS for styling if possible.
- Always create components for UI elements. If some component might be reused across multiple pages, create a shared component with parameters.
- Always create Props interfaces for components. They should be called same as components with "Props" suffix, eg. for ArticleComponent it should be ArticleComponentProps.
- Always use TypeScript for type safety and better code maintainability.
- Use shadcn/ui base components from `src/components/ui/`.
- Chat UI uses `useChat` hook from `@ai-sdk/react` with streaming.

### Backend

- Make sure to always use server-side actions if it is possible.
- Do not create API endpoints within Next.js project if it is not 100% necessary.
- Use server-side actions for any operations that require database access or complex logic.
- Use Server-Side-Rendering (SSR) for pages that require dynamic content or data fetching.
- Always use TypeScript for type safety and better code maintainability.
- The streaming chat endpoint (`/api/chat/stream`) is an exception — API routes are needed for streaming.
- LLM providers are abstracted via `src/lib/ai-provider.ts` — use this for all LLM interactions.
- File uploads go through Cloudflare R2 via `src/lib/storage/r2.ts`.
- Embeddings are generated via `src/lib/embeddings.ts` using OpenAI.
- Vector search is in `src/lib/retrieval.ts` using pgvector cosine distance.

### Database

- Schema is defined in `src/db/schema.ts` using Drizzle ORM.
- All data is organization-scoped — always filter queries by organizationId.
- Key tables: users, organizations, members, chats, chatSessions, messages, files, fileChunks, llmConnectors, groups, tokenLimits, memberInvites.
- pgvector extension is used for embedding storage and similarity search.

### Authentication

- NextAuth with JWT strategy.
- Providers: Google OAuth, Microsoft Azure AD, Credentials (email/password).
- Protected routes enforced in `src/middleware.ts`.
- Admin role checked via `src/lib/admin.ts`.

## Rules

- At the end of every task/job, ask if this should be committed or needs any more work.
- If something is not clear, ask for clarification.
- If at the process of any task/job a test file was created, make sure to remove it at the end if it is not necessary for app itself.
- Always use ESLint for code linting and formatting.
- Always use Prettier for code formatting.
- Keep changes minimal, clean, and well-structured.
- Prefer readable, maintainable code over cleverness.
- After completing work, always run:
  - `pnpm lint`
  - `pnpm format`
- If either command fails, fix issues before finishing.
- Do not remove any feature or part of the feature without asking first.
- If some part of the app is not working correctly, then we should always try to fix that, not remove it.
