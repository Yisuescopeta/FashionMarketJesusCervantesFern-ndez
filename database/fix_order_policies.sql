-- ============================================
-- FIX: VERIFICAR POLÍTICAS RLS PARA ADMINS
-- ============================================

-- 1. Asegurar que la función is_admin() existe y funciona
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Eliminar política antigua si existe (para evitar duplicados o conflictos)
DROP POLICY IF EXISTS "Admin ve todos los pedidos" ON orders;

-- 3. Crear política permisiva para el Admin
-- Opción A: Usando el rol 'service_role' (si estás usando la clave secreta)
-- Opción B: Usando el rol 'admin' definido en tu tabla profiles

CREATE POLICY "Admin ve todos los pedidos" 
ON orders 
FOR SELECT 
USING (
    -- Permite acceso si es rol de servicio (seed script) O si es admin autenticado
    (auth.jwt() ->> 'role' = 'service_role') OR is_admin()
);

-- 4. Asegurar que RLS está activo (safety check)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 5. (OPCIONAL) Debugging: Verificar si hay pedidos pero están ocultos
-- Ejecuta esto en tu SQL Editor de Supabase y mira si devuelve filas
-- SELECT count(*) FROM orders;
