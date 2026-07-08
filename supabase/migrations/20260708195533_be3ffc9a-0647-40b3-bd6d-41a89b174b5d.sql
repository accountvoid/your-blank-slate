
-- 1. Extend app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

-- 2. gate_items
CREATE TABLE IF NOT EXISTS public.gate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  rarity text NOT NULL DEFAULT 'common',
  category text NOT NULL DEFAULT 'material',
  icon text NOT NULL DEFAULT '📦',
  image text,
  drop_rate numeric NOT NULL DEFAULT 0.15,
  quantity integer NOT NULL DEFAULT 1,
  stackable boolean NOT NULL DEFAULT true,
  max_stack integer NOT NULL DEFAULT 999,
  duration_minutes integer,
  effect_type text,
  effect_value numeric,
  gate_rank text NOT NULL DEFAULT 'ALL',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gate_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gate_items TO authenticated;
GRANT ALL ON public.gate_items TO service_role;
ALTER TABLE public.gate_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gate_items readable" ON public.gate_items FOR SELECT USING (true);
CREATE POLICY "gate_items admin write" ON public.gate_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER gate_items_updated BEFORE UPDATE ON public.gate_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. shop_items
CREATE TABLE IF NOT EXISTS public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  rarity text NOT NULL DEFAULT 'common',
  category text NOT NULL DEFAULT 'consumable',
  icon text NOT NULL DEFAULT '📦',
  image text,
  price_gold integer NOT NULL DEFAULT 0,
  stackable boolean NOT NULL DEFAULT true,
  max_stack integer NOT NULL DEFAULT 999,
  duration_minutes integer,
  effect_type text,
  effect_value numeric,
  level_required integer NOT NULL DEFAULT 0,
  rank_required text NOT NULL DEFAULT 'E',
  can_purchase boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_items TO authenticated;
GRANT ALL ON public.shop_items TO service_role;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_items readable" ON public.shop_items FOR SELECT USING (true);
CREATE POLICY "shop_items admin write" ON public.shop_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER shop_items_updated BEFORE UPDATE ON public.shop_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. user_inventory
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  source text NOT NULL DEFAULT 'SYSTEM',
  quantity integer NOT NULL DEFAULT 1,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_inventory_user_idx ON public.user_inventory(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_inventory TO authenticated;
GRANT ALL ON public.user_inventory TO service_role;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_inventory owner read" ON public.user_inventory FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "user_inventory owner write" ON public.user_inventory FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_inventory_updated BEFORE UPDATE ON public.user_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gate_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_inventory;
