-- 1. Redefine the synchronization function
CREATE OR REPLACE FUNCTION public.sync_product_total_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_id UUID;
BEGIN
    -- Determine product_id from NEW or OLD record
    v_product_id := COALESCE(NEW.product_id, OLD.product_id);

    -- Update products table
    UPDATE public.products
    SET 
        stock = (
            SELECT COALESCE(SUM(stock), 0)
            FROM public.product_variants
            WHERE product_id = v_product_id
        ),
        sizes = (
            SELECT jsonb_object_agg(size, stock)
            FROM public.product_variants
            WHERE product_id = v_product_id
        ),
        updated_at = NOW()
    WHERE id = v_product_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Re-create or create the trigger on product_variants
-- (Drop it first to ensure it's clean)
DROP TRIGGER IF EXISTS sync_stock_on_variant_change ON public.product_variants;
CREATE TRIGGER sync_stock_on_variant_change
AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.sync_product_total_stock();

-- 3. Safety trigger for the products table
-- Ensures that if someone manually updates products.stock, it gets re-synced from variants
CREATE OR REPLACE FUNCTION public.ensure_stock_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- We force the calculation based on variants
    NEW.stock := (
        SELECT COALESCE(SUM(stock), 0)
        FROM public.product_variants
        WHERE product_id = NEW.id
    );
    NEW.sizes := (
        SELECT jsonb_object_agg(size, stock)
        FROM public.product_variants
        WHERE product_id = NEW.id
    );
    
    -- If no variants exist yet, we keep the NEW values (to allow first-time initialization if needed)
    -- But usually variants should be created first.
    -- Better yet: If variants EXIST, they win. If NOT, we let it be.
    IF EXISTS (SELECT 1 FROM public.product_variants WHERE product_id = NEW.id) THEN
        -- Variants exist, so they are the source of truth
        NULL; -- handled above
    ELSE
        -- No variants? We might be creating a product. 
        -- We'll stay as is.
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_ensure_stock_consistency ON public.products;
CREATE TRIGGER tr_ensure_stock_consistency
BEFORE UPDATE ON public.products
FOR EACH ROW
WHEN (pg_trigger_depth() < 1) -- Avoid recursion if we update from variant trigger
EXECUTE FUNCTION public.ensure_stock_consistency();
