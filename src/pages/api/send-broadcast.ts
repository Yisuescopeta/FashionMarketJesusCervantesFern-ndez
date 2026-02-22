import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { supabase } from '../../lib/supabase';
import { sendBroadcastEmail } from '../../lib/email';

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const { subject, message, title } = data;

        // 1. AUTENTICACIÓN: Verificar token obligatoriamente
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return new Response(JSON.stringify({ error: 'No autorizado: Falta token' }), { status: 401 });
        }

        // Verificar usuario con Supabase Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'No autorizado: Token inválido' }), { status: 401 });
        }

        // (Opcional) Aquí se podría verificar el rol de administrador en la tabla profiles
        // const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
        // if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Prohibido' }), { status: 403 });

        if (!subject || !message) {
            return new Response(JSON.stringify({ error: 'Faltan campos' }), { status: 400 });
        }

        // 2. OBTENER AUDIENCIA
        // Usamos supabaseAdmin para obtener todos los usuarios (bypass RLS necesario para broadcast)
        // Ya hemos verificado que quien llama es un usuario autenticado (y presumiblemente admin)

        let users = [];
        // Intentar usar RPC optimizada si existe
        const { data: rpcUsers, error: rpcError } = await supabaseAdmin.rpc('get_broadcast_audience');

        if (!rpcError && rpcUsers) {
            users = rpcUsers;
        } else {
            // Fallback: Leer tabla profiles
            if (rpcError) console.warn('RPC get_broadcast_audience falló, usando fallback:', rpcError.message);

            const { data: profiles, error: profilesError } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, email');

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
                return new Response(JSON.stringify({ error: 'Error al obtener usuarios' }), { status: 500 });
            }
            users = profiles || [];
        }

        if (users.length === 0) {
            return new Response(JSON.stringify({ message: 'No hay usuarios para enviar' }), { status: 200 });
        }

        // Filtrar usuarios sin email
        const validUsers = users.filter((u: any) => u.email);

        if (validUsers.length === 0) {
            return new Response(JSON.stringify({ message: 'Ningún usuario tiene email válido' }), { status: 200 });
        }

        // 3. PREPARAR LOGICA DE CUPONES
        const { include_coupon, coupon_type, coupon_value, coupon_strategy, coupon_code, coupon_expiration } = data;
        let finalCouponCode = coupon_code;

        if (include_coupon === 'on') {
            if (!coupon_value) return new Response(JSON.stringify({ error: 'Falta valor del cupón' }), { status: 400 });

            if (coupon_strategy === 'generic') {
                if (!coupon_code) return new Response(JSON.stringify({ error: 'Falta código del cupón' }), { status: 400 });

                // Crear o verificar cupón genérico
                const { data: existing } = await supabaseAdmin.from('coupons').select('id').eq('code', coupon_code).single();

                if (!existing) {
                    const { error: createError } = await supabaseAdmin.from('coupons').insert({
                        code: coupon_code,
                        discount_type: coupon_type,
                        discount_value: parseFloat(coupon_value),
                        expiration_date: coupon_expiration || null,
                        is_single_use: false,
                        is_active: true
                    });

                    if (createError) throw new Error('Error creando cupón: ' + createError.message);
                }
                finalCouponCode = coupon_code;
            }
        }

        // 4. ENVIAR EMAILS CON CONCURRENCIA CONTROLADA
        // Enviar de 5 en 5 para no saturar el servidor SMTP/API
        const CONCURRENCY_LIMIT = 5;
        let sentCount = 0;

        // Helper para dividir array en chunks
        const chunkArray = <T>(arr: T[], size: number): T[][] => {
            return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );
        };

        const chunks = chunkArray(validUsers, CONCURRENCY_LIMIT);

        for (const chunk of chunks) {
            const promises = chunk.map(async (user: any) => {
                let userMessage = message;
                let userCouponCode = finalCouponCode;

                // Generar cupón único si es necesario
                if (include_coupon === 'on' && coupon_strategy === 'unique') {
                    const uniqueCode = `PROMO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

                    // Insertar cupón único (sin bloquear excesivamente, manejo de error individual)
                    const { error: uniqueError } = await supabaseAdmin.from('coupons').insert({
                        code: uniqueCode,
                        discount_type: coupon_type,
                        discount_value: parseFloat(coupon_value),
                        expiration_date: coupon_expiration || null,
                        is_single_use: true,
                        usage_limit: 1,
                        is_active: true
                    });

                    if (!uniqueError) {
                        userCouponCode = uniqueCode;
                    } else {
                        console.error(`Failed to create coupon for ${user.email}`, uniqueError);
                    }
                }

                // Append coupon text
                if (include_coupon === 'on' && userCouponCode) {
                    userMessage += `\n\n----------------\n🎁 TU CUPÓN DE DESCUENTO: ${userCouponCode}\nUsa este código en el checkout para obtener tu descuento.\n----------------`;
                }

                // Send Email
                const result = await sendBroadcastEmail({
                    userEmail: user.email,
                    userName: user.full_name || 'Cliente',
                    subject: subject,
                    message: userMessage,
                    title: title
                });

                if (result.success) return 1;
                return 0;
            });

            const results = await Promise.all(promises);
            sentCount += results.reduce((a, b) => a + b, 0);
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
