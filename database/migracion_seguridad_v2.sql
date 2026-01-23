-- ==========================================
-- FASHIONMARKET - SCRIPT DE MIGRACIÓN v2.0
-- ==========================================
-- Fecha: Enero 2026
-- Propósito: Actualizar base de datos existente con mejoras de seguridad
--
-- INSTRUCCIONES:
-- 1. Ejecuta este script en tu base de datos Supabase
-- 2. El script es SEGURO para ejecutar en bases de datos existentes
-- 3. No eliminará datos existentes
-- ==========================================

-- ============================================
-- 1. NUEVAS COLUMNAS EN TABLAS EXISTENTES
-- ============================================

-- Añadir columnas a profiles si no existen
do $$
begin
    -- Columna email
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'profiles' and column_name = 'email') then
        alter table profiles add column email text;
    end if;
    
    -- Columna phone
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'profiles' and column_name = 'phone') then
        alter table profiles add column phone text;
    end if;
    
    -- Columna address
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'profiles' and column_name = 'address') then
        alter table profiles add column address text;
    end if;
    
    -- Columna city
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'profiles' and column_name = 'city') then
        alter table profiles add column city text;
    end if;
    
    -- Columna postal_code
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'profiles' and column_name = 'postal_code') then
        alter table profiles add column postal_code text;
    end if;
    
    -- Columna avatar_url
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'profiles' and column_name = 'avatar_url') then
        alter table profiles add column avatar_url text;
    end if;
    
    -- Columna created_at
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'profiles' and column_name = 'created_at') then
        alter table profiles add column created_at timestamp with time zone default timezone('utc'::text, now());
    end if;
end $$;

-- Añadir columnas a categories si no existen
do $$
begin
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'categories' and column_name = 'description') then
        alter table categories add column description text;
    end if;
    
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'categories' and column_name = 'image_url') then
        alter table categories add column image_url text;
    end if;
    
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'categories' and column_name = 'is_active') then
        alter table categories add column is_active boolean default true;
    end if;
    
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'categories' and column_name = 'updated_at') then
        alter table categories add column updated_at timestamp with time zone default timezone('utc'::text, now());
    end if;
end $$;

-- Añadir columnas a products si no existen
do $$
begin
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'products' and column_name = 'compare_at_price') then
        alter table products add column compare_at_price integer;
    end if;
    
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'products' and column_name = 'sku') then
        alter table products add column sku text unique;
    end if;
    
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'products' and column_name = 'sizes') then
        alter table products add column sizes text[] default '{}';
    end if;
    
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'products' and column_name = 'colors') then
        alter table products add column colors text[] default '{}';
    end if;
    
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'products' and column_name = 'material') then
        alter table products add column material text;
    end if;
    
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'products' and column_name = 'is_featured') then
        alter table products add column is_featured boolean default false;
    end if;
    
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'products' and column_name = 'is_active') then
        alter table products add column is_active boolean default true;
    end if;
    
    if not exists (select 1 from information_schema.columns 
                   where table_name = 'products' and column_name = 'updated_at') then
        alter table products add column updated_at timestamp with time zone default timezone('utc'::text, now());
    end if;
end $$;

-- ============================================
-- 2. CREAR TABLAS DE PEDIDOS SI NO EXISTEN
-- ============================================

-- Tabla de pedidos
create table if not exists orders (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references profiles(id) on delete set null,
    status text default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    total integer not null check (total > 0),
    shipping_address text not null,
    shipping_city text not null,
    shipping_postal_code text not null,
    shipping_phone text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabla de items de pedido
create table if not exists order_items (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid references orders(id) on delete cascade not null,
    product_id uuid references products(id) on delete set null,
    product_name text not null,
    quantity integer not null check (quantity > 0),
    unit_price integer not null check (unit_price > 0),
    size text,
    color text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- 3. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índices para profiles
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_email on profiles(email);

-- Índices para categories
create index if not exists idx_categories_slug on categories(slug);
create index if not exists idx_categories_active on categories(is_active);

-- Índices para products
create index if not exists idx_products_slug on products(slug);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_active on products(is_active);
create index if not exists idx_products_featured on products(is_featured);
create index if not exists idx_products_price on products(price);

-- Índices para orders
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created on orders(created_at desc);

-- Índices para order_items
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_order_items_product on order_items(product_id);

-- ============================================
-- 4. FUNCIÓN DE SEGURIDAD ANTI-ELEVACIÓN
-- ============================================
-- Esta es la MEJORA PRINCIPAL de seguridad

create or replace function prevent_role_self_elevation()
returns trigger as $$
begin
    -- Si se intenta cambiar el rol a 'admin'
    if new.role = 'admin' and (old.role is null or old.role != 'admin') then
        -- Verificar que el usuario actual NO es el mismo usuario
        if auth.uid() = new.id then
            raise exception 'SEGURIDAD: No puedes auto-asignarte el rol de administrador';
        end if;
        
        -- Verificar que quien hace el cambio es admin
        if not is_admin() then
            raise exception 'SEGURIDAD: Solo los administradores pueden asignar el rol de admin';
        end if;
    end if;
    
    return new;
end;
$$ language plpgsql security definer;

-- Aplicar trigger
drop trigger if exists prevent_role_elevation on profiles;
create trigger prevent_role_elevation
    before update on profiles
    for each row execute procedure prevent_role_self_elevation();

-- ============================================
-- 5. ACTUALIZAR FUNCIÓN DE NUEVO USUARIO
-- ============================================
-- Asegurar que siempre crea usuarios con rol 'customer'

create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, email, role)
    values (
        new.id, 
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        new.email,
        'customer' -- SIEMPRE customer, NUNCA admin
    );
    return new;
end;
$$ language plpgsql security definer;

-- Recrear trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- ============================================
-- 6. HABILITAR RLS EN NUEVAS TABLAS
-- ============================================

alter table orders enable row level security;
alter table order_items enable row level security;

-- ============================================
-- 7. POLÍTICAS PARA PEDIDOS
-- ============================================

-- Eliminar políticas existentes si hay
drop policy if exists "Usuario ve sus pedidos" on orders;
drop policy if exists "Usuario crea pedidos" on orders;
drop policy if exists "Admin ve todos los pedidos" on orders;
drop policy if exists "Admin gestiona pedidos" on orders;

-- Crear nuevas políticas
create policy "Usuario ve sus pedidos" on orders
    for select using (auth.uid() = user_id);

create policy "Usuario crea pedidos" on orders
    for insert with check (auth.uid() = user_id);

create policy "Admin ve todos los pedidos" on orders
    for select using (is_admin());

create policy "Admin gestiona pedidos" on orders
    for all using (is_admin());

-- ============================================
-- 8. POLÍTICAS PARA ITEMS DE PEDIDO
-- ============================================

drop policy if exists "Usuario ve items de sus pedidos" on order_items;
drop policy if exists "Usuario crea items en sus pedidos" on order_items;
drop policy if exists "Admin ve todos los items" on order_items;
drop policy if exists "Admin gestiona items" on order_items;

create policy "Usuario ve items de sus pedidos" on order_items
    for select using (
        exists (
            select 1 from orders 
            where orders.id = order_items.order_id 
            and orders.user_id = auth.uid()
        )
    );

create policy "Usuario crea items en sus pedidos" on order_items
    for insert with check (
        exists (
            select 1 from orders 
            where orders.id = order_items.order_id 
            and orders.user_id = auth.uid()
        )
    );

create policy "Admin ve todos los items" on order_items
    for select using (is_admin());

create policy "Admin gestiona items" on order_items
    for all using (is_admin());

-- ============================================
-- 9. ACTUALIZAR POLÍTICAS DE PRODUCTOS
-- ============================================

-- Eliminar políticas antiguas
drop policy if exists "Public can read products" on products;
drop policy if exists "Admins can manage products" on products;

-- Crear políticas actualizadas (solo productos activos visibles públicamente)
create policy "Lectura pública de productos activos" on products
    for select using (is_active = true);

create policy "Admin gestiona productos" on products
    for all using (is_admin());

-- ============================================
-- 10. ACTUALIZAR POLÍTICAS DE CATEGORÍAS
-- ============================================

drop policy if exists "Public can read categories" on categories;
drop policy if exists "Admins can manage categories" on categories;

create policy "Lectura pública de categorías activas" on categories
    for select using (is_active = true);

create policy "Admin gestiona categorías" on categories
    for all using (is_admin());

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================

-- Mensaje de confirmación
do $$
begin
    raise notice '==========================================';
    raise notice 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
    raise notice 'Versión: 2.0 - Seguridad Mejorada';
    raise notice '==========================================';
    raise notice 'Cambios aplicados:';
    raise notice '- Función anti-elevación de rol';
    raise notice '- Tablas de pedidos creadas';
    raise notice '- Índices optimizados';
    raise notice '- Políticas RLS actualizadas';
    raise notice '==========================================';
end $$;
