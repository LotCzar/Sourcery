# FreshSheet

AI-powered restaurant sourcing platform that helps restaurants discover suppliers, compare prices, and streamline ordering.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes, PostgreSQL (Supabase), Prisma ORM
- **Auth:** Clerk
- **AI:** Claude API (Anthropic)
- **Monorepo:** Turborepo

## Project Structure

```
freshsheet/
├── apps/
│   └── web/                 # Next.js web application
├── packages/
│   ├── database/            # Prisma schema & client
│   ├── shared/              # Shared types & utilities
│   └── ui/                  # Shared UI components
├── turbo.json
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm, pnpm, or yarn
- PostgreSQL database (or Supabase account)
- Clerk account
- Anthropic API key

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd freshsheet
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

5. Push database schema:
   ```bash
   npm run db:push
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build all packages and apps
- `npm run lint` - Run ESLint across the monorepo
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run format` - Format code with Prettier

## Packages

### @freshsheet/web

The main Next.js web application with:
- Dashboard for restaurant owners
- Supplier marketplace
- Order management
- AI-powered recommendations

### @freshsheet/database

Prisma schema and database client including models for:
- Users & Authentication
- Restaurants & Menu Items
- Suppliers & Products
- Orders & Notifications

### @freshsheet/shared

Shared TypeScript types, utility functions, and constants.

### @freshsheet/ui

Reusable React components for consistent branding.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `ANTHROPIC_API_KEY` | Claude API key |
| `NEXT_PUBLIC_APP_URL` | Application URL |

## License

Private - All rights reserved
