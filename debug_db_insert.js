
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log("Testing simplified order insert...");

    // Datos dummy
    const dummyOrder = {
        stripe_session_id: 'test_session_' + Date.now(),
        customer_email: 'test@example.com',
        total_amount: 1000,
        status: 'paid'
        // user_id lo dejamos null
    };

    const { data, error } = await supabase
        .from('orders')
        .insert(dummyOrder)
        .select()
        .single();

    if (error) {
        console.error("❌ INSERT FAILED:", error);
        const fs = await import('fs');
        fs.writeFileSync('insert_log.txt', JSON.stringify(error, null, 2));
    } else {
        console.log("✅ INSERT SUCCESS:", data);
        // Clean up
        // Note: Delete might fail if RLS prevents delete, checking that too
        const { error: delError } = await supabase.from('orders').delete().eq('id', data.id);
        if (delError) console.log("⚠️ Cleanup failed (expected with insert-only RLS):", delError.message);
        else console.log("🗑️ Test data cleaned up.");
    }
}

testInsert();
