import { Resend } from 'resend';

// Cliente de Resend para envío de emails transaccionales
export const resend = new Resend(import.meta.env.RESEND_API_KEY);

// Configuración del remitente
export const EMAIL_FROM = 'Aurum <noreply@aurum.com>';

// Interfaz para el email de favorito en oferta
export interface FavoriteOnSaleEmailData {
  userEmail: string;
  userName?: string;
  productName: string;
  productImage: string;
  productSlug: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
}

// Función para enviar email de favorito en oferta
export async function sendFavoriteOnSaleEmail(data: FavoriteOnSaleEmailData) {
  const {
    userEmail,
    userName,
    productName,
    productImage,
    productSlug,
    originalPrice,
    salePrice,
    discountPercent
  } = data;

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const productUrl = `${import.meta.env.SITE_URL || 'https://aurum.com'}/productos/${productSlug}`;

  try {
    const { data: result, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: userEmail,
      subject: `🔥 ¡${productName} está en oferta! -${discountPercent}%`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #1e293b; padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">
                        FASHION<span style="color: #d4a574;">MARKET</span>
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Banner de oferta -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 20px; text-align: center;">
                      <p style="margin: 0; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 3px; font-weight: bold;">
                        🔥 ¡Tu favorito está en oferta!
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Contenido principal -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #64748b; font-size: 16px;">
                        ${userName ? `Hola ${userName},` : 'Hola,'}
                      </p>
                      <p style="margin: 0 0 30px; color: #334155; font-size: 16px; line-height: 1.6;">
                        ¡Buenas noticias! Un producto que guardaste en tus favoritos acaba de entrar en oferta.
                      </p>
                      
                      <!-- Producto -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                        <tr>
                          <td width="200" style="vertical-align: top;">
                            <img src="${productImage}" alt="${productName}" style="width: 200px; height: 250px; object-fit: cover; display: block;">
                          </td>
                          <td style="padding: 30px; vertical-align: middle;">
                            <p style="margin: 0 0 10px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
                              Tu favorito
                            </p>
                            <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 22px; font-style: italic;">
                              ${productName}
                            </h2>
                            <div style="margin-bottom: 20px;">
                              <span style="color: #dc2626; font-size: 28px; font-weight: bold;">
                                ${formatPrice(salePrice)}
                              </span>
                              <span style="color: #94a3b8; font-size: 18px; text-decoration: line-through; margin-left: 10px;">
                                ${formatPrice(originalPrice)}
                              </span>
                            </div>
                            <span style="display: inline-block; background-color: #fef2f2; color: #dc2626; padding: 8px 16px; border-radius: 4px; font-size: 14px; font-weight: bold;">
                              -${discountPercent}% DESCUENTO
                            </span>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${productUrl}" style="display: inline-block; background-color: #1e293b; color: #ffffff; padding: 16px 40px; text-decoration: none; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; border-radius: 4px;">
                              Ver Producto
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 10px; color: #94a3b8; font-size: 12px;">
                        Has recibido este email porque guardaste este producto en favoritos.
                      </p>
                      <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                        <a href="${import.meta.env.SITE_URL || 'https://aurum.com'}/mi-cuenta/preferencias" style="color: #d4a574;">
                          Gestionar preferencias de email
                        </a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Error enviando email:', error);
      return { success: false, error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error enviando email:', error);
    return { success: false, error };
  }
}

// Interfaz para el email de confirmación de pedido
export interface OrderConfirmationEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
}

// Función para enviar email de confirmación de pedido
export async function sendOrderConfirmationEmail(data: OrderConfirmationEmailData) {
  const {
    orderId,
    customerName,
    customerEmail,
    totalAmount,
    items
  } = data;

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const itemsHtml = items.map(item => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 15px 0; vertical-align: top;">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 4px;">` : ''}
      </td>
      <td style="padding: 15px 0 15px 15px; vertical-align: top;">
        <p style="margin: 0 0 5px; font-weight: bold; color: #334155;">${item.name}</p>
        <p style="margin: 0; color: #64748b; font-size: 14px;">Cant: ${item.quantity}</p>
      </td>
      <td style="padding: 15px 0; text-align: right; vertical-align: top;">
        <p style="margin: 0; font-weight: bold; color: #334155;">${formatPrice(item.price * item.quantity)}</p>
      </td>
    </tr>
  `).join('');

  try {
    const { data: result, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: customerEmail,
      subject: `✅ Confirmación de Pedido #${orderId.slice(0, 8)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #1e293b; padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 2px;">
                        FASHION<span style="color: #d4a574;">MARKET</span>
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Success Banner -->
                  <tr>
                    <td style="background-color: #f0fdf4; padding: 20px; text-align: center; border-bottom: 2px solid #22c55e;">
                      <p style="margin: 0; color: #15803d; font-size: 16px; font-weight: bold;">
                        ✅ ¡Gracias por tu compra!
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #64748b; font-size: 16px;">
                        Hola ${customerName},
                      </p>
                      <p style="margin: 0 0 30px; color: #334155; font-size: 16px; line-height: 1.6;">
                        Hemos recibido tu pedido correctamente. A continuación encontrarás un resumen de tu compra.
                      </p>
                      
                      <!-- Order Details -->
                      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                          Pedido #${orderId.slice(0, 8)}
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          ${itemsHtml}
                          
                          <!-- Total -->
                          <tr>
                            <td colspan="2" style="padding-top: 20px; text-align: right; border-top: 2px solid #e2e8f0;">
                              <p style="margin: 0; font-weight: bold; font-size: 18px; color: #1e293b;">Total</p>
                            </td>
                            <td style="padding-top: 20px; text-align: right; border-top: 2px solid #e2e8f0;">
                              <p style="margin: 0; font-weight: bold; font-size: 18px; color: #1e293b;">${formatPrice(totalAmount)}</p>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <p style="margin: 0; color: #64748b; font-size: 14px; text-align: center;">
                        Te notificaremos cuando tu pedido sea enviado.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                        &copy; ${new Date().getFullYear()} Aurum. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Error enviando email de confirmación:', error);
      return { success: false, error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error enviando email de confirmación:', error);
    return { success: false, error };
  }
}
