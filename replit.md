# OpenKingdoms

An accessible, single-player HTML5 strategy game where players found a nation, grow settlements, raise forces, and redraw borders on a living campaign map.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/openkingdoms/src/App.tsx` — campaign state, founding flow, actions, accessibility announcements, and edition controls
- `artifacts/openkingdoms/src/components/campaign-canvas.tsx` — HTML5 Canvas map renderer with an accessible DOM region index
- `artifacts/openkingdoms/src/index.css` — shared edition tokens, palettes, responsive layout, focus states, and reduced-motion rules
- `classic` — frozen source branch for the original playable campaign build
- `canvas-edition` — active branch for the Canvas prototype and future editions

## Architecture decisions

- The map uses HTML5 Canvas for visual rendering while region buttons provide a keyboard and screen-reader accessible companion.
- Theme palettes are token-driven and persisted locally so future cosmetics can change without touching game rules.
- Campaign saves are migrated defensively when loaded so older local saves remain usable.
- Classic is preserved as a source branch; new edition work proceeds separately on `canvas-edition`.

## Product

- Found a nation with a custom name and banner
- Inspect and select map regions
- Build barracks, recruit forces, upgrade settlements, and attack adjacent rivals
- Advance turns to gather resources
- Switch between Parchment, Midnight, and Meadow palettes
- Enable reduced motion and use keyboard-friendly region selection

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
