
# SETVOID — Core Systems Implementation Plan

A large, cross-cutting update. Split into 4 phases so each can be verified before moving on. Phase 1 changes the database; the rest are pure frontend.

---

## Phase 1 — Permanent Gate IDs + Server-side Punishment & HP (DB migration)

**Why first:** all later code depends on the new schema.

### 1A. Permanent Gate ID system
- Add Postgres sequence `gate_id_seq` and trigger so every new row in `public.gates` auto-fills `id_gate` as `GATE-0001`, `GATE-0002`, … (zero-padded, immutable).
- Add `BEFORE UPDATE` trigger that blocks any change to `id_gate` (immutable invariant).
- Add columns to `gates`:
  - `stats jsonb default '{}'` — performance stats (clears, fastest_time, etc.)
  - `rewards_log jsonb default '[]'` — reward history
  - `battle_sessions jsonb default '[]'` — combat history references
- Frontend: `Gate.id` already exists, add `idGate` field surfaced from DB. All gate cards/loot/battle modals key off `idGate`.

### 1B. Persistent Punishment + HP SSoT
Add columns to `public.profiles`:
- `punishment_active boolean default false`
- `punishment_end_at timestamptz`
- `punishment_started_at timestamptz`
- `hp_last_tick_at timestamptz default now()`
- `hp_max integer default 100`

Add Postgres function `apply_punishment_drain(uid uuid)`:
- If `punishment_active` and `now() < punishment_end_at`: compute elapsed seconds since `hp_last_tick_at`, drain HP at fixed rate (1 HP / 30s), clamp ≥ 1, update `hp_last_tick_at`.
- If `now() >= punishment_end_at`: clear punishment flags.
- Returns the updated row.

Frontend calls `apply_punishment_drain` on app focus, on route enter for `/penalty`, and via a 30-second interval while the tab is open. This guarantees the drain persists across logout/close because it is computed from timestamps, not local counters.

All grants/RLS already permit `auth.uid() = user_id`; we'll add `EXECUTE` grant on the function to `authenticated`.

### 1C. HP as Single Source of Truth
- Remove HP duplication in local `useGameState` for Gates/Battle/Penalty: HP read/write goes through `useProfile` (which already wraps `profiles`).
- New hook `useHp()` exposes `{ hp, maxHp, setHp, damage, heal }` writing to `profiles.hp_player` + mirroring into game state for legacy consumers.

---

## Phase 2 — Data prefetching & route preloading

- Add `@tanstack/react-query` `QueryClient` at app root with sane defaults (`staleTime: 60s`, `gcTime: 5m`, `refetchOnWindowFocus: false` except profile).
- On successful login (`useAuth`), kick off background `prefetchQuery` for: profile, gates, inventory, quests, achievements, rankings.
- Route preloading: convert the heavy pages to `React.lazy` with `prefetch on idle` — `Inventory`, `Gates`, `Quests`, `Stats` (Rankings), `Battle`, `Penalty`. After login we trigger the lazy chunks via `requestIdleCallback` so subsequent navigations are instant.
- Global asset preloader: build `src/lib/assetPreload.ts` listing critical PNGs/Lottie URLs and `<link rel="preload">` them from `index.html` head plus an `Image()` warmup on app boot.

---

## Phase 3 — Visual continuity (Skeletons + Lottie)

- Replace the `Loadingsetvoid.gif` reference with a Lottie animation (`lottie-react` + JSON file under `public/lottie/`). Keep `SETVOIDUI.png` as the static fallback.
- Add `Skeleton` placeholders (existing `components/ui/skeleton.tsx`) wherever data fetches gate render: profile card, gate list, inventory grid, quest list, market grid.
- Skeletons mirror final card dimensions exactly to avoid CLS.

---

## Phase 4 — Layout stability (strict dimensions)

- Add new utility classes in `index.css`:
  - `.frame-portrait` → fixed `aspect-ratio: 3/4`, `width:100%`, `object-fit:cover`, `border-radius: var(--radius)`.
  - `.frame-square`, `.frame-card`, `.frame-banner` for the recurring sizes.
- Audit and convert all `<img>` usages in: `ProfileCard`, `CharacterAvatar`, `GateLootModal`, `InventoryPanel`, `Market`, `Battle`, `Dungeon` cards — to use the `frame-*` classes + explicit `width`/`height` attrs.
- Ensure every preload-prone container reserves space (no `h-auto` on image cards).

---

## Technical notes (for engineers)

```text
profiles (additions)
  punishment_active     bool
  punishment_end_at     timestamptz
  punishment_started_at timestamptz
  hp_last_tick_at       timestamptz
  hp_max                int

gates (additions)
  stats            jsonb
  rewards_log      jsonb
  battle_sessions  jsonb
  id_gate          (trigger-managed, immutable: GATE-XXXX)

fn apply_punishment_drain(uid)   -- server-side HP drain
trg gates_lock_id_gate           -- immutability
trg gates_assign_id_gate         -- auto numbering
```

State layer:
- Keep `useGameState` for non-server stuff (quests, inventory cache).
- New `useHp` becomes the only writer of HP → `profiles.hp_player`.
- TanStack Query keys: `['profile', uid]`, `['gates', uid]`, `['inventory', uid]`, `['quests', uid]`.

---

## Deliverables per phase

1. SQL migration + `useHp`, `usePunishment` hooks, refactor of `Penalty.tsx`, `Battle.tsx`, `Dungeon.tsx`, `Gates.tsx`.
2. React Query provider, prefetch hook, lazy routes, `assetPreload.ts`.
3. Lottie loader, Skeleton placements.
4. `frame-*` utilities and image audit.

After Phase 1 lands and the regenerated `types.ts` is in place, Phases 2–4 can ship without further DB work.

Confirm to proceed, or tell me to start with a specific phase only.
