-- Easy Imports — Schema SaaS completo
-- Execute no Supabase: Dashboard → SQL Editor → New query → Cole tudo e clique em Run
-- Se já rodou a v1 (001_initial_schema), execute apenas a partir de "ALTER TABLE" abaixo.

-- ══════════════════════════════════════════════════════════════
-- 1. TABELAS EXISTENTES — adiciona colunas faltando (IF NOT EXISTS)
-- ══════════════════════════════════════════════════════════════

-- products: colunas extras usadas pelo sistema
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS imei               text,
  ADD COLUMN IF NOT EXISTS supplier_id        uuid,
  ADD COLUMN IF NOT EXISTS product_capacity   text,
  ADD COLUMN IF NOT EXISTS product_color      text,
  ADD COLUMN IF NOT EXISTS product_condition  text,
  ADD COLUMN IF NOT EXISTS product_warranty   text,
  ADD COLUMN IF NOT EXISTS product_origin     text,
  ADD COLUMN IF NOT EXISTS entry_date         date;

-- customers: CPF, cidade, origem e aniversário
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS cpf       text,
  ADD COLUMN IF NOT EXISTS city      text,
  ADD COLUMN IF NOT EXISTS source    text,
  ADD COLUMN IF NOT EXISTS birthday  date,
  ADD COLUMN IF NOT EXISTS notes     text;

-- leads: tags e acompanhamento
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tags            jsonb   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS follow_up_date  date,
  ADD COLUMN IF NOT EXISTS position        integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_budget  numeric;

-- transactions: data separada de created_at
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS sale_id    uuid,
  ADD COLUMN IF NOT EXISTS tag        text;

-- sales: schema completo para todos os tipos de operação
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS sale_number          text,
  ADD COLUMN IF NOT EXISTS sale_type            text    DEFAULT 'sale',
  ADD COLUMN IF NOT EXISTS installments         integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installments_json    text,
  ADD COLUMN IF NOT EXISTS outgoing_items_json  text,
  ADD COLUMN IF NOT EXISTS incoming_devices_json text,
  ADD COLUMN IF NOT EXISTS sign_token           text    DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS pdf_type             text,
  ADD COLUMN IF NOT EXISTS revision             integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signature_client     text,
  -- dados do vendedor responsável
  ADD COLUMN IF NOT EXISTS seller_id            uuid,
  ADD COLUMN IF NOT EXISTS seller_display_name  text,
  ADD COLUMN IF NOT EXISTS seller_name          text,
  ADD COLUMN IF NOT EXISTS seller_cpf           text,
  ADD COLUMN IF NOT EXISTS seller_rg            text,
  ADD COLUMN IF NOT EXISTS seller_phone         text,
  ADD COLUMN IF NOT EXISTS seller_address       text,
  ADD COLUMN IF NOT EXISTS seller_email         text,
  -- dados extras do cliente
  ADD COLUMN IF NOT EXISTS customer_phone       text,
  ADD COLUMN IF NOT EXISTS customer_cpf         text,
  ADD COLUMN IF NOT EXISTS customer_city        text,
  -- dados do produto
  ADD COLUMN IF NOT EXISTS product_capacity     text,
  ADD COLUMN IF NOT EXISTS product_color        text,
  ADD COLUMN IF NOT EXISTS product_condition    text,
  ADD COLUMN IF NOT EXISTS product_imei         text,
  ADD COLUMN IF NOT EXISTS product_accessories  text,
  -- dados de troca (aparelho recebido — legado single)
  ADD COLUMN IF NOT EXISTS incoming_name        text,
  ADD COLUMN IF NOT EXISTS incoming_imei        text,
  ADD COLUMN IF NOT EXISTS incoming_serial      text,
  ADD COLUMN IF NOT EXISTS incoming_email       text,
  ADD COLUMN IF NOT EXISTS incoming_capacity    text,
  ADD COLUMN IF NOT EXISTS incoming_color       text,
  ADD COLUMN IF NOT EXISTS incoming_condition   text,
  ADD COLUMN IF NOT EXISTS incoming_battery_health text,
  ADD COLUMN IF NOT EXISTS incoming_purchase_price numeric;

-- documents: estrutura atualizada (title/category/file_url no lugar de name/type/content)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS title      text,
  ADD COLUMN IF NOT EXISTS category   text,
  ADD COLUMN IF NOT EXISTS file_url   text;

-- ══════════════════════════════════════════════════════════════
-- 2. NOVAS TABELAS
-- ══════════════════════════════════════════════════════════════

-- ── SELLERS (Vendedores da loja) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.sellers (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  role         text,
  monthly_goal numeric     DEFAULT 0,
  color        text        DEFAULT '#FFC107',
  active       boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "sellers_select" ON public.sellers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "sellers_insert" ON public.sellers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "sellers_update" ON public.sellers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "sellers_delete" ON public.sellers FOR DELETE USING (user_id = auth.uid());

-- ── TEAM MEMBERS (Colaboradores com acesso ao sistema) ──────
CREATE TABLE IF NOT EXISTS public.team_members (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  email         text        NOT NULL,
  role          text        NOT NULL DEFAULT 'vendedor',
  allowed_pages jsonb       NOT NULL DEFAULT '["dashboard","vendas","estoque","clientes","leads"]',
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
-- Owner gerencia os membros; membros podem ler a própria linha
CREATE POLICY IF NOT EXISTS "team_members_owner_all" ON public.team_members
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY IF NOT EXISTS "team_members_self_select" ON public.team_members
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ── USER PROFILES (Perfil/empresa de cada conta) ────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text,
  cargo       text        DEFAULT 'Administrador',
  telefone    text,
  avatar      text,
  cnpj        text,
  signature   text,
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "user_profiles_select" ON public.user_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY IF NOT EXISTS "user_profiles_insert" ON public.user_profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY IF NOT EXISTS "user_profiles_update" ON public.user_profiles FOR UPDATE USING (id = auth.uid());

-- Cria perfil automaticamente ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ══════════════════════════════════════════════════════════════
-- 3. ÍNDICES para performance
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_sales_user_id       ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at    ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_sale_number   ON public.sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_products_user_id    ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id   ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id       ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date   ON public.transactions(date DESC);
