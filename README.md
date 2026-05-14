# Easy Imports — Sistema de Gestão

Sistema web de gestão empresarial para importação e revenda de eletrônicos premium.

## Stack Técnica

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** (paleta customizada #FFC107)
- **Zustand** para estado global
- **React Router DOM v6** para roteamento
- **Recharts** para gráficos
- **Lucide React** para ícones
- **date-fns** para datas
- **react-hot-toast** para notificações

## Pré-requisitos

- Node.js ≥ 18
- npm ≥ 9

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

O sistema será aberto em `http://localhost:3000`.

## Build de Produção

```bash
npm run build
npm run preview
```

## Credenciais de Acesso (Demo)

- **Email:** `easyimportsbrstore@gmail.com`
- **Senha:** `123456`

## Estrutura do Projeto

```
src/
├── components/
│   ├── dashboard/    # Componentes do Dashboard (MetricCard, RevenueChart, etc.)
│   ├── layout/       # AppLayout, Header, Sidebar, MobileBottomNav
│   └── ui/           # Componentes reutilizáveis (Button, Input, Modal, Table, etc.)
├── hooks/            # Hooks customizados (useLocalStorage, useMediaQuery)
├── lib/              # Utilitários (formatters, validators, storage, dataService)
├── pages/            # Páginas da aplicação
├── routes/           # Configuração de rotas
├── stores/           # Stores Zustand (auth, app)
└── types/            # Tipos TypeScript compartilhados
```

## Armazenamento

O sistema opera em **modo demo** com `localStorage`. Para conectar ao Supabase, preencha as variáveis no `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

## Licença

Proprietário — © 2026 Easy Imports. Todos os direitos reservados.
