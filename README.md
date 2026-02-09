# Simple Ragent

Private, company-only AI chat with admin-managed context, access control, and usage limits. Built for organizations that need a secure RAG-powered chat platform with fine-grained control over LLM providers, document access, and token budgets.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui + Lucide icons
- NextAuth (Google, Microsoft, Credentials)
- next-intl (en + pl)
- Neon Postgres + Drizzle ORM + pgvector
- Cloudflare R2 (file storage)
- OpenAI embeddings (text-embedding-3-small)
- Vercel AI SDK (streaming chat)
- LLM providers: Anthropic Claude, OpenAI, Azure OpenAI, GitHub Copilot, Mistral

## Features

- **Multi-provider LLM chat** — streaming responses via Anthropic Claude, OpenAI, Azure OpenAI, GitHub Copilot
- **RAG pipeline** — upload files (PDF, Word, Markdown, Text), auto-chunk, embed with OpenAI, vector search with pgvector
- **Organization-scoped** — all data isolated per organization
- **Role-based access** — admin and member roles, group-based chat permissions
- **Token limits** — daily/weekly/monthly enforcement per member and per chat
- **Admin dashboard** — statistics, token usage breakdown, file/member/chat management
- **Member invitations** — email-based invite system with SMTP
- **Multi-language** — English and Polish via next-intl
- **OAuth + Credentials auth** — Google, Microsoft, email/password via NextAuth

## Scripts

```bash
pnpm dev              # Development server (Turbopack)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run database migrations
```

## Environment

Copy `.env.example` to `.env.local` and fill in keys:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `OPENAI_API_KEY` | OpenAI API key (for embeddings) |
| `OPENAI_EMBEDDINGS_MODEL` | Embedding model (default: text-embedding-3-small) |
| `OPENAI_EMBEDDINGS_DIM` | Embedding dimensions (default: 1536) |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key (optional fallback) |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint (optional) |
| `AZURE_OPENAI_API_VERSION` | Azure API version (default: 2024-10-21) |
| `AUTH_SECRET` | NextAuth secret |
| `AUTH_URL` | NextAuth URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID |
| `MICROSOFT_TENANT_ID` | Microsoft tenant ID |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth secret |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_SECURE` | TLS enabled (true/false) |
| `SMTP_FROM` | Sender email address |
| `APP_URL` | App URL for invite links (default: http://localhost:3000) |

## Routes

### Public

- `/(en|pl)` — Landing page
- `/(en|pl)/sign-in` — Sign in
- `/(en|pl)/sign-up` — Sign up
- `/(en|pl)/invite/[token]` — Accept invitation

### Member (authenticated)

- `/(en|pl)/app` — Chat workspace home
- `/(en|pl)/app/chats/[chatId]` — Chat interface
- `/(en|pl)/app/sessions/[sessionId]` — Chat session view
- `/(en|pl)/create-organization` — Organization creation

### Admin

- `/(en|pl)/admin` — Dashboard with stats
- `/(en|pl)/admin/chats` — Chat management (CRUD, file/group/connector linking)
- `/(en|pl)/admin/files` — File management (upload, rename, delete)
- `/(en|pl)/admin/groups` — Group management (CRUD, member assignment)
- `/(en|pl)/admin/members` — Member list and role management
- `/(en|pl)/admin/members/invite` — Send invitations
- `/(en|pl)/admin/connectors` — LLM provider configuration
- `/(en|pl)/admin/limits` — Token limit configuration

### API

- `POST /api/chat/stream` — Streaming chat responses
- `POST /api/chat/sessions` — Create chat session
- `POST /api/models` — List available models for a provider
- `/api/auth/[...nextauth]` — NextAuth handler

## Architecture

```
src/
├── app/                  # Next.js App Router
│   ├── api/              # API routes (chat streaming, auth, models)
│   └── [locale]/         # i18n routes (app, admin, auth)
├── components/           # React components
│   ├── admin/            # Admin panel components
│   ├── app/              # Chat UI components
│   ├── auth/             # Auth forms and OAuth buttons
│   └── ui/               # shadcn/ui base components
├── db/
│   ├── schema.ts         # Drizzle schema (all tables)
│   └── index.ts          # Database client
├── lib/
│   ├── ai-provider.ts    # Multi-LLM provider abstraction
│   ├── embeddings.ts     # OpenAI embedding generation
│   ├── retrieval.ts      # Vector similarity search
│   ├── chat-history.ts   # Conversation summarization
│   ├── token-limits.ts   # Token limit enforcement
│   ├── messages.ts       # Message persistence
│   ├── storage/r2.ts     # Cloudflare R2 operations
│   ├── tools/            # AI tool definitions (search_documents)
│   ├── email.ts          # SMTP email service
│   └── file-text.ts      # Text extraction (PDF, Word, Markdown)
├── messages/             # Translation files (en.json, pl.json)
└── i18n/                 # next-intl configuration
```
