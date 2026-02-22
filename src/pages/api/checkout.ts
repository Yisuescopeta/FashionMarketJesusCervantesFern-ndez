import type { APIRoute } from 'astro';
import { stripe } from '../../lib/stripe';
import { validateCoupon } from '../../lib/coupon';
import { supabaseAdmin } from '../../lib/supabase-admin';

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    size?: string;
}

export const POST: APIRoute = async ({ request, url }) => {
    try {
        const body = await request.json();
        const { items, shipping, userId, couponCode, email } = body as {
            items: CartItem[];
            shipping?: {
                full_name: string;
                phone: string;
                address: string;
                city: string;
                postal_code: string;
            };
            userId?: string;
            couponCode?: string;
            email?: string;
        };

        if (!items || items.length === 0) {
            return new Response(
                JSON.stringify({ error: 'El carrito está vacío' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 1. Obtener IDs de productos para buscar precios reales en la BD
        const productIds = items.map(item => {
            const parts = item.id.split('-');
            parts.pop(); // Remover talla (última parte)
            return parts.join('-');
        });

        // Eliminar duplicados para optimizar consulta
        const uniqueProductIds = [...new Set(productIds)];

        // 2. Consultar productos y variantes en Supabase
        const { data: dbProducts, error: dbError } = await supabaseAdmin
            .from('products')
            .select(`
                id, 
                name, 
                price, 
                sale_price, 
                is_on_sale, 
                images,
                product_variants (
                    id,
                    size,
                    stock
                )
            `)
            .in('id', uniqueProductIds);

        if (dbError || !dbProducts) {
            console.error('Error fetching products from DB:', dbError);
            return new Response(
                JSON.stringify({ error: 'Error al validar productos' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Crear mapa para acceso rápido: productId -> Product
        const productMap = new Map(dbProducts.map(p => [p.id, p]));

        // 3. Reconstruir items con precios confiables
        const validatedLineItems = [];
        let calculatedCartTotal = 0;

        for (const item of items) {
            const parts = item.id.split('-');
            const size = parts.pop() || 'Única';
            const productId = parts.join('-');

            const product = productMap.get(productId);

            if (!product) {
                console.warn(`Product not found during checkout: ${productId}`);
                return new Response(
                    JSON.stringify({ error: `Producto no disponible: ${item.name}` }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }

            // Validar stock disponible basado en las variantes
            const variant = product.product_variants.find(v => v.size === size);
            const availableStock = variant?.stock || 0;

            if (!variant || availableStock < item.quantity) {
                return new Response(
                    JSON.stringify({
                        error: `Stock insuficiente para ${product.name} (Talla: ${size}). Disponible: ${availableStock}, Solicitado: ${item.quantity}`,
                        stockError: true,
                        productName: product.name,
                        size: size,
                        available: availableStock,
                        requested: item.quantity
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }

            // Determinar precio real (Oferta vs Normal)
            const realPrice = (product.is_on_sale && product.sale_price)
                ? product.sale_price
                : product.price;

            // Acumular total
            calculatedCartTotal += realPrice * item.quantity;

            // Construir line item para Stripe
            validatedLineItems.push({
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `${product.name} (Talla: ${size})`,
                        images: product.images && product.images.length > 0 ? [product.images[0]] : [],
                        metadata: {
                            product_id: productId,
                            size: size,
                            original_name: product.name,
                        },
                    },
                    unit_amount: realPrice, // PRECIO CONFIABLE DESDE BD
                },
                quantity: item.quantity,
            });
        }

        // 4. Calcular descuentos con el total validado
        let discountTotal = 0;
        let couponId = null;

        if (couponCode) {
            const validation = await validateCoupon(couponCode, userId, calculatedCartTotal);
            if (validation.valid && validation.discountAmount) {
                discountTotal = validation.discountAmount;
                couponId = validation.coupon?.id;
            } else {
                console.warn("Invalid coupon provided during checkout:", validation.error);
            }
        }

        // 5. Aplicar descuento a los items de Stripe
        // Distribuir el descuento proporcionalmente para evitar errores de redondeo masivos
        // O simplemente crear un cupón en Stripe (mejor) - pero aquí estamos manipulando unit_amount
        // Seguiremos la lógica de manipular unit_amount para mantener consistencia con lo anterior

        const finalLineItems = validatedLineItems.map(item => {
            if (discountTotal <= 0) return item;

            // Calcular ratio de descuento global
            // PrecioTotalNuevo / PrecioTotalViejo
            const validTotal = calculatedCartTotal;
            const ratio = (validTotal - discountTotal) / validTotal;

            // Aplicar ratio al precio unitario
            // Nota: Esto puede tener problemas de redondeo de centavos
            const originalUnitAmount = item.price_data.unit_amount;
            const discountedUnitAmount = Math.round(originalUnitAmount * ratio);

            return {
                ...item,
                price_data: {
                    ...item.price_data,
                    unit_amount: discountedUnitAmount
                }
            };
        });

        // 6. Crear sesión de Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: finalLineItems,
            mode: 'payment',
            success_url: `${url.origin}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${url.origin}/carrito`,
            metadata: {
                userId: userId || '',
                coupon_id: couponId ?? '',
                coupon_code: couponCode || '',
                discount_total: discountTotal.toString(),
                shipping_full_name: shipping?.full_name || '',
                shipping_phone: shipping?.phone || '',
                shipping_address: shipping?.address || '',
                shipping_city: shipping?.city || '',
                shipping_postal_code: shipping?.postal_code || '',
            },
            customer_email: email || undefined,
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
