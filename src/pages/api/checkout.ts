import type { APIRoute } from 'astro';
import { stripe } from '../../lib/stripe';

// Interfaz para los items del carrito
interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    size?: string; // Talla seleccionada
}

export const POST: APIRoute = async ({ request, url }) => {
    try {
        const body = await request.json();
        const { items, shipping, userId } = body as {
            items: CartItem[];
            shipping?: {
                full_name: string;
                phone: string;
                address: string;
                city: string;
                postal_code: string;
            };
            userId?: string;
        };

        if (!items || items.length === 0) {
            return new Response(
                JSON.stringify({ error: 'El carrito está vacío' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Crear los line items para Stripe
        const lineItems = items.map((item) => {
            // El id tiene formato "productId-size", necesitamos extraer el productId real
            const parts = item.id.split('-');
            const size = parts.pop() || ''; // Último elemento es la talla
            const productId = parts.join('-'); // El resto es el UUID

            // Limpiar el nombre para que no incluya la talla duplicada
            const cleanName = item.name.replace(/ - Talla .+$/, '');

            return {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `${cleanName} (Talla: ${size || 'Única'})`,
                        images: item.image ? [item.image] : [],
                        metadata: {
                            product_id: productId, // UUID real del producto
                            size: size,
                            original_name: cleanName,
                        }
                    },
                    unit_amount: item.price, // Ya está en centavos
                },
                quantity: item.quantity,
            };
        });

        // Crear la sesión de checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${url.origin}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${url.origin}/carrito`,
            metadata: {
                // Guardar datos de envío en metadata para recuperarlos tras el pago
                userId: userId || '',
                shipping_full_name: shipping?.full_name || '',
                shipping_phone: shipping?.phone || '',
                shipping_address: shipping?.address || '',
                shipping_city: shipping?.city || '',
                shipping_postal_code: shipping?.postal_code || '',
            },
            customer_email: undefined, // Stripe will ask for email if not provided, or we could pass user email if we had it
        });

        return new Response(
            JSON.stringify({ sessionId: session.id, url: session.url }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error creando sesión de Stripe:', error);
        return new Response(
            JSON.stringify({ error: 'Error al procesar el pago' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
