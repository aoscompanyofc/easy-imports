import React, { useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Maximize2, TrendingUp, TrendingDown, Sparkles, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  WIDGET_MAP, type WidgetInstance, type WidgetContext, type WidgetSize, type DrillKey,
} from '../../lib/dashboardWidgets';
import { useDashboardStore } from '../../store/dashboardStore';
import { aiRequestExtras } from '../../lib/aiSettings';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SIZE_CLASS: Record<WidgetSize, string> = {
  sm: 'col-span-1',
  md: 'col-span-2',
  lg: 'col-span-2 lg:col-span-4',
};

const NEXT_SIZE: Record<WidgetSize, WidgetSize> = { sm: 'md', md: 'lg', lg: 'sm' };

const TONE_TEXT: Record<string, string> = {
  default: 'text-neutral-900',
  good: 'text-green-600',
  bad: 'text-red-500',
  info: 'text-neutral-900',
};

function TrendBadge({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return null;
  const delta = ((cur - prev) / Math.abs(prev)) * 100;
  if (!isFinite(delta) || Math.abs(delta) < 0.5) return null;
  const up = delta >= 0;
  return (
    <span className={cn('flex items-center gap-0.5 text-[10px] font-bold', up ? 'text-green-600' : 'text-red-500')}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {Math.abs(delta).toFixed(0)}%
    </span>
  );
}

// ─── Widget de insight por IA ────────────────────────────────────────────────
function AiInsight({ ctx }: { ctx: WidgetContext }) {
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const summary =
      `Período: ${ctx.periodLabel}. Faturamento: ${ctx.formatCurrency(ctx.revenue)}. ` +
      `Lucro: ${ctx.formatCurrency(ctx.netProfit)}. Caixa: ${ctx.formatCurrency(ctx.cash)}. ` +
      `Vendas: ${ctx.salesCount}. Ticket médio: ${ctx.formatCurrency(ctx.salesCount ? ctx.revenue / ctx.salesCount : 0)}. ` +
      `A receber (prazo): ${ctx.formatCurrency(ctx.pendingReceivables)}. ` +
      `Estoque: ${ctx.formatCurrency(ctx.stockValue)}. Meta do mês: ${ctx.formatCurrency(ctx.meta)}.`;

    // Heurística local — usada se a IA não estiver configurada ou falhar.
    const localInsight = (): string => {
      const ticket = ctx.salesCount ? ctx.revenue / ctx.salesCount : 0;
      if (ctx.meta > 0 && ctx.revenue < ctx.meta * 0.5)
        return `Você está em ${((ctx.revenue / ctx.meta) * 100).toFixed(0)}% da meta. Acelere as vendas para alcançar ${ctx.formatCurrency(ctx.meta)} no mês.`;
      if (ctx.pendingReceivables > ctx.cash)
        return `Há ${ctx.formatCurrency(ctx.pendingReceivables)} a receber de vendas a prazo — acompanhe os recebimentos para não comprometer o caixa.`;
      if (ctx.netProfit < 0)
        return `Atenção: o lucro do período está negativo. Revise custos e margens dos produtos vendidos.`;
      if (ticket > 0)
        return `Seu ticket médio é ${ctx.formatCurrency(ticket)} em ${ctx.salesCount} vendas. Ofertas de acessórios podem elevar esse valor.`;
      return `Cadastre suas vendas para receber análises automáticas do seu negócio aqui.`;
    };

    (async () => {
      try {
        const res = await fetch('/api/insight', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ summary, mode: 'insight', ...aiRequestExtras() }),
        });
        const data = await res.json();
        if (!alive) return;
        setText(data?.insight || localInsight());
      } catch {
        if (alive) setText(localInsight());
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.revenue, ctx.netProfit, ctx.salesCount, ctx.periodLabel]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Sparkles size={14} className="text-primary" />
        <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest">Insight Inteligente</p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-neutral-400 py-2">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Analisando seu negócio…</span>
        </div>
      ) : (
        <p className="text-sm sm:text-base font-medium text-neutral-700 leading-snug">{text}</p>
      )}
    </div>
  );
}

interface Props {
  instance: WidgetInstance;
  ctx: WidgetContext;
  onDrill: (k: DrillKey) => void;
  sections?: Record<string, React.ReactNode>;
}

// Barra de controles do modo de edição (compartilhada por KPI e seção).
function EditControls({
  instanceId, size, kind, attributes, listeners,
}: {
  instanceId: string; size: WidgetSize; kind: string; attributes: any; listeners: any;
}) {
  const { removeWidget, setSize } = useDashboardStore();
  return (
    <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
      {kind !== 'insight' && (
        <button
          onClick={(e) => { e.stopPropagation(); setSize(instanceId, NEXT_SIZE[size]); }}
          className="p-1 rounded-lg bg-white/90 border border-neutral-200 text-neutral-500 hover:bg-neutral-100 shadow-sm"
          title="Redimensionar"
        >
          <Maximize2 size={13} />
        </button>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); removeWidget(instanceId); }}
        className="p-1 rounded-lg bg-white/90 border border-red-200 text-red-500 hover:bg-red-50 shadow-sm"
        title="Remover card"
      >
        <X size={13} />
      </button>
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="p-1 rounded-lg bg-white/90 border border-neutral-200 text-neutral-400 hover:bg-neutral-100 shadow-sm cursor-grab active:cursor-grabbing touch-none"
        title="Arrastar"
      >
        <GripVertical size={13} />
      </button>
    </div>
  );
}

export function WidgetCard({ instance, ctx, onDrill, sections }: Props) {
  const def = WIDGET_MAP[instance.widgetId];
  const { editMode, removeWidget, setSize } = useDashboardStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instance.instanceId,
    disabled: !editMode,
  });

  if (!def) return null;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // ── Widget de seção: renderiza o bloco grande vindo do Dashboard ──
  if (def.kind === 'section') {
    const spanClass = instance.size === 'lg' ? 'col-span-1 lg:col-span-2' : 'col-span-1';
    const node = sections?.[def.id];
    if (!node && !editMode) return null; // seção sem conteúdo no momento (ex: alertas vazios)
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          spanClass, 'relative min-w-0',
          editMode && 'ring-2 ring-primary/30 rounded-2xl',
          isDragging && 'z-50',
        )}
      >
        {editMode && (
          <EditControls instanceId={instance.instanceId} size={instance.size} kind={def.kind} attributes={attributes} listeners={listeners} />
        )}
        {node || (
          <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-6 text-center text-sm text-neutral-400">
            {def.title} — sem conteúdo no período atual
          </div>
        )}
      </div>
    );
  }

  const view = def.compute(ctx);
  const clickable = !editMode && view.drill;
  const Icon = def.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        SIZE_CLASS[instance.size],
        'relative bg-white rounded-2xl border border-neutral-200 shadow-sm p-3 sm:p-5 flex flex-col gap-1 min-w-0 overflow-hidden transition-all',
        clickable && 'cursor-pointer hover:border-primary/40 hover:shadow-md active:scale-[0.98]',
        editMode && 'ring-2 ring-primary/20 cursor-default',
        isDragging && 'z-50 shadow-xl',
      )}
      onClick={() => { if (clickable && view.drill) onDrill(view.drill); }}
    >
      {/* Controles do modo de edição */}
      {editMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          {def.kind !== 'insight' && (
            <button
              onClick={(e) => { e.stopPropagation(); setSize(instance.instanceId, NEXT_SIZE[instance.size]); }}
              className="p-1 rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              title="Redimensionar"
            >
              <Maximize2 size={13} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); removeWidget(instance.instanceId); }}
            className="p-1 rounded-lg bg-red-100 text-red-500 hover:bg-red-200"
            title="Remover card"
          >
            <X size={13} />
          </button>
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-lg bg-neutral-100 text-neutral-400 hover:bg-neutral-200 cursor-grab active:cursor-grabbing touch-none"
            title="Arrastar"
          >
            <GripVertical size={13} />
          </button>
        </div>
      )}

      {/* Conteúdo */}
      {def.kind === 'insight' ? (
        <AiInsight ctx={ctx} />
      ) : def.kind === 'list' ? (
        <>
          <div className="flex items-center gap-1.5">
            <Icon size={13} className="text-neutral-400" />
            <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest truncate">{def.title}</p>
          </div>
          <div className="mt-1 flex flex-col gap-1.5">
            {(view.list || []).length === 0 && <p className="text-sm text-neutral-400">Sem dados no período.</p>}
            {(view.list || []).map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-neutral-600">{i + 1}. {item.label}</span>
                <span className="font-bold text-neutral-900 flex-shrink-0">{item.value}</span>
              </div>
            ))}
          </div>
        </>
      ) : def.kind === 'progress' ? (
        <>
          <div className="flex items-center gap-1.5">
            <Icon size={13} className="text-neutral-400" />
            <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest truncate">{def.title}</p>
          </div>
          <p className="text-lg sm:text-2xl font-black text-neutral-900">{view.value}</p>
          {view.progress && view.progress.target > 0 && (
            <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, (view.progress.current / view.progress.target) * 100)}%` }}
              />
            </div>
          )}
          <p className="text-[10px] sm:text-xs text-neutral-400 truncate mt-0.5">{view.sub}</p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <Icon size={13} className="text-neutral-400" />
            <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest truncate">{def.title}</p>
          </div>
          <p className={cn('text-lg sm:text-2xl font-black truncate', TONE_TEXT[view.tone || 'default'])}>{view.value}</p>
          <div className="flex items-center justify-between gap-1">
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate">{view.sub}</p>
            {view.trend && <TrendBadge cur={view.trend.cur} prev={view.trend.prev} />}
          </div>
        </>
      )}
    </div>
  );
}
