-- Add shipping columns to orders table if they don't exist
-- This ensures the orders table matches what the application expects

DO $$
BEGIN
    -- shipping_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipping_address') THEN
        ALTER TABLE orders ADD COLUMN shipping_address text DEFAULT 'No especificada';
    END IF;

    -- shipping_city
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipping_city') THEN
        ALTER TABLE orders ADD COLUMN shipping_city text DEFAULT 'No especificada';
    END IF;

    -- shipping_postal_code
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipping_postal_code') THEN
        ALTER TABLE orders ADD COLUMN shipping_postal_code text DEFAULT '00000';
    END IF;

    -- shipping_phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipping_phone') THEN
        ALTER TABLE orders ADD COLUMN shipping_phone text;
    END IF;

    -- notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'notes') THEN
        ALTER TABLE orders ADD COLUMN notes text;
    END IF;
    
    -- Ensure stripe_session_id and customer_email exist (from previous fix)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'stripe_session_id') THEN
        ALTER TABLE orders ADD COLUMN stripe_session_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_email') THEN
        ALTER TABLE orders ADD COLUMN customer_email text;
    END IF;

    -- Ensure total_amount exists
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total_amount') THEN
        ALTER TABLE orders ADD COLUMN total_amount integer;
    END IF;

END $$;
