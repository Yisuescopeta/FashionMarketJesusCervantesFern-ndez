import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const GET: APIRoute = async () => {
    try {
        const { data: products, error } = await supabaseAdmin
            .from('products')
            .select('id, name, price, images, category_id, slug, colors, sale_price, is_on_sale')
            .order('created_at', { ascending: false });

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify(products), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
