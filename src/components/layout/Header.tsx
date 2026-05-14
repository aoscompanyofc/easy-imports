import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';
import { useLocation, useNavigate } from 'react-router-dom';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  vendas: 'Vendas',
  estoque: 'Estoque',
  clientes: 'Clientes',
  leads: 'Leads',
  financeiro: 'Financeiro',
  fornecedores: 'Fornecedores',
  marketing: 'Marketing',
  relatorios: 'Relatórios',
  documentacao: 'Documentação',
  configuracoes: 'Configurações',
};

export const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const getPageTitle = () => {
    const path = location.pathname.split('/')[1];
    return PAGE_TITLES[path] || 'Dashboard';
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Close dropdown on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };
    if (isDropdownOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isDropdownOpen]);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
          aria-label="Abrir menu de navegação"
        >
          <Menu size={24} />
        </button>
        
        <div>
          <h1 className="text-lg font-bold text-neutral-900 leading-none">
            {getPageTitle()}
          </h1>
          <div className="hidden lg:flex items-center gap-1 text-[10px] text-neutral-400 font-medium uppercase tracking-wider mt-1">
            <span>Easy Imports</span>
            <span>/</span>
            <span className="text-primary-700">{getPageTitle()}</span>
          </div>
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            type="text"
            placeholder="Buscar cliente, IMEI, venda..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
            aria-label="Busca global"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <button 
          className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition-colors relative"
          aria-label="Notificações"
        >
          <Bell size={20} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-danger rounded-full border-2 border-white" />
        </button>
        
        {/* Avatar & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 pl-2 lg:pl-4 border-l border-neutral-100 cursor-pointer group"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <div className="hidden lg:text-right md:block">
              <p className="text-sm font-bold text-neutral-900 group-hover:text-primary transition-colors">
                {user?.name || 'Usuário'}
              </p>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-tight">
                Administrador
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-neutral-900 border-2 border-primary-100">
              {user?.avatar || 'JE'}
            </div>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <button
                onClick={() => { setIsDropdownOpen(false); navigate('/configuracoes'); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Settings size={16} />
                Meu Perfil
              </button>
              <div className="h-px bg-neutral-100" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-danger hover:bg-danger-light transition-colors font-medium"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
