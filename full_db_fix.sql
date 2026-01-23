
-- 1. Asegurar que la tabla existe
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users,
    stripe_session_id text,
    customer_email text,
    total_amount numeric,
    status text
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES public.orders,
    product_name text,
    quantity integer,
    price_at_purchase numeric
);

-- 2. Habilitar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 3. Conceder Permisos (CRUCIAL para que la API la vea)
GRANT ALL ON TABLE public.orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.order_items TO anon, authenticated, service_role;

-- 4. Políticas de Seguridad (Permitir inserción pública para invitados)
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
CREATE POLICY "Allow public insert orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select orders" ON public.orders;
CREATE POLICY "Allow public select orders" ON public.orders FOR SELECT USING (true); -- Cuidado en prod, filtrar por ID/Session

DROP POLICY IF EXISTS "Allow public insert items" ON public.order_items;
CREATE POLICY "Allow public insert items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select items" ON public.order_items;
CREATE POLICY "Allow public select items" ON public.order_items FOR SELECT USING (true);

-- 5. Recargar Caché de Esquema (Soluciona error "relation not found in schema cache")
NOTIFY pgrst, 'reload schema';
