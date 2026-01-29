-- ============================================
-- DIAGNOSTICO: ABRIR ACCESO TOTAL DE LECTURA A PROFILES
-- ============================================

-- 1. Verificar tabla (esto no fallará si existe)
-- Si este select da error, la tabla no existe o no se llama 'profiles'
SELECT count(*) FROM profiles;

-- 2. Eliminar políticas restrictivas previas
DROP POLICY IF EXISTS "Admin ve todos los perfiles" ON profiles;
DROP POLICY IF EXISTS "Usuario ve su perfil" ON profiles;
DROP POLICY IF EXISTS "Public Profiles Access" ON profiles;

-- 3. CREAR POLÍTICA "TODO ABIERTO" PARA LECTURA
-- ESTO ES SOLO PARA DEBUG. PERMITE QUE CUALQUIERA VEA LOS DATOS.
CREATE POLICY "Public Profiles Access"
ON profiles
FOR SELECT
USING (true);  -- 'true' significa acceso universal

-- 4. Asegurarse de que RLS está activo (las políticas solo funcionan si RLS está ON)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Dar permisos explicitos al rol 'anon' y 'authenticated' por si acaso
GRANT SELECT ON profiles TO anon;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO service_role;
