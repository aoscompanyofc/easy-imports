-- Compartilha entre dono e colaboradores (mesmo padrão do cofre de senhas,
-- ver 007_passwords.sql) as telas que hoje são "um bloco por login": dono e
-- funcionário têm contas Supabase Auth DISTINTAS, então tudo que era
-- guardado com `user_id = auth.uid()` ficava isolado por pessoa — o dono
-- criava uma tarefa e o funcionário simplesmente não via, e vice-versa.
--
-- effective_owner_id() resolve o "dono efetivo" de quem está logado: se for
-- o próprio dono, é o auth.uid() dele mesmo; se for um colaborador (achado
-- em team_members pelo e-mail), é o auth.uid() do dono. Assim toda a equipe
-- lê/grava a mesma linha, em vez de uma por conta.
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

-- Dashboard (cards personalizados)
ALTER TABLE public.dashboard_layouts ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "dashboard_layouts_all" ON public.dashboard_layouts;
CREATE POLICY "dashboard_layouts_all" ON public.dashboard_layouts
  USING (user_id = public.effective_owner_id())
  WITH CHECK (user_id = public.effective_owner_id());

-- Tarefas (quadro Kanban)
ALTER TABLE public.tasks_board ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "tasks_board_all" ON public.tasks_board;
CREATE POLICY "tasks_board_all" ON public.tasks_board
  USING (user_id = public.effective_owner_id())
  WITH CHECK (user_id = public.effective_owner_id());

-- Processos (documentação + metas)
ALTER TABLE public.processos_board ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "processos_board_all" ON public.processos_board;
CREATE POLICY "processos_board_all" ON public.processos_board
  USING (user_id = public.effective_owner_id())
  WITH CHECK (user_id = public.effective_owner_id());

-- Menu lateral (ordem/visibilidade)
ALTER TABLE public.nav_layout ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "nav_layout_all" ON public.nav_layout;
CREATE POLICY "nav_layout_all" ON public.nav_layout
  USING (user_id = public.effective_owner_id())
  WITH CHECK (user_id = public.effective_owner_id());

-- Notificações (atividade do sistema)
ALTER TABLE public.notifications_board ALTER COLUMN user_id SET DEFAULT public.effective_owner_id();
DROP POLICY IF EXISTS "notifications_board_all" ON public.notifications_board;
CREATE POLICY "notifications_board_all" ON public.notifications_board
  USING (user_id = public.effective_owner_id())
  WITH CHECK (user_id = public.effective_owner_id());
