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
  // Split de pagamento vindo da venda (pré-preenche o formulário de entrega)
  saleChargeBreakdown?: { method: 'pix' | 'cartao' | 'dinheiro'; amount: number }[];
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
  // Override do valor a cobrar (ex.: após aplicar taxas do cartão)
  chargeAmountOverride?: number;
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
    chargeAmountOverride: undefined,
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

// Valor final que o cliente paga (override > split total > base)
function clientChargeAmount(s: SaleMsgData, d: DeliveryInfo): number {
  if (d.chargeAmountOverride && d.chargeAmountOverride > 0) return d.chargeAmountOverride;
  const splitTotal = splitEntries(d).reduce((a, b) => a + Number(b.amount), 0);
  if (splitTotal > 0) return splitTotal;
  if (s.saleType === 'troca') return s.cashReceived ?? 0;
  if (s.saleType === 'prazo') return s.entradaAmount ?? s.totalAmount;
  return s.totalAmount;
}

// Como o cliente paga — uma frase curta (PIX, cartão, dinheiro) ou linhas de split
function chargeMethodClient(d: DeliveryInfo): string {
  if (splitEntries(d).length > 0) return ''; // split: tratado separadamente com splitLinesClient
  switch (d.chargeMode) {
    case 'aguardar_pix': return ' via PIX';
    case 'maquininha':   return ' no cartão';
    case 'dinheiro':     return ' em dinheiro';
    default:             return '';
  }
}

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

  // Pagamento por tipo — mostra valor final e forma de pagamento, sem expor custo interno
  L.push('');
  const cAmount = clientChargeAmount(s, d);
  const cHow = chargeMethodClient(d);
  const splitList = splitLinesClient(d); // linhas de split (ex: 💳 R$ 5.000 no cartão)

  const pushPayment = (label: string) => {
    if (splitList.length > 0) {
      L.push(label);
      splitList.forEach(l => L.push(l));
    } else {
      L.push(`${label}${cHow}`);
    }
  };

  if (s.saleType === 'troca') {
    const devs = s.incomingDevices?.length
      ? s.incomingDevices
      : s.incomingName ? [{ model: s.incomingName, value: s.incomingValue || 0 }] : [];
    if (devs.length) L.push(`🔄 Você entrega: ${devs.map((x) => x.model).join(' + ')}`);
    if (cAmount > 0) {
      pushPayment(`💵 Você paga: ${brl(cAmount)}`);
    } else {
      L.push('✅ Troca direta — sem diferença a pagar!');
    }
  } else if (s.saleType === 'prazo') {
    if (s.entradaAmount && s.entradaAmount > 0) {
      pushPayment(`💵 Entrada: ${brl(cAmount)}`);
    } else {
      pushPayment(`💰 Total: ${brl(cAmount)}`);
    }
    if (s.installments && s.installments > 1 && s.installmentValue) {
      L.push(`📅 + ${s.installments}x de ${brl(s.installmentValue)} no PIX`);
    }
  } else {
    pushPayment(`💰 Total: ${brl(cAmount)}`);
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

// Monta o nome do aparelho sem repetir capacidade/cor que já estão no nome.
// Ex.: nome "iPad 256GB Prata" + cap "256GB" + cor "Prata" → "iPad 256GB Prata"
function deviceLabel(name?: string, cap?: string, color?: string): string {
  let label = (name || '').trim();
  const append = (part?: string) => {
    const p = (part || '').trim();
    if (!p) return;
    const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (!re.test(label)) label = `${label} ${p}`.trim();
  };
  append(cap);
  append(color);
  return label.trim();
}

// Bloco de cobrança para o motoboy — sempre com cabeçalho "COBRAR" e uma linha por forma
function chargeBlock(d: DeliveryInfo, amount: number): string[] {
  const split = splitEntries(d);
  if (split.length > 0) {
    const lines = ['💰 COBRAR'];
    split.forEach((b) => lines.push(`${methodIcon(b.method)} ${brl(b.amount)} no ${methodWord(b.method)}`));
    const total = split.reduce((a, b) => a + Number(b.amount), 0);
    lines.push(`➡️ Total: ${brl(total)}`);
    if (split.some((b) => b.method === 'pix')) lines.push('⚠️ Confirmar PIX antes de entregar');
    return lines;
  }
  switch (d.chargeMode) {
    case 'aguardar_pix': return ['💰 COBRAR', `📲 ${brl(amount)} via PIX`, '⚠️ Confirmar PIX antes de entregar'];
    case 'maquininha':   return ['💰 COBRAR', `💳 ${brl(amount)} na maquininha`];
    case 'dinheiro':     return ['💰 COBRAR', `💵 ${brl(amount)} em dinheiro`];
    default:             return ['✅ Já pago — só entregar'];
  }
}

// ─── Mensagem para o MOTOBOY ────────────────────────────────────────────────
// Formato em blocos rotulados (COLETA / ENTREGA / COBRAR), uma informação por
// linha, com linha em branco entre os blocos. Fácil de ler na pressa.
export function buildMotoboyMessage(s: SaleMsgData, d: DeliveryInfo): string {
  const L: string[] = [];

  const tipo =
    s.saleType === 'troca'  ? 'TROCA' :
    s.saleType === 'compra' ? 'COMPRA' :
    s.saleType === 'prazo'  ? 'PRAZO' : 'ENTREGA';

  L.push(`🏍️ ${tipo}${s.saleNumber ? ` · ${s.saleNumber}` : ''} · ${dateBR(s.saleDateISO)}`);
  L.push('');

  const baseCharge =
    s.saleType === 'troca' && s.cashReceived != null ? s.cashReceived :
    s.saleType === 'prazo' && s.entradaAmount ? s.entradaAmount :
    s.totalAmount;
  const chargeAmount = d.chargeAmountOverride && d.chargeAmountOverride > 0
    ? d.chargeAmountOverride : baseCharge;

  // ─── COMPRA (fluxo invertido: vai ao cliente, traz aparelho, paga) ───────
  if (s.saleType === 'compra') {
    const prod = deviceLabel(s.productName, s.capacity, s.color);
    const dest = d.deliveryAddress.trim() || '⚠️ CONFIRMAR ENDEREÇO DO CLIENTE';
    const loja = d.pickupLocation.trim() || '⚠️ CONFIRMAR ENDEREÇO DA LOJA';
    const quem = d.recipient.trim() || s.customerName || 'cliente';

    L.push('📦 COLETA (com o cliente)');
    L.push(`📍 ${dest}`);
    L.push(`👤 ${quem}`);
    if (d.deliveryTime.trim()) L.push(`🕒 ${d.deliveryTime.trim()}`);
    L.push(`📱 ${prod}`);
    L.push('📸 Foto antes de retirar');
    L.push('');
    L.push('🏪 ENTREGAR NA LOJA');
    L.push(`📍 ${loja}`);
    if (d.pickupContact.trim()) L.push(`👤 ${d.pickupContact.trim()}`);
    L.push('');
    chargeBlock(d, chargeAmount).forEach((l) => L.push(l));
    if (d.instructions.trim()) { L.push(''); L.push(`📌 ${d.instructions.trim()}`); }
    L.push('');
    L.push('📲 Avisar quando finalizar');
    return L.join('\n');
  }

  // ─── VENDA / TROCA / PRAZO ───────────────────────────────────────────────
  const mainProd = deviceLabel(s.productName, s.capacity, s.color);
  const extraProds = (s.items || [])
    .map((it) => deviceLabel(it.name, it.capacity, it.color))
    .filter(Boolean);
  const allProds = [mainProd, ...extraProds].join(' + ');

  // COLETA
  L.push('📦 COLETA');
  L.push(`📍 ${d.pickupLocation.trim() || '⚠️ CONFIRMAR ENDEREÇO DE COLETA'}`);
  if (d.pickupContact.trim()) L.push(`👤 ${d.pickupContact.trim()}`);
  if (d.pickupTime.trim())    L.push(`🕒 ${d.pickupTime.trim()}`);
  L.push(`📱 ${allProds}`);
  L.push('');

  // ENTREGA
  L.push('🚚 ENTREGA');
  L.push(`📍 ${d.deliveryAddress.trim() || '⚠️ CONFIRMAR ENDEREÇO DE ENTREGA'}`);
  L.push(`👤 ${d.recipient.trim() || s.customerName || 'cliente'}`);
  if (d.deliveryTime.trim()) L.push(`🕒 ${d.deliveryTime.trim()}`);
  L.push('');

  // COBRAR
  chargeBlock(d, chargeAmount).forEach((l) => L.push(l));

  // Busca no mesmo dia (troca)
  if (s.saleType === 'troca' && !d.deferCollection) {
    const devs = s.incomingDevices?.length
      ? s.incomingDevices.map((x) => x.model)
      : s.incomingName ? [s.incomingName] : ['aparelho do cliente'];
    L.push('');
    L.push('🔄 BUSCAR COM O CLIENTE');
    L.push(`📱 ${devs.join(' + ')}`);
    L.push('📸 Foto antes de guardar');
  }

  // Busca agendada (troca, outra corrida)
  if (s.saleType === 'troca' && d.deferCollection) {
    const devs = s.incomingDevices?.length
      ? s.incomingDevices.map((x) => x.model)
      : s.incomingName ? [s.incomingName] : [];
    const quando = d.collectionDate ? dateBR(d.collectionDate) : 'a combinar';
    L.push('');
    L.push(`📌 Busca do ${devs[0] || 'aparelho'}: ${quando} (outra corrida)`);
  }

  if (d.instructions.trim()) { L.push(''); L.push(`📌 ${d.instructions.trim()}`); }
  L.push('');
  L.push('📲 Avisar quando finalizar');
  return L.join('\n');
}

// ─── Mensagem de BUSCA (corrida separada — dia agendado) ─────────────────────
export function buildCollectionMessage(s: SaleMsgData, d: DeliveryInfo): string {
  const devs = s.incomingDevices?.length
    ? s.incomingDevices
    : s.incomingName ? [{ model: s.incomingName, value: s.incomingValue || 0 }] : [];

  const lines: string[] = [];
  const quando = `${d.collectionDate ? dateBR(d.collectionDate) : 'data a confirmar'}${d.collectionTime ? ` · ${d.collectionTime.trim()}` : ''}`;
  lines.push(`🏍️ BUSCA${s.saleNumber ? ` · ${s.saleNumber}` : ''} · ${quando}`);
  lines.push('');

  // BUSCAR com o cliente
  lines.push('📦 BUSCAR (com o cliente)');
  lines.push(`📍 ${d.deliveryAddress.trim() || '⚠️ CONFIRMAR ENDEREÇO DO CLIENTE'}`);
  lines.push(`👤 ${d.recipient.trim() || s.customerName || 'cliente'}`);
  if (d.collectionTime.trim()) lines.push(`🕒 ${d.collectionTime.trim()}`);
  if (devs.length > 0) {
    lines.push(`📱 ${devs.map((dev) => dev.model).join(' + ')}`);
  } else {
    lines.push('📱 Confirmar modelo com o cliente');
  }
  lines.push('📸 Foto antes de guardar');
  lines.push('');

  // ENTREGAR no destino
  lines.push('🏪 ENTREGAR');
  lines.push(`📍 ${d.collectionDropoffLocation.trim() || d.pickupLocation.trim() || '⚠️ CONFIRMAR ENDEREÇO DE DESTINO'}`);
  lines.push('');
  lines.push('📲 Avisar quando finalizar');
  return lines.join('\n');
}

// Link wa.me com texto pré-preenchido
export function waLink(phone: string, text: string): string {
  const clean = (phone || '').replace(/\D/g, '');
  const num = clean ? (clean.startsWith('55') ? clean : `55${clean}`) : '';
  const base = num ? `https://wa.me/${num}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}
