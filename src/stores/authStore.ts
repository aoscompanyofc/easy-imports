import { create } from 'zustand';
import { User, AuthState } from '../types';
import { getStorage, setStorage, removeStorage } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { useProfileStore } from './profileStore';
import { usePermissionsStore } from './permissionsStore';

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

const storedAuth = getStorage<{ isAuthenticated: boolean; user: User | null } | null>(STORAGE_KEY, null);

function makeUser(supabaseUser: any): User {
  return {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.name || 'João Eduardo',
    email: supabaseUser.email!,
    avatar: supabaseUser.user_metadata?.avatar_url || undefined,
  };
}

function afterLogin(user: User) {
  useProfileStore.getState().hydrate(user.id, user.name);
  usePermissionsStore.getState().loadPermissions(user.email);
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: storedAuth?.isAuthenticated || false,
  user: storedAuth?.user || null,
  isLoading: isSupabaseConfigured(),

  login: async (email, password) => {
    if (isSupabaseConfigured()) {
      // 1ª tentativa: fazer login normal
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (!signInError && signInData.user) {
        const user = makeUser(signInData.user);
        set({ isAuthenticated: true, user, isLoading: false });
        setStorage(STORAGE_KEY, { isAuthenticated: true, user });
        afterLogin(user);
        return;
      }

      // 2ª tentativa: se usuário não existe, criar automaticamente
      const isInvalidCredentials =
        signInError?.message?.toLowerCase().includes('invalid') ||
        signInError?.message?.toLowerCase().includes('not found') ||
        signInError?.status === 400;

      if (isInvalidCredentials) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: 'João Eduardo' } },
        });

        if (!signUpError && signUpData.user) {
          if (signUpData.session) {
            // Conta criada e confirmada automaticamente
            const user = makeUser(signUpData.user);
            set({ isAuthenticated: true, user, isLoading: false });
            setStorage(STORAGE_KEY, { isAuthenticated: true, user });
            afterLogin(user);
            return;
          } else {
            // Precisa confirmar email
            throw new Error(
              'Conta criada! Confirme seu email antes de entrar.\n' +
              'Dica: no Supabase Dashboard → Authentication → Settings → desative "Enable email confirmations".'
            );
          }
        }
      }

      throw new Error('Email ou senha inválidos');
    }

    // Modo mock (Supabase não configurado)
    if (email === 'easyimportsbrstore@gmail.com' && password === '123456') {
      const user: User = { id: '1', name: 'João Eduardo', email, avatar: 'JE' };
      set({ isAuthenticated: true, user, isLoading: false });
      setStorage(STORAGE_KEY, { isAuthenticated: true, user });
      afterLogin(user);
      return;
    }

    throw new Error('Email ou senha inválidos');
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
      const user = makeUser(data.user!);
      set({ isAuthenticated: true, user, isLoading: false });
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
      set({ isLoading: false });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const user = makeUser(session.user);
        set({ isAuthenticated: true, user });
        setStorage(STORAGE_KEY, { isAuthenticated: true, user });
        afterLogin(user);
      } else {
        set({ isAuthenticated: false, user: null });
        removeStorage(STORAGE_KEY);
        usePermissionsStore.getState().reset();
      }
    } catch {
      // Erro de rede — mantém estado do localStorage
    } finally {
      set({ isLoading: false });
    }
  },
}));
