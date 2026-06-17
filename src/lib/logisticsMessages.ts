// Geração das mensagens de WhatsApp prontas para copiar:
//  • Cliente  — confirmação do pedido (estilo Easy Imports)
//  • Motoboy  — corrida passo a passo para cada tipo de venda
//  • Busca     — corrida separada para buscar aparelho (troca com coleta no dia seguinte)
//
// Tipos cobertos:
//  venda  → coleta na loja → entrega no cliente
//  troca  → coleta na loja → entrega no cliente → BUSCA aparelho do cliente (mesmo dia ou dia seguinte)
//  prazo  → igual venda, com instruções de parcelamento e entrada (se houver)
//  compra → vai ao cliente → PAGA e RECOLHE aparelho → traz para a loja

export interface SaleItemMsg {
  name: string;
  capacity?: string;
  color?: string;
  condition?: string;
  price?: number;
}

export interface SaleMsgData {
  saleType: string;            // 'venda' | 'troca' | 'prazo' | 'compra'
  saleNumber: string;
  customerName: string;
  phone?: string;
  productName: string;
  capacity?: string;
  color?: string;
  condition?: string;
  isNovo?: boolean;
  totalAmount: number;
  paymentMethod: string;
  installments?: number;       // nº de parcelas (prazo)
  installmentValue?: number;   // valor de cada parcela (prazo)
  entradaAmount?: number;      // valor da entrada (prazo com entrada)
  incomingName?: string;       // aparelho recebido (troca)
  incomingValue?: number;      // valor dado pelo aparelho (troca)
  warranty?: string;           // garantia explícita (ex.: "Garantia Apple até fev/2027")
  cashReceived?: number;       // diferença a pagar na troca
  incomingDevices?: { model: string; value: number }[]; // todos os dispositivos de troca
  items?: SaleItemMsg[];
  saleDateISO?: string;
}

export interface DeliveryInfo {
  deliveryAddress: string;
  deliveryTime: string;
  pickupLocation: string;
  pickupContact: string;
  pickupTime: string;
  recipient: string;
  freightFree: boolean;
  freightValue: string;
  instructions: string;
  chargeMode: 'pago' | 'aguardar_pix' | 'maquininha' | 'dinheiro';
  // Pagamento dividido na entrega (ex.: parte no cartão + parte no PIX).
  // Quando preenchido, tem prioridade sobre chargeMode nas mensagens.
  chargeBreakdown?: { method: 'pix' | 'cartao' | 'dinheiro'; amount: number }[];
  // Busca agendada (troca) — corrida separada para buscar aparelho
  deferCollection: boolean;
  collectionDate: string;       // YYYY-MM-DD da busca agendada
  collectionTime: string;       // horário estimado da busca
  collectionDropoffLocation: string; // onde entregar o aparelho após buscar
}

export const emptyDelivery = (): DeliveryInfo => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    deliveryAddress: '',
    deliveryTime: '',
    pickupLocation: '',
    pickupContact: '',
    pickupTime: '',
    recipient: '',
    freightFree: true,
    freightValue: '',
    instructions: '',
    chargeMode: 'pago',
    chargeBreakdown: [],
    deferCollection: false,
    collectionDate: tomorrow.toISOString().split('T')[0],
    collectionTime: '',
    collectionDropoffLocation: '',
  };
};

// Label sem emoji — ícones ficam no componente (Lucide, identidade visual)
export const CHARGE_MODES: { id: DeliveryInfo['chargeMode']; label: string }[] = [
  { id: 'pago',         label: 'Já pago' },
  { id: 'aguardar_pix', label: 'Aguardar PIX na entrega' },
  { id: 'maquininha',   label: 'Cobrar na maquininha' },
  { id: 'dinheiro',     label: 'Receber em dinheiro' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const brl = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const firstName = (full: string) => (full || '').trim().split(/\s+/)[0] || 'Cliente';

const dateBR = (iso?: string) => {
  if (!iso) return new Date().toLocaleDateString('pt-BR');
  // Datas "YYYY-MM-DD" (sem hora) seriam lidas como UTC e voltariam 1 dia
  // no fuso do Brasil (UTC-3). Fixa ao meio-dia local para evitar isso.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR');
};

const warrantyLine = (s: SaleMsgData): string => {
  // Garantia explícita (ex.: "Garantia Apple até fev/2027") tem prioridade.
  const w = (s.warranty || '').trim();
  if (w) return /apple/i.test(w) ? `🍎 ${w}` : `🛡️ ${w}`;
  // Se a condição já menciona garantia, não duplica com a genérica.
  if (/garantia/i.test(s.condition || '')) return '';
  return s.isNovo ? '🍎 Garantia Apple' : '🛡️ Garantia Easy Imports 90 dias';
};

function productBlock(name: string, capacity?: string, color?: string, condition?: string, price?: number): string[] {
  const lines = [`📱 ${name}`];
  if (capacity) lines.push(`💾 ${capacity}`);
  if (color)    lines.push(`🎨 ${color}`);
  if (condition) {
    const c = condition.toLowerCase();
    if (c.includes('lacrado') || c.startsWith('novo')) lines.push('🔒 Lacrado');
    else lines.push(`✨ ${condition}`);
  }
  if (price && price > 0) lines.push(`💰 ${brl(price)}`);
  return lines;
}

function freightLine(d: DeliveryInfo): string {
  if (d.freightFree) return '🚚 Frete grátis';
  const v = Number(String(d.freightValue).replace(',', '.'));
  return v > 0 ? `🚚 Frete: ${brl(v)}` : '🚚 Frete a combinar';
}

const splitEntries = (d: DeliveryInfo) =>
  (d.chargeBreakdown || []).filter((b) => Number(b.amount) > 0);

const methodWord = (m: 'pix' | 'cartao' | 'dinheiro') =>
  m === 'pix' ? 'PIX' : m === 'cartao' ? 'cartão' : 'dinheiro';

const methodIcon = (m: 'pix' | 'cartao' | 'dinheiro') =>
  m === 'pix' ? '📲' : m === 'cartao' ? '💳' : '💵';

// Linhas de pagamento dividido para o cliente (indentadas).
function splitLinesClient(d: DeliveryInfo): string[] {
  return splitEntries(d).map((b) => `   ${methodIcon(b.method)} ${brl(b.amount)} no ${methodWord(b.method)}`);
}

function chargeLineMotoboy(d: DeliveryInfo, amount: number): string[] {
  // Pagamento dividido tem prioridade
  const split = splitEntries(d);
  if (split.length > 0) {
    const lines = ['💰 Cobrar na entrega (dividido):'];
    split.forEach((b) => {
      const how = b.method === 'cartao' ? 'cartão (maquininha)' : b.method === 'pix' ? 'PIX' : 'dinheiro';
      lines.push(`   ${methodIcon(b.method)} ${brl(b.amount)} no ${how}`);
    });
    const total = split.reduce((a, b) => a + Number(b.amount), 0);
    lines.push(`   ➡️ Total a receber: ${brl(total)}`);
    if (split.some((b) => b.method === 'pix')) {
      lines.push('⚠️ Conferir o comprovante do PIX antes de liberar o produto');
    }
    return lines;
  }
  switch (d.chargeMode) {
    case 'aguardar_pix':
      return [
        `💰 Cobrar via PIX: ${brl(amount)}`,
        '⚠️ SÓ LIBERAR o produto após confirmação do PIX com a loja',
      ];
    case 'maquininha':
      return [`💳 Cobrar ${brl(amount)} na maquininha`];
    case 'dinheiro':
      return [`💵 Receber ${brl(amount)} em dinheiro`];
    default:
      return ['✅ Pedido já pago — apenas entregar, sem cobrança'];
  }
}

const SEP = '━━━━━━━━━━━━━━━━━━';

// Helpers da mensagem do cliente (curta, sem dados internos)
const oneLineAddr = (a: string) => (a || '').trim().replace(/\s*\n\s*/g, ', ');
const specsLine = (name?: string, cap?: string, color?: string) =>
  [name, cap, color].filter(Boolean).join(' · ');
const freightShort = (d: DeliveryInfo) => {
  if (d.freightFree) return '🚚 Frete grátis';
  const v = Number(String(d.freightValue).replace(',', '.'));
  return v > 0 ? `🚚 Frete ${brl(v)}` : '🚚 Frete a combinar';
};
function splitInline(d: DeliveryInfo): string {
  const sp = splitEntries(d);
  if (!sp.length) return '';
  return sp.map((b) => `${methodIcon(b.method)} ${brl(b.amount)} no ${methodWord(b.method)}`).join('  ·  ');
}

// ─── Mensagem para o CLIENTE — curta, amigável, sem custo/crédito/notas internas
export function buildClientMessage(s: SaleMsgData, d: DeliveryInfo): string {
  const L: string[] = [];
  const nome = firstName(s.customerName);
  const sp = splitInline(d);

  // ── COMPRA (a loja compra o aparelho do cliente) ──
  if (s.saleType === 'compra') {
    L.push('🏪 Easy Imports');
    L.push('');
    L.push(`Olá ${nome}! Vamos comprar o seu aparelho:`);
    L.push(`📱 ${specsLine(s.productName, s.capacity, s.color)}`);
    L.push(`💰 Valor: ${brl(s.totalAmount)}`);
    if (d.deliveryAddress.trim()) L.push(`📍 Coleta: ${oneLineAddr(d.deliveryAddress)}`);
    if (d.deliveryTime.trim()) L.push(`🕒 ${d.deliveryTime.trim()}`);
    L.push('');
    L.push('Nosso motoboy já está a caminho. Obrigado! 🚀');
    return L.join('\n');
  }

  L.push('🏪 Easy Imports — Pedido confirmado ✅');
  L.push('');
  L.push(`Olá ${nome}! Segue o resumo do seu pedido:`);
  L.push('');

  // Produto que o cliente recebe
  L.push('📦 Você recebe:');
  L.push(specsLine(s.productName, s.capacity, s.color));
  const cw = [(s.condition || '').trim(), warrantyLine(s)].filter(Boolean).join(' · ');
  if (cw) L.push(cw);
  (s.items || []).forEach((it) => L.push(`➕ ${specsLine(it.name, it.capacity, it.color)}`));

  // Pagamento por tipo (sem expor custo nem "crédito")
  L.push('');
  if (s.saleType === 'troca') {
    const devs = s.incomingDevices?.length
      ? s.incomingDevices
      : s.incomingName ? [{ model: s.incomingName, value: s.incomingValue || 0 }] : [];
    if (devs.length) L.push(`🔄 Você entrega: ${devs.map((x) => x.model).join(' + ')}`);
    if (s.cashReceived != null && s.cashReceived > 0) {
      L.push(`💵 Você paga: ${brl(s.cashReceived)}`);
      if (sp) L.push(`   ${sp}`);
    } else {
      L.push('✅ Troca direta — sem diferença a pagar!');
    }
  } else if (s.saleType === 'prazo') {
    L.push(`💰 Total: ${brl(s.totalAmount)}`);
    if (s.entradaAmount && s.entradaAmount > 0) {
      L.push(`💵 Entrada: ${brl(s.entradaAmount)}${sp ? `  ·  ${sp}` : ''}`);
    }
    if (s.installments && s.installments > 1 && s.installmentValue) {
      L.push(`📅 + ${s.installments}x de ${brl(s.installmentValue)} no PIX`);
    }
  } else {
    L.push(`💰 Total: ${brl(s.totalAmount)}`);
    if (sp) L.push(`💳 Na entrega: ${sp}`);
    else if (s.paymentMethod) L.push(`💳 ${s.paymentMethod}`);
  }

  // Entrega (compacto)
  L.push('');
  if (d.deliveryAddress.trim()) L.push(`📍 Entrega: ${oneLineAddr(d.deliveryAddress)}`);
  const eta = [d.deliveryTime.trim() ? `🕒 ${d.deliveryTime.trim()}` : '', freightShort(d)]
    .filter(Boolean).join('  ·  ');
  if (eta) L.push(eta);

  // Recolha adiada (troca) — uma linha amigável
  if (s.saleType === 'troca' && d.deferCollection) {
    const devs = s.incomingDevices?.length
      ? s.incomingDevices.map((x) => x.model)
      : s.incomingName ? [s.incomingName] : [];
    const quando = `${d.collectionDate ? dateBR(d.collectionDate) : 'data a combinar'}${d.collectionTime ? ` (${d.collectionTime.toLowerCase()})` : ''}`;
    L.push('');
    L.push(`📅 Seu ${devs.join(' e ') || 'aparelho'} será recolhido em ${quando} — sem pressa pra transferir os dados 😊`);
  }

  L.push('');
  L.push('Obrigado pela preferência! 🚀');
  return L.join('\n');
}

// ─── Mensagem para o MOTOBOY ────────────────────────────────────────────────
export function buildMotoboyMessage(s: SaleMsgData, d: DeliveryInfo): string {
  const lines: string[] = [];

  const typeLabel =
    s.saleType === 'troca'  ? (d.deferCollection ? 'TROCA — ENTREGA' : 'TROCA — 3 PASSOS')  :
    s.saleType === 'compra' ? 'COMPRA — COLETA'    :
    s.saleType === 'prazo'  ? 'ENTREGA A PRAZO'    : 'ENTREGA';

  lines.push(`🏍️ CORRIDA EASY IMPORTS — ${typeLabel}`);
  lines.push(`📅 ${dateBR(s.saleDateISO)}${s.saleNumber ? ` · ${s.saleNumber}` : ''}`);
  lines.push('');

  // ─── COMPRA (loja compra do cliente — fluxo invertido) ───────────────────
  if (s.saleType === 'compra') {
    lines.push('📍 PASSO 1 — COLETA (na casa do cliente)');
    lines.push(d.deliveryAddress.trim() || '⚠️ DEFINIR ENDEREÇO DO CLIENTE');
    lines.push(`👤 Retirar com ${d.recipient.trim() || s.customerName || 'cliente'}`);
    if (d.deliveryTime.trim()) lines.push(`⏰ ${d.deliveryTime.trim()}`);
    lines.push('');
    const prod = [s.productName, s.capacity, s.color].filter(Boolean).join(' ');
    lines.push(`📱 Aparelho a recolher: ${prod}`);
    lines.push('📸 Fotografar o aparelho antes de retirar');
    lines.push('');
    lines.push(SEP);
    lines.push('');
    lines.push('📍 PASSO 2 — ENTREGA NA LOJA');
    lines.push(d.pickupLocation.trim() || '⚠️ DEFINIR ENDEREÇO DA LOJA');
    if (d.pickupContact.trim()) lines.push(`👤 Entregar para ${d.pickupContact.trim()}`);
    lines.push('');
    lines.push(SEP);
    lines.push('');
    lines.push('⚠️ IMPORTANTE');
    chargeLineMotoboy(d, s.totalAmount).forEach(l => lines.push(l));
    if (d.instructions.trim()) lines.push(`📌 ${d.instructions.trim()}`);
    lines.push('✅ Avisar a loja após finalizar');
    lines.push('');
    lines.push('🚀 Easy Imports agradece! Boa corrida! 🏍️');
    return lines.join('\n');
  }

  // ─── VENDA / TROCA / PRAZO ───────────────────────────────────────────────

  // PASSO 1: Coleta na loja
  lines.push('📍 PASSO 1 — COLETA NA LOJA');
  lines.push(d.pickupLocation.trim() || '⚠️ DEFINIR LOCAL DE COLETA');
  if (d.pickupContact.trim()) lines.push(`👤 Retirar com ${d.pickupContact.trim()}`);
  if (d.pickupTime.trim())    lines.push(`⏰ Coletar ${d.pickupTime.trim()}`);
  lines.push('');

  // Produtos a transportar
  const mainProd = [s.productName, s.capacity, s.color].filter(Boolean).join(' ');
  lines.push(`📦 Levar: ${mainProd}`);
  (s.items || []).forEach(it => {
    const p = [it.name, it.capacity, it.color].filter(Boolean).join(' ');
    if (p) lines.push(`📦 Levar: ${p}`);
  });

  lines.push('');
  lines.push(SEP);
  lines.push('');

  // PASSO 2: Entrega no cliente
  lines.push('📍 PASSO 2 — ENTREGA NO CLIENTE');
  lines.push(d.deliveryAddress.trim() || '⚠️ DEFINIR ENDEREÇO DE ENTREGA');
  lines.push(`👤 Entregar em mãos para ${d.recipient.trim() || s.customerName || 'cliente'}`);
  if (d.deliveryTime.trim()) lines.push(`🕒 Previsão: ${d.deliveryTime.trim()}`);

  // Cobrança na entrega
  const chargeAmount =
    s.saleType === 'troca' && s.cashReceived != null ? s.cashReceived :
    s.saleType === 'prazo' && s.entradaAmount ? s.entradaAmount :
    s.totalAmount;
  lines.push('');
  chargeLineMotoboy(d, chargeAmount).forEach(l => lines.push(l));

  // PASSO 3: Buscar aparelho do cliente (somente se for no mesmo dia)
  if (s.saleType === 'troca' && !d.deferCollection) {
    const devs = s.incomingDevices?.length
      ? s.incomingDevices
      : s.incomingName ? [{ model: s.incomingName, value: s.incomingValue || 0 }] : [];

    lines.push('');
    lines.push(SEP);
    lines.push('');

    lines.push('🔄 PASSO 3 — BUSCAR APARELHO DO CLIENTE');
    if (devs.length > 0) {
      devs.forEach(dev => {
        lines.push(`📱 ${dev.model}${dev.value > 0 ? ` — avaliado em ${brl(dev.value)}` : ''}`);
      });
    } else {
      lines.push('📱 Aparelho do cliente (confirmar modelo na entrega)');
    }
    lines.push('');
    lines.push('⚠️ NÃO SAIR SEM O APARELHO DO CLIENTE!');
    lines.push('📸 Fotografar antes de guardar (frente e verso)');
    lines.push('🔒 Bem embalado — trazer direto para a loja');
  }

  lines.push('');
  lines.push(SEP);
  lines.push('');
  lines.push('✅ CHECKLIST');
  lines.push('📸 Foto do produto nas mãos do cliente');
  if (s.saleType === 'troca' && !d.deferCollection) {
    lines.push('📱 Confirmar que trouxe o aparelho do cliente');
  }
  if (d.instructions.trim()) lines.push(`📌 ${d.instructions.trim()}`);
  lines.push('📲 Avisar a loja após finalizar');
  lines.push('');
  lines.push('🚀 Easy Imports agradece! Boa corrida! 🏍️');
  return lines.join('\n');
}

// ─── Mensagem de BUSCA (corrida separada — dia agendado) ─────────────────────
export function buildCollectionMessage(s: SaleMsgData, d: DeliveryInfo): string {
  const devs = s.incomingDevices?.length
    ? s.incomingDevices
    : s.incomingName ? [{ model: s.incomingName, value: s.incomingValue || 0 }] : [];

  const lines: string[] = [];
  lines.push('🏍️ CORRIDA EASY IMPORTS — BUSCA DE APARELHO');
  lines.push(`📅 ${d.collectionDate ? dateBR(d.collectionDate) : 'Data a confirmar'}${d.collectionTime ? ` · ${d.collectionTime}` : ''}${s.saleNumber ? ` · ${s.saleNumber}` : ''}`);
  lines.push('');

  // PASSO 1 — Buscar com o cliente
  lines.push('📍 PASSO 1 — BUSCAR COM O CLIENTE');
  lines.push(d.deliveryAddress.trim() || '⚠️ CONFIRMAR ENDEREÇO DO CLIENTE');
  lines.push(`👤 ${d.recipient.trim() || s.customerName || 'cliente'}`);
  if (d.collectionTime.trim()) lines.push(`⏰ ${d.collectionTime.trim()}`);
  lines.push('');

  // Aparelho (sem valor — motoboy não precisa saber)
  if (devs.length > 0) {
    devs.forEach(dev => lines.push(`📱 ${dev.model}`));
  } else {
    lines.push('📱 Confirmar modelo com o cliente');
  }

  lines.push('');
  lines.push(SEP);
  lines.push('');

  // PASSO 2 — Entregar na loja / destino
  lines.push('📍 PASSO 2 — ENTREGAR EM');
  lines.push(d.collectionDropoffLocation.trim() || '⚠️ CONFIRMAR ENDEREÇO DE DESTINO');
  lines.push('');
  lines.push(SEP);
  lines.push('');

  // Checklist
  lines.push('✅ CHECKLIST');
  lines.push('📸 Fotografar o aparelho (frente e verso) antes de guardar');
  lines.push('📲 Avisar a loja após entregar');
  lines.push('');
  lines.push('🚀 Easy Imports agradece! Boa corrida! 🏍️');
  return lines.join('\n');
}

// Link wa.me com texto pré-preenchido
export function waLink(phone: string, text: string): string {
  const clean = (phone || '').replace(/\D/g, '');
  const num = clean ? (clean.startsWith('55') ? clean : `55${clean}`) : '';
  const base = num ? `https://wa.me/${num}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}
