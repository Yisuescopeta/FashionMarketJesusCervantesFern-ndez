-- ==========================================
-- FASHIONMARKET PROFESSIONAL SECURE SCHEMA
-- ==========================================
-- NOTA: Este archivo está DEPRECADO.
-- Usa los archivos en la carpeta /database/ para:
--   - schema_completo.sql    -> Crear BD desde cero
--   - migracion_seguridad_v2.sql -> Actualizar BD existente
--   - crear_admin.sql        -> Crear usuarios admin
-- ==========================================

-- 1. EXTENSIONS & SCHEMA CLEANUP
create extension if not exists "uuid-ossp";

-- Drop existing if re-running
drop table if exists products cascade;
drop table if exists categories cascade;
drop table if exists profiles cascade;

-- 2. TABLES WITH CONSTRAINTS
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null check (char_length(name) >= 3),
  slug text not null unique check (slug ~* '^[a-z0-9-]+$'),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text default 'customer' check (role in ('admin', 'customer')),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null check (char_length(name) >= 3),
  slug text not null unique check (slug ~* '^[a-z0-9-]+$'),
  description text check (char_length(description) <= 1000),
  price integer not null check (price > 0),
  stock integer default 0 check (stock >= 0),
  category_id uuid references categories(id) on delete set null,
  images text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. SECURITY FUNCTIONS
-- Function to check if user is admin
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

-- 4. ROW LEVEL SECURITY (RLS)
alter table categories enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;

-- Policies: Profiles
create policy "Users can view their own profile" on profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on profiles
  for select using (is_admin());

create policy "Admins can update profiles" on profiles
  for update using (is_admin());

-- Policies: Categories
create policy "Public can read categories" on categories 
  for select using (true);

create policy "Admins can manage categories" on categories 
  for all using (is_admin());

-- Policies: Products
create policy "Public can read products" on products 
  for select using (true);

create policy "Admins can manage products" on products 
  for all using (is_admin());

-- 5. AUTOMATIC PROFILE CREATION
-- Trigger to create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. STORAGE BUCKET & POLICIES
-- Create bucket if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('products-images', 'products-images', true)
on conflict (id) do nothing;

-- Strict Storage Policies
create policy "Public Read Access"
  on storage.objects for select
  using ( bucket_id = 'products-images' );

create policy "Admin Upload Access"
  on storage.objects for insert
  with check ( 
    bucket_id = 'products-images' 
    AND is_admin() 
  );

create policy "Admin Update/Delete Access"
  on storage.objects for all
  using ( 
    bucket_id = 'products-images' 
    AND is_admin() 
  );

-- 7. PROFESSIONAL SEED DATA
insert into categories (name, slug) values 
('Sastrería Premium', 'sastreria-premium'),
('Calzado Artesanal', 'calzado-artesanal'),
('Accesorios de Lujo', 'accesorios-lujo'),
('Camisería Fina', 'camiseria-fina');
