
-- ============================================================
-- Phase 1A: Permanent Gate IDs
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.gate_id_seq START 1;

-- Add columns to gates
ALTER TABLE public.gates
  ADD COLUMN IF NOT EXISTS stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rewards_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS battle_sessions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Auto-assign permanent id_gate on insert if not provided / placeholder
CREATE OR REPLACE FUNCTION public.assign_gate_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  IF NEW.id_gate IS NULL OR NEW.id_gate = '' OR NEW.id_gate !~ '^GATE-[0-9]{4,}$' THEN
    n := nextval('public.gate_id_seq');
    NEW.id_gate := 'GATE-' || lpad(n::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gates_assign_id_gate ON public.gates;
CREATE TRIGGER gates_assign_id_gate
  BEFORE INSERT ON public.gates
  FOR EACH ROW EXECUTE FUNCTION public.assign_gate_id();

-- Immutability: prevent id_gate updates
CREATE OR REPLACE FUNCTION public.lock_gate_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id_gate IS DISTINCT FROM OLD.id_gate THEN
    RAISE EXCEPTION 'id_gate is immutable (was %, attempted %)', OLD.id_gate, NEW.id_gate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gates_lock_id_gate ON public.gates;
CREATE TRIGGER gates_lock_id_gate
  BEFORE UPDATE ON public.gates
  FOR EACH ROW EXECUTE FUNCTION public.lock_gate_id();

-- Unique constraint to enforce uniqueness across the table
CREATE UNIQUE INDEX IF NOT EXISTS gates_id_gate_unique ON public.gates (id_gate);

-- Backfill any non-conforming existing ids
DO $$
DECLARE
  r RECORD;
  n bigint;
BEGIN
  FOR r IN SELECT id FROM public.gates WHERE id_gate IS NULL OR id_gate = '' OR id_gate !~ '^GATE-[0-9]{4,}$' LOOP
    n := nextval('public.gate_id_seq');
    UPDATE public.gates SET id_gate = 'GATE-' || lpad(n::text, 4, '0') WHERE id = r.id;
  END LOOP;
END$$;

-- ============================================================
-- Phase 1B: Persistent Punishment + HP SSoT
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS punishment_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS punishment_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS punishment_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS hp_last_tick_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS hp_max integer NOT NULL DEFAULT 100;

-- Server-side HP drain function. Drains 1 HP per 30s while punishment active.
-- Auto-clears punishment when end time has passed.
CREATE OR REPLACE FUNCTION public.apply_punishment_drain(uid uuid)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles;
  elapsed_seconds integer;
  drain integer;
  new_hp integer;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE user_id = uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for %', uid;
  END IF;

  -- Auto-clear if past end time
  IF p.punishment_active AND p.punishment_end_at IS NOT NULL AND now() >= p.punishment_end_at THEN
    UPDATE public.profiles
      SET punishment_active = false,
          punishment_end_at = NULL,
          punishment_started_at = NULL,
          hp_last_tick_at = now()
      WHERE user_id = uid
      RETURNING * INTO p;
    RETURN p;
  END IF;

  -- Drain HP while active
  IF p.punishment_active THEN
    elapsed_seconds := GREATEST(0, EXTRACT(EPOCH FROM (now() - p.hp_last_tick_at))::int);
    drain := elapsed_seconds / 30;  -- 1 HP per 30s
    IF drain > 0 THEN
      new_hp := GREATEST(1, p.hp_player - drain);
      UPDATE public.profiles
        SET hp_player = new_hp,
            hp_last_tick_at = p.hp_last_tick_at + (drain * interval '30 seconds')
        WHERE user_id = uid
        RETURNING * INTO p;
    END IF;
  END IF;

  RETURN p;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_punishment_drain(uuid) TO authenticated;

-- Helper to start punishment (4 hours)
CREATE OR REPLACE FUNCTION public.start_punishment(uid uuid, hours integer DEFAULT 4)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles;
BEGIN
  IF uid <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.profiles
    SET punishment_active = true,
        punishment_started_at = now(),
        punishment_end_at = now() + (hours || ' hours')::interval,
        hp_last_tick_at = now()
    WHERE user_id = uid
    RETURNING * INTO p;
  RETURN p;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_punishment(uuid, integer) TO authenticated;
