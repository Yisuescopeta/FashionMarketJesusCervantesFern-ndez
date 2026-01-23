
-- Permitir inserciones públicas en la tabla orders (necesario para guest checkout cuando no hay auth)
DROP POLICY IF EXISTS "Enable insert for everyone" ON orders;
CREATE POLICY "Enable insert for everyone" ON orders FOR INSERT WITH CHECK (true);

-- Permitir inserciones públicas en order_items
DROP POLICY IF EXISTS "Enable insert for everyone" ON order_items;
CREATE POLICY "Enable insert for everyone" ON order_items FOR INSERT WITH CHECK (true);

-- Permitir lectura pública de sus propios pedidos (opcional, pero buena práctica si el cliente lo consulta)
-- Nota: Esto es peligroso para Select all, pero limitamos a ID conocido en la app.
-- Mejor restringir a auth si es posible, pero para invitado dejamos abierto o rely on server-side fetching.
-- Por seguridad básica, solo permitimos Insert. Select ya estaba cubierto o no es necesario para el insert.

-- Asegurar que se puede hacer Auth
GRANT ALL ON TABLE orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE order_items TO anon, authenticated, service_role;
