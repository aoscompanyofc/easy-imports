import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface ProfileStore {
  name: string;
  cargo: string;
  avatar: string;
  telefone: string;
  cnpj: string;
  signature: string;
  setName: (name: string) => void;
  setCargo: (cargo: string) => void;
  setAvatar: (avatar: string) => void;
  setTelefone: (telefone: string) => void;
  setCnpj: (cnpj: string) => void;
  setSignature: (sig: string) => void;
  /** Called after login: loads profile from Supabase and hydrates store + localStorage */
  hydrate: (userId: string, supabaseName: string) => Promise<void>;
  /** Called on logout: clears in-memory state */
  reset: () => void;
}

// Persist to Supabase in background (fire-and-forget, silent on table-not-found)
async function syncToSupabase(uid: string, patch: Record<string, string>) {
  try {
    await supabase.from('user_profiles').upsert(
      { id: uid, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  } catch {
    // Table may not exist yet — silently ignore
  }
}

async function getCurrentUid(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export const useProfileStore = create<ProfileStore>((set) => ({
  // Initial state from localStorage (fast, no flash on reload)
  name: localStorage.getItem('user_name') || '',
  cargo: localStorage.getItem('user_cargo') || 'Administrador',
  avatar: localStorage.getItem('user_avatar') || '',
  telefone: localStorage.getItem('user_telefone') || '',
  cnpj: localStorage.getItem('company_cnpj') || '',
  signature: localStorage.getItem('user_signature') || '',

  setName: (name) => {
    localStorage.setItem('user_name', name);
    set({ name });
    getCurrentUid().then((uid) => { if (uid) syncToSupabase(uid, { name }); }).catch(() => {});
  },
  setCargo: (cargo) => {
    localStorage.setItem('user_cargo', cargo);
    set({ cargo });
    getCurrentUid().then((uid) => { if (uid) syncToSupabase(uid, { cargo }); }).catch(() => {});
  },
  setAvatar: (avatar) => {
    localStorage.setItem('user_avatar', avatar);
    set({ avatar });
    getCurrentUid().then((uid) => { if (uid) syncToSupabase(uid, { avatar }); }).catch(() => {});
  },
  setTelefone: (telefone) => {
    localStorage.setItem('user_telefone', telefone);
    set({ telefone });
    getCurrentUid().then((uid) => { if (uid) syncToSupabase(uid, { telefone }); }).catch(() => {});
  },
  setCnpj: (cnpj) => {
    localStorage.setItem('company_cnpj', cnpj);
    set({ cnpj });
    getCurrentUid().then((uid) => { if (uid) syncToSupabase(uid, { cnpj }); }).catch(() => {});
  },
  setSignature: (signature) => {
    localStorage.setItem('user_signature', signature);
    set({ signature });
    getCurrentUid().then((uid) => { if (uid) syncToSupabase(uid, { signature }); }).catch(() => {});
  },

  hydrate: async (userId: string, supabaseName: string) => {
    try {
      const { data } = await supabase
        .from('user_profiles').select('*').eq('id', userId).maybeSingle();

      if (data) {
        // Remote profile wins — update localStorage and store
        const name = data.name || supabaseName || localStorage.getItem('user_name') || '';
        const cargo = data.cargo || 'Administrador';
        const avatar = data.avatar || '';
        const telefone = data.telefone || '';
        const cnpj = data.cnpj || '';
        const signature = data.signature || '';

        localStorage.setItem('user_name', name);
        localStorage.setItem('user_cargo', cargo);
        localStorage.setItem('user_avatar', avatar);
        localStorage.setItem('user_telefone', telefone);
        localStorage.setItem('company_cnpj', cnpj);
        localStorage.setItem('user_signature', signature);

        set({ name, cargo, avatar, telefone, cnpj, signature });
      } else {
        // No remote profile yet — push local data to Supabase
        const name = localStorage.getItem('user_name') || supabaseName || '';
        const cargo = localStorage.getItem('user_cargo') || 'Administrador';
        const avatar = localStorage.getItem('user_avatar') || '';
        const telefone = localStorage.getItem('user_telefone') || '';
        const cnpj = localStorage.getItem('company_cnpj') || '';
        const signature = localStorage.getItem('user_signature') || '';

        if (name) {
          set({ name, cargo, avatar, telefone, cnpj, signature });
          await syncToSupabase(userId, { name, cargo, avatar, telefone, cnpj, signature });
        } else if (supabaseName) {
          localStorage.setItem('user_name', supabaseName);
          set({ name: supabaseName, cargo, avatar, telefone, cnpj, signature });
          await syncToSupabase(userId, { name: supabaseName, cargo, avatar, telefone, cnpj, signature });
        }
      }
    } catch {
      // Table doesn't exist yet — fall back to localStorage only
      const name = localStorage.getItem('user_name') || supabaseName || '';
      if (name) set({ name });
    }
  },

  reset: () => set({ name: '', cargo: 'Administrador', avatar: '', telefone: '', cnpj: '', signature: '' }),
}));
