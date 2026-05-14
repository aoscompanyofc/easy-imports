import React from 'react';
import { NavLink, useNavigate, useMatch } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, UserPlus,
  DollarSign, Truck, Megaphone, BarChart3, FileText, Settings,
  LogOut, ChevronLeft, ChevronRight, LucideIcon,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
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
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
        isActive
          ? 'bg-primary-50 text-neutral-900 font-semibold border-l-4 border-primary'
          : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
      )}
    >
      <Icon size={20} className={cn('flex-shrink-0', isCollapsed ? 'mx-auto' : '')} />
      {!isCollapsed && <span>{label}</span>}
      {isCollapsed && (
        <div className="absolute left-full ml-4 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  const { sidebarMode, toggleSidebar } = useAppStore();
  const { logout } = useAuthStore();
  const { allowedPages } = usePermissionsStore();
  const navigate = useNavigate();

  const isCollapsed = sidebarMode === 'collapsed';

  const menuItems = ALL_MENU_ITEMS.filter(
    (item) => allowedPages.includes(item.path.slice(1))
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 relative',
        isCollapsed ? 'w-[80px]' : 'w-[260px]'
      )}
    >
      <NavLink to="/dashboard" className="h-16 flex items-center px-6 mb-4 group">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 group-hover:shadow-lg group-hover:shadow-primary/20 transition-shadow">
            <span className="text-black font-bold">E</span>
          </div>
          {!isCollapsed && (
            <div className="font-bold text-xl tracking-tight">
              <span>Easy</span>
              <span className="text-primary">Imports</span>
            </div>
          )}
        </div>
      </NavLink>

      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-neutral-400 hover:text-primary transition-colors shadow-sm z-10"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar" aria-label="Navegação principal">
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

      <div className="p-3 mt-auto border-t border-neutral-100">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-danger hover:bg-danger-light transition-all duration-200 group relative',
            isCollapsed ? 'justify-center' : ''
          )}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Sair do Sistema</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-2 py-1 bg-danger text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              Sair
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
