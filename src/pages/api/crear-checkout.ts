import type { APIRoute } from 'astro';
import Stripe from 'stripe';

export const prerender = false;

// Verificar que la clave secreta existe
const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY no está configurada en las variables de entorno');
}

// Inicializar Stripe con la clave secreta
const stripe = new Stripe(stripeSecretKey || '');

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.text();
        const { items } = JSON.parse(body);
        const origin = request.headers.get('origin') || 'http://localhost:4323';

        // Validar que hay items
        if (!items || items.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No hay productos en el carrito' }),
                { status: 400 }
            );
        }

        // Convertir items del carrito a formato de Stripe
        // Nota: No incluimos imágenes si son URLs relativas
        const lineItems = items.map((item: { name: string; price: number; quantity: number; image?: string }) => {
            const productData: { name: string; images?: string[] } = {
                name: item.name,
            };
            
            // Solo incluir imagen si es una URL absoluta (https://)
            if (item.image && item.image.startsWith('http')) {
                productData.images = [item.image];
            }
            
            return {
                price_data: {
                    currency: 'eur',
                    product_data: productData,
                    unit_amount: item.price, // El precio ya viene en centavos
                },
                quantity: item.quantity,
            };
        });

        // Crear sesión de checkout en Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${origin}/pedido-exitoso?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/carrito`,
            locale: 'es',
        });

        return new Response(
            JSON.stringify({ url: session.url }),
            { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error: any) {
        console.error('Error al crear sesión de Stripe:', error?.message || error);
        return new Response(
            JSON.stringify({ error: error?.message || 'Error al procesar el pago' }),
            { status: 500 }
        );
    }
};
