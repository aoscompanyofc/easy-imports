-- Central de notificações (atividade do sistema: vendas, trocas, clientes,
-- tarefas) — mesmo padrão do dashboard_layouts: um blob JSON por usuário.
-- Sem esta tabela, dataService cai no fallback de localStorage.
CREATE TABLE IF NOT EXISTS public.notifications_board (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  items      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications_board ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_board_all" ON public.notifications_board;
CREATE POLICY "notifications_board_all" ON public.notifications_board
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
