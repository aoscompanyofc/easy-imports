import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu, LogOut, Settings, LayoutDashboard, ShoppingCart, Package, Users, UserPlus, DollarSign, Truck, Megaphone, BarChart3, FileText, LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
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

interface SearchRoute {
  keywords: string[];
  path: string;
  label: string;
  icon: LucideIcon;
}

const SEARCH_ROUTES: SearchRoute[] = [
  { keywords: ['dashboard', 'início', 'home', 'painel', 'resumo'], path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { keywords: ['vendas', 'venda', 'pedido', 'pedidos', 'vender'], path: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { keywords: ['estoque', 'produto', 'produtos', 'item', 'itens', 'inventario'], path: '/estoque', label: 'Estoque', icon: Package },
  { keywords: ['clientes', 'cliente', 'comprador', 'compradores'], path: '/clientes', label: 'Clientes', icon: Users },
  { keywords: ['leads', 'lead', 'crm', 'prospecção', 'prospeccao', 'contato'], path: '/leads', label: 'Leads / CRM', icon: UserPlus },
  { keywords: ['financeiro', 'finanças', 'financas', 'dinheiro', 'caixa', 'transação', 'transacoes', 'despesa', 'receita'], path: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { keywords: ['fornecedores', 'fornecedor', 'supplier', 'compras'], path: '/fornecedores', label: 'Fornecedores', icon: Truck },
  { keywords: ['marketing', 'campanha', 'campanhas', 'publicidade', 'anuncio', 'anúncio'], path: '/marketing', label: 'Marketing', icon: Megaphone },
  { keywords: ['relatórios', 'relatorios', 'relatorio', 'relatório', 'report', 'analise', 'análise'], path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { keywords: ['documentação', 'documentos', 'documentacao', 'doc', 'arquivos', 'arquivo'], path: '/documentacao', label: 'Documentação', icon: FileText },
  { keywords: ['configurações', 'configuracoes', 'config', 'perfil', 'settings', 'conta', 'equipe'], path: '/configuracoes', label: 'Configurações', icon: Settings },
];

function getResults(query: string): SearchRoute[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return SEARCH_ROUTES.filter((route) =>
    route.keywords.some((kw) => {
      const normalized = kw.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return normalized.includes(q) || q.includes(normalized);
    }) || route.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)
  );
}

export const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { logout } = useAuthStore();
  const { name, cargo, avatar } = useProfileStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchRoute[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const getPageTitle = () => {
    const path = location.pathname.split('/')[1];
    return PAGE_TITLES[path] || 'Dashboard';
  };

  const displayName = name || 'Usuário';
  const initials = displayName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  // Avatar dropdown close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isDropdownOpen]);

  // Search close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    const results = getResults(val);
    setSearchResults(results);
    setIsSearchOpen(results.length > 0);
    setSelectedIndex(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (searchResults[selectedIndex]) {
        goTo(searchResults[selectedIndex].path);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const goTo = (path: string) => {
    navigate(path);
    setIsSearchOpen(false);
    setSearchQuery('');
    searchInputRef.current?.blur();
  };

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
          <h1 className="text-lg font-bold text-neutral-900 leading-none">{getPageTitle()}</h1>
          <div className="hidden lg:flex items-center gap-1 text-[10px] text-neutral-400 font-medium uppercase tracking-wider mt-1">
            <span>Easy Imports</span>
            <span>/</span>
            <span className="text-primary-700">{getPageTitle()}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-8" ref={searchRef}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={18} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => searchQuery && setIsSearchOpen(searchResults.length > 0)}
            placeholder="Buscar página, módulo..."
            autoComplete="off"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
            aria-label="Busca global"
          />

          {/* Search results dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {searchResults.map((result, idx) => {
                const Icon = result.icon;
                return (
                  <button
                    key={result.path}
                    onMouseDown={() => goTo(result.path)}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${idx === selectedIndex ? 'bg-primary/10 text-neutral-900' : 'hover:bg-neutral-50 text-neutral-700'}`}
                  >
                    <div className={`p-1.5 rounded-lg ${idx === selectedIndex ? 'bg-primary text-neutral-900' : 'bg-neutral-100 text-neutral-500'}`}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{result.label}</p>
                      <p className="text-[10px] text-neutral-400">{result.path}</p>
                    </div>
                  </button>
                );
              })}
              <div className="px-4 py-2 border-t border-neutral-100 flex items-center gap-2 text-[10px] text-neutral-400">
                <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded text-[9px] font-bold">↑↓</kbd> navegar
                <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded text-[9px] font-bold">Enter</kbd> abrir
                <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded text-[9px] font-bold">Esc</kbd> fechar
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <button className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition-colors relative" aria-label="Notificações">
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
              <p className="text-sm font-bold text-neutral-900 group-hover:text-primary transition-colors">{displayName}</p>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-tight">{cargo || 'Administrador'}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-neutral-900 border-2 border-primary-100 overflow-hidden flex-shrink-0">
              {avatar ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" /> : <span>{initials}</span>}
            </div>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-neutral-900 overflow-hidden flex-shrink-0">
                  {avatar ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" /> : <span>{initials}</span>}
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
