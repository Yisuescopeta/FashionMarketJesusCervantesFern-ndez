
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

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config();

export async function sendOrderConfirmationEmail(data: OrderConfirmationEmailData) {
  const {
    orderId,
    customerName,
    customerEmail,
    totalAmount,
    items,
    shippingAddress // Nueva propiedad
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
             body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
            .header { background: #0f172a; padding: 30px; text-align: center; }
            .invoice-box { padding: 30px; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .customer-details { margin-bottom: 30px; background-color: #f1f5f9; padding: 20px; border-radius: 8px; }
            .btn { background: #0f172a; color: white; padding: 12px 25px; text-decoration: none; display: inline-block; border-radius: 6px; font-weight: bold; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
            .total-row td { padding-top: 20px; border-top: 2px solid #cbd5e1; font-size: 18px; color: #0f172a; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: white; margin: 0; letter-spacing: 2px; font-size: 24px;">FASHION<span style="color: #fbbf24;">MARKET</span></h1>
              <p style="color: #94a3b8; margin: 5px 0 0; font-size: 12px; letter-spacing: 1px;">YOUR PREMIUM STYLE</p>
            </div>
            
            <div class="invoice-box">
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="margin: 0; color: #0f172a;">Confirmación de Pedido</h2>
                <p style="color: #64748b; margin-top: 5px;">Gracias por tu confianza</p>
              </div>

              <table style="width: 100%; margin-bottom: 30px;">
                <tr>
                   <td style="vertical-align: top;">
                      <strong>Factura A:</strong><br>
                      ${customerName}<br>
                      ${customerEmail}<br>
                      ${shippingAddress ? shippingAddress.replace(/,/g, '<br>') : ''}
                   </td>
                   <td style="text-align: right; vertical-align: top;">
                      <strong>Nº Pedido:</strong> #${orderId.slice(0, 8)}<br>
                      <strong>Fecha:</strong> ${invoiceDate}<br>
                   </td>
                </tr>
              </table>

              <table width="100%" cellspacing="0">
                <thead>
                  <tr>
                    <th width="60%" style="padding-left: 10px;">Producto</th>
                    <th width="15%" style="text-align: center;">Cant.</th>
                    <th width="25%" style="text-align: right; padding-right: 10px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr class="total-row">
                    <td colspan="2" style="text-align: right; font-weight: bold; padding-right: 20px;">TOTAL</td>
                    <td style="text-align: right; font-weight: bold; padding-right: 10px;">${formatPrice(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>

              <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #e2e8f0;">
                <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
                  Hemos recibido tu pedido y estamos preparándolo para el envío. Te notificaremos cuando salga de nuestro almacén.
                </p>
                <a href="${import.meta.env.SITE_URL || ''}/mi-cuenta/pedidos" class="btn">Ver Mi Pedido</a>
              </div>
            </div>
            
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0;">
              <p>&copy; ${new Date().getFullYear()} Aurum. Todos los derechos reservados.</p>
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
             body { font-family: sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; }
            .header { background: #18181b; padding: 20px; text-align: center; color: white; }
            .btn { background: #18181b; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Aurum</h1>
            </div>
            <div style="padding: 20px;">
              <h2>¡Oferta en tus Favoritos!</h2>
              <p>Hola ${userName || 'Usuario'},</p>
              <p>Un producto que te gusta ha bajado de precio.</p>
              
              <div style="text-align: center; padding: 20px;">
                 <img src="${productImage}" alt="${productName}" style="max-width: 200px; border-radius: 8px;">
                 <h3>${productName}</h3>
                 <p>
                    <span style="text-decoration: line-through; color: #71717a;">${formatPrice(originalPrice)}</span>
                    <span style="font-weight: bold; color: #ef4444; font-size: 1.2em; margin-left: 10px;">${formatPrice(salePrice)}</span>
                 </p>
                 <p style="color: #ef4444; font-weight: bold;">¡-${discountPercent}% de Descuento!</p>
              </div>

              <div style="text-align: center; margin-top: 20px;">
                <a href="${productUrl}" class="btn">Ver Oferta</a>
              </div>
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
            body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: #18181b; padding: 30px 20px; text-align: center; }
            .content { padding: 40px 30px; color: #334155; line-height: 1.6; }
            .btn { background: #18181b; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; border-radius: 4px; font-weight: bold; }
            .footer { background: #f4f4f5; padding: 20px; text-align: center; color: #71717a; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 2px;">FASHION<span style="color: #d4a574;">MARKET</span></h1>
            </div>
            
            <div class="content">
              ${title ? `<h2 style="margin-top: 0; color: #18181b;">${title}</h2>` : ''}
              
              <p>Hola ${userName || 'Suscriptor'},</p>
              
              <div style="margin: 20px 0;">
                ${formattedMessage}
              </div>

              <div style="text-align: center; margin-top: 40px;">
                <a href="${import.meta.env.SITE_URL || 'http://localhost:4321'}" class="btn">Visitar Tienda</a>
              </div>
            </div>

            <div class="footer">
              <p>Recibes este correo porque estás suscrito a Aurum.</p>
              <p>&copy; ${new Date().getFullYear()} Aurum. Todos los derechos reservados.</p>
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
