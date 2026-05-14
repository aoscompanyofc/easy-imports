import React from 'react';
import { NavLink, useMatch } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, UserPlus,
  DollarSign, Truck, Megaphone, BarChart3, FileText, Settings,
  ChevronLeft, ChevronRight, LucideIcon,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { usePermissionsStore } from '../../stores/permissionsStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ALL_MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingCart, label: 'Vendas', path: '/vendas' },
  { icon: Package, label: 'Estoque', path: '/estoque' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: UserPlus, label: 'Leads', path: '/leads' },
  { icon: DollarSign, label: 'Financeiro', path: '/financeiro' },
  { icon: Truck, label: 'Fornecedores', path: '/fornecedores' },
  { icon: Megaphone, label: 'Marketing', path: '/marketing' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: FileText, label: 'Documentação', path: '/documentacao' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

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
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 overflow-hidden',
        isCollapsed ? 'justify-center' : '',
        isActive
          ? 'bg-primary-50 text-neutral-900 font-semibold border-l-4 border-primary'
          : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
      )}
    >
      <Icon size={20} className="flex-shrink-0" />
      {!isCollapsed && (
        <span className="truncate">{label}</span>
      )}
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  const { sidebarMode, toggleSidebar } = useAppStore();
  const { allowedPages } = usePermissionsStore();

  const isCollapsed = sidebarMode === 'collapsed';

  const menuItems = ALL_MENU_ITEMS.filter(
    (item) => allowedPages.includes(item.path.slice(1))
  );

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 relative overflow-hidden flex-shrink-0',
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <NavLink to="/dashboard" className="h-16 flex items-center px-5 mb-4 flex-shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-black font-bold text-sm">E</span>
          </div>
          {!isCollapsed && (
            <div className="font-bold text-xl tracking-tight whitespace-nowrap">
              <span>Easy</span>
              <span className="text-primary">Imports</span>
            </div>
          )}
        </div>
      </NavLink>

      {/* Toggle button — rendered outside aside overflow so it peeks out */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-neutral-400 hover:text-primary transition-colors shadow-sm z-20"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden" aria-label="Navegação principal">
        {menuItems.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            path={item.path}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>
    </aside>
  );
};
