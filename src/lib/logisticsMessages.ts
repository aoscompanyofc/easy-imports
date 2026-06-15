// Geração das mensagens de WhatsApp prontas para copiar:
//  • Cliente  — confirmação do pedido (estilo Easy Imports)
//  • Motoboy  — corrida passo a passo para cada tipo de venda
//
// Tipos cobertos:
//  venda  → coleta na loja → entrega no cliente
//  troca  → coleta na loja → entrega no cliente → RECOLHE aparelho do cliente
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
}

export const emptyDelivery = (): DeliveryInfo => ({
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
});

export const CHARGE_MODES: { id: DeliveryInfo['chargeMode']; label: string }[] = [
  { id: 'pago',         label: '✅ Já pago' },
  { id: 'aguardar_pix', label: '⏳ Aguardar PIX na entrega' },
  { id: 'maquininha',   label: '💳 Cobrar na maquininha' },
  { id: 'dinheiro',     label: '💵 Receber em dinheiro' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const brl = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const firstName = (full: string) => (full || '').trim().split(/\s+/)[0] || 'Cliente';

const dateBR = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR');
};

const warrantyLine = (s: SaleMsgData) =>
  s.isNovo ? '🍎 Garantia Apple' : '🛡️ Garantia Easy Imports 90 dias';

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

function chargeLineMotoboy(d: DeliveryInfo, amount: number): string[] {
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

// ─── Mensagem para o CLIENTE ────────────────────────────────────────────────
export function buildClientMessage(s: SaleMsgData, d: DeliveryInfo): string {
  const lines: string[] = [];
  const typeLabel =
    s.saleType === 'troca'  ? 'TROCA'        :
    s.saleType === 'prazo'  ? 'VENDA A PRAZO' :
    s.saleType === 'compra' ? 'COMPRA'        : 'PEDIDO';

  lines.push(`🏪 Easy Imports — ${typeLabel} — ${dateBR(s.saleDateISO)} 📦`);
  if (s.saleNumber) lines.push(`🆔 ${s.saleNumber}`);
  lines.push('');
  lines.push(`👤 ${s.customerName || 'Cliente'}`);

  // ── COMPRA (loja comprando do cliente) ──
  if (s.saleType === 'compra') {
    lines.push('');
    lines.push('📱 Aparelho que estamos comprando:');
    productBlock(s.productName, s.capacity, s.color, s.condition).forEach(l => lines.push('  ' + l));
    lines.push('');
    lines.push(`💰 Valor da compra: ${brl(s.totalAmount)}`);
    lines.push(freightLine(d));
    if (d.deliveryAddress.trim()) {
      lines.push('');
      lines.push('📍 Endereço de coleta:');
      lines.push(d.deliveryAddress.trim());
    }
    if (d.deliveryTime.trim()) lines.push(`🕒 Previsão de chegada: ${d.deliveryTime.trim()}`);
    lines.push('');
    lines.push('Nosso motoboy está a caminho para buscar o aparelho. Obrigado! 🚀');
    return lines.join('\n');
  }

  // ── Produto que o cliente vai receber ──
  lines.push('');
  lines.push('📦 Produto:');
  productBlock(s.productName, s.capacity, s.color, s.condition).forEach(l => lines.push('  ' + l));
  lines.push('  ' + warrantyLine(s));

  // Itens adicionais
  (s.items || []).forEach(it => {
    lines.push('');
    productBlock(it.name, it.capacity, it.color, it.condition, it.price).forEach(l => lines.push('  ' + l));
  });

  // ── TROCA ──
  if (s.saleType === 'troca') {
    lines.push('');
    lines.push('🔄 Detalhes da troca:');
    // Múltiplos dispositivos ou device único
    const devs = s.incomingDevices?.length
      ? s.incomingDevices
      : s.incomingName ? [{ model: s.incomingName, value: s.incomingValue || 0 }] : [];
    devs.forEach(dev => {
      lines.push(`  📱 Você entrega: ${dev.model}${dev.value > 0 ? ` — crédito de ${brl(dev.value)}` : ''}`);
    });
    lines.push(`  📦 Você recebe: ${s.productName}`);
    if (s.cashReceived != null && s.cashReceived > 0) {
      lines.push(`  💵 Diferença a pagar: ${brl(s.cashReceived)}`);
    } else if (s.cashReceived === 0) {
      lines.push('  ✅ Sem diferença — troca direta!');
    }
  }

  // ── Valores ──
  lines.push('');
  if (s.saleType === 'troca') {
    lines.push(`💰 Valor total do produto: ${brl(s.totalAmount)}`);
    if (s.incomingValue && s.incomingValue > 0) {
      const devTotal = s.incomingDevices?.reduce((a, d) => a + d.value, 0) ?? s.incomingValue;
      lines.push(`🔄 Crédito na troca: -${brl(devTotal)}`);
    }
    if (s.cashReceived != null && s.cashReceived > 0) {
      lines.push(`💵 A pagar: ${brl(s.cashReceived)}`);
    }
  } else if (s.saleType === 'prazo') {
    lines.push(`💰 Valor total: ${brl(s.totalAmount)}`);
    if (s.entradaAmount && s.entradaAmount > 0) {
      lines.push(`💵 Entrada: ${brl(s.entradaAmount)}`);
    }
    if (s.installments && s.installments > 0 && s.installmentValue) {
      lines.push(`📅 Parcelas: ${s.installments}x de ${brl(s.installmentValue)} via PIX`);
    }
  } else {
    lines.push(`💰 Valor: ${brl(s.totalAmount)}`);
    lines.push(`💳 Pagamento: ${s.paymentMethod || '—'}`);
  }
  lines.push(freightLine(d));

  // Endereço e horário
  if (d.deliveryAddress.trim()) {
    lines.push('');
    lines.push('📍 Endereço de entrega:');
    lines.push(d.deliveryAddress.trim());
  }
  if (d.deliveryTime.trim()) lines.push(`🕒 Previsão de entrega: ${d.deliveryTime.trim()}`);
  if (d.instructions.trim()) {
    lines.push('');
    lines.push(`📌 ${d.instructions.trim()}`);
  }

  // Fechamento
  lines.push('');
  if (d.chargeMode === 'aguardar_pix') {
    lines.push('Assim que o PIX for confirmado, seguiremos com a entrega. Obrigado pela preferência! 🚀');
  } else if (d.chargeMode === 'maquininha' || d.chargeMode === 'dinheiro') {
    lines.push('O pagamento será feito na entrega, conforme combinado. Obrigado pela preferência! 🚀');
  } else {
    lines.push('Pagamento confirmado ✅ Obrigado pela preferência! 🚀');
  }
  return lines.join('\n');
}

// ─── Mensagem para o MOTOBOY ────────────────────────────────────────────────
export function buildMotoboyMessage(s: SaleMsgData, d: DeliveryInfo): string {
  const lines: string[] = [];

  const typeLabel =
    s.saleType === 'troca'  ? 'TROCA — 3 PASSOS'  :
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
    const amount = s.totalAmount;
    chargeLineMotoboy(d, amount).forEach(l => lines.push(l));
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

  // PASSO 3 (somente troca): Recolher aparelho do cliente
  if (s.saleType === 'troca') {
    lines.push('');
    lines.push(SEP);
    lines.push('');
    lines.push('🔄 PASSO 3 — RECOLHER APARELHO DO CLIENTE');

    const devs = s.incomingDevices?.length
      ? s.incomingDevices
      : s.incomingName ? [{ model: s.incomingName, value: s.incomingValue || 0 }] : [];

    if (devs.length > 0) {
      devs.forEach(dev => {
        lines.push(`📱 ${dev.model}${dev.value > 0 ? ` — avaliado em ${brl(dev.value)}` : ''}`);
      });
    } else {
      lines.push('📱 Aparelho do cliente (confirmar modelo na entrega)');
    }

    lines.push('');
    lines.push('⚠️ NÃO SAIR SEM O APARELHO DO CLIENTE!');
    lines.push('📸 Fotografar o aparelho antes de guardar (frente e verso)');
    lines.push('🔒 Guardar bem embalado — trazer direto para a loja');
  }

  lines.push('');
  lines.push(SEP);
  lines.push('');
  lines.push('📋 CHECKLIST FINAL');
  lines.push('📸 Fotografar a entrega (produto nas mãos do cliente)');
  if (s.saleType === 'troca') {
    lines.push('📱 Conferir que recolheu o aparelho do cliente');
  }
  if (d.instructions.trim()) lines.push(`📌 ${d.instructions.trim()}`);
  lines.push('✅ Avisar a loja após finalizar a corrida');
  lines.push('');
  lines.push('🚀 Easy Imports agradece! Boa corrida! 🏍️📦');
  return lines.join('\n');
}

// Link wa.me com texto pré-preenchido
export function waLink(phone: string, text: string): string {
  const clean = (phone || '').replace(/\D/g, '');
  const num = clean ? (clean.startsWith('55') ? clean : `55${clean}`) : '';
  const base = num ? `https://wa.me/${num}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}
