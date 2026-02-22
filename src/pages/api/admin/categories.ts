import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { slugify } from '../../../lib/utils';

export const POST: APIRoute = async ({ request }) => {
    try {
        const { name } = await request.json();

        if (!name || name.trim() === '') {
            return new Response(JSON.stringify({ error: 'El nombre es obligatorio' }), { status: 400 });
        }

        const slug = slugify(name.trim());

        const { data, error } = await supabaseAdmin
            .from('categories')
            .insert({ name: name.trim(), slug })
            .select()
            .single();

        if (error) {
            console.error('Error creating category:', error);
            // Handle duplicate slug or other DB errors gracefully if possible
            return new Response(JSON.stringify({ error: 'Error al crear la categoría en DB' }), { status: 500 });
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error: any) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
