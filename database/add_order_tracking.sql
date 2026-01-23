-- ==========================================
-- SISTEMA DE TRACKING Y DEVOLUCIONES
-- ==========================================
-- Este script añade las columnas necesarias para el seguimiento
-- de pedidos y el sistema de devoluciones

-- 1. Añadir nuevas columnas a la tabla orders
DO $$
BEGIN
    -- tracking_number: Número de seguimiento del transportista
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tracking_number') THEN
        ALTER TABLE orders ADD COLUMN tracking_number text;
    END IF;

    -- carrier: Nombre del transportista (ej: "Correos", "SEUR", "MRW")
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'carrier') THEN
        ALTER TABLE orders ADD COLUMN carrier text;
    END IF;

    -- estimated_delivery: Fecha estimada de entrega
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'estimated_delivery') THEN
        ALTER TABLE orders ADD COLUMN estimated_delivery timestamp with time zone;
    END IF;

    -- shipped_at: Fecha en que el pedido salió a reparto
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipped_at') THEN
        ALTER TABLE orders ADD COLUMN shipped_at timestamp with time zone;
    END IF;

    -- delivered_at: Fecha en que se entregó el pedido
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE orders ADD COLUMN delivered_at timestamp with time zone;
    END IF;

    -- cancelled_at: Fecha de cancelación/devolución
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cancelled_at') THEN
        ALTER TABLE orders ADD COLUMN cancelled_at timestamp with time zone;
    END IF;

    -- cancellation_reason: Motivo de la cancelación/devolución
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE orders ADD COLUMN cancellation_reason text;
    END IF;

    -- refund_status: Estado del reembolso (null, 'pending', 'completed', 'failed')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'refund_status') THEN
        ALTER TABLE orders ADD COLUMN refund_status text CHECK (refund_status IN (null, 'pending', 'completed', 'failed'));
    END IF;

    -- refunded_at: Fecha del reembolso
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'refunded_at') THEN
        ALTER TABLE orders ADD COLUMN refunded_at timestamp with time zone;
    END IF;
END $$;

-- 2. Actualizar el constraint del status para incluir nuevos estados
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'));

-- 3. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_shipped_at ON orders(shipped_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);

-- 4. Crear tabla de historial de estados del pedido (para tracking detallado)
CREATE TABLE IF NOT EXISTS order_status_history (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid references orders(id) on delete cascade not null,
    status text not null,
    notes text,
    created_by uuid references profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para historial
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created ON order_status_history(created_at desc);

-- 5. Habilitar RLS en la nueva tabla
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para order_status_history
-- Los usuarios pueden ver el historial de sus propios pedidos
CREATE POLICY "Usuario ve historial de sus pedidos" ON order_status_history
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_status_history.order_id 
            AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
        )
    );

-- Los admins pueden ver todo el historial
CREATE POLICY "Admin ve todo el historial" ON order_status_history
    FOR SELECT 
    USING (is_admin());

-- Los admins pueden insertar en el historial
CREATE POLICY "Admin crea historial" ON order_status_history
    FOR INSERT 
    WITH CHECK (is_admin());

-- 7. Función para actualizar el estado de un pedido y crear historial
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id uuid,
    p_new_status text,
    p_notes text DEFAULT NULL,
    p_tracking_number text DEFAULT NULL,
    p_carrier text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
    v_current_status text;
    v_user_id uuid;
BEGIN
    -- Obtener el estado actual
    SELECT status INTO v_current_status FROM orders WHERE id = p_order_id;
    
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Pedido no encontrado';
    END IF;
    
    -- Actualizar el pedido
    UPDATE orders SET
        status = p_new_status,
        tracking_number = COALESCE(p_tracking_number, tracking_number),
        carrier = COALESCE(p_carrier, carrier),
        shipped_at = CASE WHEN p_new_status = 'shipped' AND shipped_at IS NULL THEN now() ELSE shipped_at END,
        delivered_at = CASE WHEN p_new_status = 'delivered' AND delivered_at IS NULL THEN now() ELSE delivered_at END,
        cancelled_at = CASE WHEN p_new_status IN ('cancelled', 'refunded') AND cancelled_at IS NULL THEN now() ELSE cancelled_at END,
        updated_at = now()
    WHERE id = p_order_id;
    
    -- Insertar en el historial
    INSERT INTO order_status_history (order_id, status, notes, created_by)
    VALUES (p_order_id, p_new_status, p_notes, auth.uid());
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger para crear entrada inicial en el historial cuando se crea un pedido
CREATE OR REPLACE FUNCTION create_initial_order_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_status_history (order_id, status, notes)
    VALUES (NEW.id, NEW.status, 'Pedido creado');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_order_history ON orders;
CREATE TRIGGER trigger_create_order_history
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_order_history();

-- 9. Dar permisos
GRANT SELECT, INSERT ON order_status_history TO anon, authenticated, service_role;

-- Comentarios
COMMENT ON COLUMN orders.tracking_number IS 'Número de seguimiento del transportista';
COMMENT ON COLUMN orders.carrier IS 'Nombre del transportista (Correos, SEUR, MRW, etc.)';
COMMENT ON COLUMN orders.estimated_delivery IS 'Fecha estimada de entrega';
COMMENT ON COLUMN orders.refund_status IS 'Estado del reembolso: pending, completed, failed';
COMMENT ON TABLE order_status_history IS 'Historial de cambios de estado de los pedidos para tracking detallado';

-- Notificar cambios
NOTIFY pgrst, 'reload schema';
