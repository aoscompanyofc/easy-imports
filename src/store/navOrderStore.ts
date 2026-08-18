import { create } from 'zustand';
import { dataService } from '../lib/dataService';

// Tarefas fica na 5ª posição por padrão (usuário disse que vai usar bastante).
export const DEFAULT_NAV_ORDER = [
  'dashboard', 'vendas', 'estoque', 'clientes', 'tarefas',
  'leads', 'financeiro', 'fornecedores', 'marketing', 'relatorios',
  'documentacao', 'vendedores', 'mensagens', 'calculadora', 'processos',
];

interface NavOrderState {
  order: string[];
  hidden: string[];
  editMode: boolean;
  loaded: boolean;
  setEditMode: (on: boolean) => void;
  load: () => Promise<void>;
  reorder: (activeKey: string, overKey: string) => void;
  toggleHidden: (key: string) => void;
  resetOrder: () => void;
  persist: () => void;
}

export const useNavOrderStore = create<NavOrderState>((set, get) => ({
  order: DEFAULT_NAV_ORDER,
  hidden: [],
  editMode: false,
  loaded: false,

  setEditMode: (on) => set({ editMode: on }),

  load: async () => {
    try {
      const saved = await dataService.getNavOrder();
      if (saved && Array.isArray(saved.order) && saved.order.length > 0) {
        // Só mantém chaves que ainda existem no sistema e anexa páginas novas
        // que não estavam no pedido salvo (ex.: Processos, adicionada depois).
        let valid = saved.order.filter((key) => DEFAULT_NAV_ORDER.includes(key));
        const missing = DEFAULT_NAV_ORDER.filter((key) => !valid.includes(key));
        if (missing.length > 0) valid = [...valid, ...missing];
        const hidden = (saved.hidden || []).filter((key) => DEFAULT_NAV_ORDER.includes(key));
        set({ order: valid, hidden, loaded: true });
        if (valid.length !== saved.order.length) get().persist();
        return;
      }
    } catch {
      /* usa ordem padrão */
    }
    set({ loaded: true });
  },

  reorder: (activeKey, overKey) => {
    const order = [...get().order];
    const from = order.indexOf(activeKey);
    const to = order.indexOf(overKey);
    if (from === -1 || to === -1) return;
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    set({ order });
    get().persist();
  },

  toggleHidden: (key) => {
    const hidden = get().hidden.includes(key)
      ? get().hidden.filter((k) => k !== key)
      : [...get().hidden, key];
    set({ hidden });
    get().persist();
  },

  resetOrder: () => {
    set({ order: DEFAULT_NAV_ORDER, hidden: [] });
    get().persist();
  },

  persist: () => {
    dataService.saveNavOrder({ order: get().order, hidden: get().hidden }).catch(() => { /* silencioso */ });
  },
}));
