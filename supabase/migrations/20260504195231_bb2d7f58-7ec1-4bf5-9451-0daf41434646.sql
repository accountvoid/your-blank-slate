-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- PROFILES TABLE (single row per player, JSONB game state)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  player_name TEXT NOT NULL DEFAULT 'Hunter',
  player_id TEXT NOT NULL DEFAULT ('SV-' || lpad((floor(random()*999999))::int::text, 6, '0')),
  player_title TEXT NOT NULL DEFAULT 'Newbie',
  equipped_title TEXT,
  player_job TEXT NOT NULL DEFAULT 'Hunter',
  avatar_url TEXT,
  discord_id TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_onboarded BOOLEAN NOT NULL DEFAULT false,

  -- Resources
  hp INTEGER NOT NULL DEFAULT 100,
  max_hp INTEGER NOT NULL DEFAULT 100,
  energy INTEGER NOT NULL DEFAULT 100,
  max_energy INTEGER NOT NULL DEFAULT 100,
  gold INTEGER NOT NULL DEFAULT 0,
  shadow_points INTEGER NOT NULL DEFAULT 0,
  total_level INTEGER NOT NULL DEFAULT 1,

  -- JSONB game state
  stats JSONB NOT NULL DEFAULT '{"strength":1,"mind":1,"spirit":1,"agility":1}'::jsonb,
  levels JSONB NOT NULL DEFAULT '{}'::jsonb,
  quests JSONB NOT NULL DEFAULT '[]'::jsonb,
  prayer_quests JSONB NOT NULL DEFAULT '[]'::jsonb,
  abilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  achievements JSONB NOT NULL DEFAULT '[]'::jsonb,
  inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  gates JSONB NOT NULL DEFAULT '[]'::jsonb,
  shadow_soldiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  daily_stats JSONB NOT NULL DEFAULT '[]'::jsonb,
  claimed_rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_boss JSONB,
  grand_quest JSONB,
  punishment JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Misc
  punishment_end_time TIMESTAMPTZ,
  missed_quests_count INTEGER NOT NULL DEFAULT 0,
  total_quests_completed INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  last_boss_attack_time TIMESTAMPTZ,
  selected_reciter TEXT NOT NULL DEFAULT 'default',
  sound_enabled BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Players can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Players can insert their own profile (on first login)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Players can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Players can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_player_id ON public.profiles(player_id);

-- =====================================================
-- FRIENDSHIPS TABLE
-- =====================================================
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sender_id, receiver_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their friendships"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete their friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, player_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'player_name', 'Hunter')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();