
import nodemailer from 'nodemailer';

// Cliente de correo (Nodemailer) para cuando no hay dominio propio
// Se recomienda usar una App Password de Gmail
export const transporter = nodemailer.createTransport({
  service: 'gmail', // O 'hotmail', 'outlook'
  auth: {
    user: import.meta.env.EMAIL_USER, // Tu correo (ej: mi-tienda@gmail.com)
    pass: import.meta.env.EMAIL_PASSWORD // App Password (no tu contraseña normal)
  }
});

export const EMAIL_FROM = import.meta.env.EMAIL_USER || 'noreply@aurum.com';

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
  trackingId?: string;
  shippingAddress?: string; // Dirección completa
}

// El entorno se carga automáticamente en Astro
// No es necesario importar dotenv aquí

export async function sendOrderConfirmationEmail(data: OrderConfirmationEmailData) {
  const {
    orderId,
    customerName,
    customerEmail,
    totalAmount,
    items,
    shippingAddress, // Nueva propiedad
    trackingId
  } = data;

  console.log('Intento de envío de correo a:', customerEmail);

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  // Fecha de factura
  const invoiceDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const itemsHtml = items.map(item => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px 0 12px 10px; vertical-align: top;">
         ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 10px; vertical-align: middle;">` : ''}
         <span style="font-weight: 500; color: #334155; font-size: 14px;">${item.name}</span>
      </td>
      <td style="padding: 12px 0; text-align: center; color: #64748b; font-size: 14px;">
        ${item.quantity}
      </td>
      <td style="padding: 12px 10px 12px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">
        ${formatPrice(item.price * item.quantity)}
      </td>
    </tr>
  `).join('');

  try {
    const info = await transporter.sendMail({
      from: `"Aurum" <${EMAIL_FROM}>`,
      to: customerEmail,
      subject: `🧾 Factura de Pedido #${orderId.slice(0, 8)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
             body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0; }
            .header { background: #0f172a; padding: 40px 20px; text-align: center; border-bottom: 3px solid #d4af37; }
            .header h1 { color: white; margin: 0; letter-spacing: 6px; font-size: 28px; font-weight: 300; }
            .header p { color: #94a3b8; margin: 10px 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; }
            .invoice-box { padding: 40px 30px; }
            .title { text-align: center; margin-bottom: 40px; }
            .title h2 { margin: 0; color: #0f172a; font-weight: 800; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; }
            .title p { color: #64748b; margin-top: 8px; font-size: 15px; }
            .tracking-box { background: #0f172a; border-radius: 8px; padding: 25px; text-align: center; margin: 35px 0; color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .tracking-box .code { font-family: 'Courier New', Courier, monospace; font-size: 22px; color: #d4af37; font-weight: bold; letter-spacing: 3px; margin: 15px 0; display: block; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; border: 1px dashed rgba(212, 175, 55, 0.3); }
            .btn { background: #d4af37; color: #0f172a !important; padding: 14px 28px; text-decoration: none; display: inline-block; border-radius: 6px; font-weight: bold; margin-top: 20px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
            table.items { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            table.items th { text-align: left; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 12px; border-bottom: 2px solid #f1f5f9; }
            .total-row td { padding-top: 25px; border-top: 2px solid #e2e8f0; font-size: 18px; color: #0f172a; font-weight: 800; }
            .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AURUM</h1>
              <p>The Gold Standard of Fashion</p>
            </div>
            
            <div class="invoice-box">
              <div class="title">
                <h2>Confirmación de Pedido</h2>
                <p>Tu estilo prémium está asegurado, ${customerName.split(' ')[0]}</p>
              </div>

              <table style="width: 100%; margin-bottom: 35px; border-collapse: separate; border-spacing: 15px 0; margin-left: -15px; margin-right: -15px;">
                <tr>
                   <td style="vertical-align: top; width: 50%; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
                      <strong style="color: #0f172a; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Enviar a:</strong><br>
                      <div style="color: #475569; font-size: 14px; line-height: 1.5; margin-top: 8px;">
                        <strong>${customerName}</strong><br>
                        ${shippingAddress ? shippingAddress.replace(/,/g, '<br>') : 'Dirección no especificada'}
                      </div>
                   </td>
                   <td style="vertical-align: top; width: 50%; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
                      <strong style="color: #0f172a; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Detalles:</strong><br>
                      <div style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 8px;">
                        <strong>Nº Pedido:</strong> <span style="font-family: monospace;">#${orderId.slice(0, 8).toUpperCase()}</span><br>
                        <strong>Fecha:</strong> ${invoiceDate}
                      </div>
                   </td>
                </tr>
              </table>

              <table class="items" cellspacing="0">
                <thead>
                  <tr>
                    <th width="65%" style="padding-left: 10px;">Artículo</th>
                    <th width="10%" style="text-align: center;">Cant.</th>
                    <th width="25%" style="text-align: right; padding-right: 10px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr class="total-row">
                    <td colspan="2" style="text-align: right; padding-right: 20px;">TOTAL</td>
                    <td style="text-align: right; padding-right: 10px;">${formatPrice(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>

              ${trackingId ? `
              <div class="tracking-box">
                <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8;">Número de Seguimiento</p>
                <span class="code">${trackingId}</span>
                <p style="margin: 15px 0 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">Usa este código en nuestra web para conocer el estado exacto de tu envío en todo momento.</p>
                <a href="${import.meta.env.SITE_URL || 'http://localhost:4321'}/seguimiento" class="btn">Rastrear mi pedido</a>
              </div>
              ` : `
              <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px dashed #e2e8f0;">
                <p style="color: #475569; font-size: 14px; margin-bottom: 25px; line-height: 1.6;">
                  Hemos recibido tu pedido y estamos preparándolo cuidadosamente. Te notificaremos en cuanto salga de nuestro almacén.
                </p>
                <a href="${import.meta.env.SITE_URL || 'http://localhost:4321'}/mi-cuenta/pedidos" class="btn">Ver estado de mi pedido</a>
              </div>
              `}
            </div>
            
            <div class="footer">
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} Aurum. Todos los derechos reservados.</p>
              <p style="margin: 5px 0 0;">Una marca de excelencia y exclusividad.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log("Email enviado exitosamente: %s", info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('Error enviando email (Nodemailer):', error);
    if (error instanceof Error) {
      console.error('Detalle error:', error.message);
    }
    return { success: false, error };
  }
}

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

  const productUrl = `${import.meta.env.SITE_URL || 'http://localhost:4321'}/productos/${productSlug}`;

  try {
    const info = await transporter.sendMail({
      from: `"Aurum" <${EMAIL_FROM}>`,
      to: userEmail,
      subject: `🔥 ¡${productName} está en oferta! -${discountPercent}%`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
             body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0; }
            .header { background: #0f172a; padding: 40px 20px; text-align: center; border-bottom: 3px solid #d4af37; }
            .header h1 { color: white; margin: 0; letter-spacing: 6px; font-size: 28px; font-weight: 300; }
            .header p { color: #94a3b8; margin: 10px 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; }
             .content-box { padding: 40px 30px; text-align: center; }
            .btn { background: #d4af37; color: #0f172a !important; padding: 14px 28px; text-decoration: none; display: inline-block; border-radius: 6px; font-weight: bold; margin-top: 25px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
            .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AURUM</h1>
              <p>The Gold Standard of Fashion</p>
            </div>
            <div class="content-box">
              <h2 style="margin-top: 0; color: #0f172a; font-weight: 800; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">¡Oferta en tus Favoritos!</h2>
              <p style="color: #64748b; font-size: 15px; margin-bottom: 30px;">Hola ${userName || 'Usuario'},<br>Un producto que te gusta acaba de bajar de precio.</p>
              
              <div style="background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; display: inline-block; width: 100%; box-sizing: border-box;">
                 <img src="${productImage}" alt="${productName}" style="max-width: 180px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                 <h3 style="color: #0f172a; margin: 20px 0 10px;">${productName}</h3>
                 <p style="margin: 0;">
                    <span style="text-decoration: line-through; color: #94a3b8; font-size: 0.9em;">${formatPrice(originalPrice)}</span>
                    <span style="font-weight: 800; color: #ef4444; font-size: 1.4em; margin-left: 10px;">${formatPrice(salePrice)}</span>
                 </p>
                 <div style="background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-top: 15px;">
                   ¡-${discountPercent}% DE DESCUENTO!
                 </div>
              </div>

              <div>
                <a href="${productUrl}" class="btn">Comprar Ahora</a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} Aurum. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log("Email oferta enviado: %s", info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('Error enviando email oferta (Nodemailer):', error);
    return { success: false, error };
  }
}

// Interfaz para el email masivo (broadcast)
export interface BroadcastEmailData {
  userEmail: string;
  userName?: string;
  subject: string;
  message: string;
  title?: string;
}

export async function sendBroadcastEmail(data: BroadcastEmailData) {
  const {
    userEmail,
    userName,
    subject,
    message,
    title
  } = data;

  // Convertir saltos de línea en <br> para el email si es texto plano
  const formattedMessage = message.replace(/\n/g, '<br>');

  try {
    const info = await transporter.sendMail({
      from: `"Aurum" <${EMAIL_FROM}>`,
      to: userEmail,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
             body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0; }
            .header { background: #0f172a; padding: 40px 20px; text-align: center; border-bottom: 3px solid #d4af37; }
            .header h1 { color: white; margin: 0; letter-spacing: 6px; font-size: 28px; font-weight: 300; }
            .header p { color: #94a3b8; margin: 10px 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; }
            .content { padding: 40px 30px; color: #334155; line-height: 1.6; }
            .btn { background: #d4af37; color: #0f172a !important; padding: 14px 28px; text-decoration: none; display: inline-block; border-radius: 6px; font-weight: bold; margin-top: 25px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
            .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AURUM</h1>
              <p>The Gold Standard of Fashion</p>
            </div>
            
            <div class="content">
              ${title ? `<h2 style="margin-top: 0; color: #0f172a; font-weight: 800; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">${title}</h2>` : ''}
              
              <p style="font-size: 15px; color: #64748b;">Hola ${userName || 'Suscriptor'},</p>
              
              <div style="margin: 25px 0; font-size: 15px;">
                ${formattedMessage}
              </div>

              <div style="text-align: center; margin-top: 40px;">
                <a href="${import.meta.env.SITE_URL || 'http://localhost:4321'}" class="btn">Visitar Tienda</a>
              </div>
            </div>

            <div class="footer">
              <p style="margin: 0;">Recibes este correo porque estás suscrito a las novedades de Aurum.</p>
              <p style="margin: 5px 0 0;">&copy; ${new Date().getFullYear()} Aurum. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    return { success: true, data: info };
  } catch (error) {
    console.error('Error enviando broadcast email:', error);
    return { success: false, error };
  }
}
