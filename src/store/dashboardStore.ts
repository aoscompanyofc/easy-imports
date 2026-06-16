import { create } from 'zustand';
import { dataService } from '../lib/dataService';
import { DEFAULT_LAYOUT, WIDGET_MAP, isSectionWidget, type WidgetInstance, type WidgetSize } from '../lib/dashboardWidgets';
import { safeUUID } from '../lib/storage';

interface DashboardState {
  widgets: WidgetInstance[];
  editMode: boolean;
  loaded: boolean;
  setEditMode: (on: boolean) => void;
  load: () => Promise<void>;
  reorder: (activeId: string, overId: string) => void;
  addWidget: (widgetId: string) => void;
  removeWidget: (instanceId: string) => void;
  setSize: (instanceId: string, size: WidgetSize) => void;
  resetLayout: () => void;
  persist: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useDashboardStore = create<DashboardState>((set, get) => ({
  widgets: DEFAULT_LAYOUT,
  editMode: false,
  loaded: false,

  setEditMode: (on) => set({ editMode: on }),

  load: async () => {
    try {
      const saved = await dataService.getDashboardLayout();
      if (saved && Array.isArray(saved) && saved.length > 0) {
        // Filtra widgets que não existem mais no registry
        let valid = saved.filter((w: WidgetInstance) => WIDGET_MAP[w.widgetId]);
        const before = valid.length;
        // Deduplica: cada widget é único no dashboard (sem cards repetidos)
        const seen = new Set<string>();
        valid = valid.filter((w: WidgetInstance) => {
          if (seen.has(w.widgetId)) return false;
          seen.add(w.widgetId);
          return true;
        });
        // Migração: se o layout salvo (versão antiga) não tem nenhuma seção,
        // anexa as seções padrão para o usuário não perder gráficos/listas.
        if (valid.length > 0 && !valid.some((w: WidgetInstance) => isSectionWidget(w.widgetId))) {
          const sectionDefaults = DEFAULT_LAYOUT.filter((w) => isSectionWidget(w.widgetId));
          valid = [...valid, ...sectionDefaults];
        }
        const finalWidgets = valid.length > 0 ? valid : DEFAULT_LAYOUT;
        set({ widgets: finalWidgets, loaded: true });
        // Se limpou duplicatas ou migrou, regrava o layout corrigido.
        if (valid.length !== before) get().persist();
        return;
      }
    } catch {
      /* usa layout padrão */
    }
    set({ loaded: true });
  },

  reorder: (activeId, overId) => {
    const widgets = [...get().widgets];
    const from = widgets.findIndex((w) => w.instanceId === activeId);
    const to = widgets.findIndex((w) => w.instanceId === overId);
    if (from === -1 || to === -1) return;
    const [moved] = widgets.splice(from, 1);
    widgets.splice(to, 0, moved);
    set({ widgets });
    get().persist();
  },

  addWidget: (widgetId) => {
    const def = WIDGET_MAP[widgetId];
    if (!def) return;
    // Evita duplicatas: cada card existe uma única vez no dashboard.
    if (get().widgets.some((w) => w.widgetId === widgetId)) return;
    const instance: WidgetInstance = {
      instanceId: safeUUID(),
      widgetId,
      size: def.defaultSize,
    };
    set({ widgets: [...get().widgets, instance] });
    get().persist();
  },

  removeWidget: (instanceId) => {
    set({ widgets: get().widgets.filter((w) => w.instanceId !== instanceId) });
    get().persist();
  },

  setSize: (instanceId, size) => {
    set({
      widgets: get().widgets.map((w) =>
        w.instanceId === instanceId ? { ...w, size } : w,
      ),
    });
    get().persist();
  },

  resetLayout: () => {
    set({ widgets: DEFAULT_LAYOUT });
    get().persist();
  },

  persist: () => {
    if (saveTimer) clearTimeout(saveTimer);
    const snapshot = get().widgets;
    saveTimer = setTimeout(() => {
      dataService.saveDashboardLayout(snapshot).catch(() => { /* silencioso */ });
    }, 600);
  },
}));
