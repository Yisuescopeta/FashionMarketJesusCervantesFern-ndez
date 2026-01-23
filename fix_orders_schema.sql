-- Add missing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id text UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'paid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users;

-- Ensure RLS allows inserts (Guest Checkout)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE orders TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Enable insert for everyone" ON orders;
CREATE POLICY "Enable insert for everyone" ON orders FOR INSERT WITH CHECK (true);

-- Also fix order_items just in case
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS price_at_purchase integer;

GRANT ALL ON TABLE order_items TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Enable insert for everyone" ON order_items;
CREATE POLICY "Enable insert for everyone" ON order_items FOR INSERT WITH CHECK (true);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
