import { create } from 'zustand';
import { AppState, SidebarMode } from '../types';
import { getStorage, setStorage } from '../lib/storage';

interface AppStore extends AppState {
  toggleSidebar: () => void;
  setSidebarMode: (mode: SidebarMode) => void;
}

const SIDEBAR_KEY = 'easy_imports_sidebar_collapsed';

export const useAppStore = create<AppStore>((set) => ({
  sidebarMode: getStorage<SidebarMode>(SIDEBAR_KEY, 'expanded'),

  toggleSidebar: () => {
    set((state) => {
      const newMode = state.sidebarMode === 'expanded' ? 'collapsed' : 'expanded';
      setStorage(SIDEBAR_KEY, newMode);
      return { sidebarMode: newMode };
    });
  },

  setSidebarMode: (mode: SidebarMode) => {
    set({ sidebarMode: mode });
    setStorage(SIDEBAR_KEY, mode);
  },
}));
