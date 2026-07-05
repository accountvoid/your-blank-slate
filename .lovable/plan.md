# SETVOID — Admin Panel & Item System roadmap

## Phase 1 — DONE (this turn)
- `user_roles` + `app_role` enum (`user`, `moderator`, `admin`, `super_admin`)
- `has_role`, `is_admin_or_higher`, `is_super_admin` (SECURITY DEFINER, EXECUTE revoked)
- `shop_items` catalog (public read active, admins CRUD)
- `gate_items` catalog (public read active, admins CRUD) — fully independent
- `user_inventory` normalized (item_key, source, quantity, expires_at, acquired_at)
- `audit_logs` (admins write/read)
- Seeded current shop (7) + gate drop pool (4)
- Hooks: `useShopItems`, `useGateItems`, `useUserInventory`, `useUserRole`
- Market page reads shop_items via realtime; Dungeon uses `useGateLootGenerator`
- `purchaseItem` accepts DB catalog override so prices/effects come from DB

## Phase 2 — Admin Panel foundation — DONE (this turn)
- `RequireRole` guard using `useUserRole`
- `AdminLayout` with sidebar + mobile top-scroll nav (dark, responsive)
- `AdminTable` reusable (search, sort, paginate, actions slot)
- `logAudit` helper in `src/lib/audit.ts` (never-throws)
- `admin_dashboard_stats()` SECURITY DEFINER RPC (admins only) — users/active/registrations/gates/missions/inventory/ads/payments/gold/audits
- `/admin` route mounted with placeholder pages for the CRUD modules
- AppHeader hidden on `/admin/*`

## Phase 3 — CRUD modules
Shop Items · Gate Items · Users · Main Missions · Side Missions · Gates · Monsters · Bosses · Achievements · Titles · Ranks · Rewards · Notifications · Redeem Codes · Daily Missions · Weekly Missions · Skills · Equipment · Inventory Templates · Settings · Events

## Phase 4 — Systems
- Redeem codes table + edge function to redeem
- Notifications table + broadcast surface
- Settings singleton table (XP mults, gold mults, timers, drop rates, maintenance mode)
- User admin actions: ban/unban, reset XP/gold/inventory/missions/gates, give gold/xp/items

## Phase 5 — Migrate inventory reads
- Switch runtime reads from `profiles.inventory_state` JSONB to `user_inventory`
- Backfill script + dual-write shim

## Bootstrap
- The first `super_admin` must be granted manually by inserting a row into `user_roles` for the intended user. All later admins are then created through the panel.
