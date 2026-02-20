# Sourcery - AI-Powered Restaurant Sourcing Platform

## Project Overview
B2B restaurant-supplier marketplace built with Next.js 15, React 19, Prisma/PostgreSQL, Clerk auth, Claude AI, and Resend email.

## Architecture
- **Monorepo**: Turborepo with npm workspaces
  - `apps/web` — Next.js 15 app (App Router)
  - `packages/database` — Prisma schema + client
  - `packages/shared` — Shared types, utils, constants
  - `packages/ui` — Reusable React components

## Key Conventions

### API Route Auth Pattern
```ts
const { userId } = await auth();
if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const user = await prisma.user.findUnique({
  where: { clerkId: userId },
  include: { restaurant: true },
});
if (!user?.restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
```

### Prisma Singleton
- Import from `@/lib/prisma` (uses global singleton pattern for dev hot reload)

### Decimal Conversion
- All monetary fields use `Decimal` in Prisma, convert with `Number()` in API responses
- Example: `subtotal: Number(order.subtotal)`

### Email Service
- `@/lib/email` exports `sendEmail()` and `emailTemplates`
- Uses Resend with lazy initialization; gracefully skips if `RESEND_API_KEY` not set

### Anthropic Client
- `@/lib/anthropic` exports `getAnthropicClient()` with lazy init singleton
- Returns `null` if `ANTHROPIC_API_KEY` not set

### Validation
- Zod schemas in `@/lib/validations/index.ts`
- Use `validateBody()` helper from `@/lib/validations/validate.ts` in POST/PATCH routes

### Testing
- **Framework**: Vitest with vitest-mock-extended
- **Mocks**: `__tests__/mocks/` (prisma, clerk, email, anthropic, inngest, supabase)
- **Fixtures**: `__tests__/fixtures/index.ts` — `createMock*()` helpers with Decimal types
- **Helpers**: `__tests__/helpers.ts` — `createRequest()`, `createJsonRequest()`, `parseResponse()`
- **Run**: `npm run test` (vitest run), `npm run test:watch` (vitest)

### UI Components
- Radix UI primitives wrapped in `components/ui/`
- Styling: Tailwind CSS + `class-variance-authority` + `tailwind-merge`
- Icons: `lucide-react`

### Data Fetching
- React Query hooks in `hooks/use-*.ts`
- API fetcher utility: `@/lib/api` — `apiFetch<T>(url, options)`
- Query keys: `@/lib/query-keys.ts`

### AI Chat
- SSE streaming via `app/api/ai/chat/route.ts`
- Tool definitions in `lib/ai/tools.ts`, executor in `lib/ai/tool-executor.ts`
- Chat sidebar accessible from dashboard header

### Real-time
- Supabase Realtime subscriptions via `hooks/use-realtime.ts`
- Domain hooks invalidate React Query caches on changes

### Background Jobs
- Inngest functions in `lib/inngest/functions/`
- Serve route: `app/api/inngest/route.ts`
- Events emitted from API routes after status changes

## Commands
```bash
npm run dev          # Start dev server
npm run build        # Build all packages
npm run lint         # Lint all packages
npm run test         # Run all tests
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
```

## Environment Variables
See `.env.example` for all required variables.
