-- Easy Imports — Schema inicial
-- Execute no Supabase: Dashboard → SQL Editor → New query → Cole e clique em Run

-- ── PRODUCTS ──────────────────────────────────────────────────
CREATE TABLE public.products (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  category       text,
  brand          text,
  model          text,
  sku            text,
  color          text,
  storage        text,
  description    text,
  purchase_price numeric     NOT NULL DEFAULT 0,
  sale_price     numeric     NOT NULL DEFAULT 0,
  stock_quantity integer     NOT NULL DEFAULT 0,
  min_stock      integer              DEFAULT 5,
  status         text        NOT NULL DEFAULT 'available',
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select" ON public.products FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "products_insert" ON public.products FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "products_update" ON public.products FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "products_delete" ON public.products FOR DELETE USING (user_id = auth.uid());

-- ── CUSTOMERS ─────────────────────────────────────────────────
CREATE TABLE public.customers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  email      text,
  phone      text,
  address    text,
  type       text                 DEFAULT 'individual',
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_select" ON public.customers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "customers_insert" ON public.customers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "customers_update" ON public.customers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "customers_delete" ON public.customers FOR DELETE USING (user_id = auth.uid());

-- ── SALES ─────────────────────────────────────────────────────
CREATE TABLE public.sales (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id    uuid                 REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name  text,
  product_name   text,
  total_amount   numeric     NOT NULL DEFAULT 0,
  payment_method text,
  status         text        NOT NULL DEFAULT 'completed',
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_select" ON public.sales FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "sales_insert" ON public.sales FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "sales_update" ON public.sales FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "sales_delete" ON public.sales FOR DELETE USING (user_id = auth.uid());

-- ── SALE ITEMS ────────────────────────────────────────────────
CREATE TABLE public.sale_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sale_id    uuid                 REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid                 REFERENCES public.products(id) ON DELETE SET NULL,
  quantity   integer     NOT NULL DEFAULT 1,
  unit_price numeric     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "sale_items_delete" ON public.sale_items FOR DELETE USING (user_id = auth.uid());

-- ── LEADS ─────────────────────────────────────────────────────
CREATE TABLE public.leads (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  email            text,
  phone            text,
  product_interest text,
  status           text        NOT NULL DEFAULT 'new',
  source           text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_select" ON public.leads FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "leads_insert" ON public.leads FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "leads_update" ON public.leads FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "leads_delete" ON public.leads FOR DELETE USING (user_id = auth.uid());

-- ── TRANSACTIONS ──────────────────────────────────────────────
CREATE TABLE public.transactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  description text        NOT NULL,
  amount      numeric     NOT NULL DEFAULT 0,
  type        text        NOT NULL,
  category    text,
  date        timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE USING (user_id = auth.uid());

-- ── SUPPLIERS ─────────────────────────────────────────────────
CREATE TABLE public.suppliers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  email      text,
  phone      text,
  address    text,
  category   text,
  contact    text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE USING (user_id = auth.uid());

-- ── CAMPAIGNS ─────────────────────────────────────────────────
CREATE TABLE public.campaigns (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  channel         text,
  budget          numeric              DEFAULT 0,
  status          text        NOT NULL DEFAULT 'active',
  start_date      date,
  end_date        date,
  target_audience text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_select" ON public.campaigns FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "campaigns_insert" ON public.campaigns FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "campaigns_update" ON public.campaigns FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "campaigns_delete" ON public.campaigns FOR DELETE USING (user_id = auth.uid());

-- ── DOCUMENTS ─────────────────────────────────────────────────
CREATE TABLE public.documents (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  type       text,
  content    text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select" ON public.documents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "documents_insert" ON public.documents FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "documents_update" ON public.documents FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "documents_delete" ON public.documents FOR DELETE USING (user_id = auth.uid());
