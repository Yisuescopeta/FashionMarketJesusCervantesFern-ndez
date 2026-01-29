-- ============================================
-- FIX: VERIFICAR POLÍTICAS RLS PARA PERFILES (ADMIN/SERVICE)
-- ============================================

-- 1. Eliminar política antigua si existe para evitar conflictos
DROP POLICY IF EXISTS "Admin ve todos los perfiles" ON profiles;

-- 2. Crear política permisiva para el Admin y Service Role
CREATE POLICY "Admin ve todos los perfiles" 
ON profiles 
FOR SELECT 
USING (
    -- Permite acceso si es rol de servicio O si es admin autenticado
    (auth.jwt() ->> 'role' = 'service_role') OR is_admin()
);

-- 3. Asegurar que RLS está activo
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Asegurar que podemos crear perfiles (INSERT) desde el seed script
DROP POLICY IF EXISTS "Admin crea perfiles" ON profiles;
CREATE POLICY "Admin crea perfiles"
ON profiles
FOR INSERT
WITH CHECK (
    (auth.jwt() ->> 'role' = 'service_role') OR is_admin()
);

-- 5. Asegurar que podemos actualizar perfiles (UPDATE)
DROP POLICY IF EXISTS "Admin actualiza perfiles" ON profiles;
CREATE POLICY "Admin actualiza perfiles"
ON profiles
FOR UPDATE
USING (
    (auth.jwt() ->> 'role' = 'service_role') OR is_admin()
);
