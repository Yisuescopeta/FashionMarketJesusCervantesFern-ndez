-- =============================================================
-- FIX SIZES COLUMN: Convert from TEXT[] array to JSONB object
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================================

-- STEP 1: Check current structure
SELECT id, name, stock, sizes, pg_typeof(sizes) as sizes_type 
FROM products LIMIT 3;

-- STEP 2: Create the new sizes column (JSONB for stock per size)
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes_json jsonb;

-- STEP 3: Migrate data - Convert text[] array to JSONB object with stock
-- This handles the text[] type properly
DO $$
DECLARE
    r RECORD;
    new_sizes jsonb;
    size_text text;
    size_count int;
    stock_per_size int;
BEGIN
    FOR r IN SELECT id, stock, sizes FROM products WHERE sizes IS NOT NULL
    LOOP
        -- sizes is text[], count elements
        size_count := array_length(r.sizes, 1);
        IF size_count IS NOT NULL AND size_count > 0 THEN
            stock_per_size := CEIL(COALESCE(r.stock, 50)::numeric / size_count);
            new_sizes := '{}';
            
            -- Loop through each size in the array
            FOREACH size_text IN ARRAY r.sizes
            LOOP
                new_sizes := new_sizes || jsonb_build_object(size_text, stock_per_size);
            END LOOP;
            
            UPDATE products SET sizes_json = new_sizes WHERE id = r.id;
        END IF;
    END LOOP;
END $$;

-- STEP 4: Set default sizes for products without sizes
UPDATE products 
SET sizes_json = '{"S": 10, "M": 15, "L": 15, "XL": 10}'::jsonb
WHERE sizes_json IS NULL;

-- STEP 5: Verify the migration before dropping old column
SELECT id, name, stock, sizes as old_sizes, sizes_json as new_sizes 
FROM products LIMIT 5;

-- STEP 6: Drop old column and rename new one
ALTER TABLE products DROP COLUMN IF EXISTS sizes;
ALTER TABLE products RENAME COLUMN sizes_json TO sizes;

-- STEP 7: Final verification
SELECT id, name, stock, sizes 
FROM products LIMIT 5;

-- STEP 8: Reload schema cache
NOTIFY pgrst, 'reload schema';
