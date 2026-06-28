## Goal
Replace the current hardcoded quest system with a **professional, database-driven Main Quest engine** covering STR / INT / AGI / SPR. Seed a complete starter library, but keep everything extensible from the DB.

Out of scope for this round (will be tackled in later rounds): Side quests overhaul (Part 4), seasonal/Ramadan quests (Part 5), purple XP bar redesign (Part 6), inventory persistence (Part 7), localization sweep (Part 8), ads expansion (Part 9). Existing systems for those keep working untouched.

---

## What I'll build

### 1. Database schema (new migration)

Three new tables in `public`:

- **`quest_templates`** — the catalog of every Main Quest available in the game.
  - `category` (STR/INT/AGI/SPR), `title_en`, `title_ar`, `description_en`, `description_ar`
  - `difficulty` (easy/medium/hard/legendary), `estimated_minutes`, `xp_reward`, `gold_reward`
  - `recovery_required` (boolean — true = needs all recovery answers YES, e.g. high-intensity STR)
  - `day_of_week` (0-6, NULL = any day), `program_tag` (e.g. `str_full_split`, `str_alt_split`)
  - `warning_en` / `warning_ar`, `active`, `priority`, timestamps

- **`quest_template_steps`** — ordered steps belonging to a template.
  - `template_id`, `order_index`, `title_en`, `title_ar`, `detail_en`, `detail_ar`
  - `step_type` (`warmup` | `exercise` | `set` | `reading` | `practice` | `stretch` | `note`)
  - `sets` / `reps` (JSON like `[12,10,8,8]`), `duration_minutes`

- **`user_quest_runs`** — per-user instance when they accept a quest.
  - `user_id`, `template_id`, `status` (`active` | `completed` | `failed`), `started_at`, `completed_at`
  - `step_progress` (JSONB: `{ "<step_id>": true }`), `progress_percent`

All three: RLS + GRANTs to authenticated (+ service_role), realtime publication enabled, `updated_at` trigger.

### 2. Recovery Assessment

- Add `recovery_profile` JSONB to `profiles` (`{ sleep, nutrition, protein, updated_at }`).
- New modal `RecoveryAssessmentModal.tsx` shown:
  - First time after onboarding (no `recovery_profile` set).
  - On demand from Profile page (an "Update Recovery" button).
- Three yes/no questions → saved to `profiles.recovery_profile`.
- Result determines which STR `program_tag` is assigned for the week:
  - All YES → `str_full_split` (Sat push / Sun pull / Tue legs / Wed upper / Fri core+cardio, Mon+Thu recovery).
  - Any NO → `str_alt_split` (Workout / Rest alternating).

### 3. Quest engine

New hook `useMainQuests.ts`:
- Reads today's date + user's `recovery_profile` + `program_tag`.
- Picks STR templates matching today's `day_of_week` and `program_tag`.
- Picks INT/AGI/SPR templates for today (round-robin / random within category).
- Joins active `user_quest_runs` for live progress.
- Realtime subscription on `user_quest_runs`.

### 4. UI

New component `MainQuestCard.tsx` (SETVOID system-window style, dark gradient + cyan grid, consistent with current cards):
- Header: category badge, title, difficulty, estimated time, XP/Gold rewards.
- Warning banner (when present).
- Step list with checkboxes; sets/reps shown as chip rows like `12 · 10 · 8 · 8`.
- Live progress bar (percent of steps complete).
- "Accept" → creates `user_quest_runs` row. "Complete" enabled when all steps checked → awards category XP via existing `useGameState` (`completeQuest` flow extended to take a category + xp + gold from the run).

`Index.tsx` and `Quests.tsx` render `MainQuestCard` for today's quests, grouped by category tab on Quests page. Old `SoloLevelingQuestCard` stays mounted as the legacy daily-quest card so nothing breaks during transition; new cards appear above it. (Once the new system is verified, a later round can retire the legacy card.)

### 5. Seed content (initial library, extensible)

Seeded via SQL inserts in the same migration. All bilingual (en/ar).

**STR — `str_full_split` (recovery=YES)**
- Saturday: Push (Chest+Shoulders+Triceps) — 4 exercises × `12/10/8/8`, warmup + stretch.
- Sunday: Pull (Back+Biceps) — same structure.
- Tuesday: Legs.
- Wednesday: Upper Body.
- Friday: Core + Cardio.

**STR — `str_alt_split` (recovery=NO)**
- 4 generic full-body workouts rotated on training days (Sat/Mon/Wed/Fri), Sun/Tue/Thu recovery (no quest emitted).

Each workout includes the exact warning text from the brief and 5-step structure (warm-up → 4 exercises → stretch).

**INT** — 4 starter templates: deep-reading 30m, learn-one-new-concept, problem-solving puzzle session, writing/journaling reflection.

**AGI** — 4 starter templates: 30m walk/cardio, step goal, mobility flow, HIIT short circuit.

**SPR** — 4 starter templates: morning dhikr block, evening dhikr block, gratitude reflection, helping-others mission. (Full Dhikr-250 + Friday salawat system comes in Part 4.)

Adding more later = INSERT rows in `quest_templates` + `quest_template_steps`. No code changes needed.

### 6. XP wiring (minimum needed for Parts 1-3)

When a `user_quest_runs` row flips to `completed`, the client calls existing `completeQuest` logic with the template's category + xp + gold, so STR quests grant STR XP only, etc. The shiny purple animated XP bar redesign is Part 6 and stays for the next round; current XP bars keep working.

---

## Technical details

- Files added:
  - `supabase/migrations/<ts>_main_quest_system.sql` (schema + RLS + grants + realtime + seed data)
  - `src/hooks/useMainQuests.ts`
  - `src/hooks/useRecoveryProfile.ts`
  - `src/components/quests/MainQuestCard.tsx`
  - `src/components/quests/RecoveryAssessmentModal.tsx`
  - i18n keys added to `src/i18n/locales/{ar,en}.json`
- Files edited:
  - `src/pages/Index.tsx` — render today's main quests above legacy card.
  - `src/pages/Quests.tsx` — per-category tabs render `MainQuestCard` list + existing side quests.
  - `src/pages/Profile.tsx` — "Update Recovery Assessment" button.
  - `src/hooks/useGameState.ts` — small helper to credit category XP+Gold by id (no breaking changes).
- No files removed. `SoloLevelingQuestCard`, side quests, prayer quests, gates, ads, payments — all untouched.
- All Supabase calls cast via existing `(supabase as any)` pattern to avoid type-regen blocking.
- Realtime via `supabase.channel('user_quest_runs:'+userId)` cleaned up in `useEffect` return.

---

## Verification before I claim done

1. Migration approved + run; confirm 3 tables exist, RLS on, seed rows present.
2. Open Home as a fresh user → recovery modal appears → answers persisted.
3. With all-YES profile on a Saturday: see Push workout card with 6 steps and warning.
4. With any-NO profile on a training day: see alternating-split workout.
5. Switch tabs on Quests page → INT/AGI/SPR templates render with steps.
6. Check a step → progress bar updates live. Complete all → XP credited to the right category only.
7. No console / TS errors.