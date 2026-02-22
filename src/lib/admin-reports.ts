import { supabaseAdmin } from './supabase-admin';

// ============================================================
// Funciones de agregación de datos para informes de administrador
// ============================================================

export interface SalesReportData {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  ordersByStatus: Record<string, number>;
}

export interface NewCustomersReportData {
  totalNew: number;
  customers: Array<{ full_name: string; email: string; created_at: string }>;
}

export interface ReturnsReportData {
  totalReturns: number;
  totalRefunded: number;
  returns: Array<{ id: string; customer_email: string; total_amount: number; status: string; created_at: string }>;
}

export interface LowStockReportData {
  totalLowStock: number;
  products: Array<{ name: string; stock: number; price: number; category?: string }>;
}

export interface TopProductsReportData {
  products: Array<{ name: string; totalSold: number; totalRevenue: number }>;
}

export interface FullReportData {
  sales?: SalesReportData;
  newCustomers?: NewCustomersReportData;
  returns?: ReturnsReportData;
  lowStock?: LowStockReportData;
  topProducts?: TopProductsReportData;
  periodDays: number;
  generatedAt: string;
}

// ---- Ventas del periodo ----
export async function getSalesReport(days: number): Promise<SalesReportData> {
  const { data, error } = await supabaseAdmin.rpc('get_sales_report', { days_ago: days });

  if (error || !data) {
    console.error('Error fetching sales report (RPC):', error);
    return { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, ordersByStatus: {} };
  }

  // RPC returns the exact structure matching SalesReportData
  // Ensure types match (e.g. ordersByStatus might be object)
  return {
    totalOrders: Number(data.totalOrders) || 0,
    totalRevenue: Number(data.totalRevenue) || 0,
    avgOrderValue: Number(data.avgOrderValue) || 0,
    ordersByStatus: data.ordersByStatus || {}
  };
}

// ---- Nuevos clientes ----
export async function getNewCustomersReport(days: number): Promise<NewCustomersReportData> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: customers, error } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !customers) {
    console.error('Error fetching new customers report:', error);
    return { totalNew: 0, customers: [] };
  }

  return { totalNew: customers.length, customers };
}

// ---- Devoluciones / Cancelaciones ----
export async function getReturnsReport(days: number): Promise<ReturnsReportData> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: returns, error } = await supabaseAdmin
    .from('orders')
    .select('id, customer_email, total_amount, status, created_at')
    .in('status', ['cancelled', 'refunded'])
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  if (error || !returns) {
    console.error('Error fetching returns report:', error);
    return { totalReturns: 0, totalRefunded: 0, returns: [] };
  }

  // Explicitly type the result to avoid implicit any errors in filter/reduce
  const returnsData = returns as Array<{ id: string; customer_email: string; total_amount: number; status: string; created_at: string }>;

  const totalRefunded = returnsData
    .filter((r) => r.status === 'refunded')
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);

  return { totalReturns: returns.length, totalRefunded, returns: returnsData };
}

// ---- Stock bajo ----
export async function getLowStockReport(): Promise<LowStockReportData> {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('name, stock, price, categories(name)')
    .lt('stock', 10)
    .eq('is_active', true)
    .order('stock', { ascending: true })
    .limit(20);

  if (error || !products) {
    console.error('Error fetching low stock report:', error);
    return { totalLowStock: 0, products: [] };
  }

  return {
    totalLowStock: products.length,
    products: products.map((p: any) => ({
      name: p.name,
      stock: p.stock,
      price: p.price,
      category: p.categories?.name || 'Sin categoría'
    }))
  };
}

// ---- Productos más vendidos ----
export async function getTopProductsReport(days: number): Promise<TopProductsReportData> {
  const { data, error } = await supabaseAdmin.rpc('get_top_products', {
    days_ago: days,
    limit_count: 10
  });

  if (error || !data) {
    console.error('Error fetching top products (RPC):', error);
    return { products: [] };
  }

  // data.products is the array
  const products = (data.products || []).map((p: any) => ({
    name: p.name || 'Desconocido',
    totalSold: Number(p.totalSold) || 0,
    totalRevenue: Number(p.totalRevenue) || 0
  }));

  return { products };
}

// ---- Generar informe completo ----
export async function generateFullReport(options: {
  includeSales: boolean;
  includeNewCustomers: boolean;
  includeReturns: boolean;
  includeLowStock: boolean;
  includeTopProducts: boolean;
  periodDays: number;
}): Promise<FullReportData> {
  const report: FullReportData = {
    periodDays: options.periodDays,
    generatedAt: new Date().toISOString()
  };

  const tasks: Promise<void>[] = [];

  if (options.includeSales) {
    tasks.push(getSalesReport(options.periodDays).then(d => { report.sales = d; }));
  }
  if (options.includeNewCustomers) {
    tasks.push(getNewCustomersReport(options.periodDays).then(d => { report.newCustomers = d; }));
  }
  if (options.includeReturns) {
    tasks.push(getReturnsReport(options.periodDays).then(d => { report.returns = d; }));
  }
  if (options.includeLowStock) {
    tasks.push(getLowStockReport().then(d => { report.lowStock = d; }));
  }
  if (options.includeTopProducts) {
    tasks.push(getTopProductsReport(options.periodDays).then(d => { report.topProducts = d; }));
  }

  await Promise.all(tasks);
  return report;
}

// ---- Construir HTML del email ----
export function buildReportHtml(report: FullReportData, adminName: string): string {
  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const periodLabel = report.periodDays === 1
    ? 'las últimas 24 horas'
    : `los últimos ${report.periodDays} días`;

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    confirmed: 'Confirmado',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    refunded: 'Devuelto',
  };

  let sections = '';

  // --- Ventas ---
  if (report.sales) {
    const s = report.sales;
    const statusRows = Object.entries(s.ordersByStatus)
      .map(([status, count]) => `
        <tr>
          <td style="padding: 6px 12px; font-size: 13px; color: #475569;">${statusLabels[status] || status}</td>
          <td style="padding: 6px 12px; font-size: 13px; color: #1e293b; font-weight: bold; text-align: right;">${count}</td>
        </tr>
      `).join('');

    sections += `
      <tr>
        <td style="padding: 0 30px 30px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border-radius: 12px; overflow: hidden; border: 1px solid #bae6fd;">
            <tr>
              <td style="padding: 20px 24px; background: linear-gradient(135deg, #0284c7, #0ea5e9);">
                <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">📊 Ventas</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Total Pedidos</span>
                      <p style="margin: 4px 0 0; font-size: 28px; font-weight: bold; color: #0f172a;">${s.totalOrders}</p>
                    </td>
                    <td style="padding: 8px 0; text-align: center;">
                      <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Ingresos</span>
                      <p style="margin: 4px 0 0; font-size: 28px; font-weight: bold; color: #059669;">${formatPrice(s.totalRevenue)}</p>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Valor Medio</span>
                      <p style="margin: 4px 0 0; font-size: 28px; font-weight: bold; color: #0f172a;">${formatPrice(s.avgOrderValue)}</p>
                    </td>
                  </tr>
                </table>
                ${statusRows ? `
                  <p style="margin: 20px 0 10px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Desglose por estado</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                    ${statusRows}
                  </table>
                ` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  // --- Nuevos Clientes ---
  if (report.newCustomers) {
    const c = report.newCustomers;
    const customerRows = c.customers.slice(0, 10).map(cust => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 8px 12px; font-size: 13px; color: #334155;">${cust.full_name || 'Sin nombre'}</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #64748b;">${cust.email || '-'}</td>
        <td style="padding: 8px 12px; font-size: 12px; color: #94a3b8; text-align: right;">${new Date(cust.created_at).toLocaleDateString('es-ES')}</td>
      </tr>
    `).join('');

    sections += `
      <tr>
        <td style="padding: 0 30px 30px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border-radius: 12px; overflow: hidden; border: 1px solid #bbf7d0;">
            <tr>
              <td style="padding: 20px 24px; background: linear-gradient(135deg, #16a34a, #22c55e);">
                <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">👥 Nuevos Clientes</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 24px;">
                <p style="margin: 0 0 16px; font-size: 28px; font-weight: bold; color: #0f172a;">${c.totalNew} <span style="font-size: 14px; color: #64748b; font-weight: normal;">nuevos registros</span></p>
                ${customerRows ? `
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <tr style="background: #f8fafc;">
                      <td style="padding: 8px 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Nombre</td>
                      <td style="padding: 8px 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Email</td>
                      <td style="padding: 8px 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; text-align: right;">Fecha</td>
                    </tr>
                    ${customerRows}
                  </table>
                ` : '<p style="color: #64748b; font-size: 13px;">No hay nuevos registros en este periodo.</p>'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  // --- Devoluciones ---
  if (report.returns) {
    const r = report.returns;
    sections += `
      <tr>
        <td style="padding: 0 30px 30px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #fff7ed; border-radius: 12px; overflow: hidden; border: 1px solid #fed7aa;">
            <tr>
              <td style="padding: 20px 24px; background: linear-gradient(135deg, #ea580c, #f97316);">
                <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">🔄 Devoluciones y Cancelaciones</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Total</span>
                      <p style="margin: 4px 0 0; font-size: 28px; font-weight: bold; color: #ea580c;">${r.totalReturns}</p>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Importe Devuelto</span>
                      <p style="margin: 4px 0 0; font-size: 28px; font-weight: bold; color: #dc2626;">${formatPrice(r.totalRefunded)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  // --- Stock Bajo ---
  if (report.lowStock) {
    const ls = report.lowStock;
    const productRows = ls.products.slice(0, 10).map(p => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 8px 12px; font-size: 13px; color: #334155;">${p.name}</td>
        <td style="padding: 8px 12px; font-size: 12px; color: #64748b;">${p.category}</td>
        <td style="padding: 8px 12px; font-size: 13px; text-align: center;">
          <span style="display: inline-block; background: ${p.stock <= 3 ? '#fef2f2' : '#fffbeb'}; color: ${p.stock <= 3 ? '#dc2626' : '#d97706'}; padding: 2px 10px; border-radius: 12px; font-weight: bold; font-size: 12px;">${p.stock}</span>
        </td>
        <td style="padding: 8px 12px; font-size: 13px; color: #334155; text-align: right; font-weight: bold;">${formatPrice(p.price)}</td>
      </tr>
    `).join('');

    sections += `
      <tr>
        <td style="padding: 0 30px 30px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #fefce8; border-radius: 12px; overflow: hidden; border: 1px solid #fde68a;">
            <tr>
              <td style="padding: 20px 24px; background: linear-gradient(135deg, #d97706, #eab308);">
                <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">⚠️ Stock Bajo (< 10 uds)</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 24px;">
                <p style="margin: 0 0 16px; font-size: 28px; font-weight: bold; color: #0f172a;">${ls.totalLowStock} <span style="font-size: 14px; color: #64748b; font-weight: normal;">productos con stock bajo</span></p>
                ${productRows ? `
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <tr style="background: #f8fafc;">
                      <td style="padding: 8px 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Producto</td>
                      <td style="padding: 8px 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Categoría</td>
                      <td style="padding: 8px 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; text-align: center;">Stock</td>
                      <td style="padding: 8px 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; text-align: right;">Precio</td>
                    </tr>
                    ${productRows}
                  </table>
                ` : '<p style="color: #64748b; font-size: 13px;">¡Todo el inventario tiene stock suficiente! 🎉</p>'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  // --- Top Productos ---
  if (report.topProducts) {
    const tp = report.topProducts;
    const topRows = tp.products.slice(0, 10).map((p, i) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; font-weight: bold;">#${i + 1}</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #334155; font-weight: 600;">${p.name}</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #334155; text-align: center; font-weight: bold;">${p.totalSold}</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #059669; text-align: right; font-weight: bold;">${formatPrice(p.totalRevenue)}</td>
      </tr>
    `).join('');

    sections += `
      <tr>
        <td style="padding: 0 30px 30px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #faf5ff; border-radius: 12px; overflow: hidden; border: 1px solid #e9d5ff;">
            <tr>
              <td style="padding: 20px 24px; background: linear-gradient(135deg, #7c3aed, #a855f7);">
                <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">🏆 Productos Más Vendidos</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 24px;">
                ${topRows ? `
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <tr style="background: #f8fafc;">
                      <td style="padding: 8px 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">#</td>
                      <td style="padding: 8px 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Producto</td>
                      <td style="padding: 8px 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; text-align: center;">Uds.</td>
                      <td style="padding: 8px 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; text-align: right;">Ingresos</td>
                    </tr>
                    ${topRows}
                  </table>
                ` : '<p style="color: #64748b; font-size: 13px;">No hay ventas en este periodo.</p>'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  // --- Email completo ---
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="640" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 26px; letter-spacing: 3px; font-family: 'Georgia', serif; font-style: italic;">
                    AURUM
                  </h1>
                  <p style="margin: 8px 0 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 3px;">
                    Informe de Gestión
                  </p>
                </td>
              </tr>
              
              <!-- Greeting -->
              <tr>
                <td style="padding: 30px 30px 20px;">
                  <p style="margin: 0 0 8px; color: #64748b; font-size: 15px;">
                    Hola ${adminName},
                  </p>
                  <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6;">
                    Aquí tienes tu informe de <strong>${periodLabel}</strong>, generado el ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.
                  </p>
                </td>
              </tr>
              
              <!-- Report Sections -->
              ${sections}
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 8px; color: #94a3b8; font-size: 11px;">
                    Este es un informe automático de Aurum Admin.
                  </p>
                <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                    Puedes configurar tus preferencias de informes desde el <a href="${(import.meta.env as any).SITE_URL || 'http://localhost:4321'}/admin/informes" style="color: #d4a574;">panel de administración</a>.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
