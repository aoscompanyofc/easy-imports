import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MetricCard } from '../components/dashboard/MetricCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { ChannelChart } from '../components/dashboard/ChannelChart';
import { AlertsList } from '../components/dashboard/AlertsList';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Plus, ShoppingCart, Package, DollarSign, UserPlus,
  Calendar, TrendingUp, ArrowRight, ChevronDown, ChevronUp,
  Target, Pencil, Check, RefreshCw, CheckCircle2, XCircle, Trash2,
  AlertCircle, Clock,
} from 'lucide-react';

const META_KEY       = 'easy-imports-meta-mensal';
const META_MONTH_KEY = 'easy-imports-meta-month';
import { formatCurrency } from '../lib/formatters';
import { dataService } from '../lib/dataService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Period types ─────────────────────────────────────────────────────────────
type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today',      label: 'Hoje'          },
  { id: 'yesterday',  label: 'Ontem'         },
  { id: 'this_week',  label: 'Esta Semana'   },
  { id: 'last_week',  label: 'Sem. Passada'  },
  { id: 'this_month', label: 'Este Mês'      },
  { id: 'last_month', label: 'Mês Anterior'  },
  { id: 'custom',     label: 'Personalizado' },
];

function getDateRange(period: Period, from: string, to: string): [Date, Date] {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms    = 86_400_000;

  if (period === 'today')
    return [today, new Date(today.getTime() + ms)];

  if (period === 'yesterday') {
    const y = new Date(today.getTime() - ms);
    return [y, today];
  }

  if (period === 'this_week') {
    const dow     = today.getDay();
    const monday  = new Date(today.getTime() - (dow === 0 ? 6 : dow - 1) * ms);
    return [monday, new Date(today.getTime() + ms)];
  }

  if (period === 'last_week') {
    const dow        = today.getDay();
    const thisMonday = new Date(today.getTime() - (dow === 0 ? 6 : dow - 1) * ms);
    const lastMonday = new Date(thisMonday.getTime() - 7 * ms);
    return [lastMonday, thisMonday];
  }

  if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return [start, new Date(today.getTime() + ms)];
  }

  if (period === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end   = new Date(now.getFullYear(), now.getMonth(), 1);
    return [start, end];
  }

  // custom
  const start = from ? new Date(from + 'T00:00:00') : new Date(0);
  const end   = to   ? new Date(to   + 'T23:59:59') : new Date(today.getTime() + ms);
  return [start, end];
}

function getPeriodLabel(period: Period, from: string, to: string): string {
  if (period === 'custom') {
    if (from && to) return `${from.split('-').reverse().join('/')} → ${to.split('-').reverse().join('/')}`;
    if (from)       return `A partir de ${from.split('-').reverse().join('/')}`;
    return 'Período personalizado';
  }
  return PERIODS.find(p => p.id === period)?.label ?? '';
}

function buildChartDataForRange(sales: any[], start: Date, end: Date): { date: string; value: number }[] {
  const result: { date: string; value: number }[] = [];
  const cap   = new Date(); // don't go past today
  const cur   = new Date(start);

  while (cur < end && cur <= cap) {
    const dayStr = format(cur, 'yyyy-MM-dd');
    const label  = format(cur, 'dd/MM');
    const value  = sales
      .filter(s => (s.created_at || '').slice(0, 10) === dayStr)
      .reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
    result.push({ date: label, value });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function buildTopProducts(sales: any[]) {
  const counts: Record<string, number> = {};
  for (const s of sales) {
    const name = s.product_name || s.products?.name || 'Produto';
    counts[name] = (counts[name] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, salesCount], i) => ({ id: String(i), name, salesCount }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 5);
}

const CHANNEL_COLORS = ['#FFC107', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B'];
function buildChannelData(sales: any[]) {
  const counts: Record<string, number> = {};
  for (const s of sales) {
    const method = s.payment_method || 'Outros';
    counts[method] = (counts[method] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, value], i) => ({ name, value, color: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }))
    .sort((a, b) => b.value - a.value);
}

function buildSaleTypeData(sales: any[]) {
  let venda = 0, troca = 0, compra = 0;
  for (const s of sales) {
    const t = s.sale_type || (s.incoming_name?.trim() ? 'troca' : 'venda');
    if (t === 'troca') troca += Number(s.total_amount || 0);
    else if (t === 'compra') compra += Number(s.total_amount || 0);
    else venda += Number(s.total_amount || 0);
  }
  return [
    { name: 'Venda',  value: Math.round(venda),  color: '#FFC107' },
    { name: 'Troca',  value: Math.round(troca),  color: '#8B5CF6' },
    { name: 'Compra', value: Math.round(compra), color: '#3B82F6' },
  ].filter(d => d.value > 0);
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}
function getPaymentLabel(method: string) {
  const map: Record<string, string> = {
    pix: 'PIX', credit_card: 'Crédito', debit_card: 'Débito',
    cash: 'Dinheiro', boleto: 'Boleto', transfer: 'Transferência',
  };
  return map[method] || method || 'Outro';
}
const PAYMENT_COLORS: Record<string, string> = {
  pix: 'bg-primary/10 text-neutral-900',
  credit_card: 'bg-neutral-900 text-white',
  debit_card: 'bg-neutral-200 text-neutral-700',
  cash: 'bg-neutral-100 text-neutral-700',
  boleto: 'bg-neutral-100 text-neutral-600',
  transfer: 'bg-neutral-800 text-white',
};

// ─── Component ────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isFABOpen, setIsFABOpen] = useState(false);

  // Period filter state
  const today = new Date().toISOString().split('T')[0];
  const [period, setPeriod]       = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo]     = useState(today);
  const [showCustom, setShowCustom] = useState(false);

  // Raw data
  const [allSales, setAllSales]             = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [stockValue, setStockValue]         = useState(0);
  const [isLoading, setIsLoading]           = useState(true);

  // Meta mensal — auto-reset quando muda o mês
  const [meta, setMeta] = useState<number>(() => {
    try {
      const storedMonth = localStorage.getItem(META_MONTH_KEY) || '';
      const currentMonth = new Date().toISOString().slice(0, 7);
      if (storedMonth !== currentMonth) {
        localStorage.removeItem(META_KEY);
        localStorage.setItem(META_MONTH_KEY, currentMonth);
        return 0;
      }
      return Number(localStorage.getItem(META_KEY) || '0');
    } catch { return 0; }
  });
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [metaInput, setMetaInput] = useState('');

  const clearMeta = () => {
    setMeta(0);
    localStorage.removeItem(META_KEY);
  };

  const isLastDayOfMonth = (() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return now.getDate() === lastDay;
  })();

  // Meta mensal helpers
  const [showMetaSales, setShowMetaSales] = useState(false);

  const thisMonthSales = useMemo(() => {
    const now = new Date();
    return allSales
      .filter(s => {
        if (!s.created_at) return false;
        const d = new Date(s.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allSales]);

  const thisMonthRevenue = useMemo(
    () => thisMonthSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0),
    [thisMonthSales]
  );

  const metaPct = meta > 0 ? Math.min(100, Math.round((thisMonthRevenue / meta) * 100)) : 0;

  const saveMeta = () => {
    const v = Number(metaInput.replace(',', '.'));
    if (v > 0) {
      setMeta(v);
      localStorage.setItem(META_KEY, String(v));
      localStorage.setItem(META_MONTH_KEY, new Date().toISOString().slice(0, 7));
    }
    setIsEditingMeta(false);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sales, products, transactions] = await Promise.all([
        dataService.getSales(),
        dataService.getProducts(),
        dataService.getTransactions(),
      ]);
      setAllSales(sales || []);
      setAllTransactions(transactions || []);
      const sv = (products || [])
        .filter((p: any) => p.stock_quantity > 0)
        .reduce((acc: number, p: any) =>
          acc + Number(p.purchase_price || 0), 0);
      setStockValue(sv);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // ─── Derived data filtered by period ─────────────────────────────────────
  const { filteredSales, revenue, cash, salesCount, netProfit, stockAtPeriod, prazoCount, prazoTotal, chartData, channelData, topProducts, saleTypeData } = useMemo(() => {
    const [start, end] = getDateRange(period, customFrom, customTo);
    const filtered = allSales.filter(s => {
      if (!s.created_at) return false;
      const d = new Date(s.created_at);
      return d >= start && d < end;
    });
    const rev = filtered.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
    const count = filtered.length;

    // Caixa = dinheiro efetivamente recebido (trocas descontam o crédito dado; prazo só parcelas pagas)
    const cashReceived = filtered.reduce((acc, s) => {
      const t = s.sale_type || (s.incoming_name?.trim() ? 'troca' : 'venda');
      if (t === 'troca') return acc + Number(s.total_amount || 0) - Number(s.incoming_purchase_price || 0);
      if (t === 'prazo') {
        const insts: any[] = (() => { try { return JSON.parse(s.installments_json || '[]'); } catch { return []; } })();
        return acc + insts.filter((i: any) => i.paid_at).reduce((s2: number, i: any) => s2 + Number(i.amount || 0), 0);
      }
      return acc + Number(s.total_amount || 0);
    }, 0);

    // Cost map: sale_number / id-prefix → custo (suporta formato antigo e novo)
    const costMap: Record<string, number> = {};
    for (const t of allTransactions) {
      if (t.type === 'expense' && t.category === 'stock') {
        if (t.description?.startsWith('Custo Mercadoria #')) {
          const prefix = t.description.replace('Custo Mercadoria #', '').trim();
          costMap[`uuid:${prefix}`] = (costMap[`uuid:${prefix}`] || 0) + Number(t.amount || 0);
        } else if (t.description?.startsWith('Custo ')) {
          const match = t.description.match(/^Custo (#[A-Z0-9]+)/);
          if (match) costMap[match[1]] = (costMap[match[1]] || 0) + Number(t.amount || 0);
        }
      }
    }

    // Lucro: receita líquida (transações de entrada já descontam taxa de cartão) - custo
    const txDate = (t: any) => t.date ? new Date(t.date + 'T12:00:00') : new Date(t.created_at);
    const periodIncome  = allTransactions
      .filter(t => t.type === 'income'  && txDate(t) >= start && txDate(t) < end)
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const periodExpense = allTransactions
      .filter(t => t.type === 'expense' && txDate(t) >= start && txDate(t) < end)
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    // Estoque no período: valor atual + custo dos itens vendidos DEPOIS do período
    // (esses itens ainda estavam no estoque durante o período consultado)
    const salesAfterPeriod = allSales.filter(s => s.created_at && new Date(s.created_at) >= end);
    const costSoldAfterPeriod = salesAfterPeriod.reduce((acc, s) =>
      acc + (costMap[s.sale_number] ?? costMap[`uuid:${s.id?.slice(0, 8)}`] ?? 0), 0);
    const stockSnapshot = stockValue + costSoldAfterPeriod;

    const prazoSales = filtered.filter(s => (s.sale_type || '') === 'prazo');
    const prazoTotal = prazoSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);

    return {
      filteredSales:  filtered,
      revenue:        rev,
      cash:           cashReceived,
      salesCount:     count,
      netProfit:      periodIncome - periodExpense,
      stockAtPeriod:  stockSnapshot,
      prazoCount:     prazoSales.length,
      prazoTotal,
      chartData:      buildChartDataForRange(filtered, start, end),
      channelData:    buildChannelData(filtered),
      topProducts:    buildTopProducts(filtered),
      saleTypeData:   buildSaleTypeData(filtered),
    };
  }, [allSales, allTransactions, stockValue, period, customFrom, customTo]);

  const periodLabel = getPeriodLabel(period, customFrom, customTo);

  // A Receber = saldo GLOBAL de todas as parcelas a prazo ainda não pagas (não filtra por período)
  const { pendingReceivables, pendingSalesCount } = useMemo(() => {
    let total = 0;
    let salesWithPending = 0;
    for (const s of allSales) {
      if ((s.sale_type || '') !== 'prazo' || !s.installments_json) continue;
      let insts: any[] = [];
      try { insts = JSON.parse(s.installments_json); } catch { continue; }
      const pendingAmt = insts
        .filter((i: any) => !i.paid_at)
        .reduce((acc: number, i: any) => acc + Number(i.amount || 0), 0);
      if (pendingAmt > 0) { total += pendingAmt; salesWithPending++; }
    }
    return { pendingReceivables: total, pendingSalesCount: salesWithPending };
  }, [allSales]);

  // Lucro Futuro = GLOBAL — todos os aparelhos recebidos em troca com previsão de revenda
  const { futureProfit, futureProfitItems } = useMemo(() => {
    type Item = { name: string; customer: string; tradeIn: number; resale: number; profit: number; date: string };
    const items: Item[] = [];
    for (const s of allSales) {
      const t = s.sale_type || (s.incoming_name?.trim() ? 'troca' : 'venda');
      if (t !== 'troca') continue;
      let devs: any[] = [];
      try { devs = JSON.parse(s.incoming_devices_json || '[]'); } catch { devs = []; }
      const tradeIn = Number(s.incoming_purchase_price || 0);
      const resale  = Number(devs[0]?.sale_price || 0);
      if (resale > 0) {
        items.push({
          name:     s.incoming_name || devs[0]?.model || 'Aparelho',
          customer: s.customer_name || '—',
          tradeIn,
          resale,
          profit:   resale - tradeIn,
          date:     s.created_at ? new Date(s.created_at).toLocaleDateString('pt-BR') : '',
        });
      }
    }
    const total = items.reduce((acc, i) => acc + i.profit, 0);
    return { futureProfit: total, futureProfitItems: items };
  }, [allSales]);

  const [showFutureDetail, setShowFutureDetail] = useState(false);

  // ─── Prazo installment alerts ────────────────────────────────────────────────
  const { overdueInstallments, dueSoonInstallments } = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const in7Str = in7.toISOString().slice(0, 10);
    const overdue: { sale: any; inst: any; index: number }[] = [];
    const dueSoon: { sale: any; inst: any; index: number }[] = [];
    for (const sale of allSales) {
      if (sale.sale_type !== 'prazo' || !sale.installments_json) continue;
      let insts: any[] = [];
      try { insts = JSON.parse(sale.installments_json); } catch { continue; }
      insts.forEach((inst: any, i: number) => {
        if (inst.paid_at) return;
        if (inst.due < todayStr) overdue.push({ sale, inst, index: i });
        else if (inst.due <= in7Str) dueSoon.push({ sale, inst, index: i });
      });
    }
    return { overdueInstallments: overdue, dueSoonInstallments: dueSoon };
  }, [allSales]);

  const handlePeriodClick = (p: Period) => {
    setPeriod(p);
    if (p === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
    }
  };

  const Skeleton = () => (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-neutral-100 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 bg-neutral-100 rounded-2xl" />
        <div className="h-72 bg-neutral-100 rounded-2xl" />
      </div>
      <div className="h-80 bg-neutral-100 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight">Dashboard</h2>
            <p className="text-neutral-500 font-medium text-sm">
              Exibindo dados de: <strong className="text-neutral-800">{periodLabel}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Calendar size={14} />
            <span>Hoje, {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Period pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePeriodClick(p.id)}
              className={cn(
                'flex-shrink-0 px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all border whitespace-nowrap',
                period === p.id
                  ? 'bg-primary border-primary/60 text-neutral-900 shadow-sm'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary/40 hover:text-neutral-900'
              )}
            >
              {p.id === 'custom' && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {p.label}
                </span>
              )}
              {p.id !== 'custom' && p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-neutral-600 whitespace-nowrap">De:</label>
              <input
                type="date"
                value={customFrom}
                max={customTo || today}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-neutral-600 whitespace-nowrap">Até:</label>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={today}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
            </div>
            {customFrom && customTo && (
              <span className="text-xs font-bold text-neutral-500 bg-white border border-neutral-200 px-3 py-2 rounded-xl">
                {salesCount} venda{salesCount !== 1 ? 's' : ''} neste período
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? <Skeleton /> : (
        <>
          {/* ── Metric Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Faturamento */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-3 sm:p-5 flex flex-col gap-1 min-w-0 overflow-hidden">
              <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest truncate">Faturamento</p>
              <p className="text-base sm:text-2xl font-black text-neutral-900 truncate">{formatCurrency(revenue)}</p>
              <p className="text-[10px] sm:text-xs text-neutral-400 truncate">Preço cheio · {periodLabel}</p>
            </div>

            {/* Caixa */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-3 sm:p-5 flex flex-col gap-1 min-w-0 overflow-hidden">
              <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest truncate">Caixa</p>
              <p className="text-base sm:text-2xl font-black text-neutral-900 truncate">{formatCurrency(cash)}</p>
              <p className="text-[10px] sm:text-xs text-neutral-400 truncate">Recebido · {periodLabel}</p>
            </div>

            {/* Contas a Receber */}
            <div className={cn(
              'rounded-2xl border shadow-sm p-3 sm:p-5 flex flex-col gap-1 min-w-0 overflow-hidden',
              pendingReceivables > 0 ? 'bg-primary/5 border-primary/20' : 'bg-white border-neutral-200',
            )}>
              <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest truncate">A Receber</p>
              <p className="text-base sm:text-2xl font-black text-neutral-900 truncate">{pendingReceivables > 0 ? formatCurrency(pendingReceivables) : '—'}</p>
              <p className="text-[10px] sm:text-xs text-neutral-400 truncate">
                {pendingSalesCount > 0 ? `${pendingSalesCount} venda${pendingSalesCount !== 1 ? 's' : ''} em aberto` : 'Sem pendências'}
              </p>
            </div>

            {/* Lucro Imediato */}
            <div className={cn(
              'rounded-2xl border shadow-sm p-3 sm:p-5 flex flex-col gap-1 min-w-0 overflow-hidden',
              netProfit >= 0 ? 'bg-white border-neutral-200' : 'bg-red-50 border-red-200',
            )}>
              <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest truncate">Lucro</p>
              <p className={cn('text-base sm:text-2xl font-black truncate', netProfit >= 0 ? 'text-green-600' : 'text-red-500')}>
                {formatCurrency(netProfit)}
              </p>
              <p className="text-[10px] sm:text-xs text-neutral-400 truncate">Imediato · {periodLabel}</p>
            </div>

            {/* Lucro Futuro */}
            <div className="rounded-2xl border border-neutral-200 shadow-sm bg-white min-w-0 overflow-hidden">
              <button
                onClick={() => futureProfitItems.length > 0 && setShowFutureDetail(v => !v)}
                className={cn('w-full p-3 sm:p-5 flex flex-col gap-1 text-left', futureProfitItems.length > 0 && 'hover:bg-neutral-50 transition-colors')}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest truncate">Lucro Futuro</p>
                  {futureProfitItems.length > 0 && (
                    showFutureDetail ? <ChevronUp size={13} className="text-neutral-400 flex-shrink-0" /> : <ChevronDown size={13} className="text-neutral-400 flex-shrink-0" />
                  )}
                </div>
                <p className={cn('text-base sm:text-2xl font-black truncate', futureProfit > 0 ? 'text-neutral-900' : 'text-neutral-400')}>
                  {futureProfit > 0 ? formatCurrency(futureProfit) : '—'}
                </p>
                <p className="text-[10px] sm:text-xs text-neutral-400 truncate">
                  {futureProfitItems.length > 0
                    ? `${futureProfitItems.length} aparelho${futureProfitItems.length !== 1 ? 's' : ''} em troca`
                    : 'Sem previsão cadastrada'}
                </p>
              </button>
              {showFutureDetail && futureProfitItems.length > 0 && (
                <div className="border-t border-neutral-100 divide-y divide-neutral-100 max-h-64 overflow-y-auto">
                  {futureProfitItems.map((item, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-900 truncate">{item.name}</p>
                        <p className="text-[10px] text-neutral-400 truncate">{item.customer} · {item.date}</p>
                        <p className="text-[10px] text-neutral-500">Entrou {formatCurrency(item.tradeIn)} → revenda {formatCurrency(item.resale)}</p>
                      </div>
                      <span className={cn('text-xs font-black flex-shrink-0 mt-0.5', item.profit >= 0 ? 'text-green-600' : 'text-red-500')}>
                        {item.profit >= 0 ? '+' : ''}{formatCurrency(item.profit)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Estoque — valor no período selecionado */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-3 sm:p-5 flex flex-col gap-1 min-w-0 overflow-hidden">
              <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest truncate">Estoque</p>
              <p className="text-base sm:text-2xl font-black text-neutral-900 truncate">{formatCurrency(stockAtPeriod)}</p>
              <p className="text-[10px] sm:text-xs text-neutral-400 truncate">Valor em estoque · {periodLabel}</p>
            </div>
          </div>

          {/* ── Alertas de Parcelas a Prazo ── */}
          {(overdueInstallments.length > 0 || dueSoonInstallments.length > 0) && (
            <div className="space-y-2">
              {overdueInstallments.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-red-700">
                      {overdueInstallments.length} parcela{overdueInstallments.length !== 1 ? 's' : ''} em atraso
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {overdueInstallments.slice(0, 3).map(({ sale, inst, index }) => (
                        <p key={`${sale.id}-${index}`} className="text-xs text-red-600">
                          <strong>{sale.customer_name}</strong> — Parcela {inst.n} — {formatCurrency(inst.amount)} — venceu {inst.due.split('-').reverse().join('/')}
                        </p>
                      ))}
                      {overdueInstallments.length > 3 && (
                        <p className="text-xs text-red-500 font-bold">+ {overdueInstallments.length - 3} mais...</p>
                      )}
                    </div>
                    <button onClick={() => navigate('/vendas')} className="mt-2 text-xs font-black text-red-700 underline">
                      Ver em Vendas →
                    </button>
                  </div>
                </div>
              )}
              {dueSoonInstallments.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
                  <Clock size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-neutral-800">
                      {dueSoonInstallments.length} parcela{dueSoonInstallments.length !== 1 ? 's' : ''} vencendo nos próximos 7 dias
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {dueSoonInstallments.slice(0, 3).map(({ sale, inst, index }) => (
                        <p key={`${sale.id}-${index}`} className="text-xs text-neutral-800">
                          <strong>{sale.customer_name}</strong> — Parcela {inst.n} — {formatCurrency(inst.amount)} — vence {inst.due.split('-').reverse().join('/')}
                        </p>
                      ))}
                      {dueSoonInstallments.length > 3 && (
                        <p className="text-xs text-neutral-500 font-bold">+ {dueSoonInstallments.length - 3} mais...</p>
                      )}
                    </div>
                    <button onClick={() => navigate('/vendas')} className="mt-2 text-xs font-black text-neutral-800 underline">
                      Ver em Vendas →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Meta Mensal ── */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Target size={16} className="text-primary-700" />
                </div>
                <div>
                  <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Meta do Mês</p>
                  <p className="text-sm font-bold text-neutral-900">
                    {meta > 0 ? `${formatCurrency(thisMonthRevenue)} de ${formatCurrency(meta)}` : 'Nenhuma meta definida'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditingMeta ? (
                  <>
                    <input
                      type="number"
                      placeholder="Ex: 50000"
                      value={metaInput}
                      onChange={e => setMetaInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveMeta()}
                      autoFocus
                      className="w-28 px-3 py-1.5 text-sm border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    />
                    <button onClick={saveMeta} className="p-1.5 bg-primary rounded-lg text-neutral-900">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setIsEditingMeta(false)} className="p-1.5 bg-neutral-100 rounded-lg text-neutral-500">
                      <XCircle size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setMetaInput(String(meta || '')); setIsEditingMeta(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-bold transition-colors"
                    >
                      <Pencil size={12} />
                      {meta > 0 ? 'Alterar' : 'Definir'}
                    </button>
                    {meta > 0 && (
                      <button
                        onClick={clearMeta}
                        title="Zerar meta"
                        className="p-1.5 rounded-xl bg-neutral-100 hover:bg-red-50 hover:text-red-500 text-neutral-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            {meta > 0 && (
              <div className="space-y-1.5">
                <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      metaPct >= 100 ? 'bg-green-500' : metaPct >= 70 ? 'bg-primary' : metaPct >= 40 ? 'bg-neutral-400' : 'bg-red-400'
                    )}
                    style={{ width: `${metaPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span className="font-bold">{metaPct}% atingido</span>
                  {isLastDayOfMonth ? (
                    metaPct >= 100 ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-black">
                        <CheckCircle2 size={12} /> Meta atingida!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 font-black">
                        <XCircle size={12} /> Meta não atingida
                      </span>
                    )
                  ) : (
                    metaPct >= 100 ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-black">
                        <CheckCircle2 size={12} /> Meta batida!
                      </span>
                    ) : (
                      <span className="text-neutral-400">Faltam {formatCurrency(meta - thisMonthRevenue)}</span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Vendas do mês — lista expansível */}
            {thisMonthSales.length > 0 && (
              <div>
                <button
                  onClick={() => setShowMetaSales(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 transition-colors"
                >
                  {showMetaSales ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {showMetaSales ? 'Ocultar' : 'Ver'} vendas do mês ({thisMonthSales.length})
                </button>
                {showMetaSales && (
                  <div className="mt-2 rounded-xl border border-neutral-100 overflow-hidden">
                    {thisMonthSales.map((s) => {
                      const stype = s.sale_type || 'venda';
                      const typeBadge = stype === 'troca' ? 'bg-primary text-neutral-900' : stype === 'compra' ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-900 text-white';
                      const typeLabel = stype === 'troca' ? 'T' : stype === 'compra' ? 'C' : 'V';
                      return (
                        <div key={s.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-50 last:border-0 bg-white">
                          <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0', typeBadge)}>{typeLabel}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-neutral-800 truncate">{s.customer_name || 'Avulso'}</p>
                            <p className="text-[10px] text-neutral-400 truncate">{s.product_name || '—'}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-black text-neutral-900">{formatCurrency(Number(s.total_amount))}</p>
                            <p className="text-[10px] text-neutral-400">{s.sale_number || ''}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 border-t border-neutral-100">
                      <span className="text-xs font-black text-neutral-500">Total do mês</span>
                      <span className="text-sm font-black text-neutral-900">{formatCurrency(thisMonthRevenue)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <RevenueChart
                data={chartData}
                title={`Faturamento — ${periodLabel}`}
                subtitle={
                  chartData.length === 1
                    ? 'Total do dia'
                    : `${chartData.length} dia${chartData.length !== 1 ? 's' : ''} no período`
                }
              />
            </div>
            <div className="space-y-4">
              {channelData.length > 0 ? (
                <ChannelChart data={channelData} />
              ) : (
                <Card className="flex flex-col justify-center items-center p-8 text-center space-y-4 h-full min-h-[200px]">
                  <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center">
                    <ShoppingCart size={22} className="text-neutral-300" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-600 text-sm">Sem vendas no período</p>
                    <p className="text-xs text-neutral-400 mt-1">Pagamentos aparecerão aqui.</p>
                  </div>
                </Card>
              )}
              {/* Receita por tipo (venda vs troca) */}
              {saleTypeData.length > 0 && (
                <Card>
                  <p className="text-sm font-black text-neutral-700 mb-3">Receita por Tipo</p>
                  <div className="space-y-2.5">
                    {saleTypeData.map(d => {
                      const total = saleTypeData.reduce((a, b) => a + b.value, 0);
                      const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                      return (
                        <div key={d.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                              <span className="font-semibold text-neutral-700">{d.name}</span>
                            </div>
                            <span className="font-black text-neutral-900">{pct}%</span>
                          </div>
                          <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                          </div>
                          <p className="text-[10px] text-neutral-400 text-right">{formatCurrency(d.value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* ── Recent Sales ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">Vendas do Período</h3>
                    <p className="text-sm text-neutral-400">
                      {filteredSales.length === 0
                        ? 'Nenhuma venda neste período'
                        : `${filteredSales.length} venda${filteredSales.length !== 1 ? 's' : ''} — ${periodLabel}`}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/vendas')}
                    className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                  >
                    Ver todas <ArrowRight size={14} />
                  </button>
                </div>

                {filteredSales.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-3 text-center">
                    <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center">
                      <ShoppingCart size={24} className="text-neutral-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-600 text-sm">Sem vendas no período selecionado</p>
                      <p className="text-xs text-neutral-400 mt-0.5">Escolha outro período ou registre uma venda.</p>
                    </div>
                    <Button size="sm" onClick={() => navigate('/vendas')} leftIcon={<Plus size={14} />}>
                      Registrar Venda
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredSales.slice(0, 6).map((sale) => {
                      const customerName = sale.customer_name || sale.customers?.name || 'Cliente';
                      const productName  = sale.product_name || 'Produto';
                      const value        = Number(sale.total_amount || 0);
                      const dateStr      = sale.created_at
                        ? new Date(sale.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                        : '—';
                      const payMethod = sale.payment_method || '';
                      const payColor  = PAYMENT_COLORS[payMethod] || 'bg-neutral-100 text-neutral-600';

                      return (
                        <div
                          key={sale.id}
                          className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl hover:bg-neutral-50 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary-900 flex-shrink-0">
                            {getInitials(customerName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-neutral-900 truncate">{customerName}</p>
                            <p className="text-xs text-neutral-400 truncate">{productName}</p>
                          </div>
                          {payMethod && (
                            <span className={cn('hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full', payColor)}>
                              {getPaymentLabel(payMethod)}
                            </span>
                          )}
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-neutral-900">{formatCurrency(value)}</p>
                            <p className="text-[10px] text-neutral-400">{dateStr}</p>
                          </div>
                        </div>
                      );
                    })}
                    {filteredSales.length > 6 && (
                      <button
                        onClick={() => navigate('/vendas')}
                        className="w-full text-center py-2.5 text-xs font-bold text-primary hover:underline"
                      >
                        + {filteredSales.length - 6} venda{filteredSales.length - 6 !== 1 ? 's' : ''} — Ver todas
                      </button>
                    )}
                  </div>
                )}
              </Card>
            </div>

            <div>
              <AlertsList />
            </div>
          </div>

          {/* ── Top Products ── */}
          {topProducts.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Top Produtos</h3>
                  <p className="text-sm text-neutral-400">{periodLabel}</p>
                </div>
                <button
                  onClick={() => navigate('/estoque')}
                  className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                >
                  Ver estoque <ArrowRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {topProducts.map((product, index) => {
                  const pct = Math.round((product.salesCount / (topProducts[0]?.salesCount || 1)) * 100);
                  return (
                    <div key={product.id} className="flex flex-col gap-3 p-4 rounded-xl bg-neutral-50 hover:bg-primary/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-xs font-black text-neutral-900">
                          #{index + 1}
                        </div>
                        <span className="text-xs font-bold text-neutral-500">
                          {product.salesCount} venda{product.salesCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-neutral-800 leading-tight line-clamp-2">{product.name}</p>
                      <div className="space-y-1">
                        <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-neutral-400 font-medium">{pct}% do top</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Summary strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Faturamento',   value: formatCurrency(revenue),   icon: TrendingUp,  color: 'text-primary'      },
              { label: 'Vendas',        value: `${salesCount}`,            icon: ShoppingCart, color: 'text-neutral-700'  },
              { label: 'Lucro',         value: formatCurrency(netProfit), icon: DollarSign,  color: netProfit >= 0 ? 'text-emerald-600' : 'text-red-500' },
              { label: 'Estoque',       value: formatCurrency(stockValue),icon: Package,     color: 'text-neutral-700'   },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-neutral-100 shadow-sm min-w-0 overflow-hidden">
                <div className={cn('p-1.5 sm:p-2 bg-neutral-50 rounded-lg flex-shrink-0', item.color)}>
                  <item.icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[10px] text-neutral-400 font-medium truncate">{item.label}</p>
                  <p className="text-xs sm:text-sm font-black text-neutral-900 truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── FAB ── */}
      <div className="fixed bottom-20 right-6 lg:bottom-10 lg:right-10 z-50">
        <div className="relative">
          <div className={cn(
            'absolute bottom-full right-0 mb-4 flex flex-col gap-3 transition-all duration-300 transform',
            isFABOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none translate-y-4'
          )}>
            {[
              { icon: ShoppingCart, label: 'Nova Venda',  action: '/vendas'    },
              { icon: Package,      label: 'Novo Produto', action: '/estoque'  },
              { icon: DollarSign,   label: 'Nova Despesa', action: '/financeiro'},
              { icon: UserPlus,     label: 'Novo Lead',    action: '/leads'    },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => { navigate(item.action); setIsFABOpen(false); }}
                className="flex items-center gap-3 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-xl hover:bg-neutral-800 transition-all whitespace-nowrap group"
              >
                <div className="p-1.5 bg-neutral-800 rounded-lg group-hover:bg-primary group-hover:text-black transition-colors">
                  <item.icon size={18} />
                </div>
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsFABOpen(!isFABOpen)}
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center text-black shadow-2xl shadow-primary/30 transition-all duration-300 active:scale-90',
              isFABOpen ? 'bg-neutral-900 text-white rotate-45' : 'bg-primary hover:bg-primary-600'
            )}
          >
            <Plus size={32} />
          </button>
        </div>
      </div>
    </div>
  );
};
