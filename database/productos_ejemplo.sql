-- ============================================
-- FASHIONMARKET - PRODUCTOS DE EJEMPLO
-- ============================================
-- Ejecuta este script para añadir productos de ejemplo
-- Este script crea las tablas necesarias si no existen
-- ============================================

-- Crear tabla site_settings si no existe
create table if not exists site_settings (
    id text primary key default 'main',
    show_flash_sales boolean default false,
    flash_sales_title text default 'Ofertas Flash',
    flash_sales_subtitle text default 'Descuentos por tiempo limitado',
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    updated_by uuid
);

-- Añadir columnas a products si no existen (para ofertas flash)
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'products' and column_name = 'is_on_sale') then
        alter table products add column is_on_sale boolean default false;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'products' and column_name = 'sale_price') then
        alter table products add column sale_price integer;
    end if;
end $$;

-- Primero, asegurar que existen las categorías
insert into categories (id, name, slug, description, is_active) values 
    ('11111111-1111-1111-1111-111111111111', 'Camisas', 'camisas', 'Camisas elegantes para toda ocasión', true),
    ('22222222-2222-2222-2222-222222222222', 'Camisetas', 'camisetas', 'Camisetas casuales y de vestir', true),
    ('33333333-3333-3333-3333-333333333333', 'Chalecos', 'chalecos', 'Chalecos formales e informales', true),
    ('44444444-4444-4444-4444-444444444444', 'Pantalones', 'pantalones', 'Pantalones de vestir y casual', true)
on conflict (slug) do update set
    id = excluded.id,
    name = excluded.name,
    description = excluded.description;

-- Insertar o actualizar configuración del sitio
insert into site_settings (id, show_flash_sales, flash_sales_title, flash_sales_subtitle)
values ('main', true, '¡Ofertas Flash!', 'Descuentos exclusivos por tiempo limitado')
on conflict (id) do update set show_flash_sales = true;

-- ============================================
-- CAMISAS
-- ============================================
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

-- ============================================
-- CAMISETAS
-- ============================================
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

-- ============================================
-- CHALECOS
-- ============================================
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

-- ============================================
-- PANTALONES
-- ============================================
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
-- RESUMEN
-- ============================================
-- Total productos insertados: 15
-- - 4 Camisas
-- - 4 Camisetas (2 en oferta)
-- - 3 Chalecos
-- - 4 Pantalones (1 en oferta)
-- Ofertas Flash: ACTIVADAS
-- ============================================
