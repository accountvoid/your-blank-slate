
-- Phase A: quest runtime table (progress per user per quest per day)
CREATE TABLE IF NOT EXISTS public.user_quest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL,
  quest_kind text NOT NULL CHECK (quest_kind IN ('main','side','grand')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','failed','abandoned')),
  step_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  progress_percent integer NOT NULL DEFAULT 0,
  run_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id, run_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_quest_runs TO authenticated;
GRANT ALL ON public.user_quest_runs TO service_role;

ALTER TABLE public.user_quest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_quest_runs owner read"
  ON public.user_quest_runs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "user_quest_runs owner insert"
  ON public.user_quest_runs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_quest_runs owner update"
  ON public.user_quest_runs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_quest_runs owner delete"
  ON public.user_quest_runs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_quest_runs_updated_at
  BEFORE UPDATE ON public.user_quest_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_uqr_user_date ON public.user_quest_runs(user_id, run_date);
CREATE INDEX IF NOT EXISTS idx_uqr_quest ON public.user_quest_runs(quest_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_quest_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.main_quests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.side_quests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grand_quests;
