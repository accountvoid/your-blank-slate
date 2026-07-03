
-- Independent Side Missions system, fully decoupled from main quest_templates/user_quest_runs.
CREATE TABLE public.side_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_key TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('strength','mind','spirit','agility')),
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard','legendary')),
  xp_reward INT NOT NULL DEFAULT 10,
  gold_reward INT NOT NULL DEFAULT 5,
  estimated_minutes INT NOT NULL DEFAULT 10,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  warning_en TEXT,
  warning_ar TEXT,
  is_repeatable BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.side_missions TO anon, authenticated;
GRANT ALL ON public.side_missions TO service_role;
ALTER TABLE public.side_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "side_missions readable by all" ON public.side_missions FOR SELECT USING (is_active = true);
CREATE TRIGGER side_missions_updated_at BEFORE UPDATE ON public.side_missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.side_mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.side_missions(id) ON DELETE CASCADE,
  run_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','failed','abandoned')),
  step_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress_percent INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, mission_id, run_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.side_mission_progress TO authenticated;
GRANT ALL ON public.side_mission_progress TO service_role;
ALTER TABLE public.side_mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own side progress select" ON public.side_mission_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own side progress insert" ON public.side_mission_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own side progress update" ON public.side_mission_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own side progress delete" ON public.side_mission_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER side_mission_progress_updated_at BEFORE UPDATE ON public.side_mission_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.side_missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.side_mission_progress;

-- Seed side missions (bilingual, unique keys, independent from main quests)
INSERT INTO public.side_missions (mission_key, title_en, title_ar, description_en, description_ar, category, difficulty, xp_reward, gold_reward, estimated_minutes, steps) VALUES
('DRINK_WATER_2L','Drink 2L of Water','اشرب 2 لتر ماء','Stay hydrated throughout the day.','حافظ على ترطيب جسمك خلال اليوم.','agility','easy',15,8,5,
  '[{"id":"s1","title_en":"Morning glass","title_ar":"كوب الصباح"},{"id":"s2","title_en":"Midday bottle","title_ar":"قنينة منتصف اليوم"},{"id":"s3","title_en":"Evening refill","title_ar":"إعادة تعبئة المساء"},{"id":"s4","title_en":"Night glass","title_ar":"كوب الليل"}]'::jsonb),
('PROTEIN_GOAL','Hit Protein Goal','حقق هدف البروتين','Consume enough protein for recovery.','تناول كمية كافية من البروتين للتعافي.','strength','medium',25,15,10,
  '[{"id":"s1","title_en":"Breakfast protein","title_ar":"بروتين الإفطار"},{"id":"s2","title_en":"Lunch protein","title_ar":"بروتين الغداء"},{"id":"s3","title_en":"Dinner protein","title_ar":"بروتين العشاء"}]'::jsonb),
('READ_20_MIN','Read for 20 Minutes','اقرأ لمدة 20 دقيقة','Sharpen your mind with focused reading.','اشحذ عقلك بقراءة مركّزة.','mind','easy',20,10,20,
  '[{"id":"s1","title_en":"Pick a book","title_ar":"اختر كتابًا"},{"id":"s2","title_en":"Read 20 minutes","title_ar":"اقرأ 20 دقيقة"},{"id":"s3","title_en":"Note one insight","title_ar":"دوّن فكرة واحدة"}]'::jsonb),
('MORNING_DHIKR','Morning Dhikr','أذكار الصباح','Recite morning remembrances.','اقرأ أذكار الصباح.','spirit','easy',20,10,10,
  '[{"id":"s1","title_en":"Ayat al-Kursi","title_ar":"آية الكرسي"},{"id":"s2","title_en":"Al-Mu''awwidhat x3","title_ar":"المعوذات × 3"},{"id":"s3","title_en":"SubhanAllah x100","title_ar":"سبحان الله × 100"}]'::jsonb),
('EVENING_DHIKR','Evening Dhikr','أذكار المساء','Recite evening remembrances.','اقرأ أذكار المساء.','spirit','easy',20,10,10,
  '[{"id":"s1","title_en":"Ayat al-Kursi","title_ar":"آية الكرسي"},{"id":"s2","title_en":"Al-Mu''awwidhat x3","title_ar":"المعوذات × 3"},{"id":"s3","title_en":"Alhamdulillah x100","title_ar":"الحمد لله × 100"}]'::jsonb),
('WALK_5000_STEPS','Walk 5000 Steps','امشِ 5000 خطوة','Get your steps in for the day.','أنجز خطواتك اليومية.','agility','easy',20,10,45,
  '[{"id":"s1","title_en":"Warm-up walk","title_ar":"إحماء بالمشي"},{"id":"s2","title_en":"Reach 5000 steps","title_ar":"الوصول إلى 5000 خطوة"}]'::jsonb),
('STRETCH_10_MIN','Stretch for 10 Minutes','تمدد لمدة 10 دقائق','Loosen up your muscles and joints.','ارخِ عضلاتك ومفاصلك.','strength','easy',15,8,10,
  '[{"id":"s1","title_en":"Neck & shoulders","title_ar":"الرقبة والكتفين"},{"id":"s2","title_en":"Back & hips","title_ar":"الظهر والوركين"},{"id":"s3","title_en":"Legs","title_ar":"الساقين"}]'::jsonb),
('LEARN_NEW_WORD','Learn One New Word','تعلم كلمة جديدة','Expand your vocabulary today.','وسّع حصيلتك اللغوية اليوم.','mind','easy',10,5,5,
  '[{"id":"s1","title_en":"Look up a new word","title_ar":"ابحث عن كلمة جديدة"},{"id":"s2","title_en":"Use it in a sentence","title_ar":"استخدمها في جملة"}]'::jsonb),
('GRATITUDE_REFLECTION','Gratitude Reflection','تأمل الامتنان','Write down 3 things you are grateful for.','دوّن 3 أشياء تشعر بالامتنان لها.','spirit','easy',15,8,5,
  '[{"id":"s1","title_en":"Thing 1","title_ar":"شيء 1"},{"id":"s2","title_en":"Thing 2","title_ar":"شيء 2"},{"id":"s3","title_en":"Thing 3","title_ar":"شيء 3"}]'::jsonb),
('HIIT_QUICK','Quick HIIT Circuit','دائرة HIIT سريعة','A short high-intensity burst.','دفعة قصيرة عالية الشدة.','agility','medium',30,15,15,
  '[{"id":"s1","title_en":"Jumping jacks 1m","title_ar":"قفز مفتوح 1د"},{"id":"s2","title_en":"Burpees 1m","title_ar":"بيربي 1د"},{"id":"s3","title_en":"Mountain climbers 1m","title_ar":"متسلق الجبل 1د"},{"id":"s4","title_en":"Rest & repeat","title_ar":"استرح وكرر"}]'::jsonb),
('PUSHUP_SET','Push-Up Set','مجموعة تمرين الضغط','Complete 3 sets of push-ups.','أكمل 3 مجموعات من تمرين الضغط.','strength','medium',25,12,10,
  '[{"id":"s1","title_en":"Set 1","title_ar":"المجموعة 1"},{"id":"s2","title_en":"Set 2","title_ar":"المجموعة 2"},{"id":"s3","title_en":"Set 3","title_ar":"المجموعة 3"}]'::jsonb),
('HELP_SOMEONE','Help Someone Today','ساعد شخصًا اليوم','Do a small act of kindness.','قم بعمل لطيف صغير.','spirit','easy',25,15,10,
  '[{"id":"s1","title_en":"Identify who to help","title_ar":"حدد من تساعد"},{"id":"s2","title_en":"Perform the kindness","title_ar":"نفّذ عمل الخير"}]'::jsonb);
