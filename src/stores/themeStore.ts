import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  isDark: boolean;
  isLiquidGlass: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
  toggleLiquidGlass: () => void;
  setLiquidGlass: (v: boolean) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDark: true,
      isLiquidGlass: true,
      toggle: () => set((s) => ({ isDark: !s.isDark })),
      setDark: (v) => set({ isDark: v }),
      toggleLiquidGlass: () => set((s) => ({ isLiquidGlass: !s.isLiquidGlass })),
      setLiquidGlass: (v) => set({ isLiquidGlass: v }),
    }),
    { name: 'easy-imports-theme' }
  )
);
