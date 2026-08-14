-- Campo "Observações" do cadastro de produto (Estoque) — existia no formulário mas
-- nunca era salvo porque a coluna não existia na tabela products.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS notes text;
