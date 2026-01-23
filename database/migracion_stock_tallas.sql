-- ==========================================
-- MIGRACIÓN: STOCK POR TALLA
-- ==========================================
-- Versión: 3.0
-- Fecha: Enero 2026
-- 
-- Esta migración añade soporte para gestionar el stock
-- de cada producto por talla individual.
-- ==========================================

-- ============================================
-- 1. CREAR TABLA DE VARIANTES (STOCK POR TALLA)
-- ============================================
create table if not exists product_variants (
    id uuid primary key default uuid_generate_v4(),
    product_id uuid references products(id) on delete cascade not null,
    size text not null,
    stock integer default 0 check (stock >= 0),
    sku_variant text, -- SKU específico de la variante (opcional)
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    -- Cada producto solo puede tener una entrada por talla
    unique(product_id, size)
);

-- Índices para búsquedas rápidas
create index if not exists idx_product_variants_product on product_variants(product_id);
create index if not exists idx_product_variants_size on product_variants(size);
create index if not exists idx_product_variants_stock on product_variants(stock);

-- ============================================
-- 2. HABILITAR RLS EN LA NUEVA TABLA
-- ============================================
alter table product_variants enable row level security;

-- Políticas de seguridad
create policy "Lectura pública de variantes" on product_variants
    for select using (true);

create policy "Admin gestiona variantes" on product_variants
    for all using (is_admin());

-- ============================================
-- 3. FUNCIÓN PARA REDUCIR STOCK POR TALLA
-- ============================================
-- Reemplaza la función anterior para trabajar con variantes
create or replace function decrease_stock_by_size(
    p_product_id uuid, 
    p_size text, 
    p_quantity integer
)
returns boolean as $$
declare
    current_stock integer;
begin
    -- Obtener stock actual de la variante con bloqueo
    select stock into current_stock
    from product_variants
    where product_id = p_product_id and size = p_size
    for update;
    
    -- Verificar si existe la variante
    if current_stock is null then
        raise exception 'Talla % no disponible para este producto', p_size;
    end if;
    
    -- Verificar si hay suficiente stock
    if current_stock < p_quantity then
        raise exception 'Stock insuficiente en talla %. Disponible: %, Solicitado: %', 
            p_size, current_stock, p_quantity;
    end if;
    
    -- Reducir stock de la variante
    update product_variants
    set stock = stock - p_quantity,
        updated_at = now()
    where product_id = p_product_id and size = p_size;
    
    -- Actualizar stock total del producto
    update products
    set stock = (
        select coalesce(sum(stock), 0) 
        from product_variants 
        where product_id = p_product_id
    ),
    updated_at = now()
    where id = p_product_id;
    
    return true;
end;
$$ language plpgsql security definer;

-- ============================================
-- 4. FUNCIÓN PARA OBTENER STOCK POR TALLA
-- ============================================
create or replace function get_product_stock_by_size(p_product_id uuid)
returns table(size text, stock integer) as $$
begin
    return query
    select pv.size, pv.stock
    from product_variants pv
    where pv.product_id = p_product_id
    order by 
        case pv.size
            when 'XS' then 1
            when 'S' then 2
            when 'M' then 3
            when 'L' then 4
            when 'XL' then 5
            when 'XXL' then 6
            when '28' then 7
            when '30' then 8
            when '32' then 9
            when '34' then 10
            when '36' then 11
            when '38' then 12
            when '40' then 13
            else 99
        end;
end;
$$ language plpgsql security definer;

-- ============================================
-- 5. MIGRAR DATOS EXISTENTES
-- ============================================
-- Crear variantes para productos existentes distribuyendo el stock
-- entre las tallas disponibles de forma proporcional

do $$
declare
    prod record;
    size_item text;
    num_sizes integer;
    stock_per_size integer;
    remainder integer;
    first_size boolean;
begin
    -- Para cada producto existente
    for prod in select id, sizes, stock from products where sizes is not null and array_length(sizes, 1) > 0
    loop
        num_sizes := array_length(prod.sizes, 1);
        stock_per_size := prod.stock / num_sizes;
        remainder := prod.stock % num_sizes;
        first_size := true;
        
        -- Crear una variante por cada talla
        foreach size_item in array prod.sizes
        loop
            insert into product_variants (product_id, size, stock)
            values (
                prod.id, 
                size_item, 
                -- Añadir el resto al primer tamaño
                case when first_size then stock_per_size + remainder else stock_per_size end
            )
            on conflict (product_id, size) do update set stock = excluded.stock;
            
            first_size := false;
        end loop;
    end loop;
end $$;

-- ============================================
-- 6. TRIGGER PARA SINCRONIZAR STOCK TOTAL
-- ============================================
create or replace function sync_product_total_stock()
returns trigger as $$
begin
    -- Actualizar el stock total del producto
    update products
    set stock = (
        select coalesce(sum(stock), 0) 
        from product_variants 
        where product_id = coalesce(new.product_id, old.product_id)
    ),
    updated_at = now()
    where id = coalesce(new.product_id, old.product_id);
    
    return coalesce(new, old);
end;
$$ language plpgsql security definer;

-- Trigger que se ejecuta al modificar variantes
drop trigger if exists sync_stock_on_variant_change on product_variants;
create trigger sync_stock_on_variant_change
    after insert or update or delete on product_variants
    for each row execute procedure sync_product_total_stock();

-- ============================================
-- 7. COMENTARIOS
-- ============================================
comment on table product_variants is 'Stock de productos por talla. Cada producto tiene múltiples variantes.';
comment on column product_variants.size is 'Talla del producto (S, M, L, XL, etc.)';
comment on column product_variants.stock is 'Cantidad disponible de esta talla';
comment on function decrease_stock_by_size is 'Reduce el stock de una talla específica de forma atómica';
comment on function get_product_stock_by_size is 'Obtiene el stock de todas las tallas de un producto';

-- ==========================================
-- FIN DE LA MIGRACIÓN
-- ==========================================
