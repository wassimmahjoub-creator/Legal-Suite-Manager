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

## Features

- **لوحة القيادة** — Dashboard: 4 summary cards, today's sessions + tasks, alerts
- **القضايا** — Cases: list, filters, detail with tabs (overview, docs, tasks, calendar, billing, notes)
- **الحرفاء** — Clients: list, search, cards
- **الفوترة** — Billing: invoice table with numeric keypad integration
- **الرزنامة** — Calendar: events grouped by date
- **الوثائق** — Documents: list by case
- **الإعدادات** — Settings placeholder
- **Floating Numeric Keypad**: Fixed right-side panel on desktop, bottom sheet on mobile

## Database Schema

Tables: `clients`, `cases`, `invoices`, `tasks`, `events`, `documents`

## Important Notes

- `lib/api-zod/src/index.ts` must only export from `./generated/api` (not `./generated/types`) to avoid naming conflicts
- The codegen regenerates `index.ts` — always fix it immediately after running codegen
- UI is fully RTL with `dir="rtl"` on the `<html>` element
- All text in Tunisian Arabic (Darija)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
