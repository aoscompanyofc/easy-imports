import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { X, LayoutDashboard, ShoppingCart, Package, Users, UserPlus, DollarSign, Truck, Megaphone, BarChart3, FileText, Settings, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const menuItems = [
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

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // ESC closes mobile drawer
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isMobileMenuOpen, closeMobileMenu]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[50] lg:hidden animate-in fade-in duration-300"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div 
        className={cn(
          'fixed top-0 bottom-0 left-0 w-[280px] bg-white z-[60] lg:hidden transform transition-transform duration-300 ease-in-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-100">
            <NavLink to="/dashboard" onClick={closeMobileMenu} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-black font-bold">E</span>
              </div>
              <div className="font-bold text-lg">
                <span>Easy</span>
                <span className="text-primary">Imports</span>
              </div>
            </NavLink>
            <button 
              onClick={closeMobileMenu}
              className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg transition-colors"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-primary text-neutral-900 font-bold shadow-lg shadow-primary/20'
                      : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                  )
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-neutral-100 mb-16">
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-danger hover:bg-danger-light transition-all duration-200 font-bold"
            >
              <LogOut size={20} />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        <MobileBottomNav onMenuClick={() => setIsMobileMenuOpen(true)} />
      </div>
    </div>
  );
};
