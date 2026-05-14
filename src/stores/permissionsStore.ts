import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const ALL_PAGES = [
  'dashboard', 'vendas', 'estoque', 'clientes', 'leads',
  'financeiro', 'fornecedores', 'marketing', 'relatorios',
  'documentacao', 'configuracoes',
] as const;

export type PageKey = typeof ALL_PAGES[number];

export const DEFAULT_VENDEDOR_PAGES: PageKey[] = [
  'dashboard', 'vendas', 'estoque', 'clientes', 'leads',
];

interface PermissionsStore {
  role: 'admin' | 'vendedor' | null;
  allowedPages: string[];
  isAdmin: boolean;
  loaded: boolean;
  loadPermissions: (email: string) => Promise<void>;
  reset: () => void;
}

export const usePermissionsStore = create<PermissionsStore>((set) => ({
  role: null,
  allowedPages: [...ALL_PAGES],
  isAdmin: true,
  loaded: false,

  loadPermissions: async (email: string) => {
    try {
      const { data } = await supabase
        .from('team_members')
        .select('role, allowed_pages')
        .eq('email', email)
        .maybeSingle();

      if (data) {
        // Found in team_members → restricted collaborator
        set({
          role: data.role as 'admin' | 'vendedor',
          allowedPages: data.allowed_pages as string[],
          isAdmin: data.role === 'admin',
          loaded: true,
        });
      } else {
        // No record → owner (admin)
        set({ role: 'admin', allowedPages: [...ALL_PAGES], isAdmin: true, loaded: true });
      }
    } catch (err: any) {
      const isTableMissing = err?.code === '42P01' || err?.message?.includes('does not exist');
      if (isTableMissing) {
        // Table not set up yet → treat as owner/admin
        set({ role: 'admin', allowedPages: [...ALL_PAGES], isAdmin: true, loaded: true });
      } else {
        // Network or auth error → fail safe: minimal access until resolved
        set({ role: 'vendedor', allowedPages: ['dashboard', 'vendas'], isAdmin: false, loaded: true });
      }
    }
  },

  reset: () => set({ role: null, allowedPages: [...ALL_PAGES], isAdmin: true, loaded: false }),
}));
