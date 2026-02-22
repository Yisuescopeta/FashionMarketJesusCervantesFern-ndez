import { supabaseAdmin } from '../../../lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

// GET - Obtener preferencias del admin actual
export const GET: APIRoute = async ({ request }) => {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
        }

        // Obtener el usuario del token
        const userClient = createClient(
            import.meta.env.PUBLIC_SUPABASE_URL || 'https://eqmxkqremoinnyaumist.supabase.co',
            import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '',
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        const { data: { user }, error: userError } = await userClient.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
        }

        // Verificar que es admin
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'No eres administrador' }), { status: 403 });
        }

        // Obtener preferencias existentes
        const { data: prefs } = await supabaseAdmin
            .from('admin_report_subscriptions')
            .select('*')
            .eq('admin_user_id', user.id)
            .single();

        // Si no tiene preferencias, devolver defaults
        if (!prefs) {
            return new Response(JSON.stringify({
                enabled: false,
                report_sales: true,
                report_new_customers: true,
                report_returns: true,
                report_low_stock: true,
                report_top_products: true,
                send_hour: 8,
                send_minute: 0,
                frequency_days: 1,
                last_sent_at: null,
                is_new: true
            }), { status: 200 });
        }

        return new Response(JSON.stringify(prefs), { status: 200 });

    } catch (error) {
        console.error('Error obteniendo preferencias:', error);
        return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500 });
    }
};

// POST - Guardar/actualizar preferencias
export const POST: APIRoute = async ({ request }) => {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
        }

        const userClient = createClient(
            import.meta.env.PUBLIC_SUPABASE_URL || 'https://eqmxkqremoinnyaumist.supabase.co',
            import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '',
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        const { data: { user }, error: userError } = await userClient.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
        }

        // Verificar que es admin
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'No eres administrador' }), { status: 403 });
        }

        const body = await request.json();
        const {
            enabled,
            report_sales,
            report_new_customers,
            report_returns,
            report_low_stock,
            report_top_products,
            send_hour,
            send_minute,
            frequency_days
        } = body;

        // Upsert - crear o actualizar
        const { data, error } = await supabaseAdmin
            .from('admin_report_subscriptions')
            .upsert({
                admin_user_id: user.id,
                enabled: enabled ?? true,
                report_sales: report_sales ?? true,
                report_new_customers: report_new_customers ?? true,
                report_returns: report_returns ?? true,
                report_low_stock: report_low_stock ?? true,
                report_top_products: report_top_products ?? true,
                send_hour: send_hour ?? 8,
                send_minute: send_minute ?? 0,
                frequency_days: frequency_days ?? 1,
                updated_at: new Date().toISOString()
            }, { onConflict: 'admin_user_id' })
            .select()
            .single();

        if (error) {
            console.error('Error guardando preferencias:', error);
            return new Response(JSON.stringify({ error: 'Error guardando preferencias' }), { status: 500 });
        }

        return new Response(JSON.stringify({ message: 'Preferencias guardadas', data }), { status: 200 });

    } catch (error) {
        console.error('Error guardando preferencias:', error);
        return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500 });
    }
};
