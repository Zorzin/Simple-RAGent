# Simple Ragent

Private, company-only AI chat with admin-managed context, access control, and usage limits.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Clerk authentication
- next-intl (en + pl)
- Neon Postgres (planned)
- Cloudflare R2 (planned)

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm format`

## Environment

Copy `.env.example` to `.env.local` and fill in keys.

## Routes (WIP)

- `/en` or `/pl` landing
- `/en/app` member chat workspace
- `/en/admin` admin panel

## Notes

This is the scaffolded foundation. Next steps include data modeling, auth/roles, file uploads + indexing, LLM connectors, and token limit enforcement.
