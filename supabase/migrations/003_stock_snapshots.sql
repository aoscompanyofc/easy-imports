-- Snapshot diário do valor de estoque, usado para calcular a variação
-- exibida no Dashboard (valor agora vs. valor no início do dia).
-- Opcional: se esta tabela não existir, o app usa fallback em localStorage.
CREATE TABLE IF NOT EXISTS public.stock_snapshots (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date date        NOT NULL,
  value         numeric     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);

ALTER TABLE public.stock_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "stock_snapshots_all" ON public.stock_snapshots
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
