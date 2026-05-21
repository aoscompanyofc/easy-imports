# Easy Imports — Manual Completo do Sistema

**Versão:** 1.0  
**Desenvolvido por:** AOS Company  
**Plataforma:** Web (easy-imports.vercel.app)

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Acesso e Login](#2-acesso-e-login)
3. [Dashboard](#3-dashboard)
4. [Estoque](#4-estoque)
5. [Vendas](#5-vendas)
6. [Clientes](#6-clientes)
7. [Leads (CRM)](#7-leads-crm)
8. [Financeiro](#8-financeiro)
9. [Fornecedores](#9-fornecedores)
10. [Marketing](#10-marketing)
11. [Relatórios](#11-relatórios)
12. [Vendedores](#12-vendedores)
13. [Mensagens Prontas](#13-mensagens-prontas)
14. [Documentação](#14-documentação)
15. [Assinatura Digital](#15-assinatura-digital)
16. [Configurações](#16-configurações)
17. [Integrações](#17-integrações)

---

## 1. Visão Geral

O **Easy Imports** é um sistema de gestão completo desenvolvido para lojas de celulares importados. Ele centraliza em uma única plataforma:

- Controle de estoque de aparelhos
- Registro e acompanhamento de vendas e trocas
- Gestão de clientes com histórico completo
- Funil de leads (CRM)
- Controle financeiro (receitas e despesas)
- Gestão de fornecedores e compras
- Campanhas de marketing
- Geração de contratos e recibos em PDF
- Assinatura digital de documentos
- Controle de desempenho por vendedor
- Mensagens prontas para WhatsApp

---

## 2. Acesso e Login

**URL:** `easy-imports.vercel.app`

O acesso é feito com **e-mail e senha** cadastrados. Cada usuário tem suas próprias informações e dados separados dos demais. O sistema é multi-usuário — cada empresa ou operador possui sua conta independente.

---

## 3. Dashboard

A tela inicial apresenta um **painel de controle em tempo real** com os principais indicadores do negócio.

### Períodos disponíveis
Hoje · Ontem · Esta Semana · Semana Passada · Este Mês · Mês Anterior · Personalizado

### Métricas exibidas
| Card | O que mostra |
|------|-------------|
| Faturamento | Total de receitas no período selecionado |
| Vendas | Quantidade de operações realizadas |
| Lucro Líquido | Receitas menos custos de mercadoria |
| Valor em Estoque | Custo total dos aparelhos disponíveis |

### Gráficos e análises
- **Faturamento por dia** — linha do tempo do período
- **Canais de pagamento** — divisão por PIX, Crédito, Débito, Dinheiro etc.
- **Tipos de operação** — proporção entre Vendas, Trocas e Compras
- **Top 5 Produtos** — produtos mais vendidos no período
- **Últimas 6 vendas** — feed rápido das operações recentes

### Meta do Mês
- Define uma meta de faturamento mensal
- Barra de progresso visual com percentual atingido
- A meta é salva automaticamente e se reinicia todo mês

### Atalhos rápidos (FAB)
No canto inferior direito há um botão de ação rápida com acesso direto para:
- Nova Venda
- Novo Aparelho
- Nova Despesa
- Novo Lead

---

## 4. Estoque

Controle completo de todos os aparelhos disponíveis e vendidos.

### Adicionar aparelho
Ao clicar em **+ Adicionar Aparelho**, preencha:

| Campo | Descrição |
|-------|-----------|
| Modelo | Nome completo do aparelho (ex: iPhone 14 128GB Meia-Noite) |
| IMEI / Serial | Número de identificação único |
| Categoria | iPhone, Samsung, Motorola etc. |
| Condição | Novo ou Seminovo |
| Capacidade | 64GB, 128GB, 256GB etc. |
| Cor | Cor do aparelho |
| Garantia | Tempo de garantia oferecido |
| Origem | País/procedência do aparelho |
| Custo de compra | Valor pago pelo aparelho |
| Preço de venda | Valor de venda sugerido |
| Data de entrada | Data em que o aparelho entrou no estoque |

### Filtros disponíveis
- **Busca** por nome, IMEI ou categoria
- **Condição:** Todas / Novo / Seminovo
- **Data de entrada:** intervalo de datas
- **Faixa de preço:** mínimo e máximo

### Métricas do estoque
- Aparelhos disponíveis
- Custo total investido
- Previsão de venda (soma dos preços de venda)
- Lucro potencial

### Exportar CSV
Exporta o estoque atual (ou por mês) em planilha compatível com Excel.

### Histórico de vendidos
No final da lista, o botão **"Ver histórico de vendidos"** exibe todos os aparelhos já comercializados.

---

## 5. Vendas

Registro de todas as operações comerciais: **vendas**, **trocas** e **compras de usados**.

### Nova Operação
O formulário é dividido em seções:

**Cliente**
- Selecionar cliente já cadastrado ou digitar nome/telefone de novo cliente
- CPF, cidade e telefone do cliente

**Aparelho vendido**
- Selecionar do estoque (busca por nome ou IMEI) ou cadastrar manualmente
- Capacidade, cor, condição, IMEI, acessórios inclusos

**Pagamento**
- Método: PIX, Crédito, Débito, Dinheiro, Boleto, Transferência
- Parcelamento (para cartão de crédito)
- Data e horário da operação
- Número da venda (gerado automaticamente)

**Vendedor responsável**
- Selecione qual vendedor realizou a venda para controle de métricas

**Aparelho recebido (para Trocas)**
- Nome do aparelho recebido na troca
- IMEI, capacidade, cor, condição, bateria
- Valor de entrada da troca

### Após registrar
- **Recibo em PDF** gerado automaticamente (contém todos os dados da operação)
- **Link de assinatura digital** copiável e enviável via WhatsApp
- O estoque do produto é atualizado automaticamente
- Receita e custo são lançados automaticamente no Financeiro

### Filtros de vendas
- Busca por cliente ou produto
- Filtro por período
- Filtro por método de pagamento
- Filtro por vendedor
- Filtro por tipo (Venda / Troca / Compra)

### Exportar CSV
Exporta as operações do mês selecionado.

---

## 6. Clientes

Cadastro e histórico completo de todos os clientes da loja.

### Dados cadastrais
| Campo | Descrição |
|-------|-----------|
| Nome | Nome completo |
| Telefone | Número de WhatsApp |
| E-mail | E-mail do cliente |
| CPF / CNPJ | Documento |
| Endereço / Cidade | Localização |
| Origem | Como chegou à loja (Instagram, WhatsApp, Indicação etc.) |
| Data de nascimento | Para controle de aniversariantes |
| Observações | Informações adicionais |

### Métricas por cliente
- Total gasto na loja
- Número de compras realizadas
- Última compra (data)
- LTV — tempo médio entre compras

### Métricas gerais
- Total de clientes cadastrados
- Clientes com compras realizadas
- Faturamento total gerado pelos clientes
- Ticket médio por cliente

### Clientes Inativos
Botão **"Inativos"** filtra clientes que não compram há mais de 3 meses — ideal para campanhas de reativação.

### Mensagem em Massa
Envia mensagem personalizada via WhatsApp para todos os clientes com telefone cadastrado. Use `{nome}` na mensagem para personalizar com o nome de cada cliente.

### Aniversariantes
Modal que exibe todos os clientes que fazem aniversário no mês selecionado.
- Navegue entre os meses com ← →
- Envie mensagem de parabéns personalizada via WhatsApp com 1 clique
- Clientes que fazem aniversário **hoje** recebem destaque especial

---

## 7. Leads (CRM)

Funil de vendas no formato **Kanban** para acompanhar potenciais clientes do primeiro contato até a conversão.

### Etapas do funil
| Etapa | Descrição |
|-------|-----------|
| Novo Lead | Primeiro contato recebido |
| Interessado | Demonstrou interesse em algum produto |
| Follow Up | Aguardando retorno |
| Negociando | Em processo de fechamento |
| Cliente | Convertido — virou cliente |

### Dados do lead
- Nome, telefone, e-mail
- Origem (Instagram, WhatsApp, Indicação, Google etc.)
- Data de follow-up (lembrete de quando contatar)
- Observações
- Tags personalizáveis

### Funcionalidades
- **Arrastar e soltar** cards entre etapas
- **Contato direto** via WhatsApp com 1 clique
- **Conversão automática**: ao mover para "Cliente", o lead é convertido em cliente no cadastro
- Contagem de leads por etapa
- Lembrete de follow-up por data

### Métricas
- Total de leads abertos
- Total de clientes convertidos
- Taxa de conversão (%)
- Leads criados no mês

---

## 8. Financeiro

Controle completo de entradas e saídas de caixa.

### Lançamentos automáticos
Toda venda registrada no sistema gera automaticamente:
- **Receita** no valor do produto vendido
- **Custo** no valor de compra do aparelho

### Lançamentos manuais
Registre qualquer receita ou despesa adicional:

| Campo | Descrição |
|-------|-----------|
| Descrição | Identificação do lançamento |
| Valor | Montante em R$ |
| Tipo | Receita ou Despesa |
| Categoria | Venda, Estoque, Troca, Aluguel, Salários, Marketing, Impostos, Outros |
| Data | Data de competência |

### Métricas
- Total de receitas no período
- Total de despesas no período
- Lucro líquido (receitas − despesas)
- Margem de lucro (%)

### Filtros
- Por tipo (todas / receitas / despesas)
- Por intervalo de datas
- Busca por descrição ou categoria

### Exportar CSV
Exporta o extrato financeiro do mês.

---

## 9. Fornecedores

Cadastro de fornecedores e registro de compras em lote.

### Cadastro de fornecedor
| Campo | Descrição |
|-------|-----------|
| Nome | Nome da empresa ou pessoa |
| Contato | Nome do responsável |
| E-mail | E-mail de contato |
| Telefone | Telefone/WhatsApp |
| País | País de origem |
| Categoria | Tipo de produto fornecido |

### Registro de compra (lote)
Ao registrar uma compra de um fornecedor, adicione múltiplos aparelhos de uma vez. Para cada aparelho informe:
- Modelo, capacidade, cor, condição, IMEI
- Custo unitário e preço de venda sugerido

Os aparelhos são **automaticamente adicionados ao estoque**.

### Abas
- **Fornecedores** — lista e gestão de fornecedores
- **Compras** — histórico de compras e entrada em lote

---

## 10. Marketing

Planejamento e acompanhamento de campanhas publicitárias.

### Dados da campanha
| Campo | Descrição |
|-------|-----------|
| Nome | Identificação da campanha |
| Plataforma | Instagram Ads, Facebook Ads, Google Ads, TikTok Ads, WhatsApp etc. |
| Objetivo | Geração de Leads, Conversão, Reconhecimento, Tráfego, Engajamento, Retargeting |
| Público-alvo | Descrição do público |
| Período | Data de início e fim |
| Orçamento | Valor total planejado (R$) |
| Gasto | Valor efetivamente gasto (R$) |
| Leads gerados | Quantidade de leads captados |
| Descrição / Estratégia | Detalhamento da campanha |
| Resultados obtidos | Registro dos resultados reais |
| Status | Ativa / Pausada / Encerrada |

### Métricas automáticas
- **CPL** (Custo por Lead) — calculado automaticamente
- **ROI** (Retorno sobre investimento) — calculado automaticamente
- **Progresso do orçamento** — barra de uso do budget

### Métricas gerais
- Orçamento total investido
- Total gasto
- Total de leads gerados
- CPL médio de todas as campanhas

---

## 11. Relatórios

Relatórios mensais detalhados com opção de exportação.

### Navegação
Use as setas ← → para navegar entre os meses.

### Seções disponíveis

**Vendas Mensais**
- Faturamento total do mês
- Quantidade de operações e ticket médio
- Método de pagamento mais utilizado
- Distribuição por tipo (Vendas / Trocas)

**Estoque & Custo**
- Aparelhos em estoque
- Aparelhos vendidos no mês
- Valor de venda e custo total
- Margem de lucro potencial

**Lucratividade**
- Receita bruta
- Custo de mercadoria
- Outros custos
- Lucro líquido e margem (%)

**Performance de Leads**
- Total de leads
- Leads qualificados
- Leads convertidos em clientes
- Taxa de conversão (%)
- Leads por origem

Cada seção possui botão de **Exportar CSV** individual.

---

## 12. Vendedores

Gestão de desempenho da equipe de vendas.

### Cadastro do vendedor
| Campo | Descrição |
|-------|-----------|
| Nome | Nome do vendedor |
| Cargo | Função/título |
| Meta mensal | Objetivo de faturamento (R$) |
| Cor | Cor de identificação no sistema |

### Painel de desempenho
Cada vendedor possui um card com:
- Faturamento do mês atual
- Quantidade de vendas no mês
- Variação percentual em relação ao mês anterior (↑ ↓)
- Progresso visual em direção à meta mensal
- Status "Meta atingida!" ou "Faltam R$ X para a meta"

### Ranking comparativo
Gráfico de barras comparando o faturamento de todos os vendedores no mês.

### Vínculo com vendas
Ao registrar uma venda, o **vendedor responsável** é selecionado. Todas as métricas são calculadas automaticamente com base nas vendas vinculadas.

---

## 13. Mensagens Prontas

Biblioteca de templates de mensagens para WhatsApp.

### Templates pré-criados
O sistema já vem com **12 mensagens prontas** nas categorias:
- Follow-up
- Aniversariante
- Pós-venda
- Promoção
- Recuperação de cliente
- Boas-vindas
- Cobrança
- Geral

### Variáveis dinâmicas
Use dentro das mensagens:

| Variável | Substituída por |
|----------|----------------|
| `{nome}` | Nome do cliente |
| `{produto}` | Nome do produto |
| `{valor}` | Valor formatado em R$ |
| `{empresa}` | Nome da empresa |

### Funcionalidades
- **Copiar** mensagem com 1 clique (animação de confirmação)
- **Adicionar** nova mensagem personalizada
- **Excluir** mensagens desnecessárias
- **Buscar** por palavra-chave
- **Filtrar** por categoria
- **Preview** em tempo real com substituição das variáveis

As mensagens ficam salvas localmente no navegador.

---

## 14. Documentação

Repositório central de documentos e arquivos da empresa.

### Tipos de documentos suportados
- Recibos de venda gerados pelo sistema (PDF)
- Termos de troca gerados pelo sistema (PDF)
- Links para documentos externos (Google Drive, Dropbox, OneDrive)
- Procedimentos, manuais, contratos etc.

### Categorias disponíveis
Vendas · Trocas · Compras · Procedimentos · Manuais · Financeiro · Marketing · Contratos · Importações · Outros

### Visualização
Documentos organizados cronologicamente por mês e dia, com filtro por categoria e busca por título.

---

## 15. Assinatura Digital

Permite que o cliente assine eletronicamente o recibo ou termo de troca **pelo celular**, sem necessidade de papel.

### Como funciona
1. Ao finalizar uma venda, o sistema gera um **link único de assinatura**
2. O link é enviado para o cliente via WhatsApp
3. O cliente acessa o link no celular e visualiza o resumo da operação
4. O cliente desenha a assinatura na tela com o dedo
5. A assinatura é salva e vinculada à venda

### O documento mostra
- Tipo de operação (Recibo de Venda / Termo de Troca / Compra de Produto Usado)
- Número da operação
- Produto, IMEI, condição
- Valor total e método de pagamento
- Data da operação

### Segurança
- Cada link é único e de uso único
- Após assinado, o link não pode ser reutilizado
- Se acessado novamente, exibe mensagem "Documento já assinado"

---

## 16. Configurações

Painel de administração completo do sistema.

### Aba: Perfil
- Nome, cargo, telefone, CNPJ
- Foto de perfil (upload)
- Assinatura digital da empresa (desenho no pad) — usada nos documentos PDF

### Aba: Segurança
- Alteração de senha

### Aba: Dados & Backup
- **Exportar backup** — gera um arquivo JSON com todos os dados
- **Reset do sistema** — apaga todos os dados (requer confirmação)
- Scripts SQL para migração de colunas extras no Supabase

### Aba: Integrações
- **Google Calendar** — ao ativar e inserir o Client ID, cada venda registrada cria automaticamente um evento no Google Calendar

### Aba: Equipe
Gestão de usuários adicionais com permissões por página:

| Ação | Descrição |
|------|-----------|
| Adicionar membro | Nome, e-mail, cargo e senha aleatória |
| Permissões | Marque quais páginas cada membro pode acessar |
| Enviar credenciais | Envia login/senha via WhatsApp para o membro |
| Remover membro | Revoga o acesso |

---

## 17. Integrações

| Integração | Onde é usada | Finalidade |
|------------|-------------|------------|
| **Supabase** | Todo o sistema | Banco de dados em nuvem — armazena todos os dados |
| **WhatsApp** | Clientes, Leads, Vendas, Equipe | Links diretos para conversa, envio de contratos e mensagens |
| **PDF** | Vendas, Documentação | Geração automática de recibos e termos de troca |
| **Assinatura Digital** | Vendas | Coleta de assinatura eletrônica do cliente via link |
| **Google Calendar** | Vendas, Configurações | Criação automática de eventos ao registrar vendas |
| **CSV Export** | Estoque, Vendas, Financeiro, Relatórios | Exportação de dados para Excel/Sheets |
| **Google Drive / Dropbox** | Documentação | Links para arquivos externos |

---

## Resumo das Páginas

| Página | Ícone | O que faz |
|--------|-------|-----------|
| Dashboard | 📊 | Visão geral do negócio em tempo real |
| Estoque | 📦 | Controle de aparelhos disponíveis e vendidos |
| Vendas | 💰 | Registro de operações + PDF + assinatura digital |
| Clientes | 👥 | Cadastro, histórico, aniversariantes e mensagens |
| Leads | 🎯 | Funil de vendas Kanban com CRM completo |
| Financeiro | 💳 | Controle de receitas e despesas |
| Fornecedores | 🏭 | Cadastro e compras em lote |
| Marketing | 📣 | Campanhas e ROI por plataforma |
| Relatórios | 📈 | Análises mensais exportáveis |
| Vendedores | 🏆 | Desempenho e metas da equipe |
| Mensagens Prontas | 💬 | Templates para WhatsApp |
| Documentação | 📁 | Repositório de arquivos e contratos |
| Configurações | ⚙️ | Perfil, equipe e integrações |

---

*Easy Imports — Desenvolvido por AOS Company*
