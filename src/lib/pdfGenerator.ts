export interface CompanyInfo {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
}

export interface SalePDFData {
  sale_number: string;
  sale_type: string;
  created_at: string;
  seller_name?: string;
  seller_cpf?: string;
  seller_rg?: string;
  seller_phone?: string;
  seller_address?: string;
  seller_email?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_cpf?: string;
  product_name?: string;
  product_capacity?: string;
  product_color?: string;
  product_condition?: string;
  product_imei?: string;
  product_accessories?: string;
  total_amount?: number;
  payment_method?: string;
  installments?: number;
  signature_admin?: string;
  signature_client?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt  = (v?: string | null) => v?.trim() || '';
const fmtMoney = (v?: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
const fmtPayment = (method?: string, parcelas?: number, total?: number) => {
  if (method === 'Cartão de Crédito' && parcelas && parcelas > 1)
    return `Cartão de Crédito — ${parcelas}× de ${fmtMoney((total ?? 0) / parcelas)}`;
  return fmt(method);
};

// ─── Logo SVG inline ──────────────────────────────────────────────────────────
const LOGO = `
<svg width="170" height="52" viewBox="0 0 170 52" xmlns="http://www.w3.org/2000/svg">
  <rect x="0"  y="0"  width="11" height="40" fill="#F5C200"/>
  <rect x="15" y="0"  width="15" height="12" fill="#F5C200"/>
  <rect x="15" y="14" width="11" height="11" fill="#F5C200"/>
  <rect x="15" y="28" width="15" height="12" fill="#F5C200"/>
  <text x="35" y="40" font-family="Arial Black,Impact,sans-serif" font-size="41" font-weight="900" fill="#111">ASY</text>
  <text x="1"  y="51" font-family="Arial,Helvetica,sans-serif" font-size="8.5" font-weight="700" fill="#111" letter-spacing="5.2">IMPORTS</text>
</svg>`;

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@page { size: A4 portrait; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 210mm;
  height: 297mm;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9pt;
  color: #111;
  background: #fff;
  padding: 12mm 14mm 10mm;
  display: flex;
  flex-direction: column;
  line-height: 1.45;
}

/* HEADER */
.hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2.5px solid #111;
  padding-bottom: 9px;
  margin-bottom: 14px;
  flex-shrink: 0;
}
.hdr-right { text-align: right; }
.hdr-right h1 {
  font-size: 13.5pt;
  font-weight: 900;
  letter-spacing: 0.5px;
  line-height: 1.1;
  color: #111;
}
.hdr-right .sub { font-size: 7.5pt; color: #777; margin-top: 3px; }
.hdr-right .meta { font-size: 8pt; color: #444; margin-top: 4px; }
.hdr-right .meta strong { color: #111; }

/* SECTIONS — flex-grow to fill page */
.sections {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.sec { display: flex; flex-direction: column; }
.sec-t {
  background: #111;
  color: #F5C200;
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  padding: 4px 11px;
  margin-bottom: 8px;
}
.sec-b { padding: 0 3px; flex: 1; display: flex; flex-direction: column; gap: 8px; }

/* FIELDS */
.row { display: flex; gap: 12px; }
.f  { flex: 1; display: flex; flex-direction: column; }
.f2 { flex: 2; }
.f3 { flex: 3; }
.f4 { flex: 4; }

.f label {
  font-size: 6.5pt;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 3px;
}
.ul {
  border-bottom: 1px solid #bbb;
  min-height: 18px;
  padding-bottom: 2px;
  font-size: 9pt;
  color: #111;
  font-weight: 600;
}

/* CHECKBOXES */
.ck-row { display: flex; align-items: center; gap: 14px; padding-top: 2px; }
.ck-lbl { font-size: 7pt; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.4px; flex-shrink: 0; }
.ck { display: flex; align-items: center; gap: 5px; font-size: 8pt; color: #333; }
.ck-box {
  width: 11px; height: 11px;
  border: 1px solid #666;
  display: inline-block;
  flex-shrink: 0;
  border-radius: 2px;
}
.ck-box.filled {
  background: #F5C200;
  border-color: #d4a800;
  text-align: center;
  line-height: 11px;
  font-size: 9px;
  font-weight: 900;
  color: #111;
}

/* SPLIT (dois aparelhos lado a lado) */
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.split-box { border: 1px solid #e0e0e0; border-radius: 3px; overflow: hidden; }
.split-t {
  background: #111;
  color: #F5C200;
  font-size: 6.5pt;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  padding: 4px 10px;
}
.split-b { padding: 8px 10px; display: flex; flex-direction: column; gap: 7px; }

/* GARANTIA */
.g-wrap { display: flex; gap: 16px; }
.g-txt { flex: 1; font-size: 8.5pt; line-height: 1.65; color: #111; }
.g-list-wrap { flex: 0 0 42%; }
.g-nc-t { font-size: 8pt; font-weight: 700; color: #111; margin-bottom: 5px; }
.g-list { margin: 0; padding-left: 16px; list-style-type: disc; }
.g-list li { font-size: 8.5pt; color: #111; line-height: 1.7; }

/* ACERTO FINANCEIRO (troca) */
.fin-cb-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

/* ASSINATURAS */
.sig-area {
  margin-top: auto;
  padding-top: 12px;
  border-top: 2px solid #111;
  flex-shrink: 0;
}
.sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
.sig-role {
  font-size: 7pt;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.9px;
  margin-bottom: 30px;
}
.sig-line { border-bottom: 1px solid #111; margin-bottom: 5px; }
.sig-sub { font-size: 7.5pt; color: #555; }
.sig-img { max-height: 55px; max-width: 190px; display: block; margin: 0 auto 5px; }

/* FOOTER */
.ftr {
  border-top: 1px solid #e0e0e0;
  margin-top: 10px;
  padding-top: 5px;
  text-align: center;
  font-size: 6pt;
  color: #bbb;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}
`;

// ─── helpers de renderização ──────────────────────────────────────────────────
function field(label: string, value?: string, flex = 'f') {
  const val = value?.trim()
    ? `<span style="color:#111;font-weight:600;">${value}</span>`
    : '';
  return `<div class="f ${flex}"><label>${label}</label><div class="ul">${val}</div></div>`;
}

function checkbox(label: string, checked = false) {
  const box = checked
    ? `<span class="ck-box filled">✓</span>`
    : `<span class="ck-box"></span>`;
  return `<span class="ck">${box} ${label}</span>`;
}

function sigBlock(role: string, sub: string, img?: string) {
  const imgTag = img
    ? `<img class="sig-img" src="${img}" alt="assinatura"/>`
    : `<div style="height:55px;"></div>`;
  return `
    <div>
      <div class="sig-role">${role}</div>
      ${imgTag}
      <div class="sig-line"></div>
      <div class="sig-sub">${sub}</div>
    </div>`;
}

const WARRANTY_EXCLUSIONS = [
  'Quedas e impactos','Mau uso',
  'Tela quebrada','Oxidação',
  'Danos por água','Danos por terceiros',
  'Violação técnica','Atualizações indevidas',
];

function warrantyBlock() {
  const items = WARRANTY_EXCLUSIONS.map(i => `<li>${i}</li>`).join('');
  return `
    <div class="g-list-wrap">
      <div class="g-nc-t">A garantia NÃO cobre:</div>
      <ul class="g-list">${items}</ul>
    </div>`;
}

function openAndPrint(html: string, title: string) {
  const w = window.open('', '_blank', 'width=920,height=1060');
  if (!w) { alert('Permita pop-ups no navegador para gerar o documento.'); return; }
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  setTimeout(() => w.print(), 700);
}

function page(title: string, number: string, date: string, body: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><title>${title} ${number}</title>
<style>${CSS}</style></head><body>

<div class="hdr">
  <div>${LOGO}</div>
  <div class="hdr-right">
    <h1>${title}</h1>
    <div class="sub">Documento oficial — Válido somente com ambas as assinaturas</div>
    <div class="meta">Nº <strong>${number}</strong> &nbsp;·&nbsp; Emitido em: <strong>${date}</strong></div>
  </div>
</div>

<div class="sections">
${body}
</div>

<div class="ftr">Easy Imports &nbsp;·&nbsp; Não aceito com rasuras ou alterações &nbsp;·&nbsp; Garantia de 90 dias conforme art. 26 do CDC</div>
</body></html>`;
}

// ─── CONTRATO DE VENDA ────────────────────────────────────────────────────────
export function generateVendaPDF(sale: SalePDFData, company: CompanyInfo) {
  const date = fmtDate(sale.created_at);
  const cond  = (sale.product_condition || '').toLowerCase();

  const body = `
<div class="sec">
  <div class="sec-t">Dados do Cliente</div>
  <div class="sec-b">
    <div class="row">
      ${field('Nome Completo', sale.customer_name, 'f4')}
      ${field('CPF', sale.customer_cpf, 'f2')}
      ${field('Telefone / WhatsApp', sale.customer_phone, 'f2')}
    </div>
    <div class="row">
      ${field('Endereço', undefined, 'f4')}
      ${field('Cidade / Estado', undefined, 'f2')}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Dados do Aparelho</div>
  <div class="sec-b">
    <div class="row">
      ${field('Modelo', sale.product_name, 'f3')}
      ${field('Cor', sale.product_color, 'f2')}
      ${field('Capacidade', sale.product_capacity)}
    </div>
    <div class="row">
      ${field('IMEI / Serial', sale.product_imei, 'f2')}
      ${field('Acessórios Inclusos', sale.product_accessories, 'f3')}
    </div>
    <div class="ck-row">
      <span class="ck-lbl">Estado:</span>
      ${checkbox('Novo (lacrado)', cond.includes('novo'))}
      ${checkbox('Seminovo — Excelente', cond.includes('excelente'))}
      ${checkbox('Seminovo — Bom estado', cond.includes('bom'))}
      ${checkbox('Usado', cond.includes('usado'))}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Dados da Venda</div>
  <div class="sec-b">
    <div class="row">
      ${field('Valor Total (R$)', fmtMoney(sale.total_amount), 'f2')}
      ${field('Forma de Pagamento', fmtPayment(sale.payment_method, sale.installments, sale.total_amount), 'f3')}
      ${field('Data da Compra', date)}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Termo de Garantia</div>
  <div class="sec-b">
    <div class="g-wrap">
      <div class="g-txt">
        A <strong>Easy Imports</strong> oferece garantia de <strong>90 (noventa) dias por lei</strong>
        para defeitos técnicos de funcionamento do aparelho, a contar desta data,
        conforme art. 26 do Código de Defesa do Consumidor (CDC).<br><br>
        A garantia é válida apenas para defeitos internos de fabricação. O cliente deve
        procurar a Easy Imports antes de qualquer intervenção de terceiros.
        Após abertura ou violação por terceiros, a garantia é automaticamente cancelada.
      </div>
      ${warrantyBlock()}
    </div>
  </div>
</div>

<div class="sig-area">
  <div class="sigs">
    ${sigBlock('Assinatura do Cliente', `Nome: ${fmt(sale.customer_name) || '__________________________________'} &nbsp;&nbsp; CPF: ${fmt(sale.customer_cpf) || '___________________'}`, sale.signature_client)}
    ${sigBlock('Easy Imports — Responsável', `Data: ${date}`, sale.signature_admin)}
  </div>
</div>`;

  openAndPrint(page('CONTRATO DE COMPRA E VENDA', sale.sale_number, date, body), `Venda ${sale.sale_number}`);
}

// ─── TERMO DE TROCA ───────────────────────────────────────────────────────────
export function generateTrocaPDF(sale: SalePDFData, company: CompanyInfo) {
  const date       = fmtDate(sale.created_at);
  const clientName = sale.customer_name || sale.seller_name || '';
  const clientCpf  = sale.customer_cpf  || sale.seller_cpf  || '';
  const clientPhone = sale.customer_phone || sale.seller_phone || '';

  const body = `
<div class="sec">
  <div class="sec-t">Dados do Cliente</div>
  <div class="sec-b">
    <div class="row">
      ${field('Nome Completo', clientName, 'f4')}
      ${field('CPF', clientCpf, 'f2')}
      ${field('Telefone / WhatsApp', clientPhone, 'f2')}
    </div>
    <div class="row">
      ${field('Endereço', undefined, 'f4')}
      ${field('Cidade / Estado', undefined, 'f2')}
    </div>
  </div>
</div>

<div class="sec">
  <div class="split">
    <div class="split-box">
      <div class="split-t">Aparelho Entregue pelo Cliente</div>
      <div class="split-b">
        <div class="row">
          ${field('Modelo', undefined, 'f2')}
          ${field('Cor')}
        </div>
        <div class="row">
          ${field('Capacidade')}
          ${field('IMEI / Serial', undefined, 'f2')}
        </div>
        <div class="row">${field('Observações / Defeitos Declarados')}</div>
        <div class="ck-row">
          <span class="ck-lbl">Estado:</span>
          ${checkbox('Excelente')}
          ${checkbox('Bom estado')}
          ${checkbox('Com defeito')}
        </div>
      </div>
    </div>
    <div class="split-box">
      <div class="split-t">Aparelho Recebido da Easy Imports</div>
      <div class="split-b">
        <div class="row">
          ${field('Modelo', sale.product_name, 'f2')}
          ${field('Cor', sale.product_color)}
        </div>
        <div class="row">
          ${field('Capacidade', sale.product_capacity)}
          ${field('IMEI / Serial', sale.product_imei, 'f2')}
        </div>
        <div class="row">
          ${field('Garantia', '90 dias por lei (CDC)')}
          ${field('Acessórios Inclusos', sale.product_accessories)}
        </div>
        <div class="ck-row">
          <span class="ck-lbl">Estado:</span>
          ${checkbox('Novo (lacrado)')}
          ${checkbox('Seminovo — Excelente')}
          ${checkbox('Bom estado')}
        </div>
      </div>
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Acerto Financeiro</div>
  <div class="sec-b">
    <div class="fin-cb-row" style="margin-bottom:8px;">
      <span class="ck-lbl">Diferença paga por:</span>
      ${checkbox('Cliente pagou diferença')}
      ${checkbox('Easy Imports pagou diferença')}
      ${checkbox('Troca direta (sem diferença)')}
    </div>
    <div class="row">
      ${field('Valor da Diferença (R$)', sale.total_amount && sale.total_amount > 0 ? fmtMoney(sale.total_amount) : undefined, 'f2')}
      ${field('Forma de Pagamento', fmtPayment(sale.payment_method, sale.installments, sale.total_amount), 'f3')}
      ${field('Data da Troca', date)}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Condições e Garantia</div>
  <div class="sec-b">
    <div class="g-wrap">
      <div class="g-txt">
        O cliente declara que o aparelho entregue está nas condições aqui descritas, sem omissão de defeitos.<br><br>
        A <strong>Easy Imports não se responsabiliza</strong> por bloqueios futuros (iCloud/Google),
        peças substituídas anteriormente, defeitos ocultos não informados, nem por perda de dados do aparelho entregue.<br><br>
        O aparelho recebido possui garantia de <strong>90 (noventa) dias por lei</strong>, conforme art. 26 do CDC.
      </div>
      ${warrantyBlock()}
    </div>
  </div>
</div>

<div class="sig-area">
  <div class="sigs">
    ${sigBlock('Assinatura do Cliente', `Nome: ${fmt(clientName) || '__________________________________'} &nbsp;&nbsp; CPF: ${fmt(clientCpf) || '___________________'}`, sale.signature_client)}
    ${sigBlock('Easy Imports — Responsável', `Data: ${date}`, sale.signature_admin)}
  </div>
</div>`;

  openAndPrint(page('TERMO DE TROCA', sale.sale_number, date, body), `Troca ${sale.sale_number}`);
}

// ─── DOCUMENTO DE COMPRA ──────────────────────────────────────────────────────
export function generateCompraPDF(sale: SalePDFData, company: CompanyInfo) {
  const date = fmtDate(sale.created_at);

  const body = `
<div class="sec">
  <div class="sec-t">Dados da Compradora</div>
  <div class="sec-b">
    <div class="row">
      ${field('Razão Social', company.name, 'f3')}
      ${field('CNPJ', company.cnpj, 'f2')}
      ${field('Telefone', company.phone)}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Dados do Vendedor</div>
  <div class="sec-b">
    <div class="row">
      ${field('Nome Completo', sale.seller_name, 'f4')}
      ${field('CPF', sale.seller_cpf, 'f2')}
      ${field('RG', sale.seller_rg)}
    </div>
    <div class="row">
      ${field('Telefone', sale.seller_phone, 'f2')}
      ${field('E-mail', sale.seller_email, 'f3')}
    </div>
    <div class="row">
      ${field('Endereço Completo', sale.seller_address, 'f4')}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Dados do Produto</div>
  <div class="sec-b">
    <div class="row">
      ${field('Produto / Modelo', sale.product_name, 'f3')}
      ${field('Cor', sale.product_color, 'f2')}
      ${field('Capacidade', sale.product_capacity)}
    </div>
    <div class="row">
      ${field('IMEI / Serial', sale.product_imei, 'f2')}
      ${field('Estado de Conservação', sale.product_condition, 'f2')}
      ${field('Acessórios', sale.product_accessories, 'f2')}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Condições da Compra</div>
  <div class="sec-b">
    <div class="row">
      ${field('Valor Pago (R$)', fmtMoney(sale.total_amount), 'f2')}
      ${field('Forma de Pagamento', fmtPayment(sale.payment_method, sale.installments, sale.total_amount), 'f3')}
      ${field('Data', date)}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Declaração do Vendedor</div>
  <div class="sec-b">
    <div class="g-txt" style="font-size:8.5pt;line-height:1.7;color:#333;padding:4px 0;">
      O vendedor declara, sob responsabilidade civil e criminal, ser o legítimo proprietário do produto acima descrito,
      garantindo que o mesmo <strong>não é produto de furto, roubo ou receptação</strong>, não possui bloqueios ativos
      (iCloud, Google, operadora) e está livre de qualquer restrição legal ou financeira.
      Em caso de irregularidade constatada posteriormente, o vendedor compromete-se a restituir integralmente
      o valor pago no prazo de <strong>48 horas</strong>.
    </div>
  </div>
</div>

<div class="sig-area">
  <div class="sigs">
    ${sigBlock('Vendedor', `Nome: ${fmt(sale.seller_name) || '__________________________________'} &nbsp;&nbsp; CPF: ${fmt(sale.seller_cpf) || '___________________'}`, sale.signature_client)}
    ${sigBlock('Easy Imports — Responsável', `Data: ${date}`, sale.signature_admin)}
  </div>
</div>`;

  openAndPrint(page('DOCUMENTO DE COMPRA', sale.sale_number, date, body), `Compra ${sale.sale_number}`);
}

// ─── dispatcher ───────────────────────────────────────────────────────────────
export function generatePDF(sale: SalePDFData, company: CompanyInfo) {
  if (sale.sale_type === 'compra') return generateCompraPDF(sale, company);
  if (sale.sale_type === 'troca')  return generateTrocaPDF(sale, company);
  return generateVendaPDF(sale, company);
}
