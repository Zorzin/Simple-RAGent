# AI Instructions
- Read this file at the start of each session.

## Project overview
Private, company-only AI chat with admin-managed context, access control, and usage limits.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Clerk authentication
- next-intl (en + pl)
- Neon Postgres
- Cloudflare R2
- OpenAI embeddings


## Development Commands

### Build and server start:
_Note - Do not run this commands if not asked otherwise._
```bash
# Development server with Turbopack
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start
```

### Listing and formatting:

_Note - Run this commands at the end of every finished job_
```bash
# Linting
pnpm lint

# Format
pnpm format
```

### Database:

_Note - run this commands only if needed by making changes in db schema_

```bash
# Generate:
pnpm db:generate

# Migrate:
pnpm db:migrate
```

## Architecture design

### Frontend

- Use TailwindCSS for styling if possible.
- Always create components for UI elements. If some component might be reused across multiple pages, create a shared component with parameters.
- Always create Props interfaces for components. They should be called same as components with "Props" suffix, eg. for ArticleComponent it should be ArticleComponentProps.
- Always use TypeScript for type safety and better code maintainability.

### Backend
- Make sure to always use server-side actions if it is possible.
- Do not create API endpoints within Next.js project if it is not 100% necessary.
- Use server-side actions for any operations that require database access or complex logic.
- Use Server-Side-Rendering (SSR) for pages that require dynamic content or data fetching.
- Always use TypeScript for type safety and better code maintainability.

## Rules

- At the end of every task/job, ask if this should be commited or needs any more work.
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