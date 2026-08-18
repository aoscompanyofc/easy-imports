import React, { useEffect } from 'react';
import { NavLink, useMatch } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { usePermissionsStore } from '../../stores/permissionsStore';
import { useNavOrderStore } from '../../store/navOrderStore';
import { SETTINGS_ITEM, buildOrderedItems } from '../../lib/navItems';
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

export const Sidebar: React.FC = () => {
  const { sidebarMode, toggleSidebar, sidebarPosition } = useAppStore();
  const { allowedPages } = usePermissionsStore();
  const { order, hidden, loaded, load } = useNavOrderStore();

  useEffect(() => { load(); }, [load]);

  if (sidebarPosition === 'top') return null;

  const isCollapsed = sidebarMode === 'collapsed';

  const mainItems = buildOrderedItems(order, hidden, loaded).filter(
    (item) => allowedPages.includes(item.path.slice(1))
  );
  const showSettings = allowedPages.includes('configuracoes');

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

      {/* Main navigation */}
      <nav className="flex-1 px-2 pt-1 space-y-0.5 overflow-y-auto overflow-x-hidden" aria-label="Navegação principal">
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
