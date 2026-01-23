
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.PUBLIC_SUPABASE_ANON_KEY);

async function inspectSchema() {
    // Check products table
    const { data: products, error } = await supabase.from('products').select('*').limit(1);
    if (error) console.error("Error fetching products:", error);
    else console.log("Product sample:", products[0]);

    // Check if there is a 'sizes' table or column
    // We can guess by looking at the product object keys
}

inspectSchema();
