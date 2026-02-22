-- Function to restore stock via trigger
CREATE OR REPLACE FUNCTION public.restore_stock_on_order_cancel()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- Only run if status changed to 'cancelled'
    IF (NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled')) THEN
        RAISE NOTICE 'Restoring stock for cancelled order %', NEW.id;
        
        FOR item IN 
            SELECT product_id, size, quantity 
            FROM public.order_items 
            WHERE order_id = NEW.id
        LOOP
            IF item.product_id IS NOT NULL AND item.size IS NOT NULL THEN
                PERFORM public.restore_variant_stock(
                    item.product_id,
                    item.size,
                    item.quantity
                );
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_restore_stock_on_order_cancel ON public.orders;
CREATE TRIGGER tr_restore_stock_on_order_cancel
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.restore_stock_on_order_cancel();
