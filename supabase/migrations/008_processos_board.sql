-- Página de Processos (documentação de processos + metas de métricas) — mesmo
-- padrão do dashboard_layouts/tasks_board: um blob JSON por usuário. Sem esta
-- tabela, dataService cai no fallback de localStorage.
CREATE TABLE IF NOT EXISTS public.processos_board (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb       NOT NULL DEFAULT '{"processes":[],"goals":[]}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processos_board ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "processos_board_all" ON public.processos_board;
CREATE POLICY "processos_board_all" ON public.processos_board
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
