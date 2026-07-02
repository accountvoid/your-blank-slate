
ALTER TABLE public.user_quest_runs
  ADD COLUMN IF NOT EXISTS run_date date;

UPDATE public.user_quest_runs
   SET run_date = (created_at AT TIME ZONE 'utc')::date
 WHERE run_date IS NULL;

ALTER TABLE public.user_quest_runs
  ALTER COLUMN run_date SET NOT NULL,
  ALTER COLUMN run_date SET DEFAULT ((now() AT TIME ZONE 'utc')::date);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_quest_runs_user_template_date
  ON public.user_quest_runs(user_id, template_id, run_date);

CREATE INDEX IF NOT EXISTS idx_user_quest_runs_user_date
  ON public.user_quest_runs(user_id, run_date);
