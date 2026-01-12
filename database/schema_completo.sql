-- ==========================================
-- FASHIONMARKET - ESQUEMA COMPLETO DE BASE DE DATOS
-- ==========================================
-- Versión: 2.0 (Seguridad Mejorada)
-- Fecha: Enero 2026
-- 
-- IMPORTANTE: Este archivo contiene TODA la estructura de la base de datos.
-- Úsalo para crear la base de datos desde cero o como referencia completa.
--
-- NOTAS DE SEGURIDAD:
-- - Los usuarios SOLO pueden tener rol 'customer' por defecto
-- - El rol 'admin' SOLO puede ser asignado directamente desde la base de datos
-- - NO existe forma de auto-asignarse como admin desde la aplicación
-- ==========================================

-- ============================================
-- 1. EXTENSIONES REQUERIDAS
-- ============================================
create extension if not exists "uuid-ossp";

-- ============================================
-- 2. LIMPIEZA DE TABLAS EXISTENTES
-- ============================================
-- Eliminar tablas en orden correcto por dependencias
drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists products cascade;
drop table if exists categories cascade;
drop table if exists profiles cascade;
drop table if exists site_settings cascade;

-- Eliminar funciones existentes
drop function if exists is_admin() cascade;
drop function if exists handle_new_user() cascade;
drop function if exists prevent_role_self_elevation() cascade;
drop function if exists decrease_stock() cascade;

-- ============================================
-- 3. TABLA DE CATEGORÍAS
-- ============================================
create table categories (
    id uuid primary key default uuid_generate_v4(),
    name text not null check (char_length(name) >= 3),
    slug text not null unique check (slug ~* '^[a-z0-9-]+$'),
    description text,
    image_url text,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Índices para categorías
create index idx_categories_slug on categories(slug);
create index idx_categories_active on categories(is_active);

-- ============================================
-- 4. TABLA DE PERFILES DE USUARIO
-- ============================================
-- SEGURIDAD: El rol por defecto es 'customer'
-- SOLO el administrador de la BD puede asignar rol 'admin'
create table profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text,
    email text,
    phone text,
    address text,
    city text,
    postal_code text,
    -- IMPORTANTE: Solo 'admin' o 'customer' permitidos
    -- Por defecto SIEMPRE es 'customer'
    role text default 'customer' check (role in ('admin', 'customer')),
    avatar_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Índices para perfiles
create index idx_profiles_role on profiles(role);
create index idx_profiles_email on profiles(email);

-- ============================================
-- 5. TABLA DE PRODUCTOS
-- ============================================
create table products (
    id uuid primary key default uuid_generate_v4(),
    name text not null check (char_length(name) >= 3),
    slug text not null unique check (slug ~* '^[a-z0-9-]+$'),
    description text check (char_length(description) <= 2000),
    price integer not null check (price > 0), -- Precio en céntimos
    compare_at_price integer check (compare_at_price is null or compare_at_price > price),
    stock integer default 0 check (stock >= 0),
    sku text unique,
    category_id uuid references categories(id) on delete set null,
    images text[] default '{}',
    sizes text[] default '{}', -- Tallas disponibles
    colors text[] default '{}', -- Colores disponibles
    material text,
    is_featured boolean default false,
    is_on_sale boolean default false, -- Para ofertas flash
    sale_price integer check (sale_price is null or sale_price > 0), -- Precio de oferta
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- ============================================
-- 6. TABLA DE CONFIGURACIÓN DEL SITIO
-- ============================================
-- Configuración global del sitio, incluyendo el interruptor de ofertas
create table site_settings (
    id text primary key default 'main',
    show_flash_sales boolean default false, -- Interruptor de ofertas flash
    flash_sales_title text default 'Ofertas Flash',
    flash_sales_subtitle text default 'Descuentos por tiempo limitado',
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    updated_by uuid references profiles(id)
);

-- Índices para productos
create index idx_products_slug on products(slug);
create index idx_products_category on products(category_id);
create index idx_products_active on products(is_active);
create index idx_products_featured on products(is_featured);
create index idx_products_price on products(price);

-- ============================================
-- 6. TABLA DE PEDIDOS
-- ============================================
create table orders (
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

-- Índices para pedidos
create index idx_orders_user on orders(user_id);
create index idx_orders_status on orders(status);
create index idx_orders_created on orders(created_at desc);

-- ============================================
-- 7. TABLA DE ITEMS DE PEDIDO
-- ============================================
create table order_items (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid references orders(id) on delete cascade not null,
    product_id uuid references products(id) on delete set null,
    product_name text not null, -- Guardar nombre por si se elimina el producto
    quantity integer not null check (quantity > 0),
    unit_price integer not null check (unit_price > 0),
    size text,
    color text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para items de pedido
create index idx_order_items_order on order_items(order_id);
create index idx_order_items_product on order_items(product_id);

-- ============================================
-- 8. FUNCIONES DE SEGURIDAD
-- ============================================

-- Función para verificar si el usuario actual es admin
create or replace function is_admin()
returns boolean as $$
begin
    return (
        select role = 'admin'
        from profiles
        where id = auth.uid()
    );
end;
$$ language plpgsql security definer;

-- ============================================
-- 9. TRIGGER PARA CREAR PERFIL AUTOMÁTICAMENTE
-- ============================================
-- Cuando un usuario se registra, se crea su perfil con rol 'customer'
-- NUNCA se crea con rol 'admin' desde la aplicación
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, email, role)
    values (
        new.id, 
        new.raw_user_meta_data->>'full_name',
        new.email,
        'customer' -- SIEMPRE customer por defecto
    );
    return new;
end;
$$ language plpgsql security definer;

-- Crear trigger para nuevos usuarios
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- ============================================
-- 10. FUNCIÓN DE SEGURIDAD ANTI-ELEVACIÓN DE ROL
-- ============================================
-- Esta función previene que un usuario se auto-asigne rol de admin
create or replace function prevent_role_self_elevation()
returns trigger as $$
begin
    -- Si se intenta cambiar el rol a 'admin'
    if new.role = 'admin' and old.role != 'admin' then
        -- Verificar que el usuario actual ES admin (y no el mismo usuario)
        if auth.uid() = new.id then
            raise exception 'No puedes auto-asignarte el rol de administrador';
        end if;
        
        if not is_admin() then
            raise exception 'Solo los administradores pueden asignar el rol de admin';
        end if;
    end if;
    
    return new;
end;
$$ language plpgsql security definer;

-- Trigger para prevenir auto-elevación de rol
drop trigger if exists prevent_role_elevation on profiles;
create trigger prevent_role_elevation
    before update on profiles
    for each row execute procedure prevent_role_self_elevation();

-- ============================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
alter table categories enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table site_settings enable row level security;

-- ============================================
-- 11.1 POLÍTICAS PARA CATEGORÍAS
-- ============================================
-- Cualquiera puede leer categorías activas
create policy "Lectura pública de categorías activas" on categories
    for select using (is_active = true);

-- Solo admins pueden gestionar categorías
create policy "Admin gestiona categorías" on categories
    for all using (is_admin());

-- ============================================
-- 11.2 POLÍTICAS PARA PERFILES
-- ============================================
-- Usuarios pueden ver su propio perfil
create policy "Usuario ve su perfil" on profiles
    for select using (auth.uid() = id);

-- Admins pueden ver todos los perfiles
create policy "Admin ve todos los perfiles" on profiles
    for select using (is_admin());

-- Usuarios pueden actualizar su propio perfil (excepto rol)
create policy "Usuario actualiza su perfil" on profiles
    for update using (auth.uid() = id);

-- Admins pueden actualizar cualquier perfil
create policy "Admin actualiza perfiles" on profiles
    for update using (is_admin());

-- ============================================
-- 11.3 POLÍTICAS PARA PRODUCTOS
-- ============================================
-- Cualquiera puede ver productos activos
create policy "Lectura pública de productos activos" on products
    for select using (is_active = true);

-- Solo admins pueden gestionar productos
create policy "Admin gestiona productos" on products
    for all using (is_admin());

-- ============================================
-- 11.4 POLÍTICAS PARA PEDIDOS
-- ============================================
-- Usuarios pueden ver sus propios pedidos
create policy "Usuario ve sus pedidos" on orders
    for select using (auth.uid() = user_id);

-- Usuarios pueden crear sus propios pedidos
create policy "Usuario crea pedidos" on orders
    for insert with check (auth.uid() = user_id);

-- Admins pueden ver todos los pedidos
create policy "Admin ve todos los pedidos" on orders
    for select using (is_admin());

-- Admins pueden gestionar pedidos
create policy "Admin gestiona pedidos" on orders
    for all using (is_admin());

-- ============================================
-- 11.5 POLÍTICAS PARA ITEMS DE PEDIDO
-- ============================================
-- Usuarios pueden ver items de sus pedidos
create policy "Usuario ve items de sus pedidos" on order_items
    for select using (
        exists (
            select 1 from orders 
            where orders.id = order_items.order_id 
            and orders.user_id = auth.uid()
        )
    );

-- Usuarios pueden crear items en sus pedidos
create policy "Usuario crea items en sus pedidos" on order_items
    for insert with check (
        exists (
            select 1 from orders 
            where orders.id = order_items.order_id 
            and orders.user_id = auth.uid()
        )
    );

-- Admins pueden ver todos los items
create policy "Admin ve todos los items" on order_items
    for select using (is_admin());

-- Admins pueden gestionar items
create policy "Admin gestiona items" on order_items
    for all using (is_admin());

-- ============================================
-- 11.6 POLÍTICAS PARA CONFIGURACIÓN DEL SITIO
-- ============================================
-- Cualquiera puede leer la configuración (para saber si mostrar ofertas)
create policy "Lectura pública de configuración" on site_settings
    for select using (true);

-- Solo admins pueden modificar la configuración
create policy "Admin gestiona configuración" on site_settings
    for all using (is_admin());

-- ============================================
-- 11.7 FUNCIÓN DE CONTROL DE STOCK ATÓMICO
-- ============================================
-- Esta función reduce el stock de forma atómica y previene venta sin stock
create or replace function decrease_stock(product_id uuid, quantity integer)
returns boolean as $$
declare
    current_stock integer;
begin
    -- Obtener stock actual con bloqueo
    select stock into current_stock
    from products
    where id = product_id
    for update;
    
    -- Verificar si hay suficiente stock
    if current_stock is null then
        raise exception 'Producto no encontrado';
    end if;
    
    if current_stock < quantity then
        raise exception 'Stock insuficiente. Disponible: %, Solicitado: %', current_stock, quantity;
    end if;
    
    -- Reducir stock
    update products
    set stock = stock - quantity,
        updated_at = now()
    where id = product_id;
    
    return true;
end;
$$ language plpgsql security definer;

-- ============================================
-- 12. CONFIGURACIÓN DE STORAGE
-- ============================================
-- Bucket para imágenes de productos
insert into storage.buckets (id, name, public) 
values ('products-images', 'products-images', true)
on conflict (id) do nothing;

-- Políticas de Storage
create policy "Lectura pública de imágenes"
    on storage.objects for select
    using (bucket_id = 'products-images');

create policy "Admin sube imágenes"
    on storage.objects for insert
    with check (
        bucket_id = 'products-images' 
        and is_admin()
    );

create policy "Admin gestiona imágenes"
    on storage.objects for all
    using (
        bucket_id = 'products-images' 
        and is_admin()
    );

-- ============================================
-- 13. DATOS INICIALES (SEED)
-- ============================================

-- Categorías según requisitos del cliente
insert into categories (id, name, slug, description, is_active) values 
    ('11111111-1111-1111-1111-111111111111', 'Camisas', 'camisas', 'Camisas elegantes para toda ocasión', true),
    ('22222222-2222-2222-2222-222222222222', 'Camisetas', 'camisetas', 'Camisetas casuales y de vestir', true),
    ('33333333-3333-3333-3333-333333333333', 'Chalecos', 'chalecos', 'Chalecos formales e informales', true),
    ('44444444-4444-4444-4444-444444444444', 'Pantalones', 'pantalones', 'Pantalones de vestir y casual', true)
on conflict (slug) do nothing;

-- Configuración inicial del sitio
insert into site_settings (id, show_flash_sales, flash_sales_title, flash_sales_subtitle)
values ('main', true, '¡Ofertas Flash!', 'Descuentos exclusivos por tiempo limitado')
on conflict (id) do nothing;

-- ============================================
-- 13.1 PRODUCTOS DE EJEMPLO
-- ============================================

-- CAMISAS (category_id: 11111111-1111-1111-1111-111111111111)
insert into products (name, slug, description, price, stock, category_id, images, sizes, colors, material, is_featured, is_active) values
    ('Camisa Oxford Blanca', 'camisa-oxford-blanca', 'Camisa Oxford clásica de algodón 100%. Perfecta para ocasiones formales e informales.', 4900, 50, '11111111-1111-1111-1111-111111111111', 
     ARRAY['https://images.unsplash.com/photo-1598033129183-c4f50c7176c8?q=80&w=800', 'https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=800'], 
     ARRAY['S', 'M', 'L', 'XL'], ARRAY['Blanco'], 'Algodón 100%', true, true),
    
    ('Camisa Azul Slim Fit', 'camisa-azul-slim-fit', 'Camisa slim fit en tono azul cielo. Corte moderno y elegante.', 5500, 35, '11111111-1111-1111-1111-111111111111',
     ARRAY['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800'],
     ARRAY['S', 'M', 'L', 'XL', 'XXL'], ARRAY['Azul'], 'Algodón/Poliéster', true, true),
    
    ('Camisa de Lino Natural', 'camisa-lino-natural', 'Camisa de lino premium para los días de verano. Fresca y transpirable.', 6900, 25, '11111111-1111-1111-1111-111111111111',
     ARRAY['https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?q=80&w=800'],
     ARRAY['M', 'L', 'XL'], ARRAY['Beige', 'Blanco'], 'Lino 100%', false, true),
    
    ('Camisa Negra Formal', 'camisa-negra-formal', 'Camisa negra de vestir para ocasiones especiales. Elegancia en su máxima expresión.', 5900, 40, '11111111-1111-1111-1111-111111111111',
     ARRAY['https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?q=80&w=800'],
     ARRAY['S', 'M', 'L', 'XL'], ARRAY['Negro'], 'Algodón Premium', false, true)
on conflict (slug) do nothing;

-- CAMISETAS (category_id: 22222222-2222-2222-2222-222222222222)
insert into products (name, slug, description, price, stock, category_id, images, sizes, colors, material, is_featured, is_active, is_on_sale, sale_price) values
    ('Camiseta Básica Negra', 'camiseta-basica-negra', 'Camiseta básica de algodón suave. Imprescindible en cualquier armario.', 2500, 100, '22222222-2222-2222-2222-222222222222',
     ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800', 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800'],
     ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Negro'], 'Algodón 100%', true, true, true, 1900),
    
    ('Camiseta Blanca Premium', 'camiseta-blanca-premium', 'Camiseta blanca de calidad premium. Corte regular y cómodo.', 2900, 80, '22222222-2222-2222-2222-222222222222',
     ARRAY['https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=800'],
     ARRAY['S', 'M', 'L', 'XL'], ARRAY['Blanco'], 'Algodón Orgánico', true, true, false, null),
    
    ('Camiseta Gris Jaspeada', 'camiseta-gris-jaspeada', 'Camiseta en tono gris jaspeado. Casual y versátil.', 2700, 60, '22222222-2222-2222-2222-222222222222',
     ARRAY['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=800'],
     ARRAY['S', 'M', 'L', 'XL'], ARRAY['Gris'], 'Algodón/Poliéster', false, true, false, null),
    
    ('Camiseta Cuello V Azul', 'camiseta-cuello-v-azul', 'Camiseta con cuello en V en azul marino. Estilo moderno.', 3200, 45, '22222222-2222-2222-2222-222222222222',
     ARRAY['https://images.unsplash.com/photo-1622445275576-721325763afe?q=80&w=800'],
     ARRAY['S', 'M', 'L', 'XL'], ARRAY['Azul Marino'], 'Algodón Pima', false, true, true, 2400)
on conflict (slug) do nothing;

-- CHALECOS (category_id: 33333333-3333-3333-3333-333333333333)
insert into products (name, slug, description, price, stock, category_id, images, sizes, colors, material, is_featured, is_active) values
    ('Chaleco de Vestir Gris', 'chaleco-vestir-gris', 'Chaleco formal en gris oscuro. Ideal para trajes de tres piezas.', 7900, 20, '33333333-3333-3333-3333-333333333333',
     ARRAY['https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800'],
     ARRAY['S', 'M', 'L', 'XL'], ARRAY['Gris Oscuro'], 'Lana/Poliéster', true, true),
    
    ('Chaleco Casual Marrón', 'chaleco-casual-marron', 'Chaleco casual en tono marrón tierra. Perfecto para looks informales.', 6500, 15, '33333333-3333-3333-3333-333333333333',
     ARRAY['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800'],
     ARRAY['M', 'L', 'XL'], ARRAY['Marrón'], 'Algodón', false, true),
    
    ('Chaleco Negro Elegante', 'chaleco-negro-elegante', 'Chaleco negro para ocasiones especiales. Corte slim fit.', 8500, 25, '33333333-3333-3333-3333-333333333333',
     ARRAY['https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?q=80&w=800'],
     ARRAY['S', 'M', 'L', 'XL'], ARRAY['Negro'], 'Lana Premium', true, true)
on conflict (slug) do nothing;

-- PANTALONES (category_id: 44444444-4444-4444-4444-444444444444)
insert into products (name, slug, description, price, stock, category_id, images, sizes, colors, material, is_featured, is_active, is_on_sale, sale_price) values
    ('Pantalón Chino Beige', 'pantalon-chino-beige', 'Pantalón chino clásico en color beige. Versátil y cómodo.', 5900, 40, '44444444-4444-4444-4444-444444444444',
     ARRAY['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=800'],
     ARRAY['28', '30', '32', '34', '36', '38'], ARRAY['Beige'], 'Algodón Twill', true, true, false, null),
    
    ('Pantalón de Vestir Negro', 'pantalon-vestir-negro', 'Pantalón formal de vestir. Imprescindible para el trabajo.', 6900, 35, '44444444-4444-4444-4444-444444444444',
     ARRAY['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800'],
     ARRAY['30', '32', '34', '36'], ARRAY['Negro'], 'Lana/Poliéster', true, true, true, 4900),
    
    ('Pantalón Azul Marino', 'pantalon-azul-marino', 'Pantalón en azul marino. Elegante y moderno.', 6500, 30, '44444444-4444-4444-4444-444444444444',
     ARRAY['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800'],
     ARRAY['30', '32', '34', '36', '38'], ARRAY['Azul Marino'], 'Algodón Stretch', false, true, false, null),
    
    ('Pantalón Gris Slim', 'pantalon-gris-slim', 'Pantalón gris con corte slim. Moderno y juvenil.', 5500, 45, '44444444-4444-4444-4444-444444444444',
     ARRAY['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800'],
     ARRAY['28', '30', '32', '34', '36'], ARRAY['Gris'], 'Algodón/Elastano', false, true, false, null)
on conflict (slug) do nothing;

-- ============================================
-- 14. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================
comment on table profiles is 'Perfiles de usuario. El rol solo puede ser admin o customer.';
comment on column profiles.role is 'Rol del usuario. Solo el DBA puede asignar admin.';
comment on function is_admin() is 'Verifica si el usuario actual tiene rol de administrador.';
comment on function handle_new_user() is 'Crea perfil automáticamente al registrarse. Siempre con rol customer.';
comment on function prevent_role_self_elevation() is 'Previene que usuarios se auto-asignen rol admin.';

-- ==========================================
-- FIN DEL ESQUEMA
-- ==========================================
