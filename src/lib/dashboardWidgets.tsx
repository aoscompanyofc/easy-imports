import React from 'react';
import {
  DollarSign, Wallet, TrendingUp, Package, Clock, Target, Users,
  Repeat, Crown, Calendar, Activity, Boxes, Sparkles, BarChart3,
  ShoppingCart, Percent,
} from 'lucide-react';

// ─── Tipos ──────────────────────────────────────────────────────────────────
export type WidgetSize = 'sm' | 'md' | 'lg';
export type DrillKey = 'revenue' | 'cash' | 'profit' | 'stock' | 'prazo';
export type WidgetCategory = 'financeiro' | 'clientes' | 'estoque' | 'metas' | 'ia';

export interface WidgetInstance {
  instanceId: string;
  widgetId: string;
  size: WidgetSize;
}

// Contexto de métricas entregue a cada widget para calcular seu valor.
export interface WidgetContext {
  revenue: number;
  cash: number;
  netProfit: number;
  salesCount: number;
  prevRevenue: number;
  prevProfit: number;
  pendingReceivables: number;
  prazoReceived: number;
  prazoCount: number;
  stockValue: number;
  stockUnits: number;
  meta: number;
  periodLabel: string;
  allSales: any[];
  start: Date;
  end: Date;
  formatCurrency: (n: number) => string;
}

export interface WidgetView {
  value: string;
  sub?: string;
  trend?: { cur: number; prev: number };
  tone?: 'default' | 'good' | 'bad' | 'info';
  drill?: DrillKey;
  // Para widgets de lista (top produtos / top clientes)
  list?: { label: string; value: string }[];
  // Para widgets de progresso (meta)
  progress?: { current: number; target: number };
}

export interface WidgetDef {
  id: string;
  title: string;
  description: string;
  category: WidgetCategory;
  icon: React.ComponentType<any>;
  kind: 'kpi' | 'progress' | 'list' | 'insight' | 'section';
  defaultSize: WidgetSize;
  // palavras-chave para criação por linguagem natural
  keywords: string[];
  compute: (ctx: WidgetContext) => WidgetView;
}

// ─── Helpers de cálculo ───────────────────────────────────────────────────────
const inRange = (s: any, start: Date, end: Date) => {
  if (!s.created_at) return false;
  const d = new Date(s.created_at);
  return d >= start && d < end;
};

function uniqueCustomers(sales: any[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sales) {
    const key = s.customer_id || s.customers?.name || s.customer_name || s.customer_phone;
    if (!key) continue;
    map.set(String(key), (map.get(String(key)) || 0) + Number(s.total_amount || 0));
  }
  return map;
}

function customerCount(sales: any[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sales) {
    const key = s.customer_id || s.customers?.name || s.customer_name || s.customer_phone;
    if (!key) continue;
    map.set(String(key), (map.get(String(key)) || 0) + 1);
  }
  return map;
}

// ─── Registry ─────────────────────────────────────────────────────────────────
export const WIDGETS: WidgetDef[] = [
  // ── Financeiro (existentes) ──
  {
    id: 'revenue',
    title: 'Faturamento',
    description: 'Total faturado no período selecionado.',
    category: 'financeiro',
    icon: DollarSign,
    kind: 'kpi',
    defaultSize: 'sm',
    keywords: ['faturamento', 'receita', 'vendas', 'total'],
    compute: (c) => ({
      value: c.formatCurrency(c.revenue),
      sub: `Bruto · ${c.periodLabel}`,
      trend: { cur: c.revenue, prev: c.prevRevenue },
      drill: 'revenue',
      tone: 'default',
    }),
  },
  {
    id: 'cash',
    title: 'Caixa Real',
    description: 'Dinheiro efetivamente recebido.',
    category: 'financeiro',
    icon: Wallet,
    kind: 'kpi',
    defaultSize: 'sm',
    keywords: ['caixa', 'recebido', 'dinheiro'],
    compute: (c) => ({
      value: c.formatCurrency(c.cash),
      sub: 'Efetivamente recebido',
      drill: 'cash',
      tone: 'default',
    }),
  },
  {
    id: 'profit',
    title: 'Lucro Realizado',
    description: 'Lucro das vendas já pagas.',
    category: 'financeiro',
    icon: TrendingUp,
    kind: 'kpi',
    defaultSize: 'sm',
    keywords: ['lucro', 'profit', 'margem liquida'],
    compute: (c) => ({
      value: c.formatCurrency(c.netProfit),
      sub: `Vendas pagas · ${c.periodLabel}`,
      trend: { cur: c.netProfit, prev: c.prevProfit },
      drill: 'profit',
      tone: c.netProfit >= 0 ? 'good' : 'bad',
    }),
  },
  {
    id: 'prazo',
    title: 'Receita Prevista',
    description: 'Valor a receber de vendas a prazo.',
    category: 'financeiro',
    icon: Clock,
    kind: 'kpi',
    defaultSize: 'sm',
    keywords: ['prazo', 'receber', 'prevista', 'parcelado'],
    compute: (c) => ({
      value: c.pendingReceivables > 0 ? c.formatCurrency(c.pendingReceivables) : '—',
      sub: c.prazoCount > 0
        ? `${c.prazoCount} venda${c.prazoCount !== 1 ? 's' : ''} · recebido ${c.formatCurrency(c.prazoReceived)}`
        : 'Sem vendas a prazo ativas',
      drill: 'prazo',
      tone: 'info',
    }),
  },
  {
    id: 'stock',
    title: 'Estoque',
    description: 'Valor e unidades em estoque.',
    category: 'estoque',
    icon: Package,
    kind: 'kpi',
    defaultSize: 'sm',
    keywords: ['estoque', 'inventario', 'produtos'],
    compute: (c) => ({
      value: c.formatCurrency(c.stockValue),
      sub: `Valor em estoque · ${c.periodLabel}`,
      drill: 'stock',
      tone: 'default',
    }),
  },

  // ── Novos: inteligência por cálculo ──
  {
    id: 'ticket',
    title: 'Ticket Médio',
    description: 'Valor médio por venda no período.',
    category: 'financeiro',
    icon: ShoppingCart,
    kind: 'kpi',
    defaultSize: 'sm',
    keywords: ['ticket', 'medio', 'media por venda', 'valor medio'],
    compute: (c) => ({
      value: c.salesCount > 0 ? c.formatCurrency(c.revenue / c.salesCount) : '—',
      sub: `${c.salesCount} venda${c.salesCount !== 1 ? 's' : ''} · ${c.periodLabel}`,
      tone: 'default',
    }),
  },
  {
    id: 'margin',
    title: 'Margem Líquida',
    description: 'Percentual de lucro sobre o faturamento.',
    category: 'financeiro',
    icon: Percent,
    kind: 'kpi',
    defaultSize: 'sm',
    keywords: ['margem', 'percentual', 'rentabilidade'],
    compute: (c) => {
      const pct = c.revenue > 0 ? (c.netProfit / c.revenue) * 100 : 0;
      return {
        value: c.revenue > 0 ? `${pct.toFixed(1)}%` : '—',
        sub: `Lucro sobre faturamento · ${c.periodLabel}`,
        tone: pct >= 0 ? 'good' : 'bad',
      };
    },
  },
  {
    id: 'ltv',
    title: 'LTV Médio',
    description: 'Receita média gerada por cliente (histórico).',
    category: 'clientes',
    icon: Crown,
    kind: 'kpi',
    defaultSize: 'sm',
    keywords: ['ltv', 'lifetime', 'valor do cliente', 'cliente vale'],
    compute: (c) => {
      const map = uniqueCustomers(c.allSales);
      const total = [...map.values()].reduce((a, b) => a + b, 0);
      const n = map.size;
      return {
        value: n > 0 ? c.formatCurrency(total / n) : '—',
        sub: `${n} cliente${n !== 1 ? 's' : ''} · histórico total`,
        tone: 'info',
      };
    },
  },
  {
    id: 'clients',
    title: 'Clientes Únicos',
    description: 'Quantos clientes diferentes já compraram.',
    category: 'clientes',
    icon: Users,
    kind: 'kpi',
    defaultSize: 'sm',
    keywords: ['clientes unicos', 'quantos clientes', 'base de clientes'],
    compute: (c) => {
      const map = customerCount(c.allSales);
      const periodMap = customerCount(c.allSales.filter((s) => inRange(s, c.start, c.end)));
      return {
        value: String(map.size),
        sub: `${periodMap.size} ativo${periodMap.size !== 1 ? 's' : ''} · ${c.periodLabel}`,
        tone: 'default',
      };
    },
  },
  {
    id: 'repurchase',
    title: 'Taxa de Recompra',
    description: 'Percentual de clientes que compraram mais de uma vez.',
    category: 'clientes',
    icon: Repeat,
    kind: 'kpi',
    defaultSize: 'sm',
    keywords: ['recompra', 'recorrencia', 'fidelidade', 'voltaram'],
    compute: (c) => {
      const map = customerCount(c.allSales);
      const n = map.size;
      const repeat = [...map.values()].filter((v) => v > 1).length;
      const pct = n > 0 ? (repeat / n) * 100 : 0;
      return {
        value: n > 0 ? `${pct.toFixed(0)}%` : '—',
        sub: `${repeat} de ${n} cliente${n !== 1 ? 's' : ''} recompraram`,
        tone: pct >= 30 ? 'good' : 'default',
      };
    },
  },
  {
    id: 'projection',
    title: 'Projeção do Mês',
    description: 'Faturamento projetado para o fim do mês no ritmo atual.',
    category: 'financeiro',
    icon: Calendar,
    kind: 'kpi',
    defaultSize: 'sm',
    keywords: ['projecao', 'previsao', 'estimativa', 'fim do mes', 'ritmo'],
    compute: (c) => {
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth();
      const monthStart = new Date(y, m, 1);
      const monthEnd = new Date(y, m + 1, 1);
      const daysInMonth = (monthEnd.getTime() - monthStart.getTime()) / 86_400_000;
      const dayOfMonth = now.getDate();
      let monthRevenue = 0;
      for (const s of c.allSales) {
        if (!s.created_at) continue;
        const d = new Date(s.created_at);
        if (d >= monthStart && d < monthEnd) monthRevenue += Number(s.total_amount || 0);
      }
      const projected = dayOfMonth > 0 ? (monthRevenue / dayOfMonth) * daysInMonth : 0;
      return {
        value: c.formatCurrency(projected),
        sub: `Ritmo atual · ${c.formatCurrency(monthRevenue)} até hoje`,
        tone: 'info',
      };
    },
  },
  {
    id: 'top-products',
    title: 'Top Produtos',
    description: 'Produtos mais vendidos no período.',
    category: 'estoque',
    icon: Boxes,
    kind: 'list',
    defaultSize: 'md',
    keywords: ['top produtos', 'mais vendidos', 'ranking produtos', 'campeoes'],
    compute: (c) => {
      const map = new Map<string, number>();
      for (const s of c.allSales) {
        if (!inRange(s, c.start, c.end)) continue;
        const name = s.product_name || s.product || 'Produto';
        map.set(name, (map.get(name) || 0) + Number(s.total_amount || 0));
      }
      const list = [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, v]) => ({ label, value: c.formatCurrency(v) }));
      return { value: `${map.size}`, sub: 'produtos no período', list };
    },
  },
  {
    id: 'top-clients',
    title: 'Top Clientes',
    description: 'Clientes que mais compraram (histórico).',
    category: 'clientes',
    icon: Crown,
    kind: 'list',
    defaultSize: 'md',
    keywords: ['top clientes', 'melhores clientes', 'quem mais compra', 'ranking clientes'],
    compute: (c) => {
      const map = new Map<string, number>();
      for (const s of c.allSales) {
        const name = s.customers?.name || s.customer_name || 'Cliente';
        map.set(name, (map.get(name) || 0) + Number(s.total_amount || 0));
      }
      const list = [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, v]) => ({ label, value: c.formatCurrency(v) }));
      return { value: `${map.size}`, sub: 'clientes no histórico', list };
    },
  },

  // ── Metas ──
  {
    id: 'goal',
    title: 'Meta do Mês',
    description: 'Progresso do faturamento em relação à meta.',
    category: 'metas',
    icon: Target,
    kind: 'progress',
    defaultSize: 'md',
    keywords: ['meta', 'objetivo', 'goal', 'progresso'],
    compute: (c) => ({
      value: c.meta > 0 ? `${Math.min(100, (c.revenue / c.meta) * 100).toFixed(0)}%` : '—',
      sub: c.meta > 0
        ? `${c.formatCurrency(c.revenue)} de ${c.formatCurrency(c.meta)}`
        : 'Defina uma meta mensal',
      progress: { current: c.revenue, target: c.meta },
      tone: 'default',
    }),
  },

  // ── IA ──
  {
    id: 'ai-insight',
    title: 'Insight Inteligente',
    description: 'Análise automática do seu negócio gerada por IA.',
    category: 'ia',
    icon: Sparkles,
    kind: 'insight',
    defaultSize: 'lg',
    keywords: ['insight', 'analise', 'ia', 'inteligencia', 'recomendacao', 'dica'],
    compute: (c) => ({
      value: '',
      sub: '',
      tone: 'info',
    }),
  },
];

// ─── Seções (blocos grandes) — renderizadas via node-map do Dashboard ──────────
// Cada uma tem um id estável usado como chave em `sections[id]`.
const emptyCompute = (): WidgetView => ({ value: '' });

export const SECTION_DEFS: WidgetDef[] = [
  { id: 'sec-meta', title: 'Meta do Mês', description: 'Acompanhe e edite sua meta mensal.', category: 'metas', icon: Target, kind: 'section', defaultSize: 'lg', keywords: ['meta', 'objetivo'], compute: emptyCompute },
  { id: 'sec-revenue-chart', title: 'Gráfico de Faturamento', description: 'Curva de faturamento do período.', category: 'financeiro', icon: BarChart3, kind: 'section', defaultSize: 'lg', keywords: ['grafico', 'faturamento', 'curva', 'evolucao'], compute: emptyCompute },
  { id: 'sec-sales-list', title: 'Vendas do Período', description: 'Lista das últimas vendas do período.', category: 'financeiro', icon: ShoppingCart, kind: 'section', defaultSize: 'lg', keywords: ['lista de vendas', 'ultimas vendas', 'vendas do periodo'], compute: emptyCompute },
  { id: 'sec-channel', title: 'Vendas por Canal', description: 'Distribuição de vendas por canal/pagamento.', category: 'financeiro', icon: Activity, kind: 'section', defaultSize: 'md', keywords: ['canal', 'pagamento', 'distribuicao'], compute: emptyCompute },
  { id: 'sec-sale-type', title: 'Receita por Tipo', description: 'Venda x troca e outros tipos.', category: 'financeiro', icon: Activity, kind: 'section', defaultSize: 'md', keywords: ['tipo', 'troca', 'receita por tipo'], compute: emptyCompute },
  { id: 'sec-origin', title: 'Origem dos Clientes', description: 'De onde vêm seus clientes.', category: 'clientes', icon: Users, kind: 'section', defaultSize: 'md', keywords: ['origem', 'instagram', 'olx', 'indicacao'], compute: emptyCompute },
  { id: 'sec-stock-alerts', title: 'Alertas de Estoque', description: 'Produtos com estoque baixo ou zerado.', category: 'estoque', icon: Boxes, kind: 'section', defaultSize: 'md', keywords: ['alerta de estoque', 'estoque baixo', 'ruptura'], compute: emptyCompute },
  { id: 'sec-top-products', title: 'Top Produtos (detalhado)', description: 'Ranking visual dos produtos mais vendidos.', category: 'estoque', icon: Boxes, kind: 'section', defaultSize: 'lg', keywords: ['top produtos detalhado', 'ranking detalhado'], compute: emptyCompute },
  { id: 'sec-installment-alerts', title: 'Alertas de Parcelas', description: 'Parcelas a prazo vencidas ou próximas.', category: 'financeiro', icon: Clock, kind: 'section', defaultSize: 'lg', keywords: ['parcela', 'atraso', 'vencimento', 'prazo alerta'], compute: emptyCompute },
  { id: 'sec-summary', title: 'Resumo Rápido', description: 'Faixa compacta com os números do período.', category: 'financeiro', icon: BarChart3, kind: 'section', defaultSize: 'lg', keywords: ['resumo', 'faixa', 'summary'], compute: emptyCompute },
];

// Todos os widgets (KPIs + seções) disponíveis na biblioteca.
export const ALL_WIDGETS: WidgetDef[] = [...WIDGETS, ...SECTION_DEFS];

export function isSectionWidget(widgetId: string): boolean {
  return SECTION_DEFS.some((s) => s.id === widgetId);
}

export const WIDGET_MAP: Record<string, WidgetDef> = Object.fromEntries(
  [...WIDGETS, ...SECTION_DEFS].map((w) => [w.id, w]),
);

export const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  financeiro: 'Financeiro',
  clientes: 'Clientes',
  estoque: 'Estoque',
  metas: 'Metas',
  ia: 'Inteligência Artificial',
};

// Layout padrão para quem ainda não personalizou.
export const DEFAULT_LAYOUT: WidgetInstance[] = [
  { instanceId: 'd-revenue', widgetId: 'revenue', size: 'sm' },
  { instanceId: 'd-cash', widgetId: 'cash', size: 'sm' },
  { instanceId: 'd-profit', widgetId: 'profit', size: 'sm' },
  { instanceId: 'd-prazo', widgetId: 'prazo', size: 'sm' },
  { instanceId: 'd-stock', widgetId: 'stock', size: 'sm' },
  { instanceId: 'd-ticket', widgetId: 'ticket', size: 'sm' },
  { instanceId: 'd-ltv', widgetId: 'ltv', size: 'sm' },
  { instanceId: 'd-goal', widgetId: 'goal', size: 'md' },
  // Seções (segundo grid)
  { instanceId: 'd-sec-meta', widgetId: 'sec-meta', size: 'lg' },
  { instanceId: 'd-sec-installment-alerts', widgetId: 'sec-installment-alerts', size: 'lg' },
  { instanceId: 'd-sec-revenue-chart', widgetId: 'sec-revenue-chart', size: 'lg' },
  { instanceId: 'd-sec-sales-list', widgetId: 'sec-sales-list', size: 'lg' },
  { instanceId: 'd-sec-channel', widgetId: 'sec-channel', size: 'md' },
  { instanceId: 'd-sec-origin', widgetId: 'sec-origin', size: 'md' },
  { instanceId: 'd-sec-sale-type', widgetId: 'sec-sale-type', size: 'md' },
  { instanceId: 'd-sec-stock-alerts', widgetId: 'sec-stock-alerts', size: 'md' },
  { instanceId: 'd-sec-top-products', widgetId: 'sec-top-products', size: 'lg' },
  { instanceId: 'd-sec-summary', widgetId: 'sec-summary', size: 'lg' },
];

// Mapeia um texto livre para o widget mais provável (fallback sem IA).
export function matchWidgetByText(text: string): WidgetDef | null {
  const t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  let best: { def: WidgetDef; score: number } | null = null;
  for (const w of ALL_WIDGETS) {
    let score = 0;
    for (const kw of w.keywords) {
      const k = kw.normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (t.includes(k)) score += k.length;
    }
    if (w.title && t.includes(w.title.toLowerCase())) score += 5;
    if (score > 0 && (!best || score > best.score)) best = { def: w, score };
  }
  return best?.def || null;
}
