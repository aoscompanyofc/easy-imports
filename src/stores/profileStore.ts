import { create } from 'zustand';

interface ProfileStore {
  name: string;
  cargo: string;
  avatar: string;
  telefone: string;
  setName: (name: string) => void;
  setCargo: (cargo: string) => void;
  setAvatar: (avatar: string) => void;
  setTelefone: (telefone: string) => void;
  hydrate: (supabaseName: string) => void;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  name: localStorage.getItem('user_name') || '',
  cargo: localStorage.getItem('user_cargo') || 'Administrador',
  avatar: localStorage.getItem('user_avatar') || '',
  telefone: localStorage.getItem('user_telefone') || '',

  setName: (name) => {
    localStorage.setItem('user_name', name);
    set({ name });
  },
  setCargo: (cargo) => {
    localStorage.setItem('user_cargo', cargo);
    set({ cargo });
  },
  setAvatar: (avatar) => {
    localStorage.setItem('user_avatar', avatar);
    set({ avatar });
  },
  setTelefone: (telefone) => {
    localStorage.setItem('user_telefone', telefone);
    set({ telefone });
  },
  hydrate: (supabaseName: string) => {
    if (!localStorage.getItem('user_name') && supabaseName) {
      localStorage.setItem('user_name', supabaseName);
      set({ name: supabaseName });
    }
  },
}));
