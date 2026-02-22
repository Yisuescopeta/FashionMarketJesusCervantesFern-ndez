import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function check() {
    const { data, error } = await supabase.rpc('get_table_columns_by_name', { p_table_name: 'order_items' });
    if (error) {
        const { data: qData, error: qError } = await supabase.from('order_items').select('*').limit(1);
        console.log("Cols via select:", Object.keys(qData?.[0] || {}));
    }
}

check();
