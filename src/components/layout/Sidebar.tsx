import React, { useEffect } from 'react';
import { NavLink, useMatch } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, UserPlus,
  DollarSign, Truck, Megaphone, BarChart3, FileText, Settings,
  ChevronLeft, ChevronRight, LucideIcon, Users2, MessageSquare, Calculator, Trello, Workflow,
  GripVertical, Pencil, Check, RotateCcw,
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
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ALL_MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/dashboard'     },
  { icon: ShoppingCart,    label: 'Vendas',        path: '/vendas'        },
  { icon: Package,         label: 'Estoque',       path: '/estoque'       },
  { icon: Users,           label: 'Clientes',      path: '/clientes'      },
  { icon: UserPlus,        label: 'Leads',         path: '/leads'         },
  { icon: DollarSign,      label: 'Financeiro',    path: '/financeiro'    },
  { icon: Truck,           label: 'Fornecedores',  path: '/fornecedores'  },
  { icon: Megaphone,       label: 'Marketing',     path: '/marketing'     },
  { icon: BarChart3,       label: 'Relatórios',    path: '/relatorios'    },
  { icon: FileText,        label: 'Documentação',  path: '/documentacao'  },
  { icon: Users2,          label: 'Vendedores',    path: '/vendedores'    },
  { icon: MessageSquare,   label: 'Mensagens',     path: '/mensagens'     },
  { icon: Calculator,      label: 'Calculadora',   path: '/calculadora'   },
  { icon: Trello,          label: 'Tarefas',       path: '/tarefas'       },
  { icon: Workflow,        label: 'Processos',     path: '/processos'     },
];
const ITEM_MAP = Object.fromEntries(ALL_MENU_ITEMS.map((i) => [i.path.slice(1), i]));

const SETTINGS_ITEM = { icon: Settings, label: 'Configurações', path: '/configuracoes' };

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
const SortableNavItem: React.FC<{ item: typeof ALL_MENU_ITEMS[number] }> = ({ item }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.path.slice(1) });
  const Icon = item.icon;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-1.5 px-1 py-1 rounded-lg bg-neutral-50 border border-neutral-100"
    >
      <button {...attributes} {...listeners} className="p-1.5 text-neutral-300 hover:text-neutral-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
        <GripVertical size={14} />
      </button>
      <Icon size={15} className="text-neutral-400 flex-shrink-0" />
      <span className="text-sm font-medium text-neutral-700 truncate">{item.label}</span>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { sidebarMode, toggleSidebar } = useAppStore();
  const { allowedPages } = usePermissionsStore();
  const { order, editMode, loaded, setEditMode, load, reorder, resetOrder } = useNavOrderStore();

  useEffect(() => { load(); }, [load]);

  const isCollapsed = sidebarMode === 'collapsed';

  // Ordena os itens conforme a ordem personalizada; qualquer item ainda não
  // presente na ordem salva (ex.: página nova) cai no fim, na ordem padrão.
  const orderedItems = loaded
    ? [...order.map((key) => ITEM_MAP[key]).filter(Boolean), ...ALL_MENU_ITEMS.filter((i) => !order.includes(i.path.slice(1)))]
    : ALL_MENU_ITEMS;

  const mainItems = orderedItems.filter(
    (item) => allowedPages.includes(item.path.slice(1))
  );
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

      {/* Reorganizar menu — só quando expandido (precisa de espaço pro texto/drag) */}
      {!isCollapsed && (
        <div className="px-3 mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">
            {editMode ? 'Arraste pra reordenar' : 'Menu'}
          </span>
          <div className="flex items-center gap-1">
            {editMode && (
              <button
                onClick={resetOrder}
                title="Restaurar ordem padrão"
                className="p-1 text-neutral-300 hover:text-neutral-600 transition-colors"
              >
                <RotateCcw size={12} />
              </button>
            )}
            <button
              onClick={() => setEditMode(!editMode)}
              title={editMode ? 'Concluir' : 'Reorganizar menu'}
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
                <SortableNavItem key={item.path} item={item} />
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
