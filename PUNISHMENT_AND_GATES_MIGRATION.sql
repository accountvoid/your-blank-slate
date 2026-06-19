-- ============================================================
-- SETVOID — Punishment + Gates Catalog migration
-- Apply this in Supabase SQL Editor (or via the Lovable database tool)
-- ============================================================

-- ============================================================
-- Part 1: Punishment System hardening
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS punishment_reason text,
  ADD COLUMN IF NOT EXISTS last_daily_check timestamptz,
  ADD COLUMN IF NOT EXISTS punishment_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_deadline_at timestamptz;

-- Replace start_punishment: deducts 50 HP, saves reason, increments count.
CREATE OR REPLACE FUNCTION public.start_punishment(
  uid uuid,
  hours integer DEFAULT 4,
  reason text DEFAULT 'Missed daily required quests'
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE p public.profiles;
BEGIN
  IF uid <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.profiles
     SET punishment_active     = true,
         punishment_started_at = now(),
         punishment_end_at     = now() + (hours || ' hours')::interval,
         punishment_reason     = reason,
         punishment_count      = COALESCE(punishment_count, 0) + 1,
         hp_player             = GREATEST(1, hp_player - 50),
         hp_last_tick_at       = now(),
         last_daily_check      = now()
   WHERE user_id = uid
   RETURNING * INTO p;
  RETURN p;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_punishment(uuid, integer, text) TO authenticated;

-- Server-side daily-deadline enforcement. Called on app startup.
CREATE OR REPLACE FUNCTION public.check_and_apply_punishment(uid uuid)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles;
  q jsonb;
  main_quests jsonb;
  total_main int;
  completed_main int;
  deadline timestamptz;
BEGIN
  IF uid <> auth.uid() THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT * INTO p FROM public.profiles WHERE user_id = uid;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF p.punishment_active THEN RETURN p; END IF;

  q := COALESCE(p."Quests", '{}'::jsonb);
  main_quests := COALESCE(q->'mainQuests', '[]'::jsonb);

  IF jsonb_array_length(main_quests) = 0 THEN
    IF p.daily_deadline_at IS NULL THEN
      UPDATE public.profiles
        SET daily_deadline_at = now() + interval '24 hours',
            last_daily_check  = now()
        WHERE user_id = uid
        RETURNING * INTO p;
    END IF;
    RETURN p;
  END IF;

  deadline := COALESCE(p.daily_deadline_at, p.created_at + interval '24 hours');

  IF now() < deadline THEN
    UPDATE public.profiles SET last_daily_check = now() WHERE user_id = uid
      RETURNING * INTO p;
    RETURN p;
  END IF;

  SELECT
    jsonb_array_length(main_quests),
    (SELECT count(*) FROM jsonb_array_elements(main_quests) e WHERE (e->>'completed')::boolean = true)
  INTO total_main, completed_main;

  IF completed_main < total_main THEN
    UPDATE public.profiles
      SET punishment_active     = true,
          punishment_started_at = now(),
          punishment_end_at     = now() + interval '4 hours',
          punishment_reason     = 'Daily required quests not completed before deadline',
          punishment_count      = COALESCE(punishment_count, 0) + 1,
          hp_player             = GREATEST(1, hp_player - 50),
          hp_last_tick_at       = now(),
          last_daily_check      = now(),
          daily_deadline_at     = now() + interval '24 hours'
      WHERE user_id = uid
      RETURNING * INTO p;
  ELSE
    UPDATE public.profiles
      SET last_daily_check  = now(),
          daily_deadline_at = now() + interval '24 hours'
      WHERE user_id = uid
      RETURNING * INTO p;
  END IF;

  RETURN p;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_apply_punishment(uuid) TO authenticated;

-- ============================================================
-- Part 2: Gates catalog (admin-managed source of truth)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gates_catalog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_gate         text NOT NULL UNIQUE,
  name_gate       text NOT NULL,
  description     text,
  rank_gate       text NOT NULL DEFAULT 'E',
  gate_type       text NOT NULL DEFAULT 'normal',  -- normal | boss | event | dungeon | special
  image_url       text,
  power_gate      integer NOT NULL DEFAULT 0,
  required_level  integer NOT NULL DEFAULT 1,
  required_rank   text NOT NULL DEFAULT 'E',
  boss_name       text,
  boss_hp         integer,
  boss_attack     integer,
  reward_gold     integer NOT NULL DEFAULT 0,
  reward_xp       integer NOT NULL DEFAULT 0,
  reward_items    jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats           jsonb NOT NULL DEFAULT '{}'::jsonb,
  rewards_log     jsonb NOT NULL DEFAULT '[]'::jsonb,
  battle_sessions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  force_show      boolean NOT NULL DEFAULT false,
  is_hidden       boolean NOT NULL DEFAULT false,
  start_date      timestamptz,
  end_date        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gates_catalog TO authenticated, anon;
GRANT ALL ON public.gates_catalog TO service_role;

ALTER TABLE public.gates_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gates_catalog_select_public ON public.gates_catalog;
CREATE POLICY gates_catalog_select_public ON public.gates_catalog
  FOR SELECT TO authenticated, anon
  USING (is_hidden = false AND is_active = true);

DROP TRIGGER IF EXISTS trg_gates_catalog_updated_at ON public.gates_catalog;
CREATE TRIGGER trg_gates_catalog_updated_at
  BEFORE UPDATE ON public.gates_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
DO $$
BEGIN
  PERFORM 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='gates_catalog';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.gates_catalog';
  END IF;
END$$;
ALTER TABLE public.gates_catalog REPLICA IDENTITY FULL;

-- Seed default gates so existing users see something out-of-the-box.
INSERT INTO public.gates_catalog
  (id_gate, name_gate, description, rank_gate, gate_type, power_gate, required_level, required_rank, reward_gold, reward_xp)
VALUES
  ('GATE-CAT-E', 'بوابة E',  'بوابة منخفضة الخطورة', 'E', 'normal', 5,   1,  'E',  50,   100),
  ('GATE-CAT-D', 'بوابة D',  'بوابة بسيطة الخطورة',  'D', 'normal', 10,  10, 'D',  100,  250),
  ('GATE-CAT-C', 'بوابة C',  'بوابة متوسطة الخطورة', 'C', 'normal', 20,  20, 'C',  200,  500),
  ('GATE-CAT-B', 'بوابة B',  'بوابة عالية الخطورة',  'B', 'normal', 35,  35, 'B',  400,  1000),
  ('GATE-CAT-A', 'بوابة A',  'بوابة خطرة جداً',       'A', 'boss',   60,  50, 'A',  0,    2500),
  ('GATE-CAT-S', 'بوابة S',  'بوابة كارثية',          'S', 'boss',   100, 80, 'S',  0,    10000)
ON CONFLICT (id_gate) DO NOTHING;
