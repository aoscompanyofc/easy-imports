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
const fmt = (v?: string | null) => v?.trim() || '______________________________';
const fmtMoney = (v?: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
const fmtPayment = (method?: string, parcelas?: number, total?: number) => {
  if (method === 'Cartão de Crédito' && parcelas && parcelas > 1) {
    const p = (total ?? 0) / parcelas;
    return `Cartão de Crédito — ${parcelas}× de ${fmtMoney(p)}`;
  }
  return fmt(method);
};

// ─── Logo SVG inline (Easy Imports) ──────────────────────────────────────────
const LOGO = `
<svg width="148" height="44" viewBox="0 0 148 44" xmlns="http://www.w3.org/2000/svg">
  <rect x="0"  y="0"  width="9"  height="33" fill="#F5C200"/>
  <rect x="12" y="0"  width="13" height="10" fill="#F5C200"/>
  <rect x="12" y="12" width="10" height="9"  fill="#F5C200"/>
  <rect x="12" y="23" width="13" height="10" fill="#F5C200"/>
  <text x="29" y="33" font-family="Arial Black,Impact,sans-serif" font-size="34" font-weight="900" fill="#111111">ASY</text>
  <text x="1"  y="43" font-family="Arial,Helvetica,sans-serif"   font-size="7"  font-weight="700" fill="#111111" letter-spacing="4.6">IMPORTS</text>
</svg>`;

// ─── CSS base compartilhado ───────────────────────────────────────────────────
const CSS = `
@page { size: A4 portrait; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 7.2pt;
  color: #111;
  background: #fff;
  padding: 13mm 15mm 10mm;
  width: 210mm;
  min-height: 297mm;
  line-height: 1.4;
}

/* HEADER */
.hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid #111;
  padding-bottom: 7px;
  margin-bottom: 10px;
}
.hdr-right { text-align: right; }
.hdr-right h1 {
  font-size: 11pt;
  font-weight: 900;
  letter-spacing: 0.4px;
  line-height: 1.1;
}
.hdr-right p { font-size: 6pt; color: #888; margin-top: 2px; }
.hdr-meta { margin-top: 3px; font-size: 6pt; color: #555; }
.hdr-meta strong { color: #111; }

/* SECTION */
.sec { margin-bottom: 8px; }
.sec-t {
  background: #111;
  color: #F5C200;
  font-size: 5.8pt;
  font-weight: 700;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  padding: 3px 9px;
  margin-bottom: 5px;
}
.sec-b { padding: 0 2px; }

/* FIELDS */
.row { display: flex; gap: 10px; margin-bottom: 4px; }
.row:last-child { margin-bottom: 0; }
.f  { flex: 1; display: flex; flex-direction: column; }
.f2 { flex: 2; }
.f3 { flex: 3; }
.f4 { flex: 4; }
.f label {
  font-size: 5.2pt;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 2px;
}
.ul { border-bottom: 0.7px solid #aaa; min-height: 13px; padding-bottom: 1px; font-size: 7pt; }

/* CHECKBOXES */
.ck-row { display: flex; align-items: center; gap: 12px; margin-top: 5px; }
.ck-lbl { font-size: 5.5pt; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.4px; }
.ck { display: flex; align-items: center; gap: 3px; font-size: 6.5pt; color: #333; }
.ck-box { width: 9px; height: 9px; border: 0.7px solid #555; display: inline-block; flex-shrink: 0; }

/* SPLIT — dois aparelhos lado a lado */
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.split-box { border: 0.7px solid #ddd; border-radius: 2px; }
.split-t {
  background: #111;
  color: #F5C200;
  font-size: 5.5pt;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  padding: 2.5px 8px;
}
.split-b { padding: 6px 8px; }

/* GUARANTEE */
.g-grid { display: grid; grid-template-columns: 52% 48%; gap: 8px; }
.g-txt { font-size: 6.2pt; line-height: 1.6; color: #333; }
.g-nc-t { font-size: 6pt; font-weight: 700; color: #333; margin-bottom: 3px; }
.g-nc { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 4px; }
.nci { display: flex; align-items: center; gap: 4px; font-size: 6pt; color: #555; }
.nci::before { content:''; width:5px; height:5px; background:#cc2200; border-radius:50%; flex-shrink:0; display:inline-block; }

/* DECLARATION */
.decl {
  border-left: 2.5px solid #F5C200;
  background: #fffdf0;
  padding: 5px 9px;
  font-size: 6.2pt;
  line-height: 1.65;
  color: #333;
  font-style: italic;
  margin-bottom: 9px;
}

/* SIGNATURES */
.sig-div { border-top: 2px solid #111; margin-bottom: 7px; }
.sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.sig-role { font-size: 5.5pt; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 20px; }
.sig-line { border-bottom: 0.7px solid #111; margin-bottom: 4px; }
.sig-sub { display: flex; justify-content: space-between; font-size: 6pt; color: #666; }
.sig-img { max-height: 50px; max-width: 180px; display: block; margin: 0 auto 4px; }

/* FOOTER */
.ftr { border-top: 0.7px solid #ddd; margin-top: 8px; padding-top: 4px; text-align: center; font-size: 5pt; color: #aaa; letter-spacing: 0.3px; }
`;

// ─── campo preenchido ou linha em branco ─────────────────────────────────────
function field(label: string, value?: string, flex = 'f') {
  const val = value?.trim() ? `<span style="color:#111;font-weight:600;">${value}</span>` : '';
  return `<div class="f ${flex}"><label>${label}</label><div class="ul">${val}</div></div>`;
}

function fieldSplit(label: string, value?: string) {
  const val = value?.trim() ? `<span style="color:#111;font-weight:600;">${value}</span>` : '';
  return `<div class="f"><label>${label}</label><div class="ul">${val}</div></div>`;
}

function openAndPrint(html: string, title: string) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) { alert('Permita pop-ups no navegador para gerar o documento.'); return; }
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  setTimeout(() => w.print(), 700);
}

function page(title: string, subtitle: string, number: string, date: string, body: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><title>${title} ${number}</title>
<style>${CSS}</style></head><body>
<div class="hdr">
  <div>${LOGO}</div>
  <div class="hdr-right">
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <div class="hdr-meta">Nº <strong>${number}</strong> &nbsp;·&nbsp; Data: <strong>${date}</strong></div>
  </div>
</div>
${body}
<div class="ftr">Easy Imports &nbsp;·&nbsp; Documento válido somente com assinaturas de ambas as partes &nbsp;·&nbsp; Não aceito com rasuras</div>
</body></html>`;
}

function sigArea(roleA: string, subA: string, roleB: string, subB: string, imgA?: string, imgB?: string) {
  const imgTagA = imgA ? `<img class="sig-img" src="${imgA}" alt="assinatura"/>` : `<div style="height:48px;"></div>`;
  const imgTagB = imgB ? `<img class="sig-img" src="${imgB}" alt="assinatura"/>` : `<div style="height:48px;"></div>`;
  return `
<div class="sig-div"></div>
<div class="sigs">
  <div>
    <div class="sig-role">${roleA}</div>
    ${imgTagA}
    <div class="sig-line"></div>
    <div class="sig-sub"><span>${subA}</span></div>
  </div>
  <div>
    <div class="sig-role">${roleB}</div>
    ${imgTagB}
    <div class="sig-line"></div>
    <div class="sig-sub"><span>${subB}</span></div>
  </div>
</div>`;
}

const WARRANTY_ITEMS = ['Quedas e impactos','Mau uso','Tela quebrada','Oxidação','Danos por água','Danos por terceiros','Violação técnica','Atualizações indevidas'];
const warrantyGrid = () => `<div class="g-nc">${WARRANTY_ITEMS.map(i => `<div class="nci">${i}</div>`).join('')}</div>`;

// ─── CONTRATO DE VENDA ────────────────────────────────────────────────────────
export function generateVendaPDF(sale: SalePDFData, company: CompanyInfo) {
  const date = fmtDate(sale.created_at);
  const cond = sale.product_condition || '';
  const condChecks = ['Novo (lacrado)', 'Seminovo — Excelente', 'Seminovo — Bom estado', 'Usado'].map(c => {
    const checked = cond.toLowerCase().includes(c.split(' ')[0].toLowerCase()) ? '&#x2713;' : '';
    return `<span class="ck"><span class="ck-box" style="${checked ? 'background:#F5C200;color:#111;font-weight:900;text-align:center;line-height:9px;font-size:8px;' : ''}">${checked}</span> ${c}</span>`;
  }).join('');

  const body = `
<div class="sec">
  <div class="sec-t">Dados do Cliente</div>
  <div class="sec-b">
    <div class="row">
      ${field('Nome Completo', sale.customer_name, 'f4')}
      ${field('CPF', sale.customer_cpf, 'f2')}
      ${field('Telefone / WhatsApp', sale.customer_phone, 'f2')}
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
      ${condChecks}
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
    <div class="g-grid">
      <div class="g-txt">
        A <strong>Easy Imports</strong> oferece garantia de <strong>90 (noventa) dias por lei</strong> para defeitos técnicos de funcionamento do aparelho, a contar desta data, conforme art. 26 do Código de Defesa do Consumidor (CDC).<br><br>
        Válida apenas para defeitos internos. O cliente deve procurar a Easy Imports antes de qualquer intervenção de terceiros.
      </div>
      <div>
        <div class="g-nc-t">A garantia NÃO cobre:</div>
        ${warrantyGrid()}
      </div>
    </div>
  </div>
</div>

<div class="decl">
  Declaro que recebi o aparelho descrito neste contrato em perfeito estado de funcionamento, que conferi o IMEI e todas as informações aqui registradas, e que estou ciente e de acordo com todas as condições, incluindo o prazo e as limitações da garantia oferecida pela Easy Imports.
</div>

${sigArea(
  'Assinatura do Cliente',
  `Nome: ${fmt(sale.customer_name)} &nbsp;&nbsp; CPF: ${fmt(sale.customer_cpf)}`,
  'Easy Imports — Responsável',
  `Data: ${date}`,
  sale.signature_client,
  sale.signature_admin
)}`;

  openAndPrint(page('CONTRATO DE COMPRA E VENDA', 'Documento oficial — Easy Imports', sale.sale_number, date, body), `Venda ${sale.sale_number}`);
}

// ─── TERMO DE TROCA ───────────────────────────────────────────────────────────
export function generateTrocaPDF(sale: SalePDFData, company: CompanyInfo) {
  const date = fmtDate(sale.created_at);
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
  </div>
</div>

<div class="split">
  <div class="split-box">
    <div class="split-t">Aparelho Entregue pelo Cliente</div>
    <div class="split-b">
      <div class="row">
        ${fieldSplit('Modelo')}
        ${fieldSplit('Cor')}
      </div>
      <div class="row">
        ${fieldSplit('Capacidade')}
        ${fieldSplit('IMEI / Serial')}
      </div>
      <div class="row">${fieldSplit('Observações / Defeitos Declarados')}</div>
      <div class="ck-row" style="margin-top:4px;">
        <span class="ck-lbl">Estado:</span>
        <span class="ck"><span class="ck-box"></span> Excelente</span>
        <span class="ck"><span class="ck-box"></span> Bom estado</span>
        <span class="ck"><span class="ck-box"></span> Com defeito</span>
      </div>
    </div>
  </div>
  <div class="split-box">
    <div class="split-t">Aparelho Recebido da Easy Imports</div>
    <div class="split-b">
      <div class="row">
        ${fieldSplit('Modelo')}
        ${fieldSplit('Cor')}
      </div>
      <div class="row">
        ${fieldSplit('Capacidade')}
        ${fieldSplit('IMEI / Serial')}
      </div>
      <div class="row">
        ${fieldSplit('Garantia')}
        ${fieldSplit('Acessórios Inclusos')}
      </div>
      <div class="ck-row" style="margin-top:4px;">
        <span class="ck-lbl">Estado:</span>
        <span class="ck"><span class="ck-box"></span> Novo</span>
        <span class="ck"><span class="ck-box"></span> Seminovo — Excelente</span>
        <span class="ck"><span class="ck-box"></span> Bom estado</span>
      </div>
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Acerto Financeiro</div>
  <div class="sec-b">
    <div class="ck-row" style="margin-bottom:4px;">
      <span class="ck-lbl">Diferença paga por:</span>
      <span class="ck"><span class="ck-box"></span> Cliente pagou diferença</span>
      <span class="ck"><span class="ck-box"></span> Easy Imports pagou diferença</span>
      <span class="ck"><span class="ck-box"></span> Troca direta (sem diferença)</span>
    </div>
    <div class="row">
      ${field('Valor da Diferença (R$)', sale.total_amount && sale.total_amount > 0 ? fmtMoney(sale.total_amount) : '', 'f2')}
      ${field('Forma de Pagamento', fmtPayment(sale.payment_method, sale.installments, sale.total_amount), 'f3')}
      ${field('Data da Troca', date)}
    </div>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Condições e Garantia</div>
  <div class="sec-b">
    <div class="g-grid">
      <div class="g-txt">
        O cliente declara que o aparelho entregue está nas condições aqui descritas, sem omissão de defeitos.<br><br>
        A <strong>Easy Imports não se responsabiliza</strong> por bloqueios futuros (iCloud/Google), peças substituídas anteriormente, defeitos ocultos não informados, nem por perda de dados.
        <br><br>O aparelho recebido possui garantia de <strong>90 (noventa) dias por lei</strong> para defeitos técnicos, conforme art. 26 do CDC.
      </div>
      <div>
        <div class="g-nc-t">A garantia NÃO cobre:</div>
        ${warrantyGrid()}
      </div>
    </div>
  </div>
</div>

<div class="decl">
  Declaro que li e compreendi os termos deste documento, que conferi os dados de ambos os aparelhos incluindo os IMEIs, e que aceito as condições da troca e da garantia. Declaro ainda que o aparelho entregue é de minha propriedade e não possui restrições de uso.
</div>

${sigArea(
  'Assinatura do Cliente',
  `Nome: ${fmt(clientName)} &nbsp;&nbsp; CPF: ${fmt(clientCpf)}`,
  'Easy Imports — Responsável',
  `Data: ${date}`,
  sale.signature_client,
  sale.signature_admin
)}`;

  openAndPrint(page('TERMO DE TROCA', 'Documento oficial — Easy Imports', sale.sale_number, date, body), `Troca ${sale.sale_number}`);
}

// ─── DOCUMENTO DE COMPRA (Easy Imports compra de terceiro) ───────────────────
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

<div class="decl">
  O vendedor declara, sob responsabilidade civil e criminal, ser o legítimo proprietário do produto acima descrito, garantindo que o mesmo <strong>não é produto de furto, roubo ou receptação</strong>, não possui bloqueios ativos (iCloud, Google, operadora) e está livre de qualquer restrição legal ou financeira. Em caso de irregularidade constatada posteriormente, o vendedor compromete-se a restituir integralmente o valor pago no prazo de 48 horas.
</div>

${sigArea(
  'Vendedor',
  `Nome: ${fmt(sale.seller_name)} &nbsp;&nbsp; CPF: ${fmt(sale.seller_cpf)}`,
  'Easy Imports — Responsável',
  `Data: ${date}`,
  sale.signature_client,
  sale.signature_admin
)}`;

  openAndPrint(page('DOCUMENTO DE COMPRA', 'Easy Imports — Compra de produto usado', sale.sale_number, date, body), `Compra ${sale.sale_number}`);
}

// ─── dispatcher ───────────────────────────────────────────────────────────────
export function generatePDF(sale: SalePDFData, company: CompanyInfo) {
  if (sale.sale_type === 'compra') return generateCompraPDF(sale, company);
  if (sale.sale_type === 'troca')  return generateTrocaPDF(sale, company);
  return generateVendaPDF(sale, company);
}
