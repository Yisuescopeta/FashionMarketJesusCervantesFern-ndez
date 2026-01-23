-- =============================================================
-- COMPLETE FIX FOR ORDERS SYSTEM
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================================

-- 1. Drop existing tables if they have wrong schema
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- 2. Create orders table with correct schema
CREATE TABLE orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users,
    stripe_session_id text UNIQUE,
    customer_email text,
    total_amount integer,
    status text DEFAULT 'paid'
);

-- 3. Create order_items table
CREATE TABLE order_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES orders ON DELETE CASCADE,
    product_name text,
    quantity integer,
    price_at_purchase integer
);

-- 4. Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions to all roles
GRANT ALL ON TABLE orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE order_items TO anon, authenticated, service_role;

-- 6. Create policies for anonymous inserts (guest checkout)
DROP POLICY IF EXISTS "Allow public insert orders" ON orders;
CREATE POLICY "Allow public insert orders" ON orders 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select orders" ON orders;
CREATE POLICY "Allow public select orders" ON orders 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert items" ON order_items;
CREATE POLICY "Allow public insert items" ON order_items 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select items" ON order_items;
CREATE POLICY "Allow public select items" ON order_items 
    FOR SELECT USING (true);

-- 7. CRITICAL: Reload the schema cache so PostgREST sees the new tables
NOTIFY pgrst, 'reload schema';

-- 8. Verify the tables were created
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('orders', 'order_items')
ORDER BY table_name, ordinal_position;
