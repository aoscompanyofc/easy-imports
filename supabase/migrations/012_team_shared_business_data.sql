-- Continuação de 011_team_shared_boards.sql: aplica o mesmo owner efetivo
-- (dono + colaboradores enxergam/editam os MESMOS dados) para todos os
-- dados de negócio — Estoque, Vendas, Clientes, Fornecedores, Vendedores,
-- Leads, Financeiro, Marketing e Documentação. Sem isso, um colaborador
-- logado com a própria conta não via NADA disso — nem os produtos, nem os
-- clientes, nem as vendas do dono, porque cada linha só era visível pra
-- quem literalmente a criou.
--
-- team_members (gestão de colaboradores) e user_profiles (nome/avatar de
-- cada pessoa) ficam DE FORA de propósito: são dados de identidade
-- pessoal/administração da equipe, não dados do negócio, e não devem virar
-- compartilhados (um colaborador não deve conseguir gerenciar outros
-- colaboradores, por exemplo).
CREATE OR REPLACE FUNCTION public.effective_owner_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.team_members WHERE email = auth.email() LIMIT 1),
    auth.uid()
  );
$$;

-- Products (Estoque)
ALTER TABLE public.products ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_select" ON public.products FOR SELECT USING (user_id = public.effective_owner_id());
CREATE POLICY "products_insert" ON public.products FOR INSERT WITH CHECK (user_id = public.effective_owner_id());
CREATE POLICY "products_update" ON public.products FOR UPDATE USING (user_id = public.effective_owner_id());
CREATE POLICY "products_delete" ON public.products FOR DELETE USING (user_id = public.effective_owner_id());

-- Customers (Clientes)
ALTER TABLE public.customers ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT USING (user_id = public.effective_owner_id());
CREATE POLICY "customers_insert" ON public.customers FOR INSERT WITH CHECK (user_id = public.effective_owner_id());
CREATE POLICY "customers_update" ON public.customers FOR UPDATE USING (user_id = public.effective_owner_id());
CREATE POLICY "customers_delete" ON public.customers FOR DELETE USING (user_id = public.effective_owner_id());

-- Sales (Vendas)
ALTER TABLE public.sales ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "sales_select" ON public.sales;
DROP POLICY IF EXISTS "sales_insert" ON public.sales;
DROP POLICY IF EXISTS "sales_update" ON public.sales;
DROP POLICY IF EXISTS "sales_delete" ON public.sales;
CREATE POLICY "sales_select" ON public.sales FOR SELECT USING (user_id = public.effective_owner_id());
CREATE POLICY "sales_insert" ON public.sales FOR INSERT WITH CHECK (user_id = public.effective_owner_id());
CREATE POLICY "sales_update" ON public.sales FOR UPDATE USING (user_id = public.effective_owner_id());
CREATE POLICY "sales_delete" ON public.sales FOR DELETE USING (user_id = public.effective_owner_id());

-- Sale items (itens de venda)
ALTER TABLE public.sale_items ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "sale_items_select" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_insert" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_delete" ON public.sale_items;
CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT USING (user_id = public.effective_owner_id());
CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT WITH CHECK (user_id = public.effective_owner_id());
CREATE POLICY "sale_items_delete" ON public.sale_items FOR DELETE USING (user_id = public.effective_owner_id());

-- Leads
ALTER TABLE public.leads ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "leads_select" ON public.leads;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;
DROP POLICY IF EXISTS "leads_delete" ON public.leads;
CREATE POLICY "leads_select" ON public.leads FOR SELECT USING (user_id = public.effective_owner_id());
CREATE POLICY "leads_insert" ON public.leads FOR INSERT WITH CHECK (user_id = public.effective_owner_id());
CREATE POLICY "leads_update" ON public.leads FOR UPDATE USING (user_id = public.effective_owner_id());
CREATE POLICY "leads_delete" ON public.leads FOR DELETE USING (user_id = public.effective_owner_id());

-- Transactions (Financeiro)
ALTER TABLE public.transactions ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete" ON public.transactions;
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (user_id = public.effective_owner_id());
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT WITH CHECK (user_id = public.effective_owner_id());
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE USING (user_id = public.effective_owner_id());
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE USING (user_id = public.effective_owner_id());

-- Suppliers (Fornecedores)
ALTER TABLE public.suppliers ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_delete" ON public.suppliers;
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT USING (user_id = public.effective_owner_id());
CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT WITH CHECK (user_id = public.effective_owner_id());
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE USING (user_id = public.effective_owner_id());
CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE USING (user_id = public.effective_owner_id());

-- Campaigns (Marketing)
ALTER TABLE public.campaigns ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "campaigns_select" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_insert" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_update" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_delete" ON public.campaigns;
CREATE POLICY "campaigns_select" ON public.campaigns FOR SELECT USING (user_id = public.effective_owner_id());
CREATE POLICY "campaigns_insert" ON public.campaigns FOR INSERT WITH CHECK (user_id = public.effective_owner_id());
CREATE POLICY "campaigns_update" ON public.campaigns FOR UPDATE USING (user_id = public.effective_owner_id());
CREATE POLICY "campaigns_delete" ON public.campaigns FOR DELETE USING (user_id = public.effective_owner_id());

-- Documents (Documentação)
ALTER TABLE public.documents ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;
CREATE POLICY "documents_select" ON public.documents FOR SELECT USING (user_id = public.effective_owner_id());
CREATE POLICY "documents_insert" ON public.documents FOR INSERT WITH CHECK (user_id = public.effective_owner_id());
CREATE POLICY "documents_update" ON public.documents FOR UPDATE USING (user_id = public.effective_owner_id());
CREATE POLICY "documents_delete" ON public.documents FOR DELETE USING (user_id = public.effective_owner_id());

-- Sellers (Vendedores — cadastro usado pra atribuição de vendas)
ALTER TABLE public.sellers ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "sellers_select" ON public.sellers;
DROP POLICY IF EXISTS "sellers_insert" ON public.sellers;
DROP POLICY IF EXISTS "sellers_update" ON public.sellers;
DROP POLICY IF EXISTS "sellers_delete" ON public.sellers;
CREATE POLICY "sellers_select" ON public.sellers FOR SELECT USING (user_id = public.effective_owner_id());
CREATE POLICY "sellers_insert" ON public.sellers FOR INSERT WITH CHECK (user_id = public.effective_owner_id());
CREATE POLICY "sellers_update" ON public.sellers FOR UPDATE USING (user_id = public.effective_owner_id());
CREATE POLICY "sellers_delete" ON public.sellers FOR DELETE USING (user_id = public.effective_owner_id());

-- Stock snapshots (valor de estoque por dia, usado no Dashboard)
ALTER TABLE public.stock_snapshots ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "stock_snapshots_all" ON public.stock_snapshots;
CREATE POLICY "stock_snapshots_all" ON public.stock_snapshots
  USING (user_id = public.effective_owner_id())
  WITH CHECK (user_id = public.effective_owner_id());
