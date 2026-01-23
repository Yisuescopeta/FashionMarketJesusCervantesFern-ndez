-- ==========================================
-- FIX PARA POLÍTICAS DE PEDIDOS
-- ==========================================
-- Este script arregla las políticas RLS para permitir que el servidor
-- guarde pedidos correctamente después de un pago exitoso

-- 1. Eliminar políticas restrictivas existentes
DROP POLICY IF EXISTS "Usuario crea pedidos" ON orders;
DROP POLICY IF EXISTS "Usuario crea items en sus pedidos" ON order_items;
DROP POLICY IF EXISTS "Enable insert for everyone" ON orders;
DROP POLICY IF EXISTS "Enable insert for everyone" ON order_items;

-- 2. Crear política permisiva para inserción de pedidos
-- Permite insertar pedidos tanto a usuarios autenticados como al service_role
CREATE POLICY "Permitir inserción de pedidos" ON orders
    FOR INSERT 
    WITH CHECK (true);

-- 3. Crear política permisiva para inserción de items de pedido
CREATE POLICY "Permitir inserción de items" ON order_items
    FOR INSERT 
    WITH CHECK (true);

-- 4. Mantener las políticas de lectura existentes
-- Los usuarios solo pueden ver sus propios pedidos
CREATE POLICY "Usuario ve sus pedidos" ON orders
    FOR SELECT 
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Los usuarios pueden ver items de sus pedidos
CREATE POLICY "Usuario ve items de sus pedidos" ON order_items
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
        )
    );

-- 5. Políticas de administrador (mantener las existentes)
CREATE POLICY "Admin ve todos los pedidos" ON orders
    FOR SELECT 
    USING (is_admin());

CREATE POLICY "Admin gestiona pedidos" ON orders
    FOR ALL 
    USING (is_admin());

CREATE POLICY "Admin ve todos los items" ON order_items
    FOR SELECT 
    USING (is_admin());

CREATE POLICY "Admin gestiona items" ON order_items
    FOR ALL 
    USING (is_admin());

-- 6. Asegurar que RLS está habilitado
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 7. Dar permisos explícitos a los roles
GRANT INSERT, SELECT ON orders TO anon, authenticated, service_role;
GRANT INSERT, SELECT ON order_items TO anon, authenticated, service_role;

-- Notificar cambios
NOTIFY pgrst, 'reload schema';
