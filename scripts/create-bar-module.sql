-- ============================================
-- Module Produits / Bar — Tables
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Table produits
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'boisson' CHECK (category IN ('boisson', 'spiritueux', 'soft', 'snack', 'autre')),
  purchase_price NUMERIC(10,2) DEFAULT 0,
  sell_price NUMERIC(10,2) DEFAULT 0,
  stock INT DEFAULT 0,
  unit TEXT DEFAULT 'unité',
  image_url TEXT DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table ventes par événement
CREATE TABLE IF NOT EXISTS event_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_sold INT DEFAULT 0,
  unit_price NUMERIC(10,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, product_id)
);

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_event_sales_event ON event_sales (event_id);
CREATE INDEX IF NOT EXISTS idx_event_sales_product ON event_sales (product_id);

-- 4. RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update products" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can delete products" ON products FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can read event_sales" ON event_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert event_sales" ON event_sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update event_sales" ON event_sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can delete event_sales" ON event_sales FOR DELETE TO authenticated USING (true);
