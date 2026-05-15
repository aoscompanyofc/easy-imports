import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCurrency = (value: number): string => {
  if (!isFinite(value) || isNaN(value)) return 'R$ —';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const safeParse = (date: Date | string): Date | null => {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
};

export const formatDate = (date: Date | string, formatStr: string = 'dd/MM/yyyy'): string => {
  const d = safeParse(date);
  if (!d) return '—';
  return format(d, formatStr, { locale: ptBR });
};

export const formatDateTime = (date: Date | string): string => {
  const d = safeParse(date);
  if (!d) return '—';
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

export const formatRelativeTime = (date: Date | string): string => {
  const d = safeParse(date);
  if (!d) return '—';
  return formatDistanceToNow(d, { locale: ptBR, addSuffix: true });
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatCEP = (cep: string): string => {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return cep;
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
};

export const formatIMEI = (imei: string): string => {
  return imei;
};
