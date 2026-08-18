import React, { useEffect } from 'react';
import { NavLink, useMatch } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, LucideIcon,
  GripVertical, Pencil, Check, RotateCcw, Eye, EyeOff, PanelTop,
} from 'lucide-react';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
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

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  path: string;
  isCollapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, path, isCollapsed }) => {
  const match = useMatch(path);
  const isActive = !!match;

  return (
    <NavLink
      to={path}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? label : undefined}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 overflow-hidden',
        isCollapsed ? 'justify-center' : '',
        isActive
          ? 'bg-neutral-900 text-white dark:bg-primary/15 dark:text-primary'
          : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'
      )}
    >
      <Icon
        size={17}
        className={cn(
          'flex-shrink-0 transition-colors duration-150',
          isActive ? 'text-white dark:text-primary' : 'group-hover:text-neutral-700 dark:group-hover:text-neutral-200'
        )}
      />
      {!isCollapsed && (
        <span className={cn('truncate text-sm transition-all', isActive ? 'font-semibold' : 'font-medium')}>
          {label}
        </span>
      )}
    </NavLink>
  );
};

// Item arrastável — usado só quando o modo de reorganizar está ativo.
const SortableNavItem: React.FC<{ item: NavMenuItem; isHidden: boolean; onToggleHidden: () => void }> = ({ item, isHidden, onToggleHidden }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.path.slice(1) });
  const Icon = item.icon;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={cn(
        'flex items-center gap-1.5 px-1 py-1 rounded-lg border',
        isHidden ? 'bg-neutral-50/50 border-dashed border-neutral-200' : 'bg-neutral-50 border-neutral-100',
      )}
    >
      <button {...attributes} {...listeners} className="p-1.5 text-neutral-300 hover:text-neutral-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
        <GripVertical size={14} />
      </button>
      <Icon size={15} className={cn('flex-shrink-0', isHidden ? 'text-neutral-300' : 'text-neutral-400')} />
      <span className={cn('text-sm font-medium truncate flex-1', isHidden ? 'text-neutral-400 line-through' : 'text-neutral-700')}>{item.label}</span>
      <button
        onClick={onToggleHidden}
        title={isHidden ? 'Mostrar no menu' : 'Ocultar do menu'}
        className={cn('p-1.5 rounded-md transition-colors flex-shrink-0', isHidden ? 'text-neutral-300 hover:text-primary-700 hover:bg-primary/10' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200')}
      >
        {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { sidebarMode, toggleSidebar, sidebarPosition, setSidebarPosition } = useAppStore();
  const { allowedPages } = usePermissionsStore();
  const { order, hidden, editMode, loaded, setEditMode, load, reorder, toggleHidden, resetOrder } = useNavOrderStore();

  useEffect(() => { load(); }, [load]);

  if (sidebarPosition === 'top') return null;

  const isCollapsed = sidebarMode === 'collapsed';

  const orderedItems = loaded
    ? [...order.map((key) => ALL_MENU_ITEMS.find((i) => i.path.slice(1) === key)).filter(Boolean) as NavMenuItem[], ...ALL_MENU_ITEMS.filter((i) => !order.includes(i.path.slice(1)))]
    : ALL_MENU_ITEMS;

  // Em modo normal, itens ocultos somem. Em modo de edição, aparecem riscados
  // (pra poder reativar). Os dois casos sempre respeitam as permissões da equipe.
  const editableItems = orderedItems.filter((item) => allowedPages.includes(item.path.slice(1)));
  const mainItems = editMode ? editableItems : buildOrderedItems(order, hidden, loaded).filter((item) => allowedPages.includes(item.path.slice(1)));
  const showSettings = allowedPages.includes('configuracoes');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) reorder(String(active.id), String(over.id));
  };

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-white border-r border-neutral-100 transition-all duration-300 fixed left-0 top-0 h-screen z-30',
        isCollapsed ? 'w-[72px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <NavLink
        to="/dashboard"
        className="h-16 flex items-center flex-shrink-0 overflow-hidden px-4"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/favicon.png" alt="Easy Imports" className="w-8 h-8 rounded-lg flex-shrink-0" />
          {!isCollapsed && (
            <span className="font-bold text-[17px] tracking-tight whitespace-nowrap text-neutral-900">
              Easy<span className="text-primary">Imports</span>
            </span>
          )}
        </div>
      </NavLink>

      {/* Divider */}
      <div className="mx-3 h-px bg-neutral-100 mb-2" />

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[26px] w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm z-[40]"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Reorganizar / ocultar / posição do menu — só quando expandido */}
      {!isCollapsed && (
        <div className="px-3 mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">
            {editMode ? 'Editar menu' : 'Menu'}
          </span>
          <div className="flex items-center gap-1">
            {editMode && (
              <>
                <button
                  onClick={() => setSidebarPosition('top')}
                  title="Mover menu pra cima da tela"
                  className="p-1 text-neutral-300 hover:text-neutral-600 transition-colors"
                >
                  <PanelTop size={12} />
                </button>
                <button
                  onClick={resetOrder}
                  title="Restaurar menu padrão"
                  className="p-1 text-neutral-300 hover:text-neutral-600 transition-colors"
                >
                  <RotateCcw size={12} />
                </button>
              </>
            )}
            <button
              onClick={() => setEditMode(!editMode)}
              title={editMode ? 'Concluir' : 'Reorganizar / ocultar páginas'}
              className={cn('p-1 transition-colors', editMode ? 'text-primary-700' : 'text-neutral-300 hover:text-neutral-600')}
            >
              {editMode ? <Check size={13} /> : <Pencil size={12} />}
            </button>
          </div>
        </div>
      )}

      {/* Main navigation */}
      {editMode && !isCollapsed ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={mainItems.map((i) => i.path.slice(1))} strategy={verticalListSortingStrategy}>
            <nav className="flex-1 px-2 space-y-1 overflow-y-auto overflow-x-hidden" aria-label="Reorganizar navegação">
              {mainItems.map((item) => (
                <SortableNavItem
                  key={item.path}
                  item={item}
                  isHidden={hidden.includes(item.path.slice(1))}
                  onToggleHidden={() => toggleHidden(item.path.slice(1))}
                />
              ))}
            </nav>
          </SortableContext>
        </DndContext>
      ) : (
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden" aria-label="Navegação principal">
          {mainItems.map((item) => (
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>
      )}

      {/* Settings pinned at bottom */}
      {showSettings && (
        <div className="px-2 pb-4">
          <div className="mx-1 h-px bg-neutral-100 mb-2" />
          <NavItem
            icon={SETTINGS_ITEM.icon}
            label={SETTINGS_ITEM.label}
            path={SETTINGS_ITEM.path}
            isCollapsed={isCollapsed}
          />
        </div>
      )}
    </aside>
  );
};
