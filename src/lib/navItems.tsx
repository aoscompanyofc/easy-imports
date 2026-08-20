import {
  LayoutDashboard, ShoppingCart, Package, Users, UserPlus,
  DollarSign, Truck, Megaphone, BarChart3, FileText, Settings,
  Users2, MessageSquare, Calculator, Trello, Workflow, KeyRound, LucideIcon,
} from 'lucide-react';

export interface NavMenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

// Fonte única da lista de páginas do sistema — usada pela Sidebar (lateral),
// pela TopNav (superior) e pelo menu mobile em AppLayout, pra nunca ficar
// uma tela desatualizada em relação às outras.
export const ALL_MENU_ITEMS: NavMenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/dashboard'     },
  { icon: ShoppingCart,    label: 'Vendas',        path: '/vendas'        },
  { icon: Package,         label: 'Estoque',       path: '/estoque'       },
  { icon: Users,           label: 'Clientes',      path: '/clientes'      },
  { icon: UserPlus,        label: 'Leads',         path: '/leads'         },
  { icon: DollarSign,      label: 'Financeiro',    path: '/financeiro'    },
  { icon: Truck,           label: 'Fornecedores',  path: '/fornecedores'  },
  { icon: Megaphone,       label: 'Marketing',     path: '/marketing'     },
  { icon: BarChart3,       label: 'Relatórios',    path: '/relatorios'    },
  { icon: FileText,        label: 'Documentação',  path: '/documentacao'  },
  { icon: Users2,          label: 'Vendedores',    path: '/vendedores'    },
  { icon: MessageSquare,   label: 'Mensagens',     path: '/mensagens'     },
  { icon: Calculator,      label: 'Calculadora',   path: '/calculadora'   },
  { icon: Trello,          label: 'Tarefas',       path: '/tarefas'       },
  { icon: Workflow,        label: 'Processos',     path: '/processos'     },
  { icon: KeyRound,        label: 'Senhas',        path: '/senhas'        },
];

export const ITEM_MAP: Record<string, NavMenuItem> = Object.fromEntries(
  ALL_MENU_ITEMS.map((i) => [i.path.slice(1), i]),
);

export const SETTINGS_ITEM: NavMenuItem = { icon: Settings, label: 'Configurações', path: '/configuracoes' };

// Aplica ordem personalizada + filtro de páginas ocultas sobre a lista base.
// `order`/`hidden` guardam chaves (path sem a barra), não os itens inteiros.
export function buildOrderedItems(order: string[], hidden: string[], loaded: boolean): NavMenuItem[] {
  const base = loaded
    ? [...order.map((key) => ITEM_MAP[key]).filter(Boolean), ...ALL_MENU_ITEMS.filter((i) => !order.includes(i.path.slice(1)))]
    : ALL_MENU_ITEMS;
  return base.filter((i) => !hidden.includes(i.path.slice(1)));
}
