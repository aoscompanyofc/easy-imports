import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  ALL_WIDGETS, WIDGET_MAP, CATEGORY_LABELS, matchWidgetByText,
  type WidgetCategory,
} from '../../lib/dashboardWidgets';
import { useDashboardStore } from '../../store/dashboardStore';
import { aiRequestExtras } from '../../lib/aiSettings';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ORDER: WidgetCategory[] = ['financeiro', 'clientes', 'estoque', 'metas', 'ia'];

export function AddWidgetModal({ open, onClose }: Props) {
  const addWidget = useDashboardStore((s) => s.addWidget);
  const [prompt, setPrompt] = useState('');
  const [thinking, setThinking] = useState(false);

  if (!open) return null;

  const handleAdd = (id: string) => {
    addWidget(id);
    toast.success(`"${WIDGET_MAP[id]?.title}" adicionado`);
  };

  const handleCreateFromText = async () => {
    const text = prompt.trim();
    if (!text) return;
    setThinking(true);
    try {
      // 1) Tenta a IA mapear o pedido para um widget existente.
      let chosenId: string | null = null;
      try {
        const list = ALL_WIDGETS.map((w) => `${w.id}: ${w.title} — ${w.description}`).join('\n');
        const res = await fetch('/api/insight', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            mode: 'create',
            summary: `Pedido do usuário: "${text}".\n\nWidgets disponíveis:\n${list}\n\nResponda apenas com o id do widget mais adequado.`,
            ...aiRequestExtras(),
          }),
        });
        const data = await res.json();
        const raw = (data?.insight || '').trim().toLowerCase();
        if (raw && WIDGET_MAP[raw]) chosenId = raw;
        else {
          const found = ALL_WIDGETS.find((w) => raw.includes(w.id));
          if (found) chosenId = found.id;
        }
      } catch { /* cai no matcher local */ }

      // 2) Fallback: matcher por palavras-chave (funciona sem IA).
      if (!chosenId) {
        const m = matchWidgetByText(text);
        chosenId = m?.id || null;
      }

      if (chosenId) {
        handleAdd(chosenId);
        setPrompt('');
      } else {
        toast.error('Não encontrei um card para esse pedido. Tente termos como "LTV", "ticket médio" ou "projeção".');
      }
    } finally {
      setThinking(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Biblioteca de Cards</p>
            <p className="text-base font-black text-neutral-900 mt-0.5">Adicionar ao Dashboard</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400">
            <X size={18} />
          </button>
        </div>

        {/* Criação por linguagem natural */}
        <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/60">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={14} className="text-primary" />
            <p className="text-xs font-bold text-neutral-600">Criar com IA — descreva o card que você quer</p>
          </div>
          <div className="flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !thinking) handleCreateFromText(); }}
              placeholder='Ex: "card de LTV" ou "produtos mais vendidos"'
              className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleCreateFromText}
              disabled={thinking || !prompt.trim()}
              className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-bold text-sm hover:bg-neutral-800 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {thinking ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Criar
            </button>
          </div>
        </div>

        {/* Biblioteca por categoria */}
        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {ORDER.map((cat) => {
            const items = ALL_WIDGETS.filter((w) => w.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">{CATEGORY_LABELS[cat]}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((w) => {
                    const Icon = w.icon;
                    return (
                      <button
                        key={w.id}
                        onClick={() => handleAdd(w.id)}
                        className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 hover:border-primary/40 hover:bg-neutral-50 transition-all text-left group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10">
                          <Icon size={17} className="text-neutral-500 group-hover:text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-neutral-800 truncate">{w.title}</p>
                          <p className="text-xs text-neutral-400 leading-tight">{w.description}</p>
                        </div>
                        <Plus size={16} className="text-neutral-300 group-hover:text-primary ml-auto flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
