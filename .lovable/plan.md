

## Changes before implementation

Please update the implementation plan with the following requirements.

### 1. Quest System (Single Source of Truth)

Do NOT keep or mirror `quest_templates` or `quest_template_steps`.

The only quest tables in the entire project must become:

- main_quests
- side_quests
- grand_quests

Completely migrate all existing quest data.

After migration:

- Remove every dependency on `quest_templates`.
- Remove every dependency on `quest_template_steps`.
- Remove every fallback using those tables.

There must be only one source of truth.

---

### 2. Profiles become the Core of the Game

The `profiles` table must become the central gameplay table.

Every gameplay system must read player progression from `profiles`.

Including:

- Level
- Rank
- XP
- Gold
- Void Currency
- HP
- MP
- Stats
- Punishment
- Inventory references
- Progression

No duplicated player progression data anywhere else.

---

### 3. Gates

Do NOT generate random gates inside the frontend.

Use only the `gates` table.

Show every active gate.

If the player satisfies:

- required_level
- required_rank

The gate is available.

Otherwise show:

🔒 Locked

Display:

- Required Level
- Required Rank
- Unlock Progress

Never hide future gates.

Future gates should motivate the player.

---

### 4. Dungeon

Do NOT create a new `dungeon_encounters` table.

Keep the current scope limited.

Dungeon rewards must use:

- gates
- gate_items

Monster generation and advanced encounter systems will be implemented in a future update.

---

### 5. Gameplay Data

Remove every remaining hardcoded dataset.

Including:

- Quests
- Gates
- Items
- Shop
- Rewards
- Events
- Progression

Everything must come from Supabase.

---

### 6. Services

Every gameplay module must communicate only through service classes.

Create:

- AuthService
- ProfileService
- QuestService
- GateService
- ShopService
- ItemService
- InventoryService
- EventService
- PaymentService

No duplicated SQL.

No duplicated queries.

---

### 7. Admin Panel

Admin must manage directly:

- main_quests
- side_quests
- grand_quests
- gates
- gate_items
- main_items
- side_items
- shop_items
- events

Every CRUD operation must immediately affect gameplay without modifying frontend code.

---

### 8. Rollout Strategy

Do NOT implement everything in one massive PR.

Implement in phases:

Phase A

Authentication validation + Profiles + Quest migration

Phase B

Gate System

Phase C

Items + Shop + Inventory

Phase D

Events + Admin CRUD

Phase E

Cleanup + Migration Report

Each phase must be fully tested before starting the next.

---

### 9. Final Objective

The final architecture must satisfy these rules:

- Supabase is the only backend.
- Supabase is the only source of truth.
- No Lovable Cloud gameplay logic.
- No hardcoded gameplay data.
- Frontend only renders database data.
- Every future quest, gate, item or event can be added from the Admin Panel without editing React code.