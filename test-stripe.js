import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const supabase = createClient(process.env.PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function check() {
    const { data: order } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(1).single();

    if (!order || !order.stripe_session_id) {
        console.log("No order or session id found.");
        return;
    }

    console.log("Found order:", order.id, "Session:", order.stripe_session_id);

    const lineItems = await stripe.checkout.sessions.listLineItems(order.stripe_session_id, {
        expand: ['data.price.product'],
    });

    fs.writeFileSync('stripe-state.json', JSON.stringify(lineItems.data, null, 2));
    console.log("Saved to stripe-state.json");
}

check();
