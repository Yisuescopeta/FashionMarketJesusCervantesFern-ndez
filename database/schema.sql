-- Esquema completo de la base de datos Aurum
-- Fecha: 2026-01-27

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL CHECK (char_length(name) >= 3),
  slug text NOT NULL UNIQUE CHECK (slug ~* '^[a-z0-9-]+$'::text),
  description text,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL CHECK (char_length(name) >= 3),
  slug text NOT NULL UNIQUE CHECK (slug ~* '^[a-z0-9-]+$'::text),
  description text CHECK (char_length(description) <= 2000),
  price integer NOT NULL CHECK (price > 0),
  compare_at_price integer,
  stock integer DEFAULT 0 CHECK (stock >= 0),
  sku text UNIQUE,
  category_id uuid,
  images text[] DEFAULT '{}'::text[],
  colors text[] DEFAULT '{}'::text[],
  material text,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  is_on_sale boolean DEFAULT false,
  sale_price integer,
  sale_started_at timestamp with time zone,
  sizes jsonb,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  role text DEFAULT 'customer'::text CHECK (role = ANY (ARRAY['admin'::text, 'customer'::text])),
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  stripe_session_id text UNIQUE,
  customer_email text,
  total_amount integer,
  status text DEFAULT 'paid'::text CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'confirmed'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text])),
  shipping_address text DEFAULT 'No especificada'::text,
  shipping_city text DEFAULT 'No especificada'::text,
  shipping_postal_code text DEFAULT '00000'::text,
  shipping_phone text,
  notes text,
  tracking_number text,
  carrier text,
  estimated_delivery timestamp with time zone,
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  refund_status text CHECK (refund_status = ANY (ARRAY[NULL::text, 'pending'::text, 'completed'::text, 'failed'::text])),
  refunded_at timestamp with time zone,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  product_name text,
  quantity integer,
  price_at_purchase integer,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT favorites_pkey PRIMARY KEY (id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.notification_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  notification_type character varying NOT NULL DEFAULT 'favorite_on_sale'::character varying,
  sent_at timestamp with time zone DEFAULT now(),
  email_sent_to character varying,
  CONSTRAINT notification_history_pkey PRIMARY KEY (id),
  CONSTRAINT notification_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT notification_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.order_status_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL,
  size text NOT NULL,
  stock integer DEFAULT 0 CHECK (stock >= 0),
  sku_variant text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.site_settings (
  id text NOT NULL DEFAULT 'main'::text,
  show_flash_sales boolean DEFAULT false,
  flash_sales_title text DEFAULT 'Ofertas Flash'::text,
  flash_sales_subtitle text DEFAULT 'Descuentos por tiempo limitado'::text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_by uuid,
  CONSTRAINT site_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  favorites_on_sale boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
