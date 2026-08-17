-- Flag "Anunciado" (OLX) do Estoque — liga/desliga visual por produto indicando se o
-- aparelho está com anúncio ativo. Existia a necessidade mas nunca houve coluna para isso.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_advertised boolean DEFAULT false;
