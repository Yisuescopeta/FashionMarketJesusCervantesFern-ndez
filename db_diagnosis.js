
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("--- DIAGNOSIS START ---");

    // 1. Check Table Existence via Select
    console.log("1. Testing SELECT on 'orders'...");
    const { data: selectData, error: selectError } = await supabase
        .from('orders')
        .select('count', { count: 'exact', head: true });

    if (selectError) {
        console.error("❌ SELECT Failed. Error:", JSON.stringify(selectError, null, 2));
    } else {
        console.log("✅ SELECT Success. Table exists.");
    }

    // 2. Check Insert
    console.log("\n2. Testing INSERT on 'orders'...");
    const dummyOrder = {
        stripe_session_id: 'debug_' + Date.now(),
        customer_email: 'debug@test.com',
        total_amount: 100,
        status: 'test'
    };

    const { data: insertData, error: insertError } = await supabase
        .from('orders')
        .insert(dummyOrder)
        .select()
        .single();

    if (insertError) {
        console.error("❌ INSERT Failed. Error:", JSON.stringify(insertError, null, 2));
    } else {
        console.log("✅ INSERT Success. Data:", JSON.stringify(insertData, null, 2));
        // Cleanup
        await supabase.from('orders').delete().eq('id', insertData.id);
    }

    console.log("--- DIAGNOSIS END ---");
}

diagnose();
