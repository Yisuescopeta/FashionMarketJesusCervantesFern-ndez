import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { orderId, email } = body;

        if (!orderId || !email) {
            return new Response(JSON.stringify({ error: 'ID de pedido y email requeridos' }), {
                status: 400
            });
        }

        // Buscar el pedido por ID o por número de seguimiento
        let query = supabaseAdmin
            .from('orders')
            .select(`
                id,
                status,
                total_amount,
                created_at,
                shipping_address,
                tracking_number,
                order_items (
                    quantity,
                    price_at_purchase,
                    product_name
                ),
                customer_email
            `);

        // Si parece un UUID, buscamos por ID, si no, por tracking_number
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId);

        if (isUUID) {
            query = query.eq('id', orderId);
        } else {
            // Intentar buscar por tracking_number (con o sin prefijo AURUM-)
            const searchTerms = [orderId.toUpperCase()];
            if (!orderId.toUpperCase().startsWith('AURUM-')) {
                searchTerms.push(`AURUM-${orderId.toUpperCase()}`);
            }
            query = query.in('tracking_number', searchTerms);
        }

        const { data: order, error } = await query.single();

        if (error || !order) {
            return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
                status: 404
            });
        }

        // Verificar el email usando la columna dedicada customer_email
        if (order.customer_email?.toLowerCase() !== email.toLowerCase()) {
            return new Response(JSON.stringify({ error: 'El email no coincide con los datos del pedido' }), {
                status: 403
            });
        }

        return new Response(JSON.stringify({
            success: true,
            order: {
                id: order.id,
                status: order.status,
                date: order.created_at,
                total: order.total_amount,
                tracking_number: order.tracking_number,
                shipping_address: order.shipping_address,
                items: order.order_items.map((item: any) => ({
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.price_at_purchase
                }))
            }
        }), {
            status: 200
        });

    } catch (error) {
        console.error('Error in order lookup API:', error);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500
        });
    }
};
