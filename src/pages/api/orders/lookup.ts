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

        // Buscar el pedido por ID y email del comprador
        // Nota: Asumimos que shipping_address contiene el email o hay un campo email en orders/profiles
        // Vamos a buscar en la tabla 'orders' filtrando por ID y el email guardado en shipping_address (si es JSON)
        // o asumiendo que podemos verificar el usuario.

        // Primero intentamos buscar el pedido por ID
        let { data: order, error } = await supabaseAdmin
            .from('orders')
            .select(`
                id,
                status,
                total,
                created_at,
                shipping_address,
                tracking_number,
                tracking_url,
                order_items (
                    quantity,
                    price,
                    products (
                        name,
                        images
                    )
                )
            `)
            .eq('id', orderId)
            .single();

        if (error || !order) {
            return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
                status: 404
            });
        }

        // Verificar el email. 
        // Normalmente shipping_address es un JSONB
        const shippingInfo = order.shipping_address as any;
        const orderEmail = shippingInfo?.email || '';

        if (orderEmail.toLowerCase() !== email.toLowerCase()) {
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
                total: order.total,
                tracking_number: order.tracking_number,
                tracking_url: order.tracking_url,
                items: order.order_items
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
