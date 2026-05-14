import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
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
  const { logout } = useAuthStore();
  const { name, cargo, avatar } = useProfileStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getPageTitle = () => {
    const path = location.pathname.split('/')[1];
    return PAGE_TITLES[path] || 'Dashboard';
  };

  const displayName = name || 'Usuário';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };
    if (isDropdownOpen) window.addEventListener('keydown', handleEsc);
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
                {displayName}
              </p>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-tight">
                {cargo || 'Administrador'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-neutral-900 border-2 border-primary-100 overflow-hidden flex-shrink-0">
              {avatar
                ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                : <span>{initials}</span>
              }
            </div>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              {/* Mini profile header */}
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-neutral-900 overflow-hidden flex-shrink-0">
                  {avatar
                    ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    : <span>{initials}</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-neutral-900 truncate">{displayName}</p>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-tight">{cargo || 'Administrador'}</p>
                </div>
              </div>
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
