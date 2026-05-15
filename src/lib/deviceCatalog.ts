// Catálogo completo de aparelhos, acessórios e suas especificações

export interface DeviceModel {
  name: string;
  capacities: string[];
  colors?: string[];
}

export interface DeviceBrand {
  brand: string;
  category: string;
  models: DeviceModel[];
}

export const DEVICE_CATALOG: DeviceBrand[] = [
  // ─── Apple iPhone ──────────────────────────────────────────────────────────
  {
    brand: 'Apple', category: 'iPhone',
    models: [
      // iPhone 17 (2025)
      { name: 'iPhone 17 Pro Max', capacities: ['256GB', '512GB', '1TB'], colors: ['Titânio Desert', 'Titânio Black', 'Titânio White', 'Titânio Natural'] },
      { name: 'iPhone 17 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Titânio Desert', 'Titânio Black', 'Titânio White', 'Titânio Natural'] },
      { name: 'iPhone 17 Air', capacities: ['128GB', '256GB', '512GB'], colors: ['Preto', 'Branco', 'Rosa', 'Azul Anil', 'Verde Anis'] },
      { name: 'iPhone 17', capacities: ['128GB', '256GB', '512GB'], colors: ['Preto', 'Branco', 'Rosa', 'Azul Anil', 'Verde Anis'] },
      // iPhone 16 (2024)
      { name: 'iPhone 16 Pro Max', capacities: ['256GB', '512GB', '1TB'], colors: ['Titânio Natural', 'Titânio Preto', 'Titânio Branco', 'Titânio Deserto'] },
      { name: 'iPhone 16 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Titânio Natural', 'Titânio Preto', 'Titânio Branco', 'Titânio Deserto'] },
      { name: 'iPhone 16 Plus', capacities: ['128GB', '256GB', '512GB'], colors: ['Preto', 'Branco', 'Rosa', 'Anil', 'Verde Anis'] },
      { name: 'iPhone 16', capacities: ['128GB', '256GB', '512GB'], colors: ['Preto', 'Branco', 'Rosa', 'Anil', 'Verde Anis'] },
      // iPhone 15 (2023)
      { name: 'iPhone 15 Pro Max', capacities: ['256GB', '512GB', '1TB'], colors: ['Titânio Natural', 'Titânio Azul', 'Titânio Branco', 'Titânio Preto'] },
      { name: 'iPhone 15 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Titânio Natural', 'Titânio Azul', 'Titânio Branco', 'Titânio Preto'] },
      { name: 'iPhone 15 Plus', capacities: ['128GB', '256GB', '512GB'], colors: ['Preto', 'Verde', 'Amarelo', 'Rosa', 'Azul'] },
      { name: 'iPhone 15', capacities: ['128GB', '256GB', '512GB'], colors: ['Preto', 'Verde', 'Amarelo', 'Rosa', 'Azul'] },
      // iPhone 14 (2022)
      { name: 'iPhone 14 Pro Max', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Roxo Profundo', 'Ouro', 'Prata', 'Preto Espacial'] },
      { name: 'iPhone 14 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Roxo Profundo', 'Ouro', 'Prata', 'Preto Espacial'] },
      { name: 'iPhone 14 Plus', capacities: ['128GB', '256GB', '512GB'], colors: ['Meia-Noite', 'Estelar', 'Azul', 'Roxo', 'Vermelho'] },
      { name: 'iPhone 14', capacities: ['128GB', '256GB', '512GB'], colors: ['Meia-Noite', 'Estelar', 'Azul', 'Roxo', 'Vermelho'] },
      // iPhone 13 (2021)
      { name: 'iPhone 13 Pro Max', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Grafite', 'Ouro', 'Prata', 'Azul-Sierra', 'Verde Alpino'] },
      { name: 'iPhone 13 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Grafite', 'Ouro', 'Prata', 'Azul-Sierra', 'Verde Alpino'] },
      { name: 'iPhone 13', capacities: ['128GB', '256GB', '512GB'], colors: ['Meia-Noite', 'Estelar', 'Azul', 'Rosa', 'Vermelho', 'Verde'] },
      { name: 'iPhone 13 mini', capacities: ['128GB', '256GB', '512GB'], colors: ['Meia-Noite', 'Estelar', 'Azul', 'Rosa', 'Vermelho', 'Verde'] },
      // iPhone 12 (2020)
      { name: 'iPhone 12 Pro Max', capacities: ['128GB', '256GB', '512GB'], colors: ['Prata', 'Grafite', 'Ouro', 'Azul Pacífico'] },
      { name: 'iPhone 12 Pro', capacities: ['128GB', '256GB', '512GB'], colors: ['Prata', 'Grafite', 'Ouro', 'Azul Pacífico'] },
      { name: 'iPhone 12', capacities: ['64GB', '128GB', '256GB'], colors: ['Preto', 'Branco', 'Vermelho', 'Verde', 'Azul', 'Roxo'] },
      { name: 'iPhone 12 mini', capacities: ['64GB', '128GB', '256GB'], colors: ['Preto', 'Branco', 'Vermelho', 'Verde', 'Azul', 'Roxo'] },
      // iPhone 11 (2019)
      { name: 'iPhone 11 Pro Max', capacities: ['64GB', '256GB', '512GB'], colors: ['Prata', 'Cinza Espacial', 'Ouro', 'Verde Meia-Noite'] },
      { name: 'iPhone 11 Pro', capacities: ['64GB', '256GB', '512GB'], colors: ['Prata', 'Cinza Espacial', 'Ouro', 'Verde Meia-Noite'] },
      { name: 'iPhone 11', capacities: ['64GB', '128GB', '256GB'], colors: ['Preto', 'Branco', 'Vermelho', 'Roxo', 'Amarelo', 'Verde'] },
      // iPhone XS / XR (2018)
      { name: 'iPhone XS Max', capacities: ['64GB', '256GB', '512GB'], colors: ['Prata', 'Cinza Espacial', 'Ouro'] },
      { name: 'iPhone XS', capacities: ['64GB', '256GB', '512GB'], colors: ['Prata', 'Cinza Espacial', 'Ouro'] },
      { name: 'iPhone XR', capacities: ['64GB', '128GB', '256GB'], colors: ['Preto', 'Branco', 'Azul', 'Coral', 'Amarelo', 'Vermelho'] },
      // iPhone X / 8 (2017)
      { name: 'iPhone X', capacities: ['64GB', '256GB'], colors: ['Prata', 'Cinza Espacial'] },
      { name: 'iPhone 8 Plus', capacities: ['64GB', '256GB'], colors: ['Prata', 'Cinza Espacial', 'Ouro'] },
      { name: 'iPhone 8', capacities: ['64GB', '256GB'], colors: ['Prata', 'Cinza Espacial', 'Ouro'] },
      // iPhone SE
      { name: 'iPhone SE (3ª geração)', capacities: ['64GB', '128GB', '256GB'], colors: ['Meia-Noite', 'Estelar', 'Vermelho'] },
      { name: 'iPhone SE (2ª geração)', capacities: ['64GB', '128GB', '256GB'], colors: ['Preto', 'Branco', 'Vermelho'] },
      { name: 'iPhone SE (1ª geração)', capacities: ['16GB', '32GB', '64GB'], colors: ['Cinza Espacial', 'Prata', 'Ouro', 'Ouro Rosa'] },
      // iPhone 7 / 6
      { name: 'iPhone 7 Plus', capacities: ['32GB', '128GB', '256GB'], colors: ['Preto Mate', 'Preto Brilhante', 'Prata', 'Ouro', 'Ouro Rosa', 'Vermelho'] },
      { name: 'iPhone 7', capacities: ['32GB', '128GB', '256GB'], colors: ['Preto Mate', 'Preto Brilhante', 'Prata', 'Ouro', 'Ouro Rosa', 'Vermelho'] },
      { name: 'iPhone 6s Plus', capacities: ['16GB', '32GB', '64GB', '128GB'], colors: ['Cinza Espacial', 'Prata', 'Ouro', 'Ouro Rosa'] },
      { name: 'iPhone 6s', capacities: ['16GB', '32GB', '64GB', '128GB'], colors: ['Cinza Espacial', 'Prata', 'Ouro', 'Ouro Rosa'] },
    ],
  },

  // ─── Apple iPad ────────────────────────────────────────────────────────────
  {
    brand: 'Apple', category: 'iPad',
    models: [
      { name: 'iPad Pro 13" M4', capacities: ['256GB', '512GB', '1TB', '2TB'], colors: ['Preto Espacial', 'Prata'] },
      { name: 'iPad Pro 11" M4', capacities: ['256GB', '512GB', '1TB', '2TB'], colors: ['Preto Espacial', 'Prata'] },
      { name: 'iPad Pro 13" M2', capacities: ['128GB', '256GB', '512GB', '1TB', '2TB'], colors: ['Cinza Espacial', 'Prata'] },
      { name: 'iPad Pro 11" M2', capacities: ['128GB', '256GB', '512GB', '1TB', '2TB'], colors: ['Cinza Espacial', 'Prata'] },
      { name: 'iPad Air 13" M3', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Azul', 'Roxo', 'Estelar', 'Cinza Espacial'] },
      { name: 'iPad Air 11" M3', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Azul', 'Roxo', 'Estelar', 'Cinza Espacial'] },
      { name: 'iPad Air 13" M2', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Azul', 'Roxo', 'Estelar', 'Cinza Espacial'] },
      { name: 'iPad Air 11" M2', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Azul', 'Roxo', 'Estelar', 'Cinza Espacial'] },
      { name: 'iPad Air M1', capacities: ['64GB', '256GB'] },
      { name: 'iPad (10ª geração)', capacities: ['64GB', '256GB'], colors: ['Azul', 'Rosa', 'Amarelo', 'Prata'] },
      { name: 'iPad (9ª geração)', capacities: ['64GB', '256GB'], colors: ['Cinza Espacial', 'Prata'] },
      { name: 'iPad mini 7', capacities: ['128GB', '256GB', '512GB'], colors: ['Azul', 'Roxo', 'Estelar', 'Cinza Espacial'] },
      { name: 'iPad mini 6', capacities: ['64GB', '256GB'], colors: ['Roxo', 'Rosa', 'Estelar', 'Cinza Espacial'] },
      { name: 'iPad mini 5', capacities: ['64GB', '256GB'], colors: ['Cinza Espacial', 'Prata', 'Ouro'] },
    ],
  },

  // ─── Apple MacBook ─────────────────────────────────────────────────────────
  {
    brand: 'Apple', category: 'MacBook',
    models: [
      { name: 'MacBook Pro 16" M4 Max', capacities: ['512GB', '1TB', '2TB', '4TB'], colors: ['Preto Espacial', 'Prata'] },
      { name: 'MacBook Pro 16" M4 Pro', capacities: ['512GB', '1TB', '2TB'], colors: ['Preto Espacial', 'Prata'] },
      { name: 'MacBook Pro 14" M4 Max', capacities: ['512GB', '1TB', '2TB', '4TB'], colors: ['Preto Espacial', 'Prata'] },
      { name: 'MacBook Pro 14" M4 Pro', capacities: ['512GB', '1TB', '2TB'], colors: ['Preto Espacial', 'Prata'] },
      { name: 'MacBook Pro 14" M4', capacities: ['256GB', '512GB', '1TB'], colors: ['Preto Espacial', 'Prata'] },
      { name: 'MacBook Pro 16" M3 Max', capacities: ['512GB', '1TB', '2TB', '4TB'], colors: ['Preto Espacial', 'Prata'] },
      { name: 'MacBook Pro 16" M3 Pro', capacities: ['512GB', '1TB', '2TB'], colors: ['Preto Espacial', 'Prata'] },
      { name: 'MacBook Pro 14" M3 Max', capacities: ['512GB', '1TB', '2TB', '4TB'], colors: ['Preto Espacial', 'Prata'] },
      { name: 'MacBook Pro 14" M3 Pro', capacities: ['512GB', '1TB', '2TB'], colors: ['Preto Espacial', 'Prata'] },
      { name: 'MacBook Pro 14" M3', capacities: ['512GB', '1TB'], colors: ['Preto Espacial', 'Prata'] },
      { name: 'MacBook Pro 13" M2', capacities: ['256GB', '512GB', '1TB', '2TB'], colors: ['Cinza Espacial', 'Prata'] },
      { name: 'MacBook Air 15" M4', capacities: ['256GB', '512GB', '1TB', '2TB'], colors: ['Meia-Noite', 'Estelar', 'Azul Céu', 'Cinza'] },
      { name: 'MacBook Air 13" M4', capacities: ['256GB', '512GB', '1TB', '2TB'], colors: ['Meia-Noite', 'Estelar', 'Azul Céu', 'Cinza'] },
      { name: 'MacBook Air 15" M3', capacities: ['256GB', '512GB', '1TB', '2TB'], colors: ['Meia-Noite', 'Estelar', 'Azul Céu', 'Cinza'] },
      { name: 'MacBook Air 13" M3', capacities: ['256GB', '512GB', '1TB', '2TB'], colors: ['Meia-Noite', 'Estelar', 'Azul Céu', 'Cinza'] },
      { name: 'MacBook Air 15" M2', capacities: ['256GB', '512GB', '1TB', '2TB'], colors: ['Meia-Noite', 'Estelar', 'Cinza Espacial', 'Prata'] },
      { name: 'MacBook Air 13" M2', capacities: ['256GB', '512GB', '1TB', '2TB'], colors: ['Meia-Noite', 'Estelar', 'Cinza Espacial', 'Prata'] },
      { name: 'MacBook Air M1', capacities: ['256GB', '512GB', '1TB', '2TB'], colors: ['Ouro', 'Cinza Espacial', 'Prata'] },
      { name: 'iMac M4', capacities: ['256GB', '512GB', '1TB', '2TB'], colors: ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo'] },
      { name: 'iMac M3', capacities: ['256GB', '512GB', '1TB', '2TB'], colors: ['Azul', 'Verde', 'Rosa', 'Prata', 'Amarelo', 'Laranja', 'Roxo'] },
      { name: 'Mac mini M4 Pro', capacities: ['512GB', '1TB', '2TB'] },
      { name: 'Mac mini M4', capacities: ['256GB', '512GB', '1TB', '2TB'] },
      { name: 'Mac Studio M4 Max', capacities: ['512GB', '1TB', '2TB', '4TB', '8TB'] },
      { name: 'Mac Pro M2 Ultra', capacities: ['1TB', '2TB', '4TB', '8TB'] },
    ],
  },

  // ─── Apple Watch ───────────────────────────────────────────────────────────
  {
    brand: 'Apple', category: 'Watch',
    models: [
      { name: 'Apple Watch Series 11 (46mm)', capacities: ['64GB'], colors: ['Preto', 'Prata', 'Ouro Rosa', 'Titânio Natural'] },
      { name: 'Apple Watch Series 11 (42mm)', capacities: ['64GB'], colors: ['Preto', 'Prata', 'Ouro Rosa', 'Titânio Natural'] },
      { name: 'Apple Watch Ultra 3', capacities: ['64GB'], colors: ['Titânio Natural', 'Titânio Preto'] },
      { name: 'Apple Watch Series 10 (46mm)', capacities: ['32GB'], colors: ['Preto', 'Prata', 'Ouro Rosa'] },
      { name: 'Apple Watch Series 10 (42mm)', capacities: ['32GB'], colors: ['Preto', 'Prata', 'Ouro Rosa'] },
      { name: 'Apple Watch Ultra 2', capacities: ['64GB'], colors: ['Titânio Natural', 'Titânio Preto'] },
      { name: 'Apple Watch Series 9 (45mm)', capacities: ['64GB'], colors: ['Meia-Noite', 'Estelar', 'Vermelho', 'Prata', 'Rosa'] },
      { name: 'Apple Watch Series 9 (41mm)', capacities: ['64GB'], colors: ['Meia-Noite', 'Estelar', 'Vermelho', 'Prata', 'Rosa'] },
      { name: 'Apple Watch Ultra', capacities: ['32GB'], colors: ['Titânio Natural'] },
      { name: 'Apple Watch Series 8 (45mm)', capacities: ['32GB'] },
      { name: 'Apple Watch Series 8 (41mm)', capacities: ['32GB'] },
      { name: 'Apple Watch SE 2 (44mm)', capacities: ['32GB'] },
      { name: 'Apple Watch SE 2 (40mm)', capacities: ['32GB'] },
      { name: 'Apple Watch Series 7 (45mm)', capacities: ['32GB'] },
      { name: 'Apple Watch Series 7 (41mm)', capacities: ['32GB'] },
      { name: 'Apple Watch Series 6 (44mm)', capacities: ['32GB'] },
      { name: 'Apple Watch Series 6 (40mm)', capacities: ['32GB'] },
    ],
  },

  // ─── Apple AirPods ─────────────────────────────────────────────────────────
  {
    brand: 'Apple', category: 'AirPods',
    models: [
      { name: 'AirPods Pro 2 (USB-C)', capacities: ['—'] },
      { name: 'AirPods Pro 2 (Lightning)', capacities: ['—'] },
      { name: 'AirPods 4 (ANC)', capacities: ['—'] },
      { name: 'AirPods 4', capacities: ['—'] },
      { name: 'AirPods 3', capacities: ['—'] },
      { name: 'AirPods 2', capacities: ['—'] },
      { name: 'AirPods Max (USB-C)', capacities: ['—'], colors: ['Azul Meia-Noite', 'Luz das Estrelas', 'Laranja', 'Roxo', 'Rosa'] },
      { name: 'AirPods Max (Lightning)', capacities: ['—'], colors: ['Cinza Espacial', 'Prata', 'Azul Céu', 'Verde', 'Rosa'] },
      { name: 'Beats Studio Pro', capacities: ['—'] },
      { name: 'Beats Fit Pro', capacities: ['—'] },
      { name: 'Beats Studio Buds+', capacities: ['—'] },
      { name: 'Beats Powerbeats Pro', capacities: ['—'] },
    ],
  },

  // ─── Acessórios Apple ─────────────────────────────────────────────────────
  {
    brand: 'Apple', category: 'Acessórios',
    models: [
      // Apple Pencil
      { name: 'Apple Pencil Pro', capacities: ['—'] },
      { name: 'Apple Pencil (USB-C)', capacities: ['—'] },
      { name: 'Apple Pencil (2ª geração)', capacities: ['—'] },
      { name: 'Apple Pencil (1ª geração)', capacities: ['—'] },
      // Teclados e acessórios iPad
      { name: 'Magic Keyboard para iPad Pro 13" (M4)', capacities: ['—'], colors: ['Preto', 'Branco'] },
      { name: 'Magic Keyboard para iPad Pro 11" (M4)', capacities: ['—'], colors: ['Preto', 'Branco'] },
      { name: 'Magic Keyboard para iPad Air 13"', capacities: ['—'], colors: ['Preto', 'Branco'] },
      { name: 'Magic Keyboard para iPad Air 11"', capacities: ['—'], colors: ['Preto', 'Branco'] },
      { name: 'Smart Folio para iPad Pro 13"', capacities: ['—'] },
      { name: 'Smart Folio para iPad Pro 11"', capacities: ['—'] },
      { name: 'Smart Folio para iPad Air M3', capacities: ['—'] },
      { name: 'Smart Folio para iPad (10ª geração)', capacities: ['—'] },
      { name: 'Smart Keyboard Folio para iPad Pro', capacities: ['—'] },
      // Teclados e acessórios Mac
      { name: 'Magic Keyboard com Touch ID', capacities: ['—'], colors: ['Prata', 'Preto'] },
      { name: 'Magic Keyboard com Touch ID e Teclado Numérico', capacities: ['—'], colors: ['Prata', 'Preto'] },
      { name: 'Magic Mouse', capacities: ['—'], colors: ['Prata', 'Preto'] },
      { name: 'Magic Trackpad', capacities: ['—'], colors: ['Prata', 'Preto'] },
      // Carregadores e cabos
      { name: 'Carregador MagSafe 25W', capacities: ['—'] },
      { name: 'Carregador MagSafe 15W', capacities: ['—'] },
      { name: 'Carregador MagSafe Duo', capacities: ['—'] },
      { name: 'MagSafe Battery Pack', capacities: ['—'] },
      { name: 'Cabo USB-C para MagSafe 3 (2m)', capacities: ['—'] },
      { name: 'Cabo USB-C para Lightning (1m)', capacities: ['—'] },
      { name: 'Cabo USB-C (1m)', capacities: ['—'] },
      { name: 'Cabo USB-C (2m)', capacities: ['—'] },
      { name: 'Cabo Thunderbolt 4 Pro (1m)', capacities: ['—'] },
      { name: 'Adaptador USB-C para Lightning', capacities: ['—'] },
      { name: 'Adaptador USB-C para USB', capacities: ['—'] },
      { name: 'Adaptador Multiportas USB-C Digital AV', capacities: ['—'] },
      { name: 'Cubo de Carga USB-C 30W', capacities: ['—'] },
      { name: 'Cubo de Carga USB-C 35W (2 portas)', capacities: ['—'] },
      { name: 'Cubo de Carga USB-C 67W', capacities: ['—'] },
      { name: 'Cubo de Carga USB-C 96W', capacities: ['—'] },
      // AirTag
      { name: 'AirTag (unitário)', capacities: ['—'] },
      { name: 'AirTag (Pack com 4)', capacities: ['—'] },
      // Alto-falantes e streaming
      { name: 'HomePod (2ª geração)', capacities: ['—'], colors: ['Branco', 'Meia-Noite', 'Amarelo'] },
      { name: 'HomePod mini', capacities: ['—'], colors: ['Branco', 'Meia-Noite', 'Amarelo', 'Laranja', 'Azul'] },
      { name: 'Apple TV 4K Wi-Fi + Ethernet', capacities: ['64GB'] },
      { name: 'Apple TV 4K Wi-Fi', capacities: ['64GB'] },
      // Vision Pro
      { name: 'Apple Vision Pro', capacities: ['256GB', '512GB', '1TB'] },
      // Outros
      { name: 'Siri Remote', capacities: ['—'] },
      { name: 'Apple Configurator 2 (dongle)', capacities: ['—'] },
    ],
  },

  // ─── Capas & Cases ─────────────────────────────────────────────────────────
  {
    brand: 'Diversas', category: 'Capas & Cases',
    models: [
      // Apple originais iPhone 17
      { name: 'Capa Silicone iPhone 17 Pro Max', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 17 Pro', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 17 Air', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 17', capacities: ['—'] },
      { name: 'Capa FineWoven iPhone 17 Pro Max', capacities: ['—'] },
      { name: 'Capa FineWoven iPhone 17 Pro', capacities: ['—'] },
      // Apple originais iPhone 16
      { name: 'Capa Silicone iPhone 16 Pro Max', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 16 Pro', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 16 Plus', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 16', capacities: ['—'] },
      { name: 'Capa FineWoven iPhone 16 Pro Max', capacities: ['—'] },
      { name: 'Capa FineWoven iPhone 16 Pro', capacities: ['—'] },
      // Apple originais iPhone 15
      { name: 'Capa Silicone iPhone 15 Pro Max', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 15 Pro', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 15 Plus', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 15', capacities: ['—'] },
      { name: 'Capa Couro iPhone 15 Pro Max', capacities: ['—'] },
      { name: 'Capa Couro iPhone 15 Pro', capacities: ['—'] },
      // Apple originais iPhone 14 e anteriores
      { name: 'Capa Silicone iPhone 14 Pro Max', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 14 Pro', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 14 Plus', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 14', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 13 Pro Max', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 13 Pro', capacities: ['—'] },
      { name: 'Capa Silicone iPhone 13', capacities: ['—'] },
      // Genéricas / Terceiros
      { name: 'Capa Anti-Shock (universal)', capacities: ['—'] },
      { name: 'Capa Transparente (universal)', capacities: ['—'] },
      { name: 'Capa com Carteira (universal)', capacities: ['—'] },
      { name: 'Capa Carbon Fiber (universal)', capacities: ['—'] },
      { name: 'Capinha Personalizada', capacities: ['—'] },
      // iPad Cases
      { name: 'Smart Folio para iPad Pro 13" (3ª geração)', capacities: ['—'] },
      { name: 'Smart Folio para iPad Pro 11" (3ª geração)', capacities: ['—'] },
      { name: 'Capa iPad Air M3 (slim)', capacities: ['—'] },
    ],
  },

  // ─── Samsung Galaxy ────────────────────────────────────────────────────────
  {
    brand: 'Samsung', category: 'Smartphones',
    models: [
      { name: 'Galaxy S25 Ultra', capacities: ['256GB', '512GB', '1TB'], colors: ['Titanium Shadowblue', 'Titanium Black', 'Titanium White Silver', 'Titanium Silverblue'] },
      { name: 'Galaxy S25+', capacities: ['256GB', '512GB'], colors: ['Icy Blue', 'Mint', 'Navy', 'Silver Shadow'] },
      { name: 'Galaxy S25', capacities: ['128GB', '256GB', '512GB'], colors: ['Icy Blue', 'Mint', 'Navy', 'Silver Shadow'] },
      { name: 'Galaxy S24 Ultra', capacities: ['256GB', '512GB', '1TB'] },
      { name: 'Galaxy S24+', capacities: ['256GB', '512GB'] },
      { name: 'Galaxy S24', capacities: ['128GB', '256GB'] },
      { name: 'Galaxy S23 Ultra', capacities: ['256GB', '512GB'] },
      { name: 'Galaxy S23+', capacities: ['256GB', '512GB'] },
      { name: 'Galaxy S23', capacities: ['128GB', '256GB'] },
      { name: 'Galaxy S22 Ultra', capacities: ['128GB', '256GB', '512GB'] },
      { name: 'Galaxy S22+', capacities: ['128GB', '256GB'] },
      { name: 'Galaxy S22', capacities: ['128GB', '256GB'] },
      { name: 'Galaxy Z Fold 6', capacities: ['256GB', '512GB', '1TB'] },
      { name: 'Galaxy Z Flip 6', capacities: ['256GB', '512GB'] },
      { name: 'Galaxy Z Fold 5', capacities: ['256GB', '512GB', '1TB'] },
      { name: 'Galaxy Z Flip 5', capacities: ['256GB', '512GB'] },
      { name: 'Galaxy A55', capacities: ['128GB', '256GB'] },
      { name: 'Galaxy A35', capacities: ['128GB', '256GB'] },
      { name: 'Galaxy A15', capacities: ['128GB'] },
    ],
  },

  // ─── Xiaomi ────────────────────────────────────────────────────────────────
  {
    brand: 'Xiaomi', category: 'Smartphones',
    models: [
      { name: 'Xiaomi 15 Ultra', capacities: ['256GB', '512GB', '1TB'] },
      { name: 'Xiaomi 15 Pro', capacities: ['256GB', '512GB'] },
      { name: 'Xiaomi 15', capacities: ['256GB', '512GB'] },
      { name: 'Xiaomi 14 Ultra', capacities: ['256GB', '512GB'] },
      { name: 'Xiaomi 14 Pro', capacities: ['256GB', '512GB'] },
      { name: 'Xiaomi 14', capacities: ['256GB', '512GB'] },
      { name: 'Xiaomi 13 Ultra', capacities: ['256GB', '512GB', '1TB'] },
      { name: 'Redmi Note 14 Pro+', capacities: ['256GB', '512GB'] },
      { name: 'Redmi Note 14 Pro', capacities: ['128GB', '256GB'] },
      { name: 'Redmi Note 13 Pro+', capacities: ['256GB', '512GB'] },
      { name: 'Redmi Note 13 Pro', capacities: ['128GB', '256GB'] },
      { name: 'POCO F6 Pro', capacities: ['256GB', '512GB'] },
      { name: 'POCO X6 Pro', capacities: ['256GB', '512GB'] },
    ],
  },

  // ─── Motorola ──────────────────────────────────────────────────────────────
  {
    brand: 'Motorola', category: 'Smartphones',
    models: [
      { name: 'Motorola Edge 50 Ultra', capacities: ['256GB', '512GB'] },
      { name: 'Motorola Edge 50 Pro', capacities: ['256GB'] },
      { name: 'Motorola Edge 50 Fusion', capacities: ['128GB', '256GB'] },
      { name: 'Moto G85', capacities: ['128GB', '256GB'] },
      { name: 'Moto G55', capacities: ['128GB', '256GB'] },
      { name: 'Razr 50 Ultra', capacities: ['512GB'] },
      { name: 'Razr 50', capacities: ['256GB'] },
    ],
  },

  // ─── Games / Consoles ──────────────────────────────────────────────────────
  {
    brand: 'Nintendo / Sony / Microsoft', category: 'Games',
    models: [
      { name: 'Nintendo Switch 2', capacities: ['256GB'] },
      { name: 'Nintendo Switch OLED', capacities: ['64GB'] },
      { name: 'Nintendo Switch Lite', capacities: ['32GB'] },
      { name: 'PlayStation 5 Pro', capacities: ['2TB SSD'] },
      { name: 'PlayStation 5 Slim (Disc)', capacities: ['1TB SSD'] },
      { name: 'PlayStation 5 Slim (Digital)', capacities: ['1TB SSD'] },
      { name: 'PlayStation 5 (Disc)', capacities: ['825GB SSD'] },
      { name: 'PlayStation 5 Digital', capacities: ['825GB SSD'] },
      { name: 'Xbox Series X', capacities: ['1TB SSD'] },
      { name: 'Xbox Series S', capacities: ['512GB SSD'] },
      { name: 'Steam Deck OLED', capacities: ['512GB', '1TB'] },
      { name: 'Steam Deck LCD', capacities: ['64GB', '256GB', '512GB'] },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const ALL_CATEGORIES = [...new Set(DEVICE_CATALOG.map((b) => b.category))];

export function getBrandsByCategory(category: string): DeviceBrand[] {
  return DEVICE_CATALOG.filter((b) => b.category === category);
}

export function getModelsByCategory(category: string): DeviceModel[] {
  return getBrandsByCategory(category).flatMap((b) => b.models);
}

export function getCapacitiesForModel(modelName: string): string[] {
  for (const brand of DEVICE_CATALOG) {
    const model = brand.models.find((m) => m.name === modelName);
    if (model) return model.capacities;
  }
  return [];
}

export function getColorsForModel(modelName: string): string[] {
  for (const brand of DEVICE_CATALOG) {
    const model = brand.models.find((m) => m.name === modelName);
    if (model && model.colors) return model.colors;
  }
  return [];
}

export function getBrandForModel(modelName: string): string {
  for (const brand of DEVICE_CATALOG) {
    if (brand.models.find((m) => m.name === modelName)) return brand.brand;
  }
  return '';
}

export const WARRANTY_OPTIONS = [
  'Sem garantia',
  '30 dias (loja)',
  '3 meses',
  '6 meses',
  '12 meses',
  '24 meses',
  'Garantia Apple',
  'AppleCare+',
  'Garantia de Fábrica',
];

export const BATTERY_HEALTH_OPTIONS = [
  '100%', '99%', '98%', '97%', '96%', '95%',
  '94%', '93%', '92%', '91%', '90%',
  '89%', '88%', '87%', '86%', '85%',
  '84%', '83%', '82%', '81%', '80%',
  '79%', '78%', '77%', '76%', '75%',
  '70%', '65%', '60%', 'Abaixo de 60%', 'Não se aplica',
];

export const COMMON_CONDITIONS = [
  'Novo (lacrado)',
  'Seminovo — Excelente',
  'Seminovo — Bom Estado',
  'Usado — Bom Estado',
  'Usado — Com Marcas de Uso',
  'Usado — Com Avarias',
  'Para Retirada de Peças',
];
