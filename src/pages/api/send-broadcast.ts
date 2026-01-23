
import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { sendBroadcastEmail } from '../../lib/email';

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const { subject, message, title } = data;

        // Obtener token
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!subject || !message) {
            return new Response(JSON.stringify({ error: 'Faltan campos' }), { status: 400 });
        }

        // Crear cliente autenticado si tenemos token
        let client = supabase;
        if (token) {
            const { createClient } = await import('@supabase/supabase-js');
            client = createClient(
                import.meta.env.PUBLIC_SUPABASE_URL,
                import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
                { global: { headers: { Authorization: `Bearer ${token}` } } }
            );
        }

        // 1. Obtener usuarios usando la función segura RPC
        let { data: users, error } = await client.rpc('get_broadcast_audience');

        // Si la función RPC no existe o da error, intentamos fallback a profiles directo (si RLS lo permite)
        if (error) {
            console.error('Error fetching broadcast audience via RPC:', error);

            const { data: usersBackup, error: errorBackup } = await client
                .from('profiles')
                .select('id, full_name, email');

            if (errorBackup) {
                console.error('Error fetching profiles fallback:', errorBackup);
                return new Response(JSON.stringify({ error: 'No autorizado o error de BD' }), { status: 500 });
            }
            users = usersBackup;
        }

        if (!users || users.length === 0) {
            return new Response(JSON.stringify({ message: 'No hay usuarios para enviar' }), { status: 200 });
        }

        // Filtrar usuarios sin email
        const validUsers = users.filter((u: any) => u.email);

        if (validUsers.length === 0) {
            return new Response(JSON.stringify({ message: 'Se encontraron usuarios pero ninguno tiene email registrado en profiles (ejecute script SQL)' }), { status: 200 });
        }

        // 2. Enviar emails
        let sentCount = 0;
        for (const user of validUsers) {
            const result = await sendBroadcastEmail({
                userEmail: user.email,
                userName: user.full_name || 'Cliente',
                subject: subject,
                message: message,
                title: title
            });

            if (result.success) {
                sentCount++;
            }
        }

        return new Response(
            JSON.stringify({ message: 'Proceso finalizado', sent: sentCount, total: validUsers.length }),
            { status: 200 }
        );

    } catch (error) {
        console.error('Error en broadcast:', error);
        return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500 });
    }
};
