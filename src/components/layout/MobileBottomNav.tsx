import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Calculator, Package, Menu } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { usePermissionsStore } from '../../stores/permissionsStore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

const ALL_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Início', path: '/dashboard', key: 'dashboard' },
  { icon: ShoppingCart, label: 'Vendas', path: '/vendas', key: 'vendas' },
  { icon: Calculator, label: 'Taxas', path: '/calculadora', key: 'calculadora' },
  { icon: Package, label: 'Estoque', path: '/estoque', key: 'estoque' },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const { allowedPages } = usePermissionsStore();
  const navItems = ALL_NAV_ITEMS.filter((item) => allowedPages.includes(item.key));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 h-16 flex items-center justify-around px-2 z-40 pb-safe">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 gap-1 h-full transition-colors',
              isActive ? 'text-primary' : 'text-neutral-400'
            )
          }
        >
          <item.icon size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
        </NavLink>
      ))}
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center flex-1 gap-1 h-full text-neutral-400"
      >
        <Menu size={20} />
        <span className="text-[10px] font-bold uppercase tracking-tight">Mais</span>
      </button>
    </nav>
  );
};
