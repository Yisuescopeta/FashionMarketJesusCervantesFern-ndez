import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async () => {
    try {
        const results = {
            users: 0,
            profiles: 0,
            orders: 0,
            items: 0,
            errors: [] as string[]
        };

        // 1. Obtener productos para usar en los pedidos
        const { data: products } = await supabaseAdmin
            .from('products')
            .select('id, name, price')
            .limit(3);

        if (!products || products.length === 0) {
            return new Response(JSON.stringify({ error: 'No hay productos en la base de datos. Ejecuta el seed de productos primero.' }), {
                status: 400,
            });
        }

        // 2. Crear perfiles de prueba DIRECTAMENTE (sin depender de Auth)
        const testProfiles = [
            { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 'admin@test.com', full_name: 'Admin Test', role: 'admin' },
            { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', email: 'cliente1@test.com', full_name: 'Laura García', role: 'customer' },
            { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', email: 'cliente2@test.com', full_name: 'Carlos Ruiz', role: 'customer' }
        ];

        for (const profile of testProfiles) {
            // Verificar si el perfil ya existe
            const { data: existingProfile } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('id', profile.id)
                .single();

            if (!existingProfile) {
                // Insertar perfil directamente (bypassing auth.users foreign key for simplicity)
                // Nota: En producción, esto requiere que el id exista en auth.users.
                // Pero para desarrollo/visualización, podemos insertar directamente si RLS está deshabilitado.
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .insert({
                        id: profile.id,
                        email: profile.email,
                        full_name: profile.full_name,
                        role: profile.role
                    });

                if (profileError) {
                    results.errors.push(`Error insertando perfil ${profile.email}: ${profileError.message}`);
                } else {
                    results.profiles++;
                }
            }
        }

        // 3. Crear Pedidos de prueba
        for (const profile of testProfiles.filter(p => p.role === 'customer')) {
            // Verificar si ya tiene pedidos
            const { count } = await supabaseAdmin
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', profile.id);

            if (count === 0) {
                const product = products[Math.floor(Math.random() * products.length)];
                const quantity = Math.floor(Math.random() * 2) + 1;
                const total = product.price * quantity;

                const { data: order, error: orderError } = await supabaseAdmin
                    .from('orders')
                    .insert({
                        user_id: profile.id,
                        status: ['pending', 'confirmed', 'shipped', 'delivered'][Math.floor(Math.random() * 4)],
                        total_amount: total,
                        customer_email: profile.email,
                        shipping_address: 'Calle Falsa 123',
                        shipping_city: 'Madrid',
                        shipping_postal_code: '28001'
                    })
                    .select()
                    .single();

                if (orderError) {
                    results.errors.push(`Error creando pedido para ${profile.email}: ${orderError.message}`);
                } else {
                    results.orders++;

                    // Crear Item de Pedido
                    const { error: itemError } = await supabaseAdmin
                        .from('order_items')
                        .insert({
                            order_id: order.id,
                            product_id: product.id,
                            product_name: product.name,
                            quantity: quantity,
                            unit_price: product.price
                        });

                    if (!itemError) results.items++;
                }
            }
        }

        return new Response(JSON.stringify({
            message: 'Seed completado',
            details: results
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Error desconocido' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
