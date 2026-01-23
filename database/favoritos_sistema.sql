-- =====================================================
-- SISTEMA DE FAVORITOS CON NOTIFICACIONES
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Tabla de favoritos del usuario
CREATE TABLE IF NOT EXISTS favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Evitar duplicados: un usuario solo puede tener un producto en favoritos una vez
    UNIQUE(user_id, product_id)
);

-- 2. Preferencias de notificaciones del usuario
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    favorites_on_sale BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Historial de notificaciones enviadas (para evitar spam)
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'favorite_on_sale',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_sent_to VARCHAR(255),
    
    -- Evitar enviar la misma notificación dos veces
    UNIQUE(user_id, product_id, notification_type)
);

-- 4. Añadir campo para trackear cuando un producto entró en oferta
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sale_started_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- ÍNDICES PARA RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_product ON notification_history(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_products_on_sale ON products(is_on_sale) WHERE is_on_sale = true;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Favoritos: usuarios solo pueden ver/modificar sus propios favoritos
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites" ON favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Preferencias: usuarios solo pueden ver/modificar sus propias preferencias
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON user_notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Historial de notificaciones: solo lectura para usuarios
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification history" ON notification_history
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- FUNCIÓN: Actualizar sale_started_at automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_sale_started_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el producto acaba de entrar en oferta
    IF NEW.is_on_sale = true AND (OLD.is_on_sale = false OR OLD.is_on_sale IS NULL) THEN
        NEW.sale_started_at = NOW();
    -- Si el producto sale de oferta, limpiar la fecha
    ELSIF NEW.is_on_sale = false AND OLD.is_on_sale = true THEN
        NEW.sale_started_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ejecutar la función
DROP TRIGGER IF EXISTS trigger_update_sale_started_at ON products;
CREATE TRIGGER trigger_update_sale_started_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_sale_started_at();

-- =====================================================
-- FUNCIÓN: Crear preferencias por defecto al registrarse
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_notification_preferences (user_id, favorites_on_sale, marketing_emails)
    VALUES (NEW.id, true, false)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para nuevos usuarios
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON auth.users;
CREATE TRIGGER trigger_create_notification_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();
