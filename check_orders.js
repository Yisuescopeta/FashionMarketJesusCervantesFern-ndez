
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    console.log("Checking last 5 orders...");
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching orders:", error);
    } else {
        console.log(`Found ${data.length} orders.`);
        data.forEach(order => {
            console.log(`- ID: ${order.id}`);
            console.log(`  Email: ${order.customer_email}`);
            console.log(`  Total: ${order.total_amount}`);
            console.log(`  Stripe Session: ${order.stripe_session_id}`);
            console.log(`  Created At: ${order.created_at}`);
            console.log("-----------------------------------");
        });
    }
}

checkOrders();
