import React, { useEffect } from 'react';
import { NavLink, useMatch } from 'react-router-dom';
import {
  LucideIcon, GripVertical, Pencil, Check, RotateCcw, Eye, EyeOff, PanelLeft,
} from 'lucide-react';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, horizontalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../../stores/appStore';
import { usePermissionsStore } from '../../stores/permissionsStore';
import { useNavOrderStore } from '../../store/navOrderStore';
import { ALL_MENU_ITEMS, SETTINGS_ITEM, buildOrderedItems, type NavMenuItem } from '../../lib/navItems';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TOP_NAV_HEIGHT = 60;

const TopNavItem: React.FC<{ icon: LucideIcon; label: string; path: string }> = ({ icon: Icon, label, path }) => {
  const match = useMatch(path);
  const isActive = !!match;
  return (
    <NavLink
      to={path}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 flex-shrink-0 whitespace-nowrap',
        isActive
          ? 'bg-neutral-900 text-white dark:bg-primary/15 dark:text-primary'
          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
      )}
    >
      <Icon size={15} className="flex-shrink-0" />
      <span className={cn('text-sm', isActive ? 'font-semibold' : 'font-medium')}>{label}</span>
    </NavLink>
  );
};

// Item arrastável — usado só quando o modo de reorganizar está ativo.
const SortableTopItem: React.FC<{ item: NavMenuItem; isHidden: boolean; onToggleHidden: () => void }> = ({ item, isHidden, onToggleHidden }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.path.slice(1) });
  const Icon = item.icon;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={cn(
        'flex items-center gap-1 pl-0.5 pr-1 py-1 rounded-lg border flex-shrink-0',
        isHidden ? 'bg-neutral-50/50 border-dashed border-neutral-200' : 'bg-neutral-50 border-neutral-100',
      )}
    >
      <button {...attributes} {...listeners} className="p-1 text-neutral-300 hover:text-neutral-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
        <GripVertical size={13} />
      </button>
      <Icon size={14} className={cn('flex-shrink-0', isHidden ? 'text-neutral-300' : 'text-neutral-400')} />
      <span className={cn('text-xs font-medium whitespace-nowrap px-0.5', isHidden ? 'text-neutral-400 line-through' : 'text-neutral-700')}>{item.label}</span>
      <button
        onClick={onToggleHidden}
        title={isHidden ? 'Mostrar no menu' : 'Ocultar do menu'}
        className={cn('p-1 rounded-md transition-colors flex-shrink-0', isHidden ? 'text-neutral-300 hover:text-primary-700 hover:bg-primary/10' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200')}
      >
        {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
};

export const TopNav: React.FC = () => {
  const { setSidebarPosition } = useAppStore();
  const { allowedPages } = usePermissionsStore();
  const { order, hidden, editMode, loaded, setEditMode, load, reorder, toggleHidden, resetOrder } = useNavOrderStore();

  useEffect(() => { load(); }, [load]);

  const orderedItems = loaded
    ? [...order.map((key) => ALL_MENU_ITEMS.find((i) => i.path.slice(1) === key)).filter(Boolean) as NavMenuItem[], ...ALL_MENU_ITEMS.filter((i) => !order.includes(i.path.slice(1)))]
    : ALL_MENU_ITEMS;

  const editableItems = orderedItems.filter((item) => allowedPages.includes(item.path.slice(1)));
  const mainItems = editMode ? editableItems : buildOrderedItems(order, hidden, loaded).filter((item) => allowedPages.includes(item.path.slice(1)));
  const showSettings = allowedPages.includes('configuracoes');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) reorder(String(active.id), String(over.id));
  };

  return (
    <div
      className="hidden lg:flex items-center gap-3 bg-white border-b border-neutral-100 fixed top-0 left-0 right-0 z-30 px-4"
      style={{ height: TOP_NAV_HEIGHT }}
    >
      {/* Logo */}
      <NavLink to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
        <img src="/favicon.png" alt="Easy Imports" className="w-7 h-7 rounded-lg flex-shrink-0" />
        <span className="font-bold text-[15px] tracking-tight whitespace-nowrap text-neutral-900 hidden xl:inline">
          Easy<span className="text-primary">Imports</span>
        </span>
      </NavLink>

      <div className="h-6 w-px bg-neutral-100 flex-shrink-0" />

      {/* Navegação */}
      {editMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={mainItems.map((i) => i.path.slice(1))} strategy={horizontalListSortingStrategy}>
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1" aria-label="Reorganizar navegação">
              {mainItems.map((item) => (
                <SortableTopItem
                  key={item.path}
                  item={item}
                  isHidden={hidden.includes(item.path.slice(1))}
                  onToggleHidden={() => toggleHidden(item.path.slice(1))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <nav className="flex-1 flex items-center gap-1 overflow-x-auto" aria-label="Navegação principal">
          {mainItems.map((item) => (
            <TopNavItem key={item.path} icon={item.icon} label={item.label} path={item.path} />
          ))}
          {showSettings && (
            <>
              <div className="h-6 w-px bg-neutral-100 flex-shrink-0 mx-1" />
              <TopNavItem icon={SETTINGS_ITEM.icon} label={SETTINGS_ITEM.label} path={SETTINGS_ITEM.path} />
            </>
          )}
        </nav>
      )}

      {/* Controles de edição */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {editMode && (
          <>
            <button
              onClick={() => setSidebarPosition('left')}
              title="Mover menu pra lateral"
              className="p-1.5 text-neutral-300 hover:text-neutral-600 transition-colors"
            >
              <PanelLeft size={14} />
            </button>
            <button
              onClick={resetOrder}
              title="Restaurar menu padrão"
              className="p-1.5 text-neutral-300 hover:text-neutral-600 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
          </>
        )}
        <button
          onClick={() => setEditMode(!editMode)}
          title={editMode ? 'Concluir' : 'Reorganizar / ocultar páginas'}
          className={cn('p-1.5 rounded-lg transition-colors', editMode ? 'text-primary-700 bg-primary/10' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100')}
        >
          {editMode ? <Check size={15} /> : <Pencil size={14} />}
        </button>
      </div>
    </div>
  );
};
