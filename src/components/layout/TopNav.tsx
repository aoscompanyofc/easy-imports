import React, { useEffect } from 'react';
import { NavLink, useMatch } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { usePermissionsStore } from '../../stores/permissionsStore';
import { useNavOrderStore } from '../../store/navOrderStore';
import { SETTINGS_ITEM, buildOrderedItems } from '../../lib/navItems';
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

export const TopNav: React.FC = () => {
  const { allowedPages } = usePermissionsStore();
  const { order, hidden, loaded, load } = useNavOrderStore();

  useEffect(() => { load(); }, [load]);

  const mainItems = buildOrderedItems(order, hidden, loaded).filter(
    (item) => allowedPages.includes(item.path.slice(1))
  );
  const showSettings = allowedPages.includes('configuracoes');

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
    </div>
  );
};
