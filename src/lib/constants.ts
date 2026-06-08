// Origens de clientes — compartilhado entre Clientes, Leads e Dashboard
export const CUSTOMER_SOURCES = [
  'Instagram',
  'WhatsApp Easy Imports',
  'WhatsApp João',
  'OLX',
  'Mercado Livre',
  'Facebook Marketplace',
  'Facebook',
  'TikTok',
  'Google',
  'Shopee',
  'Indicação',
  'Loja Física',
  'Outro',
] as const;

export type CustomerSource = typeof CUSTOMER_SOURCES[number];
