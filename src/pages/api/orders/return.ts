import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { getAuthenticatedUser } from '../../../lib/supabase-server';
import { stripe } from '../../../lib/stripe';

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
            .select('status, user_id, shipping_address, payment_intent_id, total_amount')
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

        // 5. Verificar que se puede cancelar
        const allowedStatuses = ['pending', 'paid', 'confirmed', 'processing', 'delivered'];
        if (!allowedStatuses.includes(order.status)) {
            return new Response(JSON.stringify({
                error: 'Este pedido no puede ser modificado en su estado actual.'
            }), {
                status: 400
            });
        }

        // 6. Actualizar estado del pedido
        const isReturn = order.status === 'delivered';
        const updateData: any = {
            cancelled_at: new Date().toISOString(),
        };

        if (isReturn) {
            updateData.refund_status = 'requested';
            updateData.notes = `Solicitud de devolución. Razón: ${reason || 'Sin especificar'}`;
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
            console.error('Error al actualizar pedido en DB:', updateError);
            return new Response(JSON.stringify({ error: 'Error al actualizar el pedido' }), {
                status: 500
            });
        }

        // 7. SI EL PEDIDO ESTABA PAGADO, PROCESAMOS REEMBOLSO EN STRIPE
        if (order.payment_intent_id && ['paid', 'confirmed', 'processing', 'delivered'].includes(order.status)) {
            console.log(`💰 Iniciando reembolso en Stripe para PI: ${order.payment_intent_id}`);
            try {
                await stripe.refunds.create({
                    payment_intent: order.payment_intent_id,
                    reason: 'requested_by_customer',
                    metadata: {
                        order_id: orderId,
                        cancellation_reason: reason || 'Cancelado por usuario'
                    }
                });
                console.log('✅ Reembolso solicitado a Stripe correctamente.');
            } catch (stripeError) {
                console.error('❌ Error al procesar reembolso en Stripe:', stripeError);
                // No bloqueamos para que el usuario vea la cancelación en DB como exitosa
            }
        }

        // 8. Insertar en el historial
        try {
            await supabaseAdmin.from('order_status_history').insert({
                order_id: orderId,
                status: 'cancelled',
                notes: `Cancelado por el usuario. Razón: ${reason || 'Sin especificar'}`,
                created_by: user.id
            });
        } catch (e) {
            console.warn('No se pudo guardar historial:', e);
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Pedido cancelado correctamente. El reembolso se procesará automáticamente.'
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
