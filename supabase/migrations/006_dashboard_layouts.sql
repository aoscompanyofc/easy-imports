-- Layout personalizado do Dashboard (posição/tamanho dos cards) por usuário.
-- Sem esta tabela, dataService cai no fallback de localStorage — funciona no
-- mesmo navegador, mas não sincroniza entre dispositivos.
CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  layout     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_layouts_all" ON public.dashboard_layouts;
CREATE POLICY "dashboard_layouts_all" ON public.dashboard_layouts
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
