Read AGENTS.md file in order to get instructions on how to use the app.

## Quick reference

- **Framework:** Next.js 16 App Router + TypeScript
- **DB:** Neon Postgres + Drizzle ORM + pgvector — schema in `src/db/schema.ts`
- **Auth:** NextAuth (Google, Microsoft, Credentials) — config in `src/auth.ts`, middleware in `src/middleware.ts`
- **LLM:** Multi-provider via `src/lib/ai-provider.ts` (Claude, OpenAI, Azure, Copilot)
- **RAG:** Embeddings in `src/lib/embeddings.ts`, search in `src/lib/retrieval.ts`, tools in `src/lib/tools/`
- **Storage:** Cloudflare R2 via `src/lib/storage/r2.ts`
- **i18n:** next-intl with `src/messages/en.json` and `src/messages/pl.json`
- **Server actions:** Located in `src/app/[locale]/*/actions.ts`
- **API routes:** `src/app/api/` (chat streaming, sessions, models, auth)
- **Admin panel:** `src/app/[locale]/admin/` with components in `src/components/admin/`
- **Chat UI:** Components in `src/components/app/`

## Important patterns

- All data is organization-scoped — always filter by organizationId.
- Prefer server actions over API routes. API routes are only for streaming and auth.
- Run `pnpm lint && pnpm format` after every completed task.
- Run `pnpm db:generate && pnpm db:migrate` only when schema changes.
