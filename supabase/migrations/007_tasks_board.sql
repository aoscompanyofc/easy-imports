-- Quadro de Tarefas (estilo Trello/Kanban) — um blob JSON por usuário, mesmo
-- padrão do dashboard_layouts. Sem esta tabela, dataService cai no fallback
-- de localStorage — funciona no mesmo navegador, mas não sincroniza entre
-- dispositivos/membros da equipe.
CREATE TABLE IF NOT EXISTS public.tasks_board (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tasks      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks_board ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_board_all" ON public.tasks_board;
CREATE POLICY "tasks_board_all" ON public.tasks_board
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
