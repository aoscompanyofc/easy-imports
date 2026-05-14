import { create } from 'zustand';
import { User, AuthState } from '../types';
import { getStorage, setStorage, removeStorage } from '../lib/storage';
import { supabase } from '../lib/supabase';

interface AuthStore extends AuthState {
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const STORAGE_KEY = 'easy_imports_auth';

const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && url !== 'YOUR_SUPABASE_URL' && url.includes('supabase.co') && key && key !== 'YOUR_SUPABASE_ANON_KEY';
};

// Read synchronously at module load time to prevent redirect flash on page reload
const storedAuth = getStorage<{ isAuthenticated: boolean; user: User | null } | null>(STORAGE_KEY, null);

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: storedAuth?.isAuthenticated || false,
  user: storedAuth?.user || null,
  // Only async-loading when Supabase needs to validate the session remotely
  isLoading: isSupabaseConfigured(),

  login: async (email, password) => {
    if (email === 'easyimportsbrstore@gmail.com' && password === '123456') {
      const user: User = { id: '1', name: 'João Eduardo', email, avatar: 'JE' };
      set({ isAuthenticated: true, user });
      setStorage(STORAGE_KEY, { isAuthenticated: true, user });
      return;
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Email ou senha inválidos');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Email ou senha inválidos');

    const user: User = {
      id: data.user.id,
      name: data.user.user_metadata.name || data.user.email?.split('@')[0],
      email: data.user.email!,
      avatar: data.user.user_metadata.avatar_url,
    };

    set({ isAuthenticated: true, user });
    setStorage(STORAGE_KEY, { isAuthenticated: true, user });
  },

  signup: async (email, password, name) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Cadastro não disponível no modo demo. Configure o Supabase para criar contas.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) throw new Error(error.message);

    if (data.session) {
      const user: User = {
        id: data.user!.id,
        name: data.user!.user_metadata.name || name,
        email: data.user!.email!,
      };
      set({ isAuthenticated: true, user });
      setStorage(STORAGE_KEY, { isAuthenticated: true, user });
      return { needsConfirmation: false };
    }

    return { needsConfirmation: true };
  },

  logout: async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    set({ isAuthenticated: false, user: null });
    removeStorage(STORAGE_KEY);
  },

  checkAuth: async () => {
    if (!isSupabaseConfigured()) {
      // Already initialized synchronously from localStorage above
      set({ isLoading: false });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const user: User = {
          id: session.user.id,
          name: session.user.user_metadata.name || session.user.email?.split('@')[0],
          email: session.user.email!,
          avatar: session.user.user_metadata.avatar_url,
        };
        set({ isAuthenticated: true, user });
        setStorage(STORAGE_KEY, { isAuthenticated: true, user });
      } else {
        // Supabase session expired — clear stale localStorage auth
        set({ isAuthenticated: false, user: null });
        removeStorage(STORAGE_KEY);
      }
    } catch {
      // Network error — keep whatever was loaded from localStorage
    } finally {
      set({ isLoading: false });
    }
  },
}));
