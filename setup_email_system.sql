
-- 1. Configuración para Ofertas en Productos
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_on_sale boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sale_price integer,
ADD COLUMN IF NOT EXISTS sale_started_at timestamp with time zone;

-- 2. Sistema de Favoritos
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  product_id uuid REFERENCES products NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- 3. Sistema de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users,
  stripe_session_id text UNIQUE,
  customer_email text,
  total_amount integer,
  status text DEFAULT 'completed',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders ON DELETE CASCADE,
  product_id uuid REFERENCES products,
  quantity integer,
  price_at_purchase integer,
  product_name text
);

-- 4. Sistema de Preferencias y Notificaciones
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id uuid REFERENCES auth.users PRIMARY KEY,
  favorites_on_sale boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS notification_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users,
  product_id uuid REFERENCES products,
  notification_type text,
  email_sent_to text,
  sent_at timestamp with time zone DEFAULT now()
);

-- 5. Políticas de Seguridad (RLS)
-- Favoritos
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios ven sus propios favoritos" ON favorites 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios agregan sus propios favoritos" ON favorites 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios eliminan sus propios favoritos" ON favorites 
  FOR DELETE USING (auth.uid() = user_id);

-- Pedidos
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios ven sus propios pedidos" ON orders 
  FOR SELECT USING (auth.uid() = user_id);
-- Permitir inserción desde el servidor (service role) es por defecto bypass RLS, 
-- pero si insertamos desde cliente (poco probable para orders seguros), se necesitaría política.
-- Asumimos que la inserción se hace via API con service role o claves adecuadas.

-- Permitir a admins ver todo
CREATE POLICY "Admins ven todos los pedidos" ON orders 
  FOR ALL USING (is_admin());

-- Preferencias
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gestionan sus preferencias" ON user_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Historial
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
-- Solo lectura para el usuario quizás? O backend access mainly.
