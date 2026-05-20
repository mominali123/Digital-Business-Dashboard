# Identity.

A SaaS digital business card platform where users sign up, build an interactive business card with live preview, and publish it to a shareable `/c/username` URL with QR code and HTML export.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/card-platform run dev` — run the frontend (port assigned via $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui components, Wouter router
- Auth: Clerk (managed), with Clerk proxy on Express for cross-domain tokens
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec`)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/card-platform/` — React + Vite frontend, served at `/`
- `artifacts/api-server/` — Express API server, served at `/api`
- `lib/db/src/schema/cards.ts` — source-of-truth DB schema (Drizzle)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source-of-truth for API contract)
- `lib/api-client-react/src/generated/` — generated React Query hooks (from Orval)
- `artifacts/card-platform/src/pages/Editor.tsx` — main editor page (content / links / design tabs, live preview, publish flow)
- `artifacts/card-platform/src/pages/PublicCard.tsx` — public card renderer (`/c/:username`) + reusable `CardDisplay` component
- `artifacts/api-server/src/routes/cards.ts` — all card CRUD, publish/unpublish, QR, export, username-check endpoints

## Architecture decisions

- **Contract-first API**: OpenAPI spec lives in `lib/api-spec`, Orval generates React Query hooks and Zod schemas — never hand-write API calls on the client.
- **Clerk proxy on Express**: The API server proxies Clerk's FAPI via `/api/__clerk/` so the frontend works cross-domain on Replit's proxied preview pane.
- **JSONB links**: Card links are stored as a JSONB array in Postgres (type, label, url, icon, sortOrder). Serialized/deserialized in routes.
- **Auto-save with debounce**: Editor debounces changes by 800ms then auto-saves (POST on first save, PATCH on subsequent). No manual save button.
- **CardDisplay component**: Shared between the Editor live preview and the public `/c/:username` page — single source of truth for card rendering.

## Product

- **Landing page**: Clean serif headline, sign-up CTA.
- **Sign in / Sign up**: Clerk-managed auth pages styled to match the app theme.
- **Editor** (`/editor`, auth-gated): Three-tab form (Content / Links / Design). Live card preview on the right. Auto-saves on change. Publish modal with username availability check. QR code display + SVG download. HTML export download.
- **Public card** (`/c/:username`): Full-screen animated card with scatter icon background, pulsing logo ring, staggered link entrance animations. Custom accent color, text color, background color, and font from card design settings.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Never call service ports directly in curl/tests — always go through `localhost:80/api/...` (the shared proxy).
- `pnpm run typecheck` trusts tsc output; editor LSP diagnostics may lag. Run typecheck after generating codegen outputs.
- After schema changes, run `pnpm --filter @workspace/db run push` then `pnpm --filter @workspace/api-spec run codegen` if API types change.
- Clerk warning about "development keys" in console is expected in dev — not an error.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
