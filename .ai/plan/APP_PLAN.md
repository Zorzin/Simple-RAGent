# Simple Ragent App Plan

## Vision

Private company AI chat with admin-managed scope, connectors, and usage limits. Members can chat about company files and projects; admins manage files, chats, groups, and model connections. Deployed on Vercel with free-tier SaaS services.

## Tech Stack (Chosen)

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui + Lucide icons
- Clerk (auth + invites)
- Neon Postgres + Drizzle ORM
- Cloudflare R2 (file storage)
- next-intl (i18n: en + pl)
- Prettier + ESLint
- Server Actions

## Current Status (Completed)

- Scaffolded Next.js app with Tailwind, TS, ESLint, Prettier
- shadcn/ui initialized + base components installed
- next-intl configured with locales `en` and `pl`
- Clerk integrated (provider + sign-in/up routes + protected routes)
- Drizzle + Neon setup with initial schema
- Admin panel with standard list/create/edit pages and full-width layout:
  - Chats, groups, connectors, files, limits, members, access links
  - Pagination, sorting, confirm deletes
- Upload files to Cloudflare R2 (private objects)
  - Link chats to files / groups / connectors
  - Text files are chunked + embedded
- Member workspace shows chats for org
- Repo initialized + first commit
- Root `/` redirect added to avoid 404
- Admin UI avoids manual ID entry (select inputs)
- Clerk org create route added
- Streaming chat responses for Claude + OpenAI
- Vector search with pgvector + OpenAI embeddings
- Token usage tracking + enforcement (day/week/month)

## Work In Progress

- Wire Clerk invites (organization or invitation API)
- Copilot connector integration (GitHub Copilot API style)
- Admin UX polish as issues are found

## Major Milestones (Planned)

1. **Auth & Org Model**
   - Use Clerk Organizations for membership and invites
   - Implement invite flows (admin only)
   - Sync Clerk users -> DB members

2. **Chat Core**
   - Chat sessions, message persistence
   - Streaming responses
   - Role-based access enforcement

3. **File Ingestion + Retrieval**
   - File upload pipeline (Cloudflare R2)
   - Chunking + embedding (OpenAI embeddings)
   - Vector search (pgvector)
   - Tools/skills mechanism to fetch relevant files in chat

4. **LLM Connectors**
   - Claude (primary)
   - OpenAI (secondary)
   - Copilot (exact product TBD)
   - Admin UI to select per-chat model
   - Secure storage for API keys

5. **Limits & Governance**
   - Token usage tracking
   - Daily/weekly/monthly limit enforcement

6. **Admin UX**
   - Better forms (dropdowns, selectors)
   - Chat-to-file/group/connector linking UI
   - Member management + roles

7. **Deployment**
   - Vercel project setup
   - Environment variables
   - Database migrations

## Resolved Decisions

- Copilot product: GitHub Copilot (Extensions)
- Embeddings provider: OpenAI embeddings (text-embedding-3-small)
- Org model: Clerk Organizations

## Next Steps (Immediate)

- Implement Clerk invites
- Implement token usage tracking + enforcement
- Integrate Copilot connector
