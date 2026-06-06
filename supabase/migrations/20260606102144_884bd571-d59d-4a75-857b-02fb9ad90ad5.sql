
-- 1) Portals (admin-defined gates)
CREATE TABLE IF NOT EXISTS public.portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_portal text NOT NULL UNIQUE,
  name text NOT NULL,
  rank text NOT NULL DEFAULT 'E',
  required_level integer NOT NULL DEFAULT 1,
  required_power integer NOT NULL DEFAULT 0,
  energy_density text NOT NULL DEFAULT '1,000',
  danger text NOT NULL DEFAULT 'MINIMAL THREAT',
  color text NOT NULL DEFAULT 'gray',
  rewards jsonb NOT NULL DEFAULT '{"xp":100,"gold":50,"shadowPoints":2}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.portals TO authenticated, anon;
GRANT ALL ON public.portals TO service_role;

ALTER TABLE public.portals ENABLE ROW LEVEL SECURITY;

CREATE POLICY portals_select_active_all ON public.portals
  FOR SELECT TO authenticated, anon
  USING (active = true);

CREATE TRIGGER trg_portals_updated_at
  BEFORE UPDATE ON public.portals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Profiles: add mp_max + convert Quests text -> jsonb
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mp_max integer NOT NULL DEFAULT 100;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='Quests' AND data_type='text'
  ) THEN
    ALTER TABLE public.profiles
      ALTER COLUMN "Quests" TYPE jsonb USING COALESCE(NULLIF("Quests",'')::jsonb, '{}'::jsonb);
    ALTER TABLE public.profiles
      ALTER COLUMN "Quests" SET DEFAULT '{}'::jsonb;
    UPDATE public.profiles SET "Quests" = '{}'::jsonb WHERE "Quests" IS NULL;
    ALTER TABLE public.profiles ALTER COLUMN "Quests" SET NOT NULL;
  END IF;
END $$;

-- 3) Atomic HP/MP damage
CREATE OR REPLACE FUNCTION public.apply_damage(uid uuid, hp_delta integer, mp_delta integer)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE p public.profiles;
BEGIN
  IF uid <> auth.uid() THEN RAISE EXCEPTION 'unauthorized'; END IF;
  UPDATE public.profiles
     SET hp_player = GREATEST(0, LEAST(hp_max, hp_player + hp_delta)),
         mb_player = GREATEST(0, LEAST(mp_max, mb_player + mp_delta))
   WHERE user_id = uid
   RETURNING * INTO p;
  RETURN p;
END;
$$;

-- 4) Quests snapshot update
CREATE OR REPLACE FUNCTION public.update_quests(uid uuid, quests_json jsonb)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE p public.profiles;
BEGIN
  IF uid <> auth.uid() THEN RAISE EXCEPTION 'unauthorized'; END IF;
  UPDATE public.profiles SET "Quests" = quests_json WHERE user_id = uid RETURNING * INTO p;
  RETURN p;
END;
$$;
