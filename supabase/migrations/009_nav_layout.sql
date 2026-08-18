-- Ordem personalizada dos itens do menu lateral — mesmo padrão do
-- dashboard_layouts: um blob JSON por usuário. Sem esta tabela,
-- dataService cai no fallback de localStorage.
CREATE TABLE IF NOT EXISTS public.nav_layout (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  order_list jsonb       NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nav_layout ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nav_layout_all" ON public.nav_layout;
CREATE POLICY "nav_layout_all" ON public.nav_layout
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
