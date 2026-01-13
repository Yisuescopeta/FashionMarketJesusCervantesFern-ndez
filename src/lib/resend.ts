import { Resend } from 'resend';

// Cliente de Resend para envío de emails transaccionales
export const resend = new Resend(import.meta.env.RESEND_API_KEY);

// Configuración del remitente
export const EMAIL_FROM = 'FashionMarket <noreply@fashionmarket.com>';

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

  const productUrl = `${import.meta.env.SITE_URL || 'https://fashionmarket.com'}/productos/${productSlug}`;

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
                        <a href="${import.meta.env.SITE_URL || 'https://fashionmarket.com'}/mi-cuenta/preferencias" style="color: #d4a574;">
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
