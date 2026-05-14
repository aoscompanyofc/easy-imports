import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bell, Search, Menu, LogOut, Settings,
  LayoutDashboard, ShoppingCart, Package, Users, UserPlus,
  DollarSign, Truck, Megaphone, BarChart3, FileText, LucideIcon,
  User, Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { dataService } from '../../lib/dataService';
import { formatCurrency } from '../../lib/formatters';

// ─── Page routes ────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', vendas: 'Vendas', estoque: 'Estoque',
  clientes: 'Clientes', leads: 'Leads', financeiro: 'Financeiro',
  fornecedores: 'Fornecedores', marketing: 'Marketing',
  relatorios: 'Relatórios', documentacao: 'Documentação', configuracoes: 'Configurações',
};

interface PageRoute { type: 'page'; keywords: string[]; path: string; label: string; icon: LucideIcon; }

const SEARCH_ROUTES: PageRoute[] = [
  { type: 'page', keywords: ['dashboard', 'início', 'home', 'painel', 'resumo'], path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { type: 'page', keywords: ['vendas', 'venda', 'pedido', 'vender'], path: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { type: 'page', keywords: ['estoque', 'produto', 'produtos', 'inventario'], path: '/estoque', label: 'Estoque', icon: Package },
  { type: 'page', keywords: ['clientes', 'cliente', 'comprador'], path: '/clientes', label: 'Clientes', icon: Users },
  { type: 'page', keywords: ['leads', 'lead', 'crm', 'prospecção'], path: '/leads', label: 'Leads / CRM', icon: UserPlus },
  { type: 'page', keywords: ['financeiro', 'finanças', 'caixa', 'transação', 'despesa', 'receita'], path: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { type: 'page', keywords: ['fornecedores', 'fornecedor', 'compras'], path: '/fornecedores', label: 'Fornecedores', icon: Truck },
  { type: 'page', keywords: ['marketing', 'campanha', 'publicidade'], path: '/marketing', label: 'Marketing', icon: Megaphone },
  { type: 'page', keywords: ['relatórios', 'relatorios', 'relatorio', 'analise'], path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { type: 'page', keywords: ['documentação', 'documentos', 'arquivos'], path: '/documentacao', label: 'Documentação', icon: FileText },
  { type: 'page', keywords: ['configurações', 'config', 'perfil', 'conta', 'equipe'], path: '/configuracoes', label: 'Configurações', icon: Settings },
];

// ─── PT-BR date parsing ──────────────────────────────────────────
const MONTHS: Record<string, number> = {
  jan: 1, janeiro: 1,
  fev: 2, fevereiro: 2,
  mar: 3, marco: 3,
  abr: 4, abril: 4,
  mai: 5, maio: 5,
  jun: 6, junho: 6,
  jul: 7, julho: 7,
  ago: 8, agosto: 8,
  set: 9, setembro: 9,
  out: 10, outubro: 10,
  nov: 11, novembro: 11,
  dez: 12, dezembro: 12,
};

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

interface DateFilter { day?: number; month?: number; year?: number; }

function parseDateQuery(q: string): DateFilter | null {
  const n = norm(q);

  // "2 de maio", "10 de dezembro", "2 maio"
  const dayMonth = n.match(/(\d{1,2})\s*(?:de\s*)?([a-z]+)/);
  if (dayMonth) {
    const day = parseInt(dayMonth[1]);
    const month = MONTHS[dayMonth[2]];
    if (month) {
      const yearM = n.match(/(\d{4})/);
      return { day, month, year: yearM ? parseInt(yearM[1]) : undefined };
    }
  }

  // month name alone: "maio", "dezembro 2024"
  for (const [name, num] of Object.entries(MONTHS)) {
    if (n.includes(name)) {
      const yearM = n.match(/(\d{4})/);
      return { month: num, year: yearM ? parseInt(yearM[1]) : undefined };
    }
  }

  // dd/mm or dd/mm/yyyy
  const slashDate = n.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (slashDate) {
    return {
      day: parseInt(slashDate[1]),
      month: parseInt(slashDate[2]),
      year: slashDate[3] ? parseInt(slashDate[3]) : undefined,
    };
  }

  // bare year "2024", "2025"
  const yearOnly = n.match(/^(\d{4})$/);
  if (yearOnly) return { year: parseInt(yearOnly[1]) };

  return null;
}

function matchesDateFilter(dateStr: string, f: DateFilter): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  if (f.year !== undefined && d.getFullYear() !== f.year) return false;
  if (f.month !== undefined && d.getMonth() + 1 !== f.month) return false;
  if (f.day !== undefined && d.getDate() !== f.day) return false;
  return true;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR');
}

// ─── Unified result type ─────────────────────────────────────────
interface AnyResult {
  type: 'page' | 'sale' | 'customer' | 'product';
  path: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  badge?: string;
  badgeClass?: string;
}

// ─── Main search logic ───────────────────────────────────────────
function buildResults(
  q: string,
  sales: any[],
  customers: any[],
  products: any[],
): AnyResult[] {
  if (!q.trim()) return [];
  const nq = norm(q);
  const dateFilter = parseDateQuery(q);
  const results: AnyResult[] = [];

  // Pages
  const pageMatches = SEARCH_ROUTES.filter((r) =>
    r.keywords.some((kw) => norm(kw).includes(nq) || nq.includes(norm(kw))) ||
    norm(r.label).includes(nq)
  );
  for (const r of pageMatches.slice(0, 3)) {
    results.push({ type: 'page', path: r.path, label: r.label, sub: r.path, icon: r.icon });
  }

  // Sales — match by date, customer name, sale number, amount
  const saleMatches = sales.filter((s) => {
    if (dateFilter && matchesDateFilter(s.created_at, dateFilter)) return true;
    if (s.sale_number && norm(String(s.sale_number)).includes(nq)) return true;
    if (s.customer_name && norm(s.customer_name).includes(nq)) return true;
    const amountStr = formatCurrency(s.total_amount);
    if (norm(amountStr).includes(nq)) return true;
    if (s.product_name && norm(s.product_name).includes(nq)) return true;
    return false;
  });
  for (const s of saleMatches.slice(0, 4)) {
    const typeLabel = s.sale_type === 'troca' ? 'Troca' : 'Venda';
    results.push({
      type: 'sale',
      path: '/vendas',
      label: `${typeLabel} #${String(s.sale_number || '').padStart(3, '0')} — ${s.customer_name || 'Cliente'}`,
      sub: `${formatDate(s.created_at)} · ${formatCurrency(s.total_amount)}`,
      icon: ShoppingCart,
      badge: typeLabel,
      badgeClass: s.sale_type === 'troca' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700',
    });
  }

  // Customers — match by name, phone, CPF
  const customerMatches = customers.filter((c) =>
    norm(c.name || '').includes(nq) ||
    (c.phone || '').includes(q) ||
    (c.cpf || '').includes(q)
  );
  for (const c of customerMatches.slice(0, 3)) {
    const parts = [c.phone, c.cpf, c.email].filter(Boolean);
    results.push({
      type: 'customer',
      path: '/clientes',
      label: c.name,
      sub: parts.join(' · ') || 'Sem contato',
      icon: User,
    });
  }

  // Products — match by name, IMEI, category
  const productMatches = products.filter((p) =>
    norm(p.name || '').includes(nq) ||
    norm(p.category || '').includes(nq) ||
    (p.imei || '').includes(q)
  );
  for (const p of productMatches.slice(0, 3)) {
    const inStock = p.stock_quantity > 0;
    results.push({
      type: 'product',
      path: '/estoque',
      label: p.name,
      sub: `${p.category}${p.imei ? ' · IMEI: ' + p.imei : ''} · ${formatCurrency(p.sale_price || p.purchase_price)}`,
      icon: Package,
      badge: inStock ? 'Em estoque' : 'Vendido',
      badgeClass: inStock ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500',
    });
  }

  return results;
}

const TYPE_LABELS: Record<string, string> = {
  page: 'Página',
  sale: 'Venda',
  customer: 'Cliente',
  product: 'Estoque',
};

// ─── Component ───────────────────────────────────────────────────
export const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { logout } = useAuthStore();
  const { name, cargo, avatar } = useProfileStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<AnyResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Data cache — loaded once on first search focus
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const dataLoaded = useRef(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const getPageTitle = () => {
    const path = location.pathname.split('/')[1];
    return PAGE_TITLES[path] || 'Dashboard';
  };

  const displayName = name || 'Usuário';
  const initials = displayName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  // Load data on first focus
  const loadData = useCallback(async () => {
    if (dataLoaded.current) return;
    dataLoaded.current = true;
    setDataLoading(true);
    try {
      const [s, c, p] = await Promise.all([
        dataService.getSales(),
        dataService.getCustomers(),
        dataService.getProducts(),
      ]);
      setSales(s || []);
      setCustomers(c || []);
      setProducts(p || []);
    } catch (_) {
      // silent — search still works for pages
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Re-compute results when query or data changes
  useEffect(() => {
    const r = buildResults(searchQuery, sales, customers, products);
    setResults(r);
    setIsSearchOpen(r.length > 0 && searchQuery.trim().length > 0);
    setSelectedIndex(0);
  }, [searchQuery, sales, customers, products]);

  // Close dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsDropdownOpen(false);
    };
    if (isDropdownOpen) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isDropdownOpen]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const goTo = (path: string) => {
    navigate(path);
    setIsSearchOpen(false);
    setSearchQuery('');
    searchInputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[selectedIndex]) goTo(results[selectedIndex].path);
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate('/login');
  };

  // Group results by type for display
  const grouped: Record<string, AnyResult[]> = {};
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }
  const typeOrder: AnyResult['type'][] = ['sale', 'customer', 'product', 'page'];

  let flatIndex = 0;

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
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
          {dataLoading
            ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 animate-spin pointer-events-none" size={18} />
            : <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={18} />
          }
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              loadData();
              if (searchQuery && results.length > 0) setIsSearchOpen(true);
            }}
            placeholder="Buscar venda, cliente, produto, data..."
            autoComplete="off"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
          />

          {isSearchOpen && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-[480px] overflow-y-auto">
              {typeOrder.map((type) => {
                const group = grouped[type];
                if (!group || group.length === 0) return null;
                return (
                  <div key={type}>
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                        {TYPE_LABELS[type]}
                      </p>
                    </div>
                    {group.map((r) => {
                      const Icon = r.icon;
                      const idx = flatIndex++;
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={`${r.type}-${r.label}-${idx}`}
                          onMouseDown={() => goTo(r.path)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                            isSelected ? 'bg-primary/10' : 'hover:bg-neutral-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-primary text-neutral-900' : 'bg-neutral-100 text-neutral-500'
                          }`}>
                            <Icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-neutral-900 truncate">{r.label}</p>
                            <p className="text-[11px] text-neutral-400 truncate">{r.sub}</p>
                          </div>
                          {r.badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${r.badgeClass}`}>
                              {r.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <div className="px-4 py-2 border-t border-neutral-100 flex items-center gap-2 text-[10px] text-neutral-400">
                <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded text-[9px] font-bold">↑↓</kbd> navegar
                <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded text-[9px] font-bold">Enter</kbd> abrir
                <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded text-[9px] font-bold">Esc</kbd> fechar
              </div>
            </div>
          )}

          {/* No results message */}
          {isSearchOpen && results.length === 0 && searchQuery.trim().length > 1 && !dataLoading && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 px-4 py-6 text-center">
              <p className="text-sm text-neutral-500">Nenhum resultado para <strong>"{searchQuery}"</strong></p>
              <p className="text-xs text-neutral-400 mt-1">Tente: "João Silva", "maio", "iPhone 15", "2 de abril"</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <button className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-danger rounded-full border-2 border-white" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 pl-2 lg:pl-4 border-l border-neutral-100 cursor-pointer group"
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
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden">
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
