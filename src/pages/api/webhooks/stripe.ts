
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { sendOrderConfirmationEmail } from '../../../lib/email';
import { stripe } from '../../../lib/stripe';

export const POST: APIRoute = async ({ request }) => {
    const signature = request.headers.get('stripe-signature');
    const body = await request.text();
    const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('❌ STRIPE_WEBHOOK_SECRET is missing');
        return new Response('Webhook Secret Config Error', { status: 500 });
    }

    let event: Stripe.Event;

    try {
        if (!signature) throw new Error('No signature');
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error(`⚠️ Webhook signature verification failed.`, err);
        return new Response(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown Error'}`, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`🔔 Payment successful for session: ${session.id}`);

        try {
            await handleCheckoutSessionCompleted(session);
        } catch (error) {
            console.error('❌ Error processing checkout session:', error);
            // Return 200 to acknowledge receipt even on error to prevent Stripe retries loop if logic is broken?
            // Ideally return 500 to retry, but for now let's return 500 to allow retry.
            return new Response('Error processing order', { status: 500 });
        }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
};

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const sessionId = session.id;

    // 1. Idempotency Check: Check if order already exists
    const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .single();

    if (existingOrder) {
        console.log(`ℹ️ Order already exists for session ${sessionId}. Skipping.`);
        return;
    }

    // 2. Prepare Order Data
    const metadata = session.metadata || {};
    const customerEmail = session.customer_details?.email || session.customer_email || '';
    const userId = metadata.userId && metadata.userId !== '' ? metadata.userId : null;

    // Expand line items to get product details
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
        expand: ['data.price.product'],
    });

    const orderData = {
        user_id: userId,
        stripe_session_id: sessionId,
        customer_email: customerEmail,
        total_amount: session.amount_total || 0,
        status: 'paid', // Or 'procesando'
        shipping_address: metadata.shipping_address || session.shipping_details?.address?.line1 || 'No especificada',
        shipping_city: metadata.shipping_city || session.shipping_details?.address?.city || 'No especificada',
        shipping_postal_code: metadata.shipping_postal_code || session.shipping_details?.address?.postal_code || '00000',
        shipping_phone: metadata.shipping_phone || session.customer_details?.phone || null,
        notes: metadata.shipping_full_name ? `Destinatario: ${metadata.shipping_full_name}` : null,
    };

    console.log(`📝 Creating order for ${customerEmail}...`);

    // 3. Insert Order
    const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert(orderData)
        .select()
        .single();

    if (orderError) throw new Error(`Failed to insert order: ${orderError.message}`);

    console.log(`✅ Order created: ${order.id}`);

    // 4. Process Line Items & Update Stock
    const orderItems = [];
    const emailItems = [];

    for (const item of lineItems.data) {
        const product = item.price?.product as Stripe.Product;
        const quantity = item.quantity || 1;

        // Metadata from checkout session creation
        const productId = product.metadata?.product_id;
        const size = product.metadata?.size;
        const productName = product.metadata?.original_name || product.name;

        // Items for DB
        orderItems.push({
            order_id: order.id,
            product_name: productName + (size ? ` (${size})` : ''),
            product_id: productId, // Can be null if generic product
            quantity: quantity,
            price_at_purchase: item.price?.unit_amount || 0,
            size: size || null
        });

        // Items for Email
        emailItems.push({
            name: productName + (size ? ` (Talla: ${size})` : ''),
            quantity: quantity,
            price: (item.amount_total || 0) / quantity,
            image: product.images?.[0] || ''
        });

        // Update Stock
        if (productId && size) {
            await decrementStock(productId, size, quantity);
        }
    }

    // 5. Insert Order Items
    if (orderItems.length > 0) {
        console.log("Attempting to insert orderItems: ", JSON.stringify(orderItems, null, 2));
        const { error: itemsError } = await supabaseAdmin
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            console.error('❌ Error inserting order items:', itemsError);
            try {
                // Write error to a file because console might be swallowed by Astro
                const fs = await import('fs');
                fs.writeFileSync('debug-error.json', JSON.stringify(itemsError, null, 2));
            } catch (e) { }
        }
    }

    // 6. Record Coupon Usage (Fixing the vulnerability)
    if (metadata.coupon_id && userId) {
        await recordCouponUsage(metadata.coupon_id, userId, order.id);
    }

    // 7. Send Confirmation Email
    if (customerEmail) {
        const shippingAddressStr = order.shipping_address
            ? `${order.shipping_address}, ${order.shipping_postal_code} ${order.shipping_city}`
            : undefined;

        await sendOrderConfirmationEmail({
            orderId: order.id,
            customerName: session.customer_details?.name || metadata.shipping_full_name || 'Cliente',
            customerEmail,
            totalAmount: order.total_amount,
            items: emailItems,
            shippingAddress: shippingAddressStr
        });
    }
}

async function decrementStock(productId: string, size: string, quantity: number) {
    console.log(`📉 Decrementing stock: Product ${productId}, Size ${size}, Qty ${quantity}`);

    const { error: rpcError } = await supabaseAdmin.rpc('decrement_variant_stock', {
        p_product_id: productId,
        p_size: size,
        p_quantity: quantity
    });

    if (rpcError) {
        console.error(`❌ Failed to update stock for ${productId} (${size}):`, rpcError);
    } else {
        console.log(`✅ Stock updated remotely for ${productId} (${size})`);
    }
}

async function recordCouponUsage(couponId: string, userId: string, orderId: string) {
    console.log(`🎟️ Recording coupon usage: Coupon ${couponId}, User ${userId}`);

    const { error } = await supabaseAdmin
        .from('user_coupons')
        .insert({
            user_id: userId,
            coupon_id: couponId,
            used_at: new Date().toISOString()
            // order_id: orderId // If your schema supports it, uncomment this
        });

    if (error) {
        console.error('❌ Failed to record coupon usage:', error);
    } else {
        console.log('✅ Coupon usage recorded.');
    }
}
