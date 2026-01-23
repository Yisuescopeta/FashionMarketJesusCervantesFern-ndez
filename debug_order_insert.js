
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", url);
console.log("Key length:", key ? key.length : 0);
console.log("Key start:", key ? key.substring(0, 10) : "N/A");

const supabaseAdmin = createClient(url, key);

async function debugOrderInsert() {
    console.log("--- Debugging Order Insert ---");

    const testSessionId = `sess_${Date.now()}`;

    // 1. Try to insert an Order
    console.log("Attempting to insert order...");
    const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
            stripe_session_id: testSessionId,
            customer_email: "debug@example.com",
            total_amount: 1000,
            status: "paid"
        })
        .select()
        .single();

    if (orderError) {
        console.log("ERROR_MESSAGE:", orderError.message);
        console.log("ERROR_DETAILS:", orderError.details);
        console.log("ERROR_HINT:", orderError.hint);
        console.log("ERROR_CODE:", orderError.code);
        return;
    }

    console.log("✅ Order created successfully:", order.id);

    // Cleanup
    await supabaseAdmin.from("orders").delete().eq("id", order.id);
}

debugOrderInsert();
