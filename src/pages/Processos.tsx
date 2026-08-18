import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus, Trash2, Workflow, Target, ListChecks, AlertTriangle,
  BarChart3, DollarSign, ShoppingCart, TrendingUp, Users, Package,
  Lock, ChevronUp, ChevronDown, Pencil, ArrowRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { dataService } from '../lib/dataService';
import { safeUUID } from '../lib/storage';
import { formatCurrency } from '../lib/formatters';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// ─── Types ──────────────────────────────────────────────────────────────────
interface ProcessStep { id: string; title: string; description: string; attention: string }
interface ProcessDoc {
  id: string;
  title: string;
  category: string;
  description: string;
  steps: ProcessStep[];
  attentionPoints: string[];
  status: 'ativo' | 'rascunho';
  created_at: string;
  updated_at: string;
}
interface Goal {
  id: string;
  metricId: string;
  label: string;
  target: number;
  deadline: string;
  created_at: string;
}

const CATEGORIES = ['Vendas', 'Compras', 'Estoque', 'Atendimento', 'Marketing', 'Financeiro', 'Operacional'] as const;
const CATEGORY_COLORS: Record<string, string> = {
  Vendas: '#EAB308', Compras: '#2563EB', Estoque: '#7C3AED',
  Atendimento: '#10B981', Marketing: '#EC4899', Financeiro: '#DC2626', Operacional: '#525252',
};

function emptyProcessForm() {
  return {
    title: '', category: 'Vendas' as string, description: '',
    steps: [] as ProcessStep[], attentionPoints: [] as string[],
    status: 'ativo' as 'ativo' | 'rascunho',
  };
}

// ─── Processos reais da Easy Imports (documentam o fluxo já implementado no
// sistema) — servem de ponto de partida; editáveis e removíveis livremente. ──
function seedProcesses(): ProcessDoc[] {
  const now = new Date().toISOString();
  const mk = (
    title: string, category: string, description: string,
    steps: [string, string, string?][], attentionPoints: string[],
  ): ProcessDoc => ({
    id: safeUUID(), title, category, description, status: 'ativo',
    created_at: now, updated_at: now,
    steps: steps.map(([t, d, a]) => ({ id: safeUUID(), title: t, description: d, attention: a || '' })),
    attentionPoints,
  });

  return [
    mk(
      'Venda de Aparelho do Estoque',
      'Vendas',
      'Fluxo padrão de venda pra quem já escolheu o aparelho, seja balcão ou WhatsApp.',
      [
        ['Cliente escolhe o aparelho', 'Confira a saúde da bateria e o IMEI direto no Estoque antes de prometer o modelo pro cliente.'],
        ['Iniciar a venda', 'Em Vendas → Nova Operação, ou direto pelo botão "Vender" no card do aparelho no Estoque.'],
        ['Selecionar ou cadastrar o cliente', 'Se o nome já existe, o sistema avisa antes de duplicar.'],
        ['Selecionar o produto do estoque', 'O aparelho reservado aparece marcado "[RESERVADO]" na lista — não vender pra outra pessoa sem confirmar.', 'Aparelhos sem bateria informada aparecem sinalizados no Estoque.'],
        ['Definir forma de pagamento e parcelas', ''],
        ['Revisar e confirmar', 'O sistema gera o PDF automaticamente e desconta do estoque na hora.'],
      ],
      [
        'Sempre conferir o IMEI exibido contra o aparelho físico — se estiver errado, corrija direto na tela de venda, o sistema sincroniza sozinho com o cadastro do Estoque.',
        'Nunca confirmar a venda de um aparelho com o selo "Reservado" sem falar com quem reservou.',
      ],
    ),
    mk(
      'Compra / Entrada de Aparelho no Estoque',
      'Compras',
      'Como registrar um aparelho novo ou seminovo que chegou pra revenda.',
      [
        ['Negociar e confirmar a compra', 'Com o fornecedor ou cliente que está trocando/vendendo o aparelho.'],
        ['Cadastrar no Estoque', 'Estoque → Adicionar Aparelho: modelo, capacidade, cor.'],
        ['Definir a condição', 'Novo (lacrado) trava a garantia em 1 ano Apple. Qualquer outra condição trava em 3 meses Easy Imports — não dá mais pra digitar garantia errada.'],
        ['Preencher saúde da bateria e ciclos', 'Obrigatório pra qualquer aparelho que não seja novo — sem isso o aparelho fica marcado "Sem bateria" na lista.'],
        ['Preencher o IMEI/Nº de série', 'O sistema bloqueia automaticamente se esse número já estiver cadastrado em outro produto.'],
        ['Definir preço de custo', 'Sem isso o lucro fica calculado errado em todo o sistema (Dashboard, Relatórios).'],
      ],
      [
        'Preço de custo é obrigatório — sem ele, o Dashboard mostra 100% do valor como lucro.',
        'Se o sistema avisar IMEI duplicado, pare e confira se não é o mesmo aparelho reentrando por engano.',
      ],
    ),
    mk(
      'Reserva de Aparelho (Sinal via Pix)',
      'Vendas',
      'Quando o cliente confirma interesse e paga um sinal antes de fechar a compra.',
      [
        ['Cliente paga o sinal via Pix', ''],
        ['Abrir o aparelho no Estoque e clicar em "Reservar"', ''],
        ['Preencher nome do cliente e valor do sinal', 'Fica registrado com data automaticamente.'],
        ['O aparelho some da lista de Seminovos do WhatsApp', 'Continua contando normalmente no estoque e no financeiro.'],
        ['Quando o cliente vier fechar', 'Usar "Vender" normalmente — o aparelho reservado continua selecionável na venda.'],
        ['Se o cliente desistir', 'Voltar no aparelho e clicar em "Cancelar Reserva".'],
      ],
      [
        'A reserva não bloqueia a venda pra outra pessoa sozinha — o vendedor precisa reparar no selo "Reservado" antes de confirmar.',
      ],
    ),
    mk(
      'Pós-Venda — Follow-up de 7 Dias',
      'Atendimento',
      'Contato automático de acompanhamento pra saber se o cliente está satisfeito.',
      [
        ['O Dashboard identifica sozinho', 'Clientes que compraram entre 6 e 12 dias atrás aparecem no card de Follow-up.'],
        ['Clicar em "Enviar" no card', 'Abre o WhatsApp com a mensagem já pronta perguntando se está tudo certo.'],
        ['Dispensar depois de enviar', 'O card some da lista pra não mandar duas vezes pro mesmo cliente.'],
      ],
      [
        'Não precisa reescrever a mensagem — ela já vem personalizada com o nome e o produto.',
      ],
    ),
    mk(
      'Divulgação da Lista de Seminovos (WhatsApp)',
      'Marketing',
      'Como gerar e enviar a lista atualizada de aparelhos disponíveis.',
      [
        ['Ir em Estoque → Mensagem WhatsApp', ''],
        ['O sistema monta a lista sozinho', 'Agrupada por modelo e ordenada por preço crescente dentro de cada modelo.'],
        ['Garantia aparece uma vez por seção', '3 meses nos seminovos, 1 ano Apple nos lacrados — não repete item por item.'],
        ['Aparelhos reservados não entram na lista', 'Somem automaticamente — não precisa tirar na mão.'],
        ['Copiar mensagem e enviar', ''],
      ],
      [
        'Aparelho sem saúde da bateria preenchida fica sinalizado no Estoque — preencha antes de gerar a lista, senão o cliente não vê essa informação.',
      ],
    ),
    mk(
      'Troca de Aparelho',
      'Vendas',
      'Cliente entrega um aparelho usado e paga a diferença por outro do estoque.',
      [
        ['Escolher "Troca de Aparelhos" no início da operação', ''],
        ['Cadastrar o aparelho que o cliente está entregando', 'Categoria, modelo, IMEI, condição e valor de avaliação.'],
        ['Selecionar o aparelho de saída no estoque', ''],
        ['Conferir a diferença calculada automaticamente', 'Valor do aparelho de saída menos o valor de avaliação do que entrou.'],
        ['Confirmar', 'O aparelho recebido entra automaticamente no estoque, pronto pra revenda.'],
      ],
      [
        'O valor de avaliação que você digitar vira o preço de custo do aparelho recebido no estoque — confira o estado físico dele com atenção antes de definir esse valor.',
      ],
    ),
    mk(
      'Venda a Prazo (Parcelado)',
      'Vendas',
      'Venda parcelada em vencimentos mensais, com ou sem entrada.',
      [
        ['Escolher "Venda a Prazo" no início da operação', ''],
        ['Definir o produto e o valor total', ''],
        ['Informar entrada (opcional) e valor/quantidade das parcelas', ''],
        ['Definir a data do 1º vencimento', 'As parcelas seguintes são geradas automaticamente mês a mês.'],
        ['Informar o custo de entrada do produto', 'Obrigatório — sem isso o sistema calcula o lucro errado.'],
        ['Confirmar', 'Gera o PDF e já lança o custo no Financeiro na hora.'],
      ],
      [
        'Custo de entrada é obrigatório em venda a prazo — sem ele o lucro aparece 100% errado no Dashboard.',
        'Ir em Financeiro marcar cada parcela como paga assim que o cliente pagar — o sistema não faz isso sozinho.',
      ],
    ),
    mk(
      'Edição de uma Venda Já Registrada',
      'Vendas',
      'Corrigir dados de uma venda depois de já ter sido feita.',
      [
        ['Abrir a venda no histórico de Vendas', ''],
        ['Clicar em Editar', ''],
        ['Ajustar os dados necessários', 'Cliente, produto, valor, forma de pagamento, etc.'],
        ['Salvar', 'Gera uma nova versão do PDF automaticamente (v1, v2...).'],
      ],
      [
        'Editar uma venda corrige o cadastro/recibo — não desfaz a baixa no estoque nem o lançamento financeiro já feito. Pra desfazer a operação de verdade, use excluir a venda.',
      ],
    ),
    mk(
      'Cancelamento de Venda',
      'Vendas',
      'Excluir uma venda e tentar devolver o aparelho pro estoque.',
      [
        ['Abrir a venda no histórico', ''],
        ['Clicar em excluir', 'O sistema tenta devolver automaticamente o(s) aparelho(s) vendido(s) pro estoque, casando pelo IMEI ou nome do produto.'],
        ['Conferir no Estoque', 'Verificar se o aparelho realmente voltou como "Disponível".'],
      ],
      [
        'Se o IMEI do aparelho foi corrigido depois da venda original, a devolução automática pode não encontrar o produto certo — confira manualmente nesse caso.',
      ],
    ),
    mk(
      'Cadastro de Cliente',
      'Atendimento',
      'Cadastrar um novo cliente sem duplicar quem já existe.',
      [
        ['Ir em Clientes → Novo Cliente', ''],
        ['Preencher nome (obrigatório), telefone, CPF, cidade e origem', ''],
        ['O sistema confere duplicidade automaticamente', 'Por CPF, telefone ou nome parecido — avisa antes de salvar se já existir alguém assim.'],
        ['Confirmar cadastro ou abrir o cliente existente', ''],
      ],
      [
        'Se o aviso de "cliente parecido" aparecer, confira com calma — CPF ou telefone repetido é quase sempre a mesma pessoa.',
      ],
    ),
    mk(
      'Aniversariantes — Mensagem de Parabéns',
      'Atendimento',
      'Enviar mensagem de aniversário com cupom pros clientes do mês.',
      [
        ['Ir em Clientes → aba de Aniversariantes', ''],
        ['Ver quem faz aniversário no mês selecionado', ''],
        ['Clicar em enviar', 'Abre o WhatsApp com a mensagem pronta, incluindo o cupom de desconto.'],
      ],
      [
        'Só funciona pra clientes que têm a data de nascimento preenchida no cadastro — vale a pena perguntar e completar esse dado com o tempo.',
      ],
    ),
    mk(
      'Gestão de Leads (Funil de Vendas)',
      'Vendas',
      'Acompanhar um contato desde o primeiro interesse até virar cliente.',
      [
        ['Ir em Leads → Novo Lead', 'Preencher dados de contato e origem (Instagram, indicação, etc.).'],
        ['Arrastar entre as etapas conforme o andamento', 'Novo Lead → Interessado → Follow Up → Negociando → Cliente.'],
        ['Quando chega em "Cliente"', 'O sistema cadastra automaticamente esse lead como cliente.'],
      ],
      [
        'Só mover um lead pra "Cliente" quando a venda realmente aconteceu — mover antes da hora infla a taxa de conversão sem faturamento real por trás.',
      ],
    ),
    mk(
      'Lançamento Financeiro Manual',
      'Financeiro',
      'Registrar receitas e despesas que não vêm de uma venda ou compra.',
      [
        ['Ir em Financeiro → Nova Transação', ''],
        ['Escolher tipo (receita ou despesa), categoria, valor e data', ''],
        ['Salvar', ''],
      ],
      [
        'Vendas e custos de produto já lançam sozinhos no Financeiro — lance manualmente só o que não passa por Venda/Compra (aluguel, energia, salário, etc.), senão duplica o valor.',
      ],
    ),
    mk(
      'Controle de Parcelas (Venda a Prazo)',
      'Financeiro',
      'Acompanhar e dar baixa nas parcelas de vendas parceladas.',
      [
        ['Ir em Financeiro → parcelas pendentes/atrasadas', ''],
        ['Marcar como paga quando o cliente pagar', ''],
      ],
      [
        'Parcela atrasada não bloqueia nada sozinha no sistema — o acompanhamento e a cobrança são manuais.',
      ],
    ),
    mk(
      'Cadastro de Fornecedor',
      'Compras',
      'Registrar de quem a loja compra aparelhos e acessórios.',
      [
        ['Ir em Fornecedores → Novo Fornecedor', ''],
        ['Preencher dados de contato', ''],
        ['Vincular às compras feitas com ele', ''],
      ],
      [],
    ),
    mk(
      'Cálculo de Parcelamento na Maquininha',
      'Financeiro',
      'Simular o valor final de uma venda parcelada no cartão, já com a taxa da maquininha embutida.',
      [
        ['Ir em Calculadora', ''],
        ['Informar o valor e escolher a bandeira do cartão', ''],
        ['Escolher o número de parcelas (até 18x)', ''],
        ['Gerar a imagem com o valor final', 'Pronta pra mandar direto pro cliente.'],
      ],
      [
        'Confira a bandeira certa antes de gerar — a taxa muda bastante de uma bandeira pra outra.',
      ],
    ),
    mk(
      'Mensagens Prontas (Templates de WhatsApp)',
      'Atendimento',
      'Usar modelos de mensagem já prontos pra situações recorrentes.',
      [
        ['Ir em Mensagens', ''],
        ['Escolher o modelo', 'Garantia, cobrança, avisos, etc.'],
        ['Preencher os dados do cliente no modelo', ''],
        ['Copiar e enviar', ''],
      ],
      [],
    ),
    mk(
      'Gestão de Vendedores e Comissão',
      'Operacional',
      'Acompanhar a performance individual de cada vendedor.',
      [
        ['Ir em Vendedores → Novo Vendedor', ''],
        ['Vincular o vendedor na hora de registrar uma venda', 'Campo "Vendedor Responsável" na tela de Venda.'],
        ['Acompanhar o desempenho de cada um', 'Em Vendedores ou Relatórios.'],
      ],
      [],
    ),
    mk(
      'Permissões da Equipe',
      'Operacional',
      'Controlar o que cada membro da equipe pode acessar no sistema.',
      [
        ['Ir em Configurações → Equipe', ''],
        ['Cadastrar o membro com e-mail e senha', ''],
        ['Escolher quais páginas ele pode acessar', ''],
      ],
      [
        'Por padrão, um vendedor só enxerga Dashboard, Vendas, Estoque, Clientes e Leads — libere manualmente qualquer página extra que ele precisar (Financeiro, Processos, etc.).',
      ],
    ),
    mk(
      'Quadro de Tarefas (Kanban)',
      'Operacional',
      'Organizar o que precisa ser feito no dia a dia da loja.',
      [
        ['Ir em Tarefas → Nova Tarefa', ''],
        ['Definir coluna inicial, prioridade e prazo', ''],
        ['Arrastar entre as colunas conforme o progresso', 'A Fazer → Em Andamento → Concluído.'],
        ['Ocultar tarefas concluídas antigas', 'Sem perder o histórico — dá pra restaurar depois.'],
      ],
      [],
    ),
    mk(
      'Correção de IMEI Depois de Cadastrado',
      'Estoque',
      'Como corrigir um IMEI/número de série digitado errado.',
      [
        ['Editando o produto direto no Estoque', ''],
        ['Ou direto na tela de Venda, no momento de vender', 'Sincroniza sozinho de volta pro cadastro do Estoque.'],
        ['Ou editando uma venda já feita', 'Nesse caso só corrige o recibo/PDF, não o cadastro do Estoque.'],
      ],
      [
        'O sistema bloqueia sozinho o cadastro de dois produtos com o mesmo IMEI — se aparecer o aviso, confira se não é o mesmo aparelho reentrando.',
      ],
    ),
    mk(
      'Geração de Relatórios',
      'Financeiro',
      'Ver o desempenho da loja num período.',
      [
        ['Ir em Relatórios', ''],
        ['Escolher o período', ''],
        ['Analisar faturamento, lucro, produtos mais vendidos e desempenho por vendedor', ''],
      ],
      [],
    ),
  ];
}

// ─── Métricas reais (calculadas a partir dos dados do sistema) ─────────────
type MetricFormat = 'currency' | 'number' | 'percent';
interface MetricDef {
  id: string; label: string; icon: React.ElementType; format: MetricFormat;
  direction: 'up' | 'down' | 'neutral'; // "up": quanto maior melhor. "down": quanto menor melhor.
  compute: (d: RawData) => number;
}
interface RawData { sales: any[]; products: any[]; leads: any[]; transactions: any[] }

function isThisMonth(dateStr: string) {
  if (!dateStr) return false;
  const d = new Date(dateStr); const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

const METRICS: MetricDef[] = [
  {
    id: 'faturamento_mes', label: 'Faturamento do Mês', icon: DollarSign, format: 'currency', direction: 'up',
    compute: (d) => d.sales.filter(s => isThisMonth(s.created_at)).reduce((a, s) => a + (Number(s.total_amount) || 0), 0),
  },
  {
    id: 'lucro_mes', label: 'Lucro do Mês', icon: TrendingUp, format: 'currency', direction: 'up',
    compute: (d) => {
      const mesTx = d.transactions.filter(t => isThisMonth(t.date));
      const income = mesTx.filter(t => t.type === 'income').reduce((a, t) => a + (Number(t.amount) || 0), 0);
      const expense = mesTx.filter(t => t.type === 'expense').reduce((a, t) => a + (Number(t.amount) || 0), 0);
      return income - expense;
    },
  },
  {
    id: 'vendas_mes', label: 'Vendas no Mês', icon: ShoppingCart, format: 'number', direction: 'up',
    compute: (d) => d.sales.filter(s => isThisMonth(s.created_at)).length,
  },
  {
    id: 'ticket_medio', label: 'Ticket Médio', icon: BarChart3, format: 'currency', direction: 'up',
    compute: (d) => {
      const mes = d.sales.filter(s => isThisMonth(s.created_at));
      if (mes.length === 0) return 0;
      return mes.reduce((a, s) => a + (Number(s.total_amount) || 0), 0) / mes.length;
    },
  },
  {
    id: 'conversao_leads', label: 'Conversão de Leads', icon: Users, format: 'percent', direction: 'up',
    compute: (d) => {
      if (d.leads.length === 0) return 0;
      const closed = d.leads.filter(l => l.status === 'closed').length;
      return (closed / d.leads.length) * 100;
    },
  },
  {
    id: 'aparelhos_parados', label: 'Aparelhos Parados (+45d)', icon: AlertTriangle, format: 'number', direction: 'down',
    compute: (d) => d.products.filter(p => {
      if (Number(p.stock_quantity) <= 0 || !p.entry_date) return false;
      const days = Math.floor((Date.now() - new Date(p.entry_date + 'T12:00').getTime()) / 86400000);
      return days >= 45;
    }).length,
  },
  {
    id: 'reservas_ativas', label: 'Reservas Ativas', icon: Lock, format: 'number', direction: 'neutral',
    compute: (d) => d.products.filter(p => p.status === 'reserved').length,
  },
  {
    id: 'capital_estoque', label: 'Capital em Estoque', icon: Package, format: 'currency', direction: 'neutral',
    compute: (d) => d.products.filter(p => Number(p.stock_quantity) > 0).reduce((a, p) => a + (Number(p.purchase_price) || 0), 0),
  },
];
function getMetric(id: string) { return METRICS.find(m => m.id === id); }
function formatMetric(value: number, format: MetricFormat) {
  if (format === 'currency') return formatCurrency(value);
  if (format === 'percent') return `${value.toFixed(1)}%`;
  return String(Math.round(value));
}

// ─── Página ─────────────────────────────────────────────────────────────────
export const Processos: React.FC = () => {
  const [tab, setTab] = useState<'processos' | 'metricas'>('processos');
  const [processes, setProcesses] = useState<ProcessDoc[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rawData, setRawData] = useState<RawData>({ sales: [], products: [], leads: [], transactions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyProcessForm());
  const [isSaving, setIsSaving] = useState(false);
  const [newAttention, setNewAttention] = useState('');

  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ metricId: METRICS[0].id, label: '', target: '', deadline: '' });

  // ── Load ──
  useEffect(() => {
    (async () => {
      try {
        const [board, sales, products, leads, transactions] = await Promise.all([
          dataService.getProcessosBoard(),
          dataService.getSales().catch(() => []),
          dataService.getProducts().catch(() => []),
          dataService.getLeads().catch(() => []),
          dataService.getTransactions().catch(() => []),
        ]);
        const allSeeds = seedProcesses();
        if (board && Array.isArray(board.processes) && board.processes.length > 0) {
          // Migração incremental: novos processos padrão adicionados depois que o
          // usuário já tinha o quadro — anexa só os que ainda não existem (por
          // título), sem duplicar nem mexer no que já foi editado.
          const existingTitles = new Set(board.processes.map((p: ProcessDoc) => p.title));
          const missing = allSeeds.filter(p => !existingTitles.has(p.title));
          const merged = missing.length > 0 ? [...board.processes, ...missing] : board.processes;
          setProcesses(merged);
          if (missing.length > 0) {
            dataService.saveProcessosBoard({ processes: merged, goals: board.goals || [] }).catch(() => { /* silencioso */ });
          }
        } else {
          setProcesses(allSeeds);
        }
        setGoals(board?.goals && Array.isArray(board.goals) ? board.goals : []);
        setRawData({ sales: sales || [], products: products || [], leads: leads || [], transactions: transactions || [] });
      } catch {
        setProcesses(seedProcesses());
      }
      setLoaded(true);
      setIsLoading(false);
    })();
  }, []);

  const persist = useCallback((nextProcesses: ProcessDoc[], nextGoals: Goal[]) => {
    setProcesses(nextProcesses);
    setGoals(nextGoals);
    if (!loaded) return;
    dataService.saveProcessosBoard({ processes: nextProcesses, goals: nextGoals }).catch(() => { /* silencioso */ });
  }, [loaded]);

  const metricValues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of METRICS) map[m.id] = m.compute(rawData);
    return map;
  }, [rawData]);

  const filteredProcesses = useMemo(
    () => categoryFilter === 'Todas' ? processes : processes.filter(p => p.category === categoryFilter),
    [processes, categoryFilter],
  );

  // ── Process CRUD ──
  const openCreate = () => {
    setDetailId(null);
    setForm(emptyProcessForm());
    setIsEditing(true);
  };
  const openDetail = (p: ProcessDoc) => {
    setDetailId(p.id);
    setForm({ title: p.title, category: p.category, description: p.description, steps: p.steps, attentionPoints: p.attentionPoints, status: p.status });
    setIsEditing(false);
  };

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, { id: safeUUID(), title: '', description: '', attention: '' }] }));
  const updateStep = (id: string, patch: Partial<ProcessStep>) =>
    setForm(f => ({ ...f, steps: f.steps.map(s => s.id === id ? { ...s, ...patch } : s) }));
  const removeStep = (id: string) => setForm(f => ({ ...f, steps: f.steps.filter(s => s.id !== id) }));
  const moveStep = (id: string, dir: -1 | 1) => setForm(f => {
    const idx = f.steps.findIndex(s => s.id === id);
    const to = idx + dir;
    if (to < 0 || to >= f.steps.length) return f;
    const steps = [...f.steps];
    [steps[idx], steps[to]] = [steps[to], steps[idx]];
    return { ...f, steps };
  });
  const addAttention = () => {
    if (!newAttention.trim()) return;
    setForm(f => ({ ...f, attentionPoints: [...f.attentionPoints, newAttention.trim()] }));
    setNewAttention('');
  };
  const removeAttention = (idx: number) => setForm(f => ({ ...f, attentionPoints: f.attentionPoints.filter((_, i) => i !== idx) }));

  const handleSaveProcess = () => {
    if (!form.title.trim()) { toast.error('Informe o título do processo.'); return; }
    setIsSaving(true);
    const now = new Date().toISOString();
    if (detailId) {
      const next = processes.map(p => p.id === detailId ? { ...p, ...form, updated_at: now } : p);
      persist(next, goals);
      toast.success('Processo atualizado!');
    } else {
      const created: ProcessDoc = { id: safeUUID(), ...form, created_at: now, updated_at: now };
      persist([...processes, created], goals);
      toast.success('Processo criado!');
      setDetailId(created.id);
    }
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleDeleteProcess = (id: string) => {
    if (!confirm('Excluir este processo? Não dá pra desfazer.')) return;
    persist(processes.filter(p => p.id !== id), goals);
    setDetailId(null);
    toast.success('Processo excluído.');
  };

  // ── Goals CRUD ──
  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(goalForm.target);
    if (!target || target <= 0) { toast.error('Informe uma meta válida.'); return; }
    const metric = getMetric(goalForm.metricId);
    const goal: Goal = {
      id: safeUUID(), metricId: goalForm.metricId,
      label: goalForm.label.trim() || metric?.label || 'Meta',
      target, deadline: goalForm.deadline, created_at: new Date().toISOString(),
    };
    persist(processes, [...goals, goal]);
    setIsGoalOpen(false);
    setGoalForm({ metricId: METRICS[0].id, label: '', target: '', deadline: '' });
    toast.success('Meta criada!');
  };
  const handleDeleteGoal = (id: string) => {
    persist(processes, goals.filter(g => g.id !== id));
    toast.success('Meta removida.');
  };

  const detailProcess = detailId ? processes.find(p => p.id === detailId) ?? null : null;

  if (isLoading) {
    return (
      <div className="space-y-5 pb-10">
        <div className="h-8 w-52 bg-neutral-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Workflow size={22} className="text-primary" /> Processos Easy Imports
          </h2>
          <p className="text-neutral-500">
            <strong>{processes.length}</strong> processo{processes.length !== 1 ? 's' : ''} documentado{processes.length !== 1 ? 's' : ''}
            {goals.length > 0 && <span className="text-neutral-400"> · {goals.length} meta{goals.length !== 1 ? 's' : ''} ativa{goals.length !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        {tab === 'processos' ? (
          <Button leftIcon={<Plus size={16} />} onClick={openCreate}>Novo Processo</Button>
        ) : (
          <Button leftIcon={<Target size={16} />} onClick={() => setIsGoalOpen(true)}>Nova Meta</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200">
        <button
          onClick={() => setTab('processos')}
          className={cn(
            'px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors flex items-center gap-1.5',
            tab === 'processos' ? 'border-primary text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-600',
          )}
        >
          <ListChecks size={15} /> Processos
        </button>
        <button
          onClick={() => setTab('metricas')}
          className={cn(
            'px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors flex items-center gap-1.5',
            tab === 'metricas' ? 'border-primary text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-600',
          )}
        >
          <BarChart3 size={15} /> Métricas
        </button>
      </div>

      {tab === 'processos' ? (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['Todas', ...CATEGORIES].map(c => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0',
                  categoryFilter === c ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200',
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Process grid */}
          {filteredProcesses.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 bg-white border border-neutral-200 rounded-2xl">
              <Workflow size={36} className="mx-auto mb-3 text-neutral-300" />
              <p className="font-bold text-neutral-600">Nenhum processo nessa categoria</p>
              <p className="text-sm mt-1">Crie um novo processo pra documentar esse fluxo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProcesses.map(p => {
                const color = CATEGORY_COLORS[p.category] || '#525252';
                return (
                  <button
                    key={p.id}
                    onClick={() => openDetail(p)}
                    className="text-left bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all p-4 flex flex-col gap-2.5"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ color, backgroundColor: color + '18' }}>
                        {p.category}
                      </span>
                      {p.status === 'rascunho' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400">Rascunho</span>
                      )}
                    </div>
                    <p className="font-bold text-neutral-900 text-[15px] leading-snug">{p.title}</p>
                    {p.description && <p className="text-xs text-neutral-400 line-clamp-2">{p.description}</p>}
                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-medium pt-1 border-t border-neutral-100 mt-auto">
                      <span className="flex items-center gap-1"><ListChecks size={11} /> {p.steps.length} passo{p.steps.length !== 1 ? 's' : ''}</span>
                      {p.attentionPoints.length > 0 && (
                        <span className="flex items-center gap-1 text-amber-600"><AlertTriangle size={11} /> {p.attentionPoints.length}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI cards — dados reais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {METRICS.map(m => {
              const Icon = m.icon;
              const value = metricValues[m.id] ?? 0;
              return (
                <div key={m.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
                  <div className="flex items-center gap-2 text-neutral-400 mb-2">
                    <Icon size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wide">{m.label}</span>
                  </div>
                  <p className="text-xl font-black text-neutral-900">{formatMetric(value, m.format)}</p>
                </div>
              );
            })}
          </div>

          {/* Goals */}
          <div>
            <h3 className="text-sm font-black text-neutral-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Target size={14} /> Metas
            </h3>
            {goals.length === 0 ? (
              <div className="py-10 text-center text-neutral-400 bg-white border border-neutral-200 rounded-2xl">
                <Target size={28} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-sm">Nenhuma meta criada ainda. Escolha uma métrica real e defina um alvo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {goals.map(g => {
                  const metric = getMetric(g.metricId);
                  if (!metric) return null;
                  const current = metricValues[g.metricId] ?? 0;
                  const progress = metric.direction === 'down'
                    ? (current <= g.target ? 100 : Math.max(0, Math.min(100, (g.target / Math.max(current, 1)) * 100)))
                    : Math.max(0, Math.min(100, (current / g.target) * 100));
                  const hit = metric.direction === 'down' ? current <= g.target : current >= g.target;
                  return (
                    <div key={g.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-neutral-900">{g.label}</p>
                          <p className="text-[11px] text-neutral-400">{metric.label}{g.deadline ? ` · até ${new Date(g.deadline + 'T12:00').toLocaleDateString('pt-BR')}` : ''}</p>
                        </div>
                        <button onClick={() => handleDeleteGoal(g.id)} className="p-1 text-neutral-300 hover:text-red-400 transition-colors flex-shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', hit ? 'bg-green-500' : 'bg-primary')}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-700">{formatMetric(current, metric.format)}</span>
                        <span className="text-neutral-400">meta: {formatMetric(g.target, metric.format)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DETALHE / EDIÇÃO DE PROCESSO */}
      <Modal
        isOpen={!!detailProcess || isEditing}
        onClose={() => { setDetailId(null); setIsEditing(false); }}
        title={isEditing ? (detailId ? 'Editar Processo' : 'Novo Processo') : (detailProcess?.title || '')}
        maxWidth="lg"
      >
        {isEditing ? (
          <div className="space-y-4">
            <Input label="Título *" placeholder="Ex: Venda de Aparelho do Estoque" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus autoComplete="off" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Categoria</label>
                <select className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1.5">Status</label>
                <select className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'ativo' | 'rascunho' }))}>
                  <option value="ativo">Ativo</option>
                  <option value="rascunho">Rascunho</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Descrição</label>
              <textarea
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary resize-none"
                rows={2} placeholder="Do que se trata esse processo..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Steps editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-neutral-700">Passos do Processo</label>
                <button type="button" onClick={addStep} className="text-xs font-bold text-primary-700 hover:underline flex items-center gap-1">
                  <Plus size={13} /> Adicionar passo
                </button>
              </div>
              <div className="space-y-2">
                {form.steps.map((s, i) => (
                  <div key={s.id} className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <input
                        className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/25"
                        placeholder="Título do passo" value={s.title}
                        onChange={e => updateStep(s.id, { title: e.target.value })}
                      />
                      <button type="button" onClick={() => moveStep(s.id, -1)} disabled={i === 0} className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-20 flex-shrink-0"><ChevronUp size={15} /></button>
                      <button type="button" onClick={() => moveStep(s.id, 1)} disabled={i === form.steps.length - 1} className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-20 flex-shrink-0"><ChevronDown size={15} /></button>
                      <button type="button" onClick={() => removeStep(s.id)} className="p-1 text-neutral-300 hover:text-red-400 flex-shrink-0"><Trash2 size={14} /></button>
                    </div>
                    <textarea
                      className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/25 resize-none"
                      rows={2} placeholder="Descrição do passo (opcional)"
                      value={s.description} onChange={e => updateStep(s.id, { description: e.target.value })}
                    />
                    <input
                      className="w-full bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-300"
                      placeholder="⚠️ Ponto de atenção deste passo (opcional)"
                      value={s.attention} onChange={e => updateStep(s.id, { attention: e.target.value })}
                    />
                  </div>
                ))}
                {form.steps.length === 0 && <p className="text-xs text-neutral-400 text-center py-3">Nenhum passo ainda.</p>}
              </div>
            </div>

            {/* Attention points editor */}
            <div>
              <label className="text-sm font-bold text-neutral-700 mb-2 flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-500" /> Pontos de Atenção Gerais</label>
              <div className="space-y-1.5 mb-2">
                {form.attentionPoints.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="flex-1 text-xs text-amber-800">{a}</p>
                    <button type="button" onClick={() => removeAttention(i)} className="text-amber-400 hover:text-red-500 flex-shrink-0"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                  placeholder="Ex: Sempre conferir X antes de Y..."
                  value={newAttention} onChange={e => setNewAttention(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAttention(); } }}
                />
                <Button type="button" variant="secondary" onClick={addAttention}>Adicionar</Button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth type="button" onClick={() => (detailId ? setIsEditing(false) : setDetailId(null))}>Cancelar</Button>
              <Button fullWidth loading={isSaving} type="button" onClick={handleSaveProcess}>Salvar</Button>
            </div>
          </div>
        ) : detailProcess ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ color: CATEGORY_COLORS[detailProcess.category], backgroundColor: (CATEGORY_COLORS[detailProcess.category] || '#525252') + '18' }}>
                {detailProcess.category}
              </span>
              {detailProcess.status === 'rascunho' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400">Rascunho</span>}
            </div>
            {detailProcess.description && <p className="text-sm text-neutral-500">{detailProcess.description}</p>}

            {/* Visual step flow */}
            {detailProcess.steps.length > 0 && (
              <div className="space-y-0">
                {detailProcess.steps.map((s, i) => (
                  <div key={s.id} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-neutral-900 text-white text-xs font-black flex items-center justify-center">{i + 1}</div>
                      {i < detailProcess.steps.length - 1 && <div className="w-0.5 flex-1 bg-neutral-200 my-1" style={{ minHeight: 24 }} />}
                    </div>
                    <div className="flex-1 pb-5 min-w-0">
                      <p className="text-sm font-bold text-neutral-900">{s.title}</p>
                      {s.description && <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{s.description}</p>}
                      {s.attention && (
                        <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                          <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-amber-800 leading-relaxed">{s.attention}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailProcess.attentionPoints.length > 0 && (
              <div>
                <p className="text-xs font-black text-neutral-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-amber-500" /> Pontos de Atenção
                </p>
                <div className="space-y-1.5">
                  {detailProcess.attentionPoints.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <ArrowRight size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-800 leading-relaxed">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleDeleteProcess(detailProcess.id)}
                className="w-12 flex items-center justify-center rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors flex-shrink-0"
                title="Excluir processo"
              >
                <Trash2 size={16} />
              </button>
              <Button variant="secondary" fullWidth leftIcon={<Pencil size={14} />} onClick={() => setIsEditing(true)}>Editar</Button>
              <Button fullWidth onClick={() => setDetailId(null)}>Fechar</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* MODAL NOVA META */}
      <Modal isOpen={isGoalOpen} onClose={() => setIsGoalOpen(false)} title="Nova Meta" maxWidth="sm">
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">Métrica</label>
            <select
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              value={goalForm.metricId}
              onChange={e => setGoalForm(f => ({ ...f, metricId: e.target.value }))}
            >
              {METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <p className="text-[11px] text-neutral-400 mt-1">
              Valor atual: <strong>{formatMetric(metricValues[goalForm.metricId] ?? 0, getMetric(goalForm.metricId)?.format || 'number')}</strong>
            </p>
          </div>
          <Input label="Nome da meta (opcional)" placeholder="Ex: Bater 30 vendas por mês" value={goalForm.label} onChange={e => setGoalForm(f => ({ ...f, label: e.target.value }))} autoComplete="off" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Alvo *" type="number" step="any" placeholder="Ex: 30000" value={goalForm.target} onChange={e => setGoalForm(f => ({ ...f, target: e.target.value }))} />
            <Input label="Prazo (opcional)" type="date" value={goalForm.deadline} onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth type="button" onClick={() => setIsGoalOpen(false)}>Cancelar</Button>
            <Button fullWidth type="submit">Criar Meta</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Processos;
