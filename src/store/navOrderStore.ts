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
  editMode: boolean;
  loaded: boolean;
  setEditMode: (on: boolean) => void;
  load: () => Promise<void>;
  reorder: (activeKey: string, overKey: string) => void;
  resetOrder: () => void;
  persist: () => void;
}

export const useNavOrderStore = create<NavOrderState>((set, get) => ({
  order: DEFAULT_NAV_ORDER,
  editMode: false,
  loaded: false,

  setEditMode: (on) => set({ editMode: on }),

  load: async () => {
    try {
      const saved = await dataService.getNavOrder();
      if (saved && Array.isArray(saved) && saved.length > 0) {
        // Só mantém chaves que ainda existem no sistema e anexa páginas novas
        // que não estavam no pedido salvo (ex.: Processos, adicionada depois).
        let valid = saved.filter((key) => DEFAULT_NAV_ORDER.includes(key));
        const missing = DEFAULT_NAV_ORDER.filter((key) => !valid.includes(key));
        if (missing.length > 0) valid = [...valid, ...missing];
        set({ order: valid, loaded: true });
        if (valid.length !== saved.length) get().persist();
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

  resetOrder: () => {
    set({ order: DEFAULT_NAV_ORDER });
    get().persist();
  },

  persist: () => {
    dataService.saveNavOrder(get().order).catch(() => { /* silencioso */ });
  },
}));
