import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { getAuthenticatedUser } from '../../../lib/supabase-server';

export const POST: APIRoute = async ({ request, cookies }: { request: Request; cookies: any }) => {
    try {
        // 1. Verificar autenticación
        const user = await getAuthenticatedUser(cookies);
        if (!user) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), {
                status: 401
            });
        }

        // 2. Obtener datos del body
        const body = await request.json();
        const { orderId, reason } = body;

        if (!orderId) {
            return new Response(JSON.stringify({ error: 'ID de pedido requerido' }), {
                status: 400
            });
        }

        // 3. Obtener el pedido actual
        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('status, user_id, shipping_address')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
                status: 404
            });
        }

        // 4. Verificar propiedad del pedido
        if (order.user_id !== user.id) {
            return new Response(JSON.stringify({ error: 'No tienes permiso para modificar este pedido' }), {
                status: 403
            });
        }

        // 5. Verificar que se puede cancelar (no ha salido a reparto)
        // 5. Verificar que se puede cancelar o devolver
        const allowedStatuses = ['pending', 'paid', 'confirmed', 'processing', 'delivered'];
        if (!allowedStatuses.includes(order.status)) {
            return new Response(JSON.stringify({
                error: 'Este pedido no puede ser modificado en su estado actual.'
            }), {
                status: 400
            });
        }

        // 6. Actualizar estado del pedido
        // Si está entregado, es una DEVOLUCIÓN (solicitud de reembolso), no una cancelación
        const isReturn = order.status === 'delivered';

        const updateData: any = {
            cancelled_at: new Date().toISOString(), // Fecha de solicitud
            // Si es devolución, el estado del pedido no cambia a 'cancelled' inmediatamente, 
            // sino que el refund_status pasa a 'requested'.
            // Si es cancelación, el status pasa a 'cancelled'.
        };

        if (isReturn) {
            updateData.refund_status = 'requested';
            updateData.notes = `Solicitud de devolución. Razón: ${reason || 'Sin especificar'}`;
            // No cambiamos order.status a 'cancelled' todavía, esperamos proceso manual o automático de devolución
        } else {
            updateData.status = 'cancelled';
            updateData.cancellation_reason = reason || 'Cancelado por el usuario';
            updateData.refund_status = 'pending';
            updateData.notes = `Cancelación solicitada por usuario. Razón: ${reason || 'Sin especificar'}`;
        }

        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update(updateData)
            .eq('id', orderId);

        if (updateError) {
            console.error('Error al cancelar pedido:', updateError);
            return new Response(JSON.stringify({ error: 'Error al procesar la cancelación' }), {
                status: 500
            });
        }

        // 6.5 Stock is now automatically restored by database trigger tr_restore_stock_on_order_cancel
        // when status changes to 'cancelled'.

        // 7. Insertar en el historial (si existe la tabla, sino fallará silenciosamente o ignoramos por ahora)
        // Nota: Si has ejecutado el script SQL, el trigger o función se encargará, 
        // pero aquí hacemos una inserción manual por si acaso la lógica del trigger falla o no está presente aún
        try {
            await supabaseAdmin.from('order_status_history').insert({
                order_id: orderId,
                status: 'cancelled',
                notes: `Cancelado por el usuario. Razón: ${reason}`,
                created_by: user.id
            });
        } catch (e) {
            // Ignoramos error de historial si la tabla no existe aún
            console.warn('No se pudo guardar historial:', e);
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Pedido cancelado correctamente. El reembolso se procesará en breve.'
        }), {
            status: 200
        });

    } catch (error) {
        console.error('Error en API return:', error);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500
        });
    }
};
