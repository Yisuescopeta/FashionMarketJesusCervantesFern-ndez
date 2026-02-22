-- Tabla para las suscripciones de informes automáticos de administradores
-- Fecha: 2026-02-17

CREATE TABLE IF NOT EXISTS public.admin_report_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  enabled boolean DEFAULT true,
  -- Tipos de informes
  report_sales boolean DEFAULT true,
  report_new_customers boolean DEFAULT true,
  report_returns boolean DEFAULT true,
  report_low_stock boolean DEFAULT true,
  report_top_products boolean DEFAULT true,
  -- Programación
  send_hour integer DEFAULT 8 CHECK (send_hour >= 0 AND send_hour <= 23),
  send_minute integer DEFAULT 0 CHECK (send_minute >= 0 AND send_minute <= 59),
  frequency_days integer DEFAULT 1 CHECK (frequency_days >= 1 AND frequency_days <= 30),
  last_sent_at timestamptz,
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT admin_report_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT admin_report_subscriptions_admin_unique UNIQUE (admin_user_id),
  CONSTRAINT admin_report_subscriptions_admin_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id)
);

-- RLS: solo el propio admin puede ver/modificar sus preferencias
ALTER TABLE public.admin_report_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own subscriptions"
  ON public.admin_report_subscriptions FOR SELECT
  USING (admin_user_id = auth.uid());

CREATE POLICY "Admins can insert own subscriptions"
  ON public.admin_report_subscriptions FOR INSERT
  WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Admins can update own subscriptions"
  ON public.admin_report_subscriptions FOR UPDATE
  USING (admin_user_id = auth.uid());

-- Service role bypasses RLS for cron/automated sends
