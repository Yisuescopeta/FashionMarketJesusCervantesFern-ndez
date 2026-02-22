import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { generateFullReport, buildReportHtml } from '../../../lib/admin-reports';
import { sendAdminReportEmail } from '../../../lib/resend';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { force } = body;

        // ============================================
        // Modo MANUAL: el admin solicita un envío ahora
        // ============================================
        if (force) {
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

            // Obtener perfil del admin
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('role, full_name, email')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'admin') {
                return new Response(JSON.stringify({ error: 'No eres administrador' }), { status: 403 });
            }

            // Obtener preferencias del admin
            const { data: prefs } = await supabaseAdmin
                .from('admin_report_subscriptions')
                .select('*')
                .eq('admin_user_id', user.id)
                .single();

            // Generar informe con las preferencias del admin (o defaults)
            const report = await generateFullReport({
                includeSales: prefs?.report_sales ?? true,
                includeNewCustomers: prefs?.report_new_customers ?? true,
                includeReturns: prefs?.report_returns ?? true,
                includeLowStock: prefs?.report_low_stock ?? true,
                includeTopProducts: prefs?.report_top_products ?? true,
                periodDays: prefs?.frequency_days ?? 1
            });

            const adminEmail = profile.email || user.email;
            if (!adminEmail) {
                return new Response(JSON.stringify({ error: 'No se encontró email del administrador' }), { status: 400 });
            }

            const html = buildReportHtml(report, profile.full_name || 'Admin');
            const periodLabel = report.periodDays === 1 ? 'diario' : `${report.periodDays} días`;

            const result = await sendAdminReportEmail({
                adminEmail,
                subject: `📊 Informe ${periodLabel} — Aurum`,
                html
            });

            if (result.success) {
                // Actualizar last_sent_at
                if (prefs) {
                    await supabaseAdmin
                        .from('admin_report_subscriptions')
                        .update({ last_sent_at: new Date().toISOString() })
                        .eq('admin_user_id', user.id);
                }

                return new Response(JSON.stringify({
                    message: `Informe enviado a ${adminEmail}`,
                    sent: 1
                }), { status: 200 });
            } else {
                return new Response(JSON.stringify({ error: 'Error enviando el informe' }), { status: 500 });
            }
        }

        // ============================================
        // Modo CRON: revisar todos los admins suscritos
        // ============================================
        const { data: subscriptions, error: fetchError } = await supabaseAdmin
            .from('admin_report_subscriptions')
            .select('*, profiles!admin_report_subscriptions_admin_fkey(full_name, email)')
            .eq('enabled', true);

        if (fetchError || !subscriptions) {
            console.error('Error fetching subscriptions:', fetchError);
            return new Response(JSON.stringify({ error: 'Error obteniendo suscripciones' }), { status: 500 });
        }

        const now = new Date();
        const currentHour = now.getHours();
        let sentCount = 0;

        for (const sub of subscriptions) {
            // Verificar si toca enviar ahora
            if (sub.send_hour !== currentHour) continue;

            // Verificar frecuencia: si ya se envió dentro del periodo
            if (sub.last_sent_at) {
                const lastSent = new Date(sub.last_sent_at);
                const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
                const minHours = (sub.frequency_days * 24) - 2; // 2h de margen
                if (hoursSinceLastSent < minHours) continue;
            }

            // Generar informe
            const report = await generateFullReport({
                includeSales: sub.report_sales,
                includeNewCustomers: sub.report_new_customers,
                includeReturns: sub.report_returns,
                includeLowStock: sub.report_low_stock,
                includeTopProducts: sub.report_top_products,
                periodDays: sub.frequency_days
            });

            const adminProfile = sub.profiles as any;
            const adminEmail = adminProfile?.email;
            const adminName = adminProfile?.full_name || 'Admin';

            if (!adminEmail) continue;

            const html = buildReportHtml(report, adminName);
            const periodLabel = report.periodDays === 1 ? 'diario' : `${report.periodDays} días`;

            const result = await sendAdminReportEmail({
                adminEmail,
                subject: `📊 Informe ${periodLabel} — Aurum`,
                html
            });

            if (result.success) {
                sentCount++;
                await supabaseAdmin
                    .from('admin_report_subscriptions')
                    .update({ last_sent_at: now.toISOString() })
                    .eq('id', sub.id);
            }
        }

        return new Response(JSON.stringify({
            message: `Informes procesados`,
            sent: sentCount,
            total: subscriptions.length
        }), { status: 200 });

    } catch (error) {
        console.error('Error en send-reports:', error);
        return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500 });
    }
};
