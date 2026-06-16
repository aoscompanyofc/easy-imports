import React, { useEffect, useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { LayoutGrid, Plus, Check, RotateCcw } from 'lucide-react';
import { useDashboardStore } from '../../store/dashboardStore';
import { type WidgetContext, type DrillKey, isSectionWidget } from '../../lib/dashboardWidgets';
import { WidgetCard } from './WidgetCard';
import { AddWidgetModal } from './AddWidgetModal';

interface Props {
  ctx: WidgetContext;
  onDrill: (k: DrillKey) => void;
  sections?: Record<string, React.ReactNode>;
}

export function WidgetGrid({ ctx, onDrill, sections }: Props) {
  const { widgets, editMode, setEditMode, reorder, resetLayout, load, loaded } = useDashboardStore();
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    reorder(String(active.id), String(over.id));
  };

  const kpiWidgets = widgets.filter((w) => !isSectionWidget(w.widgetId));
  const sectionWidgets = widgets.filter((w) => isSectionWidget(w.widgetId));

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
          <LayoutGrid size={13} /> Meus Cards
        </p>
        <div className="flex items-center gap-2">
          {editMode && (
            <>
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
              >
                <Plus size={14} /> Adicionar card
              </button>
              <button
                onClick={resetLayout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-bold hover:bg-neutral-200 transition-colors"
                title="Restaurar layout padrão"
              >
                <RotateCcw size={14} /> Restaurar
              </button>
            </>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            className={
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ' +
              (editMode
                ? 'bg-primary text-neutral-900 hover:brightness-95'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')
            }
          >
            {editMode ? <><Check size={14} /> Concluir</> : <><LayoutGrid size={14} /> Personalizar</>}
          </button>
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3 border-2 border-dashed border-neutral-200 rounded-2xl">
          <p className="text-sm text-neutral-400">Nenhum card no dashboard.</p>
          <button
            onClick={() => { setEditMode(true); setAddOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-bold"
          >
            <Plus size={15} /> Adicionar card
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="space-y-4 sm:space-y-6">
            {/* Band 1: KPIs compactos (4 colunas) */}
            {kpiWidgets.length > 0 && (
              <SortableContext items={kpiWidgets.map((w) => w.instanceId)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {kpiWidgets.map((w) => (
                    <WidgetCard key={w.instanceId} instance={w} ctx={ctx} onDrill={onDrill} sections={sections} />
                  ))}
                </div>
              </SortableContext>
            )}

            {/* Band 2: Seções grandes (2 colunas) */}
            {sectionWidgets.length > 0 && (
              <SortableContext items={sectionWidgets.map((w) => w.instanceId)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
                  {sectionWidgets.map((w) => (
                    <WidgetCard key={w.instanceId} instance={w} ctx={ctx} onDrill={onDrill} sections={sections} />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        </DndContext>
      )}

      <AddWidgetModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
