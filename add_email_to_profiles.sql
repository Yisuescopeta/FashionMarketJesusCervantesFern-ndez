
-- 1. Añadir columna email a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Sincronizar emails existentes desde auth.users
-- Nota: Esto requiere privilegios elevados. Si falla, el admin debe ejecutarlo en el SQL Editor de Dashboard.
UPDATE profiles 
SET email = users.email
FROM auth.users
WHERE profiles.id = users.id;

-- 3. Actualizar el trigger para que nuevos usuarios guarden su email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    'customer',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Asegurar que los admins puedan ver todo (reafirmar politica)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- 5. Función para notificaciones masivas (útil si RLS da problemas)
CREATE OR REPLACE FUNCTION get_broadcast_audience()
RETURNS TABLE (id uuid, full_name text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar si el usuario que llama es admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  RETURN QUERY 
  SELECT p.id, p.full_name, p.email 
  FROM profiles p
  WHERE p.email IS NOT NULL;
END;
$$;
