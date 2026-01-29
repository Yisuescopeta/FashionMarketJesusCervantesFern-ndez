import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { sendFavoriteOnSaleEmail } from '../../lib/email';

/**
 * Endpoint para detectar productos en oferta y notificar a usuarios
 * que los tienen en favoritos.
 * 
 * Este endpoint debe ser llamado:
 * - Por un cron job (ej: cada hora)
 * - Cuando un admin activa una oferta en un producto
 * - Manualmente para testing
 * 
 * Seguridad: Requiere API_SECRET_KEY para evitar abusos
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Verificar autorización
    const authHeader = request.headers.get('Authorization');
    const apiKey = import.meta.env.API_SECRET_KEY;

    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener productos que acaban de entrar en oferta (últimas 24h)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { data: productsOnSale, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, price, sale_price, images')
      .eq('is_on_sale', true)
      .gte('sale_started_at', oneDayAgo.toISOString());

    if (productsError) {
      throw new Error(`Error obteniendo productos: ${productsError.message}`);
    }

    if (!productsOnSale || productsOnSale.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No hay nuevas ofertas', notificationsSent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const productIds = productsOnSale.map(p => p.id);
    let totalNotificationsSent = 0;

    // 2. Para cada producto, encontrar usuarios que lo tienen en favoritos
    for (const product of productsOnSale) {
      // Obtener usuarios con este producto en favoritos
      const { data: favorites, error: favError } = await supabaseAdmin
        .from('favorites')
        .select(`
          user_id,
          users:user_id (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('product_id', product.id);

      if (favError || !favorites) continue;

      for (const fav of favorites) {
        const user = fav.users as any;
        if (!user?.email) continue;

        // 3. Verificar preferencias del usuario
        const { data: prefs } = await supabaseAdmin
          .from('user_notification_preferences')
          .select('favorites_on_sale')
          .eq('user_id', user.id)
          .single();

        // Si no tiene preferencias o las tiene desactivadas, saltar
        if (prefs && prefs.favorites_on_sale === false) continue;

        // 4. Verificar que no hayamos enviado ya esta notificación
        const { data: existingNotification } = await supabaseAdmin
          .from('notification_history')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', product.id)
          .eq('notification_type', 'favorite_on_sale')
          .single();

        if (existingNotification) continue; // Ya notificado

        // 5. Enviar email
        const discountPercent = Math.round((1 - product.sale_price / product.price) * 100);

        const emailResult = await sendFavoriteOnSaleEmail({
          userEmail: user.email,
          userName: user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name,
          productName: product.name,
          productImage: product.images?.[0] || '',
          productSlug: product.slug,
          originalPrice: product.price,
          salePrice: product.sale_price,
          discountPercent
        });

        if (emailResult.success) {
          // 6. Registrar en historial de notificaciones
          await supabaseAdmin
            .from('notification_history')
            .insert({
              user_id: user.id,
              product_id: product.id,
              notification_type: 'favorite_on_sale',
              email_sent_to: user.email
            });

          totalNotificationsSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Notificaciones procesadas',
        productsChecked: productsOnSale.length,
        notificationsSent: totalNotificationsSent
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en notify-favorites-on-sale:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// También permitir GET para testing manual (solo en desarrollo)
export const GET: APIRoute = async ({ request }) => {
  if (import.meta.env.PROD) {
    return new Response(
      JSON.stringify({ error: 'Método no permitido en producción' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Redirigir a POST en desarrollo
  return POST({ request } as any);
};
