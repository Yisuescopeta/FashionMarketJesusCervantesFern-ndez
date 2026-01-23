
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking orders table...");
    const { data: orders, error: ordersError } = await supabase.from('orders').select('*').limit(1);
    if (ordersError) {
        console.error("Orders Error:", ordersError);
    } else {
        console.log("Orders columns:", orders.length > 0 ? Object.keys(orders[0]) : "Empty table");
    }

    console.log("Checking order_items table...");
    const { data: items, error: itemsError } = await supabase.from('order_items').select('*').limit(1);
    if (itemsError) {
        console.error("Order Items Error:", itemsError);
    } else {
        console.log("Order Items columns:", items.length > 0 ? Object.keys(items[0]) : "Empty table");
    }
}

check();
