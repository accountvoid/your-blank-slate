
-- =========================================================
-- ROLES SYSTEM
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_admin_or_higher(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin')) $$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') $$;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_higher(auth.uid()));

DROP POLICY IF EXISTS "super admin manages roles" ON public.user_roles;
CREATE POLICY "super admin manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- =========================================================
-- SHOP ITEMS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  rarity TEXT NOT NULL DEFAULT 'common',
  category TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  image TEXT,
  price_gold INTEGER NOT NULL DEFAULT 0,
  stackable BOOLEAN NOT NULL DEFAULT true,
  max_stack INTEGER NOT NULL DEFAULT 999,
  duration_minutes INTEGER,
  effect_type TEXT,
  effect_value NUMERIC,
  level_required INTEGER NOT NULL DEFAULT 0,
  rank_required TEXT NOT NULL DEFAULT 'E',
  can_purchase BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shop_items TO anon, authenticated;
GRANT ALL ON public.shop_items TO service_role;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read active shop items" ON public.shop_items;
CREATE POLICY "public read active shop items" ON public.shop_items FOR SELECT
  USING (is_active = true OR public.is_admin_or_higher(auth.uid()));

DROP POLICY IF EXISTS "admins manage shop items" ON public.shop_items;
CREATE POLICY "admins manage shop items" ON public.shop_items FOR ALL TO authenticated
  USING (public.is_admin_or_higher(auth.uid())) WITH CHECK (public.is_admin_or_higher(auth.uid()));

CREATE TRIGGER shop_items_updated_at BEFORE UPDATE ON public.shop_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- GATE ITEMS (independent from shop_items)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.gate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  rarity TEXT NOT NULL DEFAULT 'common',
  category TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  image TEXT,
  drop_rate NUMERIC NOT NULL DEFAULT 0.15 CHECK (drop_rate >= 0 AND drop_rate <= 1),
  quantity INTEGER NOT NULL DEFAULT 1,
  stackable BOOLEAN NOT NULL DEFAULT true,
  max_stack INTEGER NOT NULL DEFAULT 999,
  duration_minutes INTEGER,
  effect_type TEXT,
  effect_value NUMERIC,
  gate_rank TEXT NOT NULL DEFAULT 'E' CHECK (gate_rank IN ('E','D','C','B','A','S','ALL')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gate_items TO anon, authenticated;
GRANT ALL ON public.gate_items TO service_role;
ALTER TABLE public.gate_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read active gate items" ON public.gate_items;
CREATE POLICY "public read active gate items" ON public.gate_items FOR SELECT
  USING (is_active = true OR public.is_admin_or_higher(auth.uid()));

DROP POLICY IF EXISTS "admins manage gate items" ON public.gate_items;
CREATE POLICY "admins manage gate items" ON public.gate_items FOR ALL TO authenticated
  USING (public.is_admin_or_higher(auth.uid())) WITH CHECK (public.is_admin_or_higher(auth.uid()));

CREATE TRIGGER gate_items_updated_at BEFORE UPDATE ON public.gate_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- USER INVENTORY (normalized)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('SHOP','GATE','SYSTEM','EVENT','QUEST')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  equipped BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_key, source)
);

CREATE INDEX IF NOT EXISTS user_inventory_user_idx ON public.user_inventory(user_id);
CREATE INDEX IF NOT EXISTS user_inventory_expires_idx ON public.user_inventory(expires_at) WHERE expires_at IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_inventory TO authenticated;
GRANT ALL ON public.user_inventory TO service_role;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own inventory" ON public.user_inventory;
CREATE POLICY "users read own inventory" ON public.user_inventory FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_higher(auth.uid()));

DROP POLICY IF EXISTS "users insert own inventory" ON public.user_inventory;
CREATE POLICY "users insert own inventory" ON public.user_inventory FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own inventory" ON public.user_inventory;
CREATE POLICY "users update own inventory" ON public.user_inventory FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own inventory" ON public.user_inventory;
CREATE POLICY "users delete own inventory" ON public.user_inventory FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins manage all inventory" ON public.user_inventory;
CREATE POLICY "admins manage all inventory" ON public.user_inventory FOR ALL TO authenticated
  USING (public.is_admin_or_higher(auth.uid())) WITH CHECK (public.is_admin_or_higher(auth.uid()));

CREATE TRIGGER user_inventory_updated_at BEFORE UPDATE ON public.user_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- AUDIT LOGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  affected_table TEXT NOT NULL,
  affected_record UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_admin_idx ON public.audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_table_idx ON public.audit_logs(affected_table, created_at DESC);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read audit logs" ON public.audit_logs;
CREATE POLICY "admins read audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin_or_higher(auth.uid()));

DROP POLICY IF EXISTS "admins write audit logs" ON public.audit_logs;
CREATE POLICY "admins write audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_higher(auth.uid()) AND auth.uid() = admin_id);

-- =========================================================
-- SEED shop_items (mirrors current MARKET_CATALOG)
-- =========================================================
INSERT INTO public.shop_items (item_key, name_ar, name_en, description_ar, description_en, rarity, category, icon, price_gold, rank_required, effect_type, effect_value, max_stack, sort_order, metadata) VALUES
('hp_elixir',      'إكسير الصحة', 'HP Elixir',      'يستعيد نسبة من نقاط الحياة.', 'Restores a portion of your health.',       'common',    'consumable',       '🧪',   300, 'E', 'health', 50,  99, 10, '{"maxUses":1}'::jsonb),
('mp_elixir',      'إكسير المانا', 'MP Elixir',      'يستعيد نسبة من نقاط المانا.', 'Restores a portion of your mana.',         'common',    'consumable',       '⚡',   300, 'E', 'energy', 50,  99, 20, '{"maxUses":1}'::jsonb),
('xp_book',        'كتاب الخبرة', 'XP Book',        'يمنحك نقاط خبرة عند الاستخدام.', 'Grants XP when used.',                  'common',    'consumable',       '📚',   250, 'E', 'xp',     75,  99, 30, '{"maxUses":1}'::jsonb),
('stone_dagger',   'خنجر حجري',   'Stone Dagger',   'سلاح بدائي متين.', 'A sturdy primitive weapon.',                          'uncommon',  'weapon',           '🗡️',  600, 'D', NULL,     NULL, 1,  40, '{"durability":150,"stats":{"hp":16,"damage":23}}'::jsonb),
('shadow_dagger',  'خنجر الظل',   'Shadow Dagger',  'سلاح متقدم قاتم.', 'A dark advanced weapon.',                             'rare',      'weapon',           '🗡️', 11000, 'B', NULL,     NULL, 1,  50, '{"durability":600,"stats":{"hp":92,"damage":231}}'::jsonb),
('cutting_stones', 'أحجار القطع',  'Cutting Stones', 'مادة نادرة لصياغة حجر المانا.', 'Rare material to forge a Mana Stone.', 'rare',      'special_material', '💎',  7000, 'C', NULL,     NULL, 99, 60, '{}'::jsonb),
('mana_analyst',   'محلل المانا', 'Mana Analyst',   'أداة لتحليل الأغراض.', 'A tool to analyze items.',                       'uncommon',  'utility',          '📊',  1000, 'D', NULL,     NULL, 99, 70, '{"maxUses":2}'::jsonb)
ON CONFLICT (item_key) DO NOTHING;

-- =========================================================
-- SEED gate_items (mirrors current GATE_BONUS_LOOT)
-- =========================================================
INSERT INTO public.gate_items (item_key, name_ar, name_en, description_ar, description_en, rarity, category, icon, drop_rate, quantity, gate_rank, effect_type, effect_value, sort_order) VALUES
('xp_book',        'كتاب الخبرة', 'XP Book',        'يمنحك نقاط خبرة عند الاستخدام.', 'Grants XP when used.',                  'uncommon', 'consumable',       '📚', 0.15, 1, 'ALL', 'xp',     75, 10),
('hp_elixir',      'إكسير الصحة', 'HP Elixir',      'يستعيد نسبة من نقاط الحياة.', 'Restores a portion of your health.',       'uncommon', 'consumable',       '🧪', 0.15, 1, 'ALL', 'health', 50, 20),
('mp_elixir',      'إكسير المانا', 'MP Elixir',      'يستعيد نسبة من نقاط المانا.', 'Restores a portion of your mana.',         'uncommon', 'consumable',       '⚡', 0.15, 1, 'ALL', 'energy', 50, 30),
('cutting_stones', 'أحجار القطع',  'Cutting Stones', 'مادة نادرة لصياغة حجر المانا.', 'Rare material to forge a Mana Stone.', 'rare',     'special_material', '💎', 0.15, 1, 'ALL', NULL,     NULL, 40)
ON CONFLICT (item_key) DO NOTHING;
