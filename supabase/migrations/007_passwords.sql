-- Cofre de senhas (Instagram, Facebook, OLX, sistemas internos etc).
--
-- Precisa ficar visível/editável tanto pelo dono da conta quanto pelos
-- colaboradores (team_members) — mas dono e colaborador são contas Supabase
-- Auth DISTINTAS (cada um com seu próprio auth.uid()). Por isso não dá pra
-- usar o padrão `user_id = auth.uid()` de outras tabelas (products, sales,
-- sellers...) aqui: isso isolaria cada login do resto da equipe. Em vez
-- disso, toda linha é dona do "owner_id" da equipe (resolvido via
-- team_members quando quem está logado é um colaborador), e a política usa
-- esse owner_id efetivo — dono e colaboradores autorizados enxergam e
-- editam o mesmo cofre compartilhado.
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

CREATE TABLE IF NOT EXISTS public.passwords (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid        NOT NULL DEFAULT public.effective_owner_id() REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  category        text        NOT NULL DEFAULT 'outro',
  username        text        DEFAULT '',
  password        text        NOT NULL,
  url             text        DEFAULT '',
  notes           text        DEFAULT '',
  favorite        boolean     NOT NULL DEFAULT false,
  created_by      uuid        NOT NULL DEFAULT auth.uid(),
  created_by_name text        DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "passwords_all" ON public.passwords;
CREATE POLICY "passwords_all" ON public.passwords
  USING (owner_id = public.effective_owner_id())
  WITH CHECK (owner_id = public.effective_owner_id());
