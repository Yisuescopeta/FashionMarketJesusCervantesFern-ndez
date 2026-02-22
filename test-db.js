import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function check() {
    const { data: latestOrder } = await supabase.from('orders').select('id').order('created_at', { ascending: false }).limit(1).single();
    if (latestOrder) {
        const { data: items } = await supabase.from('order_items').select('*').eq('order_id', latestOrder.id);
        fs.writeFileSync('db-state-latest.json', JSON.stringify({ order: latestOrder, items }, null, 2));
        console.log("Written to db-state-latest.json");
    }
}

check();
