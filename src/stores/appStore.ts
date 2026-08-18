import { create } from 'zustand';
import { AppState, SidebarMode } from '../types';
import { getStorage, setStorage } from '../lib/storage';

export type SidebarPosition = 'left' | 'top';

interface AppStore extends AppState {
  sidebarPosition: SidebarPosition;
  toggleSidebar: () => void;
  setSidebarMode: (mode: SidebarMode) => void;
  setSidebarPosition: (position: SidebarPosition) => void;
}

const SIDEBAR_KEY = 'easy_imports_sidebar_collapsed';
const SIDEBAR_POSITION_KEY = 'easy-imports-sidebar-position';

export const useAppStore = create<AppStore>((set) => ({
  sidebarMode: getStorage<SidebarMode>(SIDEBAR_KEY, 'expanded'),
  sidebarPosition: getStorage<SidebarPosition>(SIDEBAR_POSITION_KEY, 'left'),

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

  setSidebarPosition: (position: SidebarPosition) => {
    set({ sidebarPosition: position });
    setStorage(SIDEBAR_POSITION_KEY, position);
  },
}));
