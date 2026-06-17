import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy, Check, Send, Truck, User, MapPin, Clock, RotateCcw, Package,
  RefreshCw, AlertTriangle, Store, CheckCircle2, CreditCard, DollarSign,
  Smartphone, Calendar, CalendarClock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SaleMsgData, DeliveryInfo, emptyDelivery, CHARGE_MODES,
  buildClientMessage, buildMotoboyMessage, buildCollectionMessage, waLink,
} from '../lib/logisticsMessages';

// Sugere a cobrança inicial a partir do tipo de venda e forma de pagamento
function inferChargeMode(paymentMethod: string, sale: SaleMsgData): DeliveryInfo['chargeMode'] {
  if (sale.saleType === 'compra') return 'dinheiro';
  if (sale.saleType === 'prazo') {
    return sale.entradaAmount && sale.entradaAmount > 0 ? 'aguardar_pix' : 'pago';
  }
  if (sale.saleType === 'troca') {
    if (!sale.cashReceived || sale.cashReceived === 0) return 'pago';
    const p = (paymentMethod || '').toLowerCase();
    if (p.includes('pix')) return 'aguardar_pix';
    if (p.includes('dinheiro')) return 'dinheiro';
    if (p.includes('cartão') || p.includes('cartao') || p.includes('crédito') || p.includes('débito')) return 'maquininha';
    return 'aguardar_pix';
  }
  const p = (paymentMethod || '').toLowerCase();
  if (p.includes('pix')) return 'aguardar_pix';
  if (p.includes('dinheiro')) return 'dinheiro';
  if (p.includes('cartão') || p.includes('cartao') || p.includes('crédito') || p.includes('débito')) return 'maquininha';
  return 'pago';
}

// Ícone branded para cada modo de cobrança (Lucide — identidade Easy Imports)
function ChargeModeIcon({ id, size = 14, className = '' }: { id: DeliveryInfo['chargeMode']; size?: number; className?: string }) {
  switch (id) {
    case 'pago':         return <CheckCircle2 size={size} className={className} />;
    case 'aguardar_pix': return <Smartphone   size={size} className={className} />;
    case 'maquininha':   return <CreditCard   size={size} className={className} />;
    case 'dinheiro':     return <DollarSign   size={size} className={className} />;
  }
}

const PICKUP_KEY = 'easy-imports-last-pickup';
const LOGISTICS_KEY = (saleNumber: string) => `easy-imports-logistics-${saleNumber}`;
const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface SavedLogistics {
  delivery: DeliveryInfo;
  clientMsg: string;
  motoboyMsg: string;
  collectionMsg: string;
  savedAt: string;
}

function loadSavedLogistics(saleNumber: string): SavedLogistics | null {
  if (!saleNumber) return null;
  try {
    const raw = localStorage.getItem(LOGISTICS_KEY(saleNumber));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLogistics(saleNumber: string, data: SavedLogistics) {
  if (!saleNumber) return;
  try { localStorage.setItem(LOGISTICS_KEY(saleNumber), JSON.stringify(data)); } catch {}
}

const inputCls =
  'w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all';
const labelCls = 'block text-[11px] font-bold text-neutral-500 mb-1 uppercase tracking-wide';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }
}

const MessageCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  accent: string;
  value: string;
  onChange: (v: string) => void;
  onRegenerate: () => void;
  onAction?: () => void;
  waHref: string;
  waLabel: string;
}> = ({ title, icon, accent, value, onChange, onRegenerate, onAction, waHref, waLabel }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-neutral-200 overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-2.5 ${accent}`}>
        <div className="flex items-center gap-2 font-bold text-sm">{icon}{title}</div>
        <button
          type="button"
          onClick={onRegenerate}
          title="Gerar novamente a partir dos campos"
          className="flex items-center gap-1 text-[11px] font-bold opacity-80 hover:opacity-100 transition-opacity"
        >
          <RotateCcw size={12} /> Regerar
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.min(16, Math.max(6, value.split('\n').length + 1))}
        className="w-full px-4 py-3 text-sm font-mono leading-relaxed outline-none resize-y bg-white text-neutral-800"
      />
      <div className="flex items-center gap-2 p-3 border-t border-neutral-100 bg-neutral-50">
        <button
          type="button"
          onClick={async () => {
            const ok = await copyText(value);
            if (ok) {
              setCopied(true);
              toast.success('Mensagem copiada!');
              setTimeout(() => setCopied(false), 1800);
              onAction?.();
            } else toast.error('Não foi possível copiar');
          }}
          className="flex-1 flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-neutral-800 transition-colors"
        >
          {copied ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar</>}
        </button>
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          onClick={onAction}
          className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold text-sm py-2.5 rounded-xl hover:brightness-95 transition-all"
        >
          <Send size={16} /> {waLabel}
        </a>
      </div>
    </div>
  );
};

export const PostSaleLogistics: React.FC<{ sale: SaleMsgData; defaultAddress?: string }> = ({ sale, defaultAddress }) => {
  // Carrega estado salvo ou constrói o inicial
  const [delivery, setDelivery] = useState<DeliveryInfo>(() => {
    const saved = loadSavedLogistics(sale.saleNumber);
    if (saved?.delivery) return saved.delivery;
    return {
      ...emptyDelivery(),
      deliveryAddress: defaultAddress || '',
      recipient: sale.customerName || '',
      pickupLocation: localStorage.getItem(PICKUP_KEY) || '',
      chargeMode: inferChargeMode(sale.paymentMethod, sale),
      chargeBreakdown: sale.saleChargeBreakdown ?? [],
      deferCollection: sale.saleType === 'troca',
    };
  });

  const generatedClient     = useMemo(() => buildClientMessage(sale, delivery), [sale, delivery]);
  const generatedMotoboy    = useMemo(() => buildMotoboyMessage(sale, delivery), [sale, delivery]);
  const generatedCollection = useMemo(() => buildCollectionMessage(sale, delivery), [sale, delivery]);

  const saved = useMemo(() => loadSavedLogistics(sale.saleNumber), [sale.saleNumber]);

  const [clientMsg, setClientMsg]         = useState(() => saved?.clientMsg     || generatedClient);
  const [motoboyMsg, setMotoboyMsg]       = useState(() => saved?.motoboyMsg    || generatedMotoboy);
  const [collectionMsg, setCollectionMsg] = useState(() => saved?.collectionMsg || generatedCollection);
  const [clientEdited, setClientEdited]     = useState(!!saved?.clientMsg);
  const [motoboyEdited, setMotoboyEdited]   = useState(!!saved?.motoboyMsg);
  const [collectionEdited, setCollectionEdited] = useState(!!saved?.collectionMsg);

  useEffect(() => { if (!clientEdited)     setClientMsg(generatedClient);         }, [generatedClient, clientEdited]);
  useEffect(() => { if (!motoboyEdited)    setMotoboyMsg(generatedMotoboy);       }, [generatedMotoboy, motoboyEdited]);
  useEffect(() => { if (!collectionEdited) setCollectionMsg(generatedCollection); }, [generatedCollection, collectionEdited]);

  const set = (k: keyof DeliveryInfo) => (v: any) => setDelivery((d) => ({ ...d, [k]: v }));

  const persistPickup = () => {
    if (delivery.pickupLocation.trim()) localStorage.setItem(PICKUP_KEY, delivery.pickupLocation.trim());
  };

  // Salva estado completo (delivery + mensagens finais)
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback((d: DeliveryInfo, cm: string, mm: string, colm: string) => {
    if (!sale.saleNumber) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      saveLogistics(sale.saleNumber, {
        delivery: d,
        clientMsg: cm,
        motoboyMsg: mm,
        collectionMsg: colm,
        savedAt: new Date().toISOString(),
      });
    }, 600);
  }, [sale.saleNumber]);

  // Auto-salva sempre que delivery ou mensagens mudam
  useEffect(() => {
    persist(delivery, clientMsg, motoboyMsg, collectionMsg);
  }, [delivery, clientMsg, motoboyMsg, collectionMsg, persist]);

  // Aparelhos a recolher (troca)
  const collectDevices =
    sale.incomingDevices?.length
      ? sale.incomingDevices
      : sale.incomingName
        ? [{ model: sale.incomingName, value: sale.incomingValue || 0 }]
        : [];

  return (
    <div className="space-y-4">

      {/* ── Banner de troca — 3 passos (ícones branded) ── */}
      {sale.saleType === 'troca' && (
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
          <p className="text-xs font-black text-neutral-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <RefreshCw size={13} /> Corrida de Troca
          </p>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Passo 1 */}
            <div className="bg-white rounded-xl p-2.5 border border-neutral-100 flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center">
                <Store size={15} className="text-primary" />
              </div>
              <p className="text-[10px] font-black text-neutral-700">1. Coleta</p>
              <p className="text-[10px] text-neutral-400">Busca na loja</p>
            </div>
            {/* Passo 2 */}
            <div className="bg-white rounded-xl p-2.5 border border-neutral-100 flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center">
                <Package size={15} className="text-primary" />
              </div>
              <p className="text-[10px] font-black text-neutral-700">2. Entrega</p>
              <p className="text-[10px] text-neutral-400">Leva pro cliente</p>
            </div>
            {/* Passo 3 — diferente se adiado */}
            <div className={`rounded-xl p-2.5 border flex flex-col items-center gap-1 ${delivery.deferCollection ? 'bg-blue-50 border-blue-200' : 'bg-primary/10 border-primary/30'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${delivery.deferCollection ? 'bg-blue-600' : 'bg-primary'}`}>
                {delivery.deferCollection
                  ? <CalendarClock size={15} className="text-white" />
                  : <RefreshCw size={15} className="text-neutral-900" />
                }
              </div>
              <p className={`text-[10px] font-black ${delivery.deferCollection ? 'text-blue-700' : 'text-primary-700'}`}>
                3. Busca
              </p>
              <p className={`text-[10px] ${delivery.deferCollection ? 'text-blue-500' : 'text-primary-600'}`}>
                {delivery.deferCollection ? 'Outra data' : 'Mesma corrida'}
              </p>
            </div>
          </div>

          {/* Dispositivos a recolher */}
          {collectDevices.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[11px] font-black text-neutral-500 uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle size={11} className="text-amber-500" /> Motoboy deve buscar:
              </p>
              {collectDevices.map((dev, i) => (
                <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <Smartphone size={11} /> {dev.model}
                  </span>
                  {dev.value > 0 && <span className="text-xs font-black text-amber-700">{brl(dev.value)}</span>}
                </div>
              ))}
            </div>
          )}

          {sale.cashReceived != null && (
            <div className="mt-2 flex items-center justify-between bg-white border border-neutral-200 rounded-lg px-3 py-2">
              <span className="text-[11px] font-bold text-neutral-600">
                {sale.cashReceived > 0 ? 'Diferença a cobrar na entrega:' : '✅ Troca direta — sem cobrança'}
              </span>
              {sale.cashReceived > 0 && (
                <span className="text-xs font-black text-neutral-900">{brl(sale.cashReceived)}</span>
              )}
            </div>
          )}

          {/* Toggle: recolha mesma corrida x outra data */}
          <div className="mt-3 pt-3 border-t border-primary/20">
            <p className="text-[11px] font-black text-neutral-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Calendar size={11} /> Quando buscar o aparelho?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set('deferCollection')(false)}
                className={[
                  'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all',
                  !delivery.deferCollection
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400',
                ].join(' ')}
              >
                <RefreshCw size={13} /> Hoje (mesma corrida)
              </button>
              <button
                type="button"
                onClick={() => set('deferCollection')(true)}
                className={[
                  'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all',
                  delivery.deferCollection
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-neutral-200 text-neutral-500 hover:border-blue-300',
                ].join(' ')}
              >
                <CalendarClock size={13} /> Outra data
              </button>
            </div>

            {/* Data e horário da recolha */}
            {delivery.deferCollection && (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Data da busca</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={delivery.collectionDate}
                      onChange={(e) => set('collectionDate')(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Horário estimado</label>
                    <input
                      type="text"
                      className={inputCls}
                      value={delivery.collectionTime}
                      placeholder="Ex: entre 10h e 11h"
                      onChange={(e) => set('collectionTime')(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}><Store size={11} className="inline mr-1" />Entregar em (destino após buscar) *</label>
                  <input
                    className={delivery.collectionDropoffLocation.trim() ? inputCls : inputCls.replace('border-neutral-200', 'border-red-300 bg-red-50/50')}
                    value={delivery.collectionDropoffLocation}
                    placeholder="Obrigatório — endereço da loja ou outro destino"
                    onChange={(e) => set('collectionDropoffLocation')(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Banner de prazo com entrada ── */}
      {sale.saleType === 'prazo' && sale.entradaAmount && sale.entradaAmount > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-black text-blue-700 uppercase tracking-widest mb-1">Venda a Prazo com Entrada</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-600">Entrada a cobrar na entrega:</span>
            <span className="text-sm font-black text-blue-800">{brl(sale.entradaAmount)}</span>
          </div>
          {sale.installments && sale.installmentValue && (
            <p className="text-[11px] text-blue-500 mt-1">
              + {sale.installments}x de {brl(sale.installmentValue)} via PIX (mensais)
            </p>
          )}
        </div>
      )}

      {/* ── Form de entrega ── */}
      <div className="rounded-2xl border border-neutral-200 p-4 space-y-3">
        <p className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
          <Truck size={14} /> Dados da entrega
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}><MapPin size={11} className="inline mr-1" />Endereço de entrega</label>
            <input className={inputCls} value={delivery.deliveryAddress} placeholder="Rua, número, bairro — cidade"
              onChange={(e) => set('deliveryAddress')(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}><User size={11} className="inline mr-1" />Entregar em mãos para</label>
            <input className={inputCls} value={delivery.recipient} placeholder="Nome de quem recebe"
              onChange={(e) => set('recipient')(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}><Clock size={11} className="inline mr-1" />Previsão de entrega</label>
            <input className={inputCls} value={delivery.deliveryTime} placeholder="Ex: até 11h30 / entre 14h e 15h"
              onChange={(e) => set('deliveryTime')(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}><Package size={11} className="inline mr-1" />Local de coleta (motoboy) *</label>
            <input
              className={delivery.pickupLocation.trim() ? inputCls : inputCls.replace('border-neutral-200', 'border-red-300 bg-red-50/50')}
              value={delivery.pickupLocation}
              placeholder="Obrigatório — de onde o motoboy retira"
              onBlur={persistPickup}
              onChange={(e) => set('pickupLocation')(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Contato na coleta</label>
            <input className={inputCls} value={delivery.pickupContact} placeholder="Com quem retirar"
              onChange={(e) => set('pickupContact')(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Horário de coleta</label>
            <input className={inputCls} value={delivery.pickupTime} placeholder="Ex: entre 13h30 e 14h"
              onChange={(e) => set('pickupTime')(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm font-bold text-neutral-700 cursor-pointer select-none py-2">
              <input type="checkbox" checked={delivery.freightFree}
                onChange={(e) => set('freightFree')(e.target.checked)}
                className="w-4 h-4 accent-primary" />
              Frete grátis
            </label>
            {!delivery.freightFree && (
              <input className={inputCls + ' flex-1'} value={delivery.freightValue} placeholder="Valor do frete"
                onChange={(e) => set('freightValue')(e.target.value)} />
            )}
          </div>

          {/* ── Cobrança na entrega — ícones branded ── */}
          <div className="sm:col-span-2">
            <label className={labelCls}>Cobrança na entrega</label>
            <div className="grid grid-cols-2 gap-2">
              {CHARGE_MODES.map((m) => {
                const active = delivery.chargeMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => set('chargeMode')(m.id)}
                    className={[
                      'flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all text-left',
                      active
                        ? 'bg-primary border-primary text-neutral-900'
                        : 'bg-white border-neutral-200 text-neutral-500 hover:border-primary/40 hover:text-neutral-700',
                    ].join(' ')}
                  >
                    <ChargeModeIcon
                      id={m.id}
                      size={15}
                      className={active ? 'text-neutral-900' : 'text-neutral-400'}
                    />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Override do valor final (para incluir taxas do cartão) ── */}
          {delivery.chargeMode !== 'pago' && (
            <div className="sm:col-span-2">
              <label className={labelCls}>
                <CreditCard size={11} className="inline mr-1" />
                Valor final a cobrar
                <span className="text-neutral-400 normal-case font-normal ml-1">
                  (ajuste se houver taxas de cartão/parcelamento)
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  inputMode="decimal"
                  className={inputCls}
                  placeholder={`Padrão: ${brl(sale.cashReceived != null && sale.saleType === 'troca' ? sale.cashReceived : sale.saleType === 'prazo' && sale.entradaAmount ? sale.entradaAmount : sale.totalAmount)}`}
                  value={delivery.chargeAmountOverride ? String(delivery.chargeAmountOverride) : ''}
                  onChange={(e) => {
                    const v = Number(String(e.target.value).replace(/\./g, '').replace(',', '.')) || 0;
                    set('chargeAmountOverride')(v > 0 ? v : undefined);
                  }}
                />
                {delivery.chargeAmountOverride && delivery.chargeAmountOverride > 0 && (
                  <button
                    type="button"
                    onClick={() => set('chargeAmountOverride')(undefined)}
                    className="text-xs text-neutral-400 hover:text-red-500 whitespace-nowrap"
                  >
                    ✕ limpar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Pagamento dividido (ex.: parte cartão + parte PIX) ── */}
          {(() => {
            const splitMap: Record<'cartao' | 'pix' | 'dinheiro', number> = { cartao: 0, pix: 0, dinheiro: 0 };
            (delivery.chargeBreakdown || []).forEach((b) => { splitMap[b.method] = b.amount; });
            const setSplit = (method: 'cartao' | 'pix' | 'dinheiro') => (raw: string) => {
              const amount = Number(String(raw).replace(/\./g, '').replace(',', '.')) || 0;
              const others = (delivery.chargeBreakdown || []).filter((b) => b.method !== method);
              set('chargeBreakdown')(amount > 0 ? [...others, { method, amount }] : others);
            };
            const splitTotal = (delivery.chargeBreakdown || []).reduce((a, b) => a + Number(b.amount), 0);
            const due = (sale.cashReceived != null ? sale.cashReceived : sale.totalAmount) || 0;
            const hasSplit = splitTotal > 0;
            const diff = +(splitTotal - due).toFixed(2);
            return (
              <div className="sm:col-span-2">
                <label className={labelCls}>Pagamento dividido na entrega <span className="text-neutral-400 normal-case font-normal">(opcional — preenche se for parte cartão, parte PIX…)</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cartao', 'pix', 'dinheiro'] as const).map((m) => (
                    <div key={m}>
                      <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1 mb-0.5">
                        {m === 'cartao' ? <CreditCard size={11} /> : m === 'pix' ? <Smartphone size={11} /> : <DollarSign size={11} />}
                        {m === 'cartao' ? 'Cartão' : m === 'pix' ? 'PIX' : 'Dinheiro'}
                      </span>
                      <input
                        inputMode="decimal"
                        className={inputCls}
                        placeholder="0,00"
                        value={splitMap[m] ? String(splitMap[m]) : ''}
                        onChange={(e) => setSplit(m)(e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                {hasSplit && (
                  <p className="text-[11px] mt-1 font-bold text-neutral-500">
                    Total: {brl(splitTotal)}
                  </p>
                )}
              </div>
            );
          })()}

          <div className="sm:col-span-2">
            <label className={labelCls}>Observações / instruções</label>
            <textarea className={inputCls + ' resize-none'} rows={2} value={delivery.instructions}
              placeholder="Ex: aguardar confirmação do PIX · deixar no carro do Netinho · só entregar"
              onChange={(e) => set('instructions')(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Mensagens geradas ── */}
      <MessageCard
        title="Mensagem para o Cliente"
        icon={<User size={15} />}
        accent="bg-primary/10 text-neutral-900"
        value={clientMsg}
        onChange={(v) => { setClientMsg(v); setClientEdited(true); }}
        onRegenerate={() => { setClientEdited(false); setClientMsg(generatedClient); }}
        onAction={() => persist(delivery, clientMsg, motoboyMsg, collectionMsg)}
        waHref={waLink(sale.phone || '', clientMsg)}
        waLabel="Enviar ao cliente"
      />
      <MessageCard
        title="Mensagem para o Motoboy"
        icon={<Truck size={15} />}
        accent="bg-neutral-900 text-white"
        value={motoboyMsg}
        onChange={(v) => { setMotoboyMsg(v); setMotoboyEdited(true); }}
        onRegenerate={() => { setMotoboyEdited(false); setMotoboyMsg(generatedMotoboy); }}
        onAction={() => persist(delivery, clientMsg, motoboyMsg, collectionMsg)}
        waHref={waLink('', motoboyMsg)}
        waLabel="Abrir no WhatsApp"
      />

      {/* Corrida de Busca — só aparece quando busca está adiada */}
      {sale.saleType === 'troca' && delivery.deferCollection && (
        <MessageCard
          title="Corrida de Busca (data agendada)"
          icon={<CalendarClock size={15} />}
          accent="bg-blue-600 text-white"
          value={collectionMsg}
          onChange={(v) => { setCollectionMsg(v); setCollectionEdited(true); }}
          onRegenerate={() => { setCollectionEdited(false); setCollectionMsg(generatedCollection); }}
          onAction={() => persist(delivery, clientMsg, motoboyMsg, collectionMsg)}
          waHref={waLink('', collectionMsg)}
          waLabel="Abrir no WhatsApp"
        />
      )}
    </div>
  );
};
