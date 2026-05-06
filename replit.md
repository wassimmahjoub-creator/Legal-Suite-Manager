# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This is a full-stack law firm management SaaS called **محامي بلوس (Mahami Plus)** — built for Tunisian lawyers with a fully Tunisian Arabic (Darija) interface, RTL layout, dark navy + gold theme, and a floating numeric keypad.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS v4 (artifacts/law-firm)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (jsonwebtoken + bcryptjs), stored in localStorage, 7-day expiry, signed with SESSION_SECRET
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Routing**: Wouter
- **UI**: shadcn/ui components
- **Font**: Cairo (Google Fonts, Arabic)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
  - After codegen, immediately run: `echo 'export * from "./generated/api";' > lib/api-zod/src/index.ts`
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm run typecheck:libs` — rebuild lib packages (run after adding new DB schema tables)

## Features

- **المصادقة** — Auth: JWT login, first-time setup, multi-user roles (مدير/محامي/سكرتيرة/متربص/محاسب)
- **لوحة القيادة** — Dashboard: 4 summary cards, today's sessions + tasks, alerts
- **القضايا** — Cases: list, filters, detail with tabs (overview, docs, tasks, calendar, billing, notes)
- **الحرفاء** — Clients: list, search, cards
- **الخصوم** — Opponents: CRUD, linked to cases
- **الاستشارات** — Consultations: CRUD, linked to clients, revenue tracking
- **الفوترة** — Billing: invoice table with numeric keypad integration
- **الرزنامة** — Calendar: events grouped by date
- **الوثائق** — Documents: list by case
- **النماذج** — Document templates: CRUD, {{variable}} syntax, preview + download as .txt
- **البحث الشامل** — Global search: Ctrl+K modal, searches cases/clients/events/consultations
- **Floating Numeric Keypad**: Fixed right-side panel on desktop, bottom sheet on mobile

## Database Schema

Tables: `clients`, `cases`, `invoices`, `tasks`, `events`, `documents`, `conversations`, `messages`, `users`, `opponents`, `consultations`, `templates`

## Auth Architecture

- `artifacts/api-server/src/middleware/auth.ts` — JWT verification, `requireAuth` middleware, `signToken`
- `artifacts/api-server/src/routes/auth.ts` — /auth/status, /auth/setup, /auth/login, /auth/me, /auth/users
- `artifacts/api-server/src/routes/index.ts` — `softAuth` middleware: PUBLIC paths = [/auth/status, /auth/login, /auth/setup, /healthz]
- `artifacts/law-firm/src/context/AuthContext.tsx` — AuthProvider, useAuth hook, `authFetch` helper, calls `setAuthTokenGetter` so generated hooks also send Bearer token
- First run: GET /api/auth/status → `{hasUsers: false}` → Login page shows setup form

## Important Notes

- `lib/api-zod/src/index.ts` must only export from `./generated/api` (not `./generated/types`) to avoid naming conflicts
- The codegen regenerates `index.ts` — always fix it immediately after running codegen
- UI is fully RTL with `dir="rtl"` on the `<html>` element
- All text in Tunisian Arabic (Darija)
- New pages use `authFetch` helper (not generated hooks) since they predate the OpenAPI spec
- Pre-existing TS errors exist in tasks.ts, cases.ts, clients.ts, events.ts — do not introduce new ones

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
