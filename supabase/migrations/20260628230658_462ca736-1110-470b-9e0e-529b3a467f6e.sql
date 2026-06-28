
-- =========================================================
-- MAIN QUEST ENGINE (Parts 1-3)
-- =========================================================

CREATE TYPE public.quest_category AS ENUM ('strength','mind','spirit','agility');
CREATE TYPE public.quest_difficulty AS ENUM ('easy','medium','hard','legendary');
CREATE TYPE public.quest_step_type AS ENUM ('warmup','exercise','set','reading','practice','stretch','note','cardio');
CREATE TYPE public.quest_run_status AS ENUM ('active','completed','failed','abandoned');

-- ---------- TEMPLATES ----------
CREATE TABLE public.quest_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      public.quest_category NOT NULL,
  title_en      text NOT NULL,
  title_ar      text NOT NULL,
  description_en text NOT NULL,
  description_ar text NOT NULL,
  difficulty    public.quest_difficulty NOT NULL DEFAULT 'medium',
  estimated_minutes int NOT NULL DEFAULT 30,
  xp_reward     int NOT NULL DEFAULT 50,
  gold_reward   int NOT NULL DEFAULT 0,
  recovery_required boolean NOT NULL DEFAULT false,
  day_of_week   smallint, -- 0=Sun..6=Sat; NULL = any day
  program_tag   text,     -- e.g. 'str_full_split', 'str_alt_split'
  warning_en    text,
  warning_ar    text,
  active        boolean NOT NULL DEFAULT true,
  priority      int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quest_templates TO authenticated;
GRANT SELECT ON public.quest_templates TO anon;
GRANT ALL    ON public.quest_templates TO service_role;
ALTER TABLE public.quest_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active templates readable by all"
  ON public.quest_templates FOR SELECT
  USING (active = true);

CREATE INDEX idx_quest_templates_cat_day ON public.quest_templates(category, day_of_week);
CREATE INDEX idx_quest_templates_program ON public.quest_templates(program_tag);

-- ---------- STEPS ----------
CREATE TABLE public.quest_template_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid NOT NULL REFERENCES public.quest_templates(id) ON DELETE CASCADE,
  order_index   int NOT NULL,
  step_type     public.quest_step_type NOT NULL DEFAULT 'exercise',
  title_en      text NOT NULL,
  title_ar      text NOT NULL,
  detail_en     text,
  detail_ar     text,
  reps          jsonb,            -- e.g. [12,10,8,8]
  sets          int,
  duration_minutes int,
  created_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quest_template_steps TO authenticated;
GRANT SELECT ON public.quest_template_steps TO anon;
GRANT ALL    ON public.quest_template_steps TO service_role;
ALTER TABLE public.quest_template_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "steps readable by all"
  ON public.quest_template_steps FOR SELECT
  USING (true);

CREATE INDEX idx_quest_steps_template ON public.quest_template_steps(template_id, order_index);

-- ---------- USER RUNS ----------
CREATE TABLE public.user_quest_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id   uuid NOT NULL REFERENCES public.quest_templates(id) ON DELETE CASCADE,
  status        public.quest_run_status NOT NULL DEFAULT 'active',
  step_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  progress_percent int NOT NULL DEFAULT 0,
  started_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_quest_runs TO authenticated;
GRANT ALL ON public.user_quest_runs TO service_role;
ALTER TABLE public.user_quest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own runs"   ON public.user_quest_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own runs" ON public.user_quest_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own runs" ON public.user_quest_runs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own runs" ON public.user_quest_runs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_quest_runs_user ON public.user_quest_runs(user_id, status);

CREATE TRIGGER trg_quest_templates_updated_at
  BEFORE UPDATE ON public.quest_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_user_quest_runs_updated_at
  BEFORE UPDATE ON public.user_quest_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_quest_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_templates;

-- =========================================================
-- SEED CONTENT
-- =========================================================

-- Helper to add a template + its steps in one call
CREATE OR REPLACE FUNCTION public._seed_quest(
  p_category public.quest_category, p_title_en text, p_title_ar text,
  p_desc_en text, p_desc_ar text, p_difficulty public.quest_difficulty,
  p_minutes int, p_xp int, p_gold int, p_recovery boolean,
  p_dow smallint, p_program text, p_warn_en text, p_warn_ar text,
  p_steps jsonb
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
  v_step jsonb;
  v_idx int := 0;
BEGIN
  INSERT INTO public.quest_templates(category,title_en,title_ar,description_en,description_ar,difficulty,estimated_minutes,xp_reward,gold_reward,recovery_required,day_of_week,program_tag,warning_en,warning_ar)
  VALUES (p_category,p_title_en,p_title_ar,p_desc_en,p_desc_ar,p_difficulty,p_minutes,p_xp,p_gold,p_recovery,p_dow,p_program,p_warn_en,p_warn_ar)
  RETURNING id INTO v_id;

  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps) LOOP
    INSERT INTO public.quest_template_steps(template_id,order_index,step_type,title_en,title_ar,detail_en,detail_ar,reps,sets,duration_minutes)
    VALUES (
      v_id, v_idx,
      COALESCE((v_step->>'type')::public.quest_step_type, 'exercise'),
      v_step->>'en', v_step->>'ar',
      v_step->>'detail_en', v_step->>'detail_ar',
      CASE WHEN v_step ? 'reps' THEN v_step->'reps' ELSE NULL END,
      NULLIF((v_step->>'sets')::text,'')::int,
      NULLIF((v_step->>'minutes')::text,'')::int
    );
    v_idx := v_idx + 1;
  END LOOP;
  RETURN v_id;
END;
$$;

-- ---------------- STR — FULL SPLIT (recovery OK) ----------------
-- Warning text reused
-- Saturday (dow=6) Push
SELECT public._seed_quest('strength','Push Day — Chest, Shoulders, Triceps','يوم الدفع — صدر، أكتاف، تراي',
  'Push workout targeting chest, shoulders and triceps.','تمرين دفع يستهدف الصدر والأكتاف والتراي.',
  'hard',45,90,30,true,6::smallint,'str_full_split',
  'Choose a weight that challenges you while maintaining proper technique. Do not use weights that are too light or too heavy.',
  'اختر وزناً يتحداك مع الحفاظ على التقنية الصحيحة. لا تستخدم أوزاناً خفيفة جداً أو ثقيلة جداً.',
  '[
    {"type":"warmup","en":"Warm-up","ar":"إحماء","detail_en":"5-10 minutes light cardio + shoulder mobility","detail_ar":"5-10 دقائق كارديو خفيف + إطالة أكتاف","minutes":"10"},
    {"type":"exercise","en":"Bench Press","ar":"بنش بريس","detail_en":"4 sets","detail_ar":"4 مجاميع","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Overhead Shoulder Press","ar":"ضغط كتف أمامي","detail_en":"4 sets","detail_ar":"4 مجاميع","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Incline Dumbbell Press","ar":"بنش مائل دامبل","detail_en":"4 sets","detail_ar":"4 مجاميع","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Triceps Pushdown","ar":"تراي كيبل","detail_en":"4 sets","detail_ar":"4 مجاميع","sets":"4","reps":[12,10,8,8]},
    {"type":"stretch","en":"Stretching","ar":"تمارين الإطالة","detail_en":"5 minutes full upper-body stretch","detail_ar":"5 دقائق إطالة كاملة للجزء العلوي","minutes":"5"}
  ]'::jsonb);

-- Sunday (dow=0) Pull
SELECT public._seed_quest('strength','Pull Day — Back & Biceps','يوم السحب — ظهر وباي',
  'Pull workout targeting back width, thickness and biceps.','تمرين سحب يستهدف عرض وسماكة الظهر والباي.',
  'hard',45,90,30,true,0::smallint,'str_full_split',
  'Choose a weight that challenges you while maintaining proper technique. Do not use weights that are too light or too heavy.',
  'اختر وزناً يتحداك مع الحفاظ على التقنية الصحيحة. لا تستخدم أوزاناً خفيفة جداً أو ثقيلة جداً.',
  '[
    {"type":"warmup","en":"Warm-up","ar":"إحماء","detail_en":"5-10 minutes light cardio + scapular activation","detail_ar":"5-10 دقائق كارديو خفيف + تنشيط لوح الكتف","minutes":"10"},
    {"type":"exercise","en":"Pull-ups or Lat Pulldown","ar":"عقلة أو سحب علوي","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Barbell Row","ar":"تجديف بار","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Seated Cable Row","ar":"تجديف كيبل جالس","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Barbell Biceps Curl","ar":"بايسبس بار","sets":"4","reps":[12,10,8,8]},
    {"type":"stretch","en":"Stretching","ar":"تمارين الإطالة","minutes":"5"}
  ]'::jsonb);

-- Tuesday (dow=2) Legs
SELECT public._seed_quest('strength','Leg Day — Quads, Hamstrings, Calves','يوم الأرجل — أمامية، خلفية، سمانة',
  'Lower-body workout for size and strength.','تمرين أرجل لزيادة الحجم والقوة.',
  'legendary',50,100,40,true,2::smallint,'str_full_split',
  'Choose a weight that challenges you while maintaining proper technique. Do not use weights that are too light or too heavy.',
  'اختر وزناً يتحداك مع الحفاظ على التقنية الصحيحة. لا تستخدم أوزاناً خفيفة جداً أو ثقيلة جداً.',
  '[
    {"type":"warmup","en":"Warm-up","ar":"إحماء","detail_en":"5-10 minutes bike + dynamic stretches","detail_ar":"5-10 دقائق دراجة + إطالات ديناميكية","minutes":"10"},
    {"type":"exercise","en":"Back Squat","ar":"سكوات بار","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Romanian Deadlift","ar":"ديدلفت روماني","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Leg Press","ar":"بنش رجل","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Standing Calf Raise","ar":"رفع سمانة واقف","sets":"4","reps":[15,12,10,10]},
    {"type":"stretch","en":"Stretching","ar":"تمارين الإطالة","minutes":"5"}
  ]'::jsonb);

-- Wednesday (dow=3) Upper Body
SELECT public._seed_quest('strength','Upper Body — Mixed','الجزء العلوي — متنوع',
  'Balanced upper-body day mixing push and pull.','يوم متوازن للجزء العلوي يجمع الدفع والسحب.',
  'hard',45,90,30,true,3::smallint,'str_full_split',
  'Choose a weight that challenges you while maintaining proper technique. Do not use weights that are too light or too heavy.',
  'اختر وزناً يتحداك مع الحفاظ على التقنية الصحيحة. لا تستخدم أوزاناً خفيفة جداً أو ثقيلة جداً.',
  '[
    {"type":"warmup","en":"Warm-up","ar":"إحماء","minutes":"10"},
    {"type":"exercise","en":"Incline Bench Press","ar":"بنش مائل بار","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Lat Pulldown","ar":"سحب علوي","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Dumbbell Lateral Raise","ar":"رفرفة جانبي","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Hammer Curl","ar":"هامر باي","sets":"4","reps":[12,10,8,8]},
    {"type":"stretch","en":"Stretching","ar":"تمارين الإطالة","minutes":"5"}
  ]'::jsonb);

-- Friday (dow=5) Core + Cardio
SELECT public._seed_quest('strength','Core & Cardio','بطن وكارديو',
  'Conditioning day focused on core strength and aerobic capacity.','يوم لياقة يركز على قوة البطن والقدرة الهوائية.',
  'medium',45,80,25,true,5::smallint,'str_full_split',
  'Maintain steady breathing and proper form throughout each circuit.',
  'حافظ على تنفس منتظم وتقنية سليمة طوال الجولات.',
  '[
    {"type":"warmup","en":"Warm-up","ar":"إحماء","minutes":"10"},
    {"type":"exercise","en":"Plank","ar":"بلانك","sets":"4","reps":[60,45,45,30],"detail_en":"seconds per set","detail_ar":"ثواني لكل مجموعة"},
    {"type":"exercise","en":"Hanging Leg Raise","ar":"رفع أرجل معلق","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Russian Twist","ar":"تويست روسي","sets":"4","reps":[20,16,14,12]},
    {"type":"cardio","en":"Cardio Finisher","ar":"كارديو ختامي","detail_en":"15 minutes moderate intensity","detail_ar":"15 دقيقة شدة متوسطة","minutes":"15"},
    {"type":"stretch","en":"Stretching","ar":"تمارين الإطالة","minutes":"5"}
  ]'::jsonb);

-- ---------------- STR — ALTERNATING SPLIT (recovery weak) ----------------
-- Training Sat(6) / Mon(1) / Wed(3) / Fri(5)
SELECT public._seed_quest('strength','Full Body A','جسم كامل أ',
  'Full-body workout (training day in alternating program).','تمرين جسم كامل (يوم تمرين في البرنامج المتناوب).',
  'medium',45,80,25,false,6::smallint,'str_alt_split',
  'Choose a weight that challenges you while maintaining proper technique. Do not use weights that are too light or too heavy.',
  'اختر وزناً يتحداك مع الحفاظ على التقنية الصحيحة. لا تستخدم أوزاناً خفيفة جداً أو ثقيلة جداً.',
  '[
    {"type":"warmup","en":"Warm-up","ar":"إحماء","minutes":"10"},
    {"type":"exercise","en":"Goblet Squat","ar":"سكوات دامبل","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Push-up","ar":"ضغط","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"One-arm Dumbbell Row","ar":"تجديف دامبل يد واحدة","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Plank","ar":"بلانك","sets":"4","reps":[45,40,35,30]},
    {"type":"stretch","en":"Stretching","ar":"تمارين الإطالة","minutes":"5"}
  ]'::jsonb);

SELECT public._seed_quest('strength','Full Body B','جسم كامل ب',
  'Full-body workout (training day in alternating program).','تمرين جسم كامل (يوم تمرين في البرنامج المتناوب).',
  'medium',45,80,25,false,1::smallint,'str_alt_split',
  'Choose a weight that challenges you while maintaining proper technique. Do not use weights that are too light or too heavy.',
  'اختر وزناً يتحداك مع الحفاظ على التقنية الصحيحة. لا تستخدم أوزاناً خفيفة جداً أو ثقيلة جداً.',
  '[
    {"type":"warmup","en":"Warm-up","ar":"إحماء","minutes":"10"},
    {"type":"exercise","en":"Romanian Deadlift","ar":"ديدلفت روماني","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Dumbbell Shoulder Press","ar":"ضغط كتف دامبل","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Lat Pulldown","ar":"سحب علوي","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Russian Twist","ar":"تويست روسي","sets":"4","reps":[20,16,14,12]},
    {"type":"stretch","en":"Stretching","ar":"تمارين الإطالة","minutes":"5"}
  ]'::jsonb);

SELECT public._seed_quest('strength','Full Body C','جسم كامل ج',
  'Full-body workout (training day in alternating program).','تمرين جسم كامل (يوم تمرين في البرنامج المتناوب).',
  'medium',45,80,25,false,3::smallint,'str_alt_split',
  'Choose a weight that challenges you while maintaining proper technique. Do not use weights that are too light or too heavy.',
  'اختر وزناً يتحداك مع الحفاظ على التقنية الصحيحة. لا تستخدم أوزاناً خفيفة جداً أو ثقيلة جداً.',
  '[
    {"type":"warmup","en":"Warm-up","ar":"إحماء","minutes":"10"},
    {"type":"exercise","en":"Front Squat","ar":"سكوات أمامي","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Incline Dumbbell Press","ar":"بنش مائل دامبل","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Barbell Row","ar":"تجديف بار","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Hanging Knee Raise","ar":"رفع ركب معلق","sets":"4","reps":[12,10,8,8]},
    {"type":"stretch","en":"Stretching","ar":"تمارين الإطالة","minutes":"5"}
  ]'::jsonb);

SELECT public._seed_quest('strength','Full Body D','جسم كامل د',
  'Full-body workout (training day in alternating program).','تمرين جسم كامل (يوم تمرين في البرنامج المتناوب).',
  'medium',45,80,25,false,5::smallint,'str_alt_split',
  'Choose a weight that challenges you while maintaining proper technique. Do not use weights that are too light or too heavy.',
  'اختر وزناً يتحداك مع الحفاظ على التقنية الصحيحة. لا تستخدم أوزاناً خفيفة جداً أو ثقيلة جداً.',
  '[
    {"type":"warmup","en":"Warm-up","ar":"إحماء","minutes":"10"},
    {"type":"exercise","en":"Bulgarian Split Squat","ar":"سكوات بلغاري","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Bench Press","ar":"بنش بريس","sets":"4","reps":[12,10,8,8]},
    {"type":"exercise","en":"Pull-up or Assisted Pull-up","ar":"عقلة أو عقلة بمساعدة","sets":"4","reps":[10,8,6,6]},
    {"type":"cardio","en":"Cardio Finisher","ar":"كارديو ختامي","minutes":"10"},
    {"type":"stretch","en":"Stretching","ar":"تمارين الإطالة","minutes":"5"}
  ]'::jsonb);

-- ---------------- INT (mind) ----------------
SELECT public._seed_quest('mind','Deep Reading','قراءة عميقة',
  '30 minutes of focused reading without distractions, with a 3-line summary at the end.',
  '30 دقيقة قراءة مركّزة بدون مشتتات، مع تلخيص في 3 أسطر في النهاية.',
  'medium',30,60,15,false,NULL,NULL,NULL,NULL,
  '[
    {"type":"reading","en":"Pick one book or long-form article","ar":"اختر كتاباً أو مقالاً طويلاً","minutes":"2"},
    {"type":"reading","en":"Read for 25 uninterrupted minutes","ar":"اقرأ 25 دقيقة بدون انقطاع","minutes":"25"},
    {"type":"note","en":"Write a 3-line summary","ar":"اكتب ملخصاً من 3 أسطر","minutes":"3"}
  ]'::jsonb);

SELECT public._seed_quest('mind','Learn One New Concept','تعلّم مفهوماً جديداً',
  'Pick one concept you do not know, study it, and explain it in your own words.',
  'اختر مفهوماً لا تعرفه، ادرسه، ثم اشرحه بكلماتك.',
  'medium',25,55,15,false,NULL,NULL,NULL,NULL,
  '[
    {"type":"practice","en":"Choose the concept","ar":"اختر المفهوم","minutes":"3"},
    {"type":"reading","en":"Study reliable sources","ar":"ادرس من مصادر موثوقة","minutes":"15"},
    {"type":"note","en":"Explain it in your own words","ar":"اشرحه بكلماتك","minutes":"7"}
  ]'::jsonb);

SELECT public._seed_quest('mind','Problem-Solving Session','جلسة حل مشكلات',
  '20 minutes solving logic puzzles or math problems to sharpen reasoning.',
  '20 دقيقة حل ألغاز منطقية أو مسائل رياضيات لتقوية المنطق.',
  'hard',20,55,15,false,NULL,NULL,NULL,NULL,
  '[
    {"type":"warmup","en":"Easy warm-up puzzle","ar":"لغز إحماء سهل","minutes":"3"},
    {"type":"practice","en":"3-5 progressively harder problems","ar":"3-5 مسائل متدرجة الصعوبة","minutes":"15"},
    {"type":"note","en":"Review your approach","ar":"راجع طريقتك في الحل","minutes":"2"}
  ]'::jsonb);

SELECT public._seed_quest('mind','Reflective Journaling','تأمل مكتوب',
  '15 minutes of free writing about what you learned and what you struggled with today.',
  '15 دقيقة كتابة حرة عن ما تعلمته اليوم وما واجهك من صعوبات.',
  'easy',15,40,10,false,NULL,NULL,NULL,NULL,
  '[
    {"type":"note","en":"What did I learn today?","ar":"ماذا تعلمت اليوم؟","minutes":"5"},
    {"type":"note","en":"What was hardest?","ar":"ما أصعب شيء واجهته؟","minutes":"5"},
    {"type":"note","en":"One thing to improve tomorrow","ar":"شيء واحد لأحسنه غداً","minutes":"5"}
  ]'::jsonb);

-- ---------------- AGI (agility) ----------------
SELECT public._seed_quest('agility','Cardio Walk','مشي كارديو',
  '30 minutes of brisk walking or light cardio.','30 دقيقة مشي سريع أو كارديو خفيف.',
  'easy',30,50,10,false,NULL,NULL,NULL,NULL,
  '[
    {"type":"warmup","en":"5 min easy pace","ar":"5 دقائق بخطى هادئة","minutes":"5"},
    {"type":"cardio","en":"20 min brisk pace","ar":"20 دقيقة بخطى سريعة","minutes":"20"},
    {"type":"stretch","en":"5 min cool down","ar":"5 دقائق تهدئة","minutes":"5"}
  ]'::jsonb);

SELECT public._seed_quest('agility','Daily Step Goal','هدف الخطوات اليومي',
  'Hit your daily step goal of 8,000-10,000 steps.','حقّق هدف الخطوات اليومي 8000-10000 خطوة.',
  'medium',60,55,15,false,NULL,NULL,NULL,NULL,
  '[
    {"type":"cardio","en":"Reach 8,000-10,000 steps","ar":"الوصول إلى 8000-10000 خطوة"}
  ]'::jsonb);

SELECT public._seed_quest('agility','Mobility Flow','تدفق المرونة',
  '20 minutes of mobility and flexibility work.','20 دقيقة تمارين مرونة وحركية.',
  'easy',20,40,10,false,NULL,NULL,NULL,NULL,
  '[
    {"type":"warmup","en":"Joint rotations","ar":"تدوير المفاصل","minutes":"5"},
    {"type":"stretch","en":"Full-body mobility flow","ar":"تدفق مرونة لكامل الجسم","minutes":"15"}
  ]'::jsonb);

SELECT public._seed_quest('agility','HIIT Burst','جلسة HIIT',
  '15 minute HIIT circuit: 30 sec work, 30 sec rest.','جلسة HIIT 15 دقيقة: 30 ثانية عمل و30 ثانية راحة.',
  'hard',20,65,20,false,NULL,NULL,NULL,NULL,
  '[
    {"type":"warmup","en":"Warm-up","ar":"إحماء","minutes":"5"},
    {"type":"exercise","en":"Jumping jacks","ar":"قفز متعاكس","sets":"4","reps":[30,30,30,30],"detail_en":"30 sec on / 30 sec rest","detail_ar":"30 ث عمل / 30 ث راحة"},
    {"type":"exercise","en":"Burpees","ar":"بيربي","sets":"4","reps":[30,30,30,30]},
    {"type":"exercise","en":"Mountain climbers","ar":"متسلق الجبل","sets":"4","reps":[30,30,30,30]},
    {"type":"stretch","en":"Cool down","ar":"تهدئة","minutes":"3"}
  ]'::jsonb);

-- ---------------- SPR (spirit) ----------------
SELECT public._seed_quest('spirit','Morning Dhikr Block','ورد الصباح',
  'Morning dhikr session to start the day grounded.','ورد ذكر صباحي لبدء يوم متّزن.',
  'easy',15,50,10,false,NULL,NULL,NULL,NULL,
  '[
    {"type":"practice","en":"Subhan Allah ×33","ar":"سبحان الله ×33"},
    {"type":"practice","en":"Alhamdulillah ×33","ar":"الحمد لله ×33"},
    {"type":"practice","en":"Allahu Akbar ×34","ar":"الله أكبر ×34"}
  ]'::jsonb);

SELECT public._seed_quest('spirit','Evening Dhikr Block','ورد المساء',
  'Evening dhikr to close the day with intention.','ورد ذكر مسائي لختم اليوم بنية.',
  'easy',15,50,10,false,NULL,NULL,NULL,NULL,
  '[
    {"type":"practice","en":"La ilaha illa Allah ×100","ar":"لا إله إلا الله ×100"},
    {"type":"practice","en":"Astaghfirullah ×100","ar":"أستغفر الله ×100"}
  ]'::jsonb);

SELECT public._seed_quest('spirit','Gratitude Reflection','تأمل الشكر',
  'List 5 specific things you are grateful for today.','اكتب 5 أشياء محددة تشكر الله عليها اليوم.',
  'easy',10,35,10,false,NULL,NULL,NULL,NULL,
  '[
    {"type":"note","en":"Write 5 gratitudes","ar":"اكتب 5 نعم تشكر عليها"}
  ]'::jsonb);

SELECT public._seed_quest('spirit','Help Someone Today','ساعد شخصاً اليوم',
  'Perform one intentional act of help for someone today.','قم بعمل خير مقصود لشخص اليوم.',
  'medium',20,55,15,false,NULL,NULL,NULL,NULL,
  '[
    {"type":"practice","en":"Identify someone who needs help","ar":"حدد شخصاً يحتاج المساعدة"},
    {"type":"practice","en":"Take the action","ar":"نفّذ المساعدة"},
    {"type":"note","en":"Reflect on the impact","ar":"تأمل في الأثر"}
  ]'::jsonb);

DROP FUNCTION public._seed_quest(public.quest_category, text, text, text, text, public.quest_difficulty, int, int, int, boolean, smallint, text, text, text, jsonb);
