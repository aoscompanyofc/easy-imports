import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SignaturePad } from '../components/ui/SignaturePad';
import { CheckCircle2, Loader2, FileText, AlertTriangle } from 'lucide-react';

const fmt = (v?: string | null) => v || '—';
const fmtVal = (v?: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const Assinar: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signature, setSignature] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    supabase
      .from('sales')
      .select('*')
      .eq('sign_token', token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); }
        else {
          setSale(data);
          if (data.signature_client) setAlreadySigned(true);
        }
        setLoading(false);
      });
  }, [token]);

  const handleSign = async () => {
    if (!signature) { alert('Por favor, assine no campo acima antes de confirmar.'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('sales')
      .update({ signature_client: signature })
      .eq('sign_token', token!);
    setSaving(false);
    if (error) { alert('Erro ao salvar assinatura. Tente novamente.'); return; }
    setDone(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 size={32} className="animate-spin text-neutral-400" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-50 px-4">
        <AlertTriangle size={48} className="text-amber-400" />
        <h1 className="text-xl font-bold text-neutral-800">Link inválido ou expirado</h1>
        <p className="text-neutral-500 text-center">Este link de assinatura não foi encontrado.</p>
      </div>
    );
  }

  if (done || alreadySigned) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-50 px-4">
        <CheckCircle2 size={56} className="text-green-500" />
        <h1 className="text-2xl font-bold text-neutral-800">
          {done ? 'Assinatura confirmada!' : 'Documento já assinado'}
        </h1>
        <p className="text-neutral-500 text-center max-w-sm">
          {done
            ? 'Seu documento foi assinado com sucesso. Guarde este número para referência:'
            : 'Este documento já foi assinado anteriormente.'}
        </p>
        <div className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-mono font-bold text-lg">
          {sale?.sale_number || `#${sale?.id?.slice(0, 6).toUpperCase()}`}
        </div>
      </div>
    );
  }

  const typeLabel = sale.sale_type === 'compra' ? 'Compra de Produto Usado'
    : sale.sale_type === 'troca' ? 'Documento de Troca'
    : 'Recibo de Venda';

  const installmentText = sale.installments > 1
    ? `Cartão de Crédito — ${sale.installments}x de ${fmtVal(sale.total_amount / sale.installments)}`
    : sale.payment_method;

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center mx-auto mb-3">
            <FileText size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-neutral-900">Assinatura Digital</h1>
          <p className="text-neutral-500 text-sm">{typeLabel}</p>
          <div className="inline-block px-3 py-1 bg-neutral-900 text-white rounded-full font-mono font-bold text-sm mt-1">
            {sale.sale_number || `#${sale.id?.slice(0, 6).toUpperCase()}`}
          </div>
        </div>

        {/* Document summary */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
          <div className="bg-neutral-900 text-white px-4 py-3">
            <p className="font-bold text-sm uppercase tracking-wider">Resumo do Documento</p>
          </div>
          <div className="divide-y divide-neutral-100">
            {[
              ['Produto', sale.product_name],
              sale.product_imei && ['IMEI', sale.product_imei],
              sale.product_condition && ['Condição', sale.product_condition],
              ['Valor', fmtVal(Number(sale.total_amount))],
              ['Pagamento', installmentText],
              ['Data', new Date(sale.created_at).toLocaleDateString('pt-BR')],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label as string} className="flex items-start gap-3 px-4 py-3">
                <span className="text-xs text-neutral-400 uppercase font-bold w-24 flex-shrink-0 mt-0.5">{label}</span>
                <span className="text-sm text-neutral-800 font-medium">{fmt(value as string)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signature section */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
          <div className="bg-neutral-900 text-white px-4 py-3">
            <p className="font-bold text-sm uppercase tracking-wider">Sua Assinatura</p>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-neutral-600">
              Ao assinar abaixo, você confirma que está de acordo com os termos do documento acima.
            </p>
            <SignaturePad
              value={signature}
              onChange={setSignature}
              height={150}
              placeholder="Desenhe sua assinatura aqui com o dedo ou mouse"
            />
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={handleSign}
          disabled={saving || !signature}
          className="w-full py-4 rounded-2xl font-bold text-base bg-neutral-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
          {saving ? 'Salvando...' : 'Confirmar Assinatura'}
        </button>

        <p className="text-center text-xs text-neutral-400">
          Powered by Easy Imports — Sistema de Gestão
        </p>
      </div>
    </div>
  );
};
