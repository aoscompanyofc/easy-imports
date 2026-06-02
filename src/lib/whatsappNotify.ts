const NOTIFY_PHONE_KEY = 'wpp_notify_phone';
const NOTIFY_APIKEY_KEY = 'wpp_notify_apikey';

export function getWppNotifyPhone(): string {
  return localStorage.getItem(NOTIFY_PHONE_KEY) || '';
}
export function setWppNotifyPhone(v: string) {
  localStorage.setItem(NOTIFY_PHONE_KEY, v);
}
export function getWppNotifyApiKey(): string {
  return localStorage.getItem(NOTIFY_APIKEY_KEY) || '';
}
export function setWppNotifyApiKey(v: string) {
  localStorage.setItem(NOTIFY_APIKEY_KEY, v);
}

// Envia mensagem via CallMeBot (fire-and-forget, não bloqueia o fluxo)
export function sendWppNotification(text: string): void {
  const phone = getWppNotifyPhone().replace(/\D/g, '');
  const apiKey = getWppNotifyApiKey().trim();
  if (!phone || !apiKey) return;

  const url =
    `https://api.callmebot.com/whatsapp.php` +
    `?phone=${phone}&text=${encodeURIComponent(text)}&apikey=${apiKey}`;

  // Usa Image() para contornar CORS — dispara a requisição sem ler resposta
  try { new Image().src = url; } catch { /* silencioso */ }
}

export function buildSaleNotificationText(params: {
  saleType: string;
  saleNumber: string;
  customerName: string;
  productName: string;
  productCondition?: string;
  totalAmount: number;
  paymentMethod: string;
}): string {
  const { saleType, saleNumber, customerName, productName, productCondition, totalAmount, paymentMethod } = params;

  const typeLabel =
    saleType === 'troca'  ? '🔄 Nova Troca'        :
    saleType === 'prazo'  ? '📋 Venda a Prazo'      :
    saleType === 'compra' ? '📦 Compra de Estoque'  :
                            '🛍️ Nova Venda';

  const amount = totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const condition = productCondition ? ` · ${productCondition}` : '';

  return [
    `${typeLabel} — Easy Imports`,
    `${saleNumber} · ${customerName}`,
    `${productName}${condition}`,
    `${amount} — ${paymentMethod}`,
  ].join('\n');
}
