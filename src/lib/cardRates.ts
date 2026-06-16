// Calculadora de taxas de maquininha — Easy Imports
// Modelo: o lojista recebe o valor cheio, a taxa é repassada ao cliente.
//   Total  = valor / (1 - taxa/100)
//   Parcela = Total / nº de parcelas
// As taxas são fixas (conforme tabela das maquininhas). Para alterar, edite aqui.

export type CardBrand = 'visa_master' | 'elo_amex';

export interface RateRow {
  label: string;     // "Débito", "1x", ... "18x"
  parcelas: number;  // nº de parcelas para dividir o total (débito e 1x = 1)
  taxa: number;      // % de taxa
}

export const BRANDS: { id: CardBrand; label: string; short: string }[] = [
  { id: 'visa_master', label: 'Visa / Mastercard', short: 'Visa / Master' },
  { id: 'elo_amex',    label: 'Elo / Amex',        short: 'Elo / Amex'    },
];

// Visa / Mastercard
export const VISA_MASTER: RateRow[] = [
  { label: 'Débito', parcelas: 1,  taxa: 2.39 },
  { label: '1x',     parcelas: 1,  taxa: 4.67 },
  { label: '2x',     parcelas: 2,  taxa: 5.93 },
  { label: '3x',     parcelas: 3,  taxa: 6.66 },
  { label: '4x',     parcelas: 4,  taxa: 7.39 },
  { label: '5x',     parcelas: 5,  taxa: 8.10 },
  { label: '6x',     parcelas: 6,  taxa: 8.81 },
  { label: '7x',     parcelas: 7,  taxa: 9.16 },
  { label: '8x',     parcelas: 8,  taxa: 9.86 },
  { label: '9x',     parcelas: 9,  taxa: 10.55 },
  { label: '10x',    parcelas: 10, taxa: 11.23 },
  { label: '11x',    parcelas: 11, taxa: 11.90 },
  { label: '12x',    parcelas: 12, taxa: 12.57 },
  { label: '13x',    parcelas: 13, taxa: 13.68 },
  { label: '14x',    parcelas: 14, taxa: 14.33 },
  { label: '15x',    parcelas: 15, taxa: 14.98 },
  { label: '16x',    parcelas: 16, taxa: 15.62 },
  { label: '17x',    parcelas: 17, taxa: 16.26 },
  { label: '18x',    parcelas: 18, taxa: 16.89 },
];

// Elo / Amex
export const ELO_AMEX: RateRow[] = [
  { label: 'Débito', parcelas: 1,  taxa: 3.10 },
  { label: '1x',     parcelas: 1,  taxa: 5.10 },
  { label: '2x',     parcelas: 2,  taxa: 6.37 },
  { label: '3x',     parcelas: 3,  taxa: 7.02 },
  { label: '4x',     parcelas: 4,  taxa: 7.66 },
  { label: '5x',     parcelas: 5,  taxa: 8.30 },
  { label: '6x',     parcelas: 6,  taxa: 8.93 },
  { label: '7x',     parcelas: 7,  taxa: 10.34 },
  { label: '8x',     parcelas: 8,  taxa: 10.96 },
  { label: '9x',     parcelas: 9,  taxa: 11.57 },
  { label: '10x',    parcelas: 10, taxa: 12.18 },
  { label: '11x',    parcelas: 11, taxa: 12.78 },
  { label: '12x',    parcelas: 12, taxa: 13.38 },
  { label: '13x',    parcelas: 13, taxa: 13.97 },
  { label: '14x',    parcelas: 14, taxa: 14.56 },
  { label: '15x',    parcelas: 15, taxa: 15.14 },
  { label: '16x',    parcelas: 16, taxa: 15.72 },
  { label: '17x',    parcelas: 17, taxa: 16.29 },
  { label: '18x',    parcelas: 18, taxa: 16.86 },
];

export const RATES: Record<CardBrand, RateRow[]> = {
  visa_master: VISA_MASTER,
  elo_amex: ELO_AMEX,
};

export interface SimRow extends RateRow {
  parcelaValor: number;
  total: number;
}

// Calcula a simulação completa para um valor e bandeira
export function simulate(valor: number, brand: CardBrand): SimRow[] {
  const rows = RATES[brand];
  return rows.map((r) => {
    const total = r.taxa >= 100 ? valor : valor / (1 - r.taxa / 100);
    const parcelaValor = total / r.parcelas;
    return { ...r, total, parcelaValor };
  });
}

export const brl = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Texto pronto para enviar no WhatsApp
export function simulationToText(valor: number, brand: CardBrand): string {
  const brandLabel = BRANDS.find((b) => b.id === brand)?.label || '';
  const rows = simulate(valor, brand);
  const lines: string[] = [];
  lines.push('💳 *Simulação Easy Imports*');
  lines.push(`Valor: *${brl(valor)}*`);
  lines.push(`Cartão: ${brandLabel}`);
  lines.push('');
  for (const r of rows) {
    if (r.parcelas <= 1) {
      lines.push(`${r.label}: ${brl(r.total)}`);
    } else {
      lines.push(`${r.label}: ${r.parcelas}x de ${brl(r.parcelaValor)}  (total ${brl(r.total)})`);
    }
  }
  lines.push('');
  lines.push('_Taxas sujeitas a alteração._');
  return lines.join('\n');
}
