# Project: Revelation — Book Publishing Platform

## What This Project Is
A multi-sided book publishing platform for authors, publishers, and readers, with white-labelling support for publishers. Built on Next.js 14 (App Router) with tRPC, Prisma.

---

## CRITICAL: Code Preservation Rules

### The #1 Rule
**Do not remove, replace, or restructure existing logic unless explicitly approved.**
Existing code — even if it looks redundant, unclear, or unusual — was written with intent. Treat unfamiliar patterns as intentional until proven otherwise.

### What This Means in Practice
- **Augment, don't rewrite.** Add to existing functions/components rather than replacing them.
- **Preserve all conditionals, guards, and edge-case handling** even if they seem unnecessary.
- **Never silently remove imports, props, variables, or utility calls** — if something looks unused, flag it and ask before removing.
- **Do not refactor for style or cleanliness** unless that is the explicit task.
- If completing a task requires changing existing logic, **stop and surface it in Plan Mode first** so it can be reviewed and approved before any edits are made.

### Plan Mode Protocol
For any task that involves:
- Modifying the flow of an existing function
- Changing data shapes or API contracts
- Touching auth, middleware, or tRPC router logic
- Restructuring components or file layout

→ **Present the plan first. Wait for approval. Then implement.**

---

## Tech Stack

### Core
- **Framework:** Next.js `14.2.35` — use App Router patterns
- **Language:** TypeScript `^5.5.2`
- **Database ORM:** Prisma `5.15.1` with `@prisma/client`
- **API Layer:** tRPC `^11.0.0-rc.608` with `@trpc/next`, `@trpc/react-query`
- **Auth:** `next-auth ^5.0.0-beta.16` (beta — handle carefully, APIs differ from v4)
- **State:** Zustand `^5.0.0`
- **Server state / caching:** TanStack Query `^5.49.2`

### UI
- **Styling:** Tailwind CSS `^3.3.0`
- **Component primitives:** Radix UI (various `^1.x` and `^2.x` packages)
- **Icons:** Lucide React `^0.360.0`, React Icons `^5.2.1`, FontAwesome `^6.6.0`
- **Animation:** Framer Motion `^11.11.9`
- **Carousel:** Embla Carousel `^8.5.1`
- **Utilities:** `clsx`, `tailwind-merge`, `class-variance-authority`

### Forms & Validation
- React Hook Form `^7.51.5` with `@hookform/resolvers`
- Zod `^3.23.8`

### Editors / Content
- `react-quill` / `react-quill-new`
- `react-editor-js`
- `slate` / `slate-react`
- `mammoth` (Word doc parsing)
- `pdf-lib`

### File / Media
- Uploadcare (`uploadcare-widget ^3.21.8`, `@uploadcare/upload-client ^6.14.2`)
- Vercel Blob `^0.27.0`

### Backend / Infra
- Docker Compose for local infra (`npm run infra`)
- `bcryptjs` for password hashing
- `superjson` for tRPC serialization

---

## Version Awareness — Handle With Care

- **next-auth is beta (`^5.0.0-beta.16`)** — do not apply v4 patterns. Session handling, callbacks, and config differ.
- **tRPC is RC (`^11.0.0-rc.608`)** — API may differ from stable v10/v11 docs. Follow existing router patterns in the codebase exactly.
- **Radix UI packages are mixed versions** — check the specific package version before referencing docs.
- **Zustand is v5** — `createStore` and hook patterns differ from v4. Match existing store implementations.
- **`cmdk ^0.1.7`** — older version, API differs from v1+. Don't upgrade or use v1 patterns.
- **`react-day-picker ^9.x`** — v9 API differs from v8. Match existing usage.

---

## Dev Commands
```bash
npm run dev          # prisma generate + next dev on port 8090
npm run migrate      # prisma migrate dev
npm run generate     # prisma generate only
npm run seed         # seed with tsx
npm run infra        # start Docker infra
npm run type-check   # tsc --noemit (run this after changes)
```

---

## General Implementation Rules

1. **Match existing patterns.** Before implementing anything, read the relevant existing files first. Mirror the conventions you find — naming, file structure, error handling, tRPC procedure style.
2. **TypeScript strictly.** No `any` unless it already exists in that file. Run `npm run type-check` mentally before suggesting code.
3. **tRPC for all API calls.** Don't introduce raw API routes (`/api/...`) unless a tRPC approach is impossible or an existing route already handles it.
4. **Prisma for all DB access.** No raw SQL unless Prisma can't handle the query.
5. **Don't install new packages** without flagging it first. The stack is intentional.
6. **White-labelling is a core concern.** Any UI or config logic that could vary per publisher should be abstracted or flagged as needing white-label consideration.
7. **Multi-role awareness.** The platform serves authors, publishers, and readers. Any feature touching user data or permissions should account for all relevant roles.
7. **Prisma Schema Awareness** Always stay aware of existing schema defined in the shema.prisma file.