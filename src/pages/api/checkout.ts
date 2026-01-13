import type { APIRoute } from 'astro';
import { stripe } from '../../lib/stripe';

// Interfaz para los items del carrito
interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
}

export const POST: APIRoute = async ({ request, url }) => {
    try {
        const body = await request.json();
        const { items } = body as { items: CartItem[] };

        if (!items || items.length === 0) {
            return new Response(
                JSON.stringify({ error: 'El carrito está vacío' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Crear los line items para Stripe
        const lineItems = items.map((item) => ({
            price_data: {
                currency: 'eur',
                product_data: {
                    name: item.name,
                    images: item.image ? [item.image] : [],
                },
                unit_amount: item.price, // Ya está en centavos
            },
            quantity: item.quantity,
        }));

        // Crear la sesión de checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${url.origin}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${url.origin}/carrito`,
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
