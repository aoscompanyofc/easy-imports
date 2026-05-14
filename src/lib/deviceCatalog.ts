// Catálogo completo de aparelhos e suas capacidades padrão

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
      { name: 'iPhone 16 Pro Max', capacities: ['256GB', '512GB', '1TB'], colors: ['Titânio Natural', 'Titânio Preto', 'Titânio Branco', 'Titânio Deserto'] },
      { name: 'iPhone 16 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Titânio Natural', 'Titânio Preto', 'Titânio Branco', 'Titânio Deserto'] },
      { name: 'iPhone 16 Plus', capacities: ['128GB', '256GB', '512GB'], colors: ['Preto', 'Branco', 'Rosa', 'Anil', 'Verde Anis'] },
      { name: 'iPhone 16', capacities: ['128GB', '256GB', '512GB'], colors: ['Preto', 'Branco', 'Rosa', 'Anil', 'Verde Anis'] },
      { name: 'iPhone 15 Pro Max', capacities: ['256GB', '512GB', '1TB'], colors: ['Titânio Natural', 'Titânio Azul', 'Titânio Branco', 'Titânio Preto'] },
      { name: 'iPhone 15 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Titânio Natural', 'Titânio Azul', 'Titânio Branco', 'Titânio Preto'] },
      { name: 'iPhone 15 Plus', capacities: ['128GB', '256GB', '512GB'], colors: ['Preto', 'Verde', 'Amarelo', 'Rosa', 'Azul'] },
      { name: 'iPhone 15', capacities: ['128GB', '256GB', '512GB'], colors: ['Preto', 'Verde', 'Amarelo', 'Rosa', 'Azul'] },
      { name: 'iPhone 14 Pro Max', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Roxo Profundo', 'Ouro', 'Prata', 'Preto Espacial'] },
      { name: 'iPhone 14 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Roxo Profundo', 'Ouro', 'Prata', 'Preto Espacial'] },
      { name: 'iPhone 14 Plus', capacities: ['128GB', '256GB', '512GB'], colors: ['Meia-Noite', 'Estelar', 'Azul', 'Roxo', 'Vermelho'] },
      { name: 'iPhone 14', capacities: ['128GB', '256GB', '512GB'], colors: ['Meia-Noite', 'Estelar', 'Azul', 'Roxo', 'Vermelho'] },
      { name: 'iPhone 13 Pro Max', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Grafite', 'Ouro', 'Prata', 'Azul-Sierra', 'Verde Alpino'] },
      { name: 'iPhone 13 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], colors: ['Grafite', 'Ouro', 'Prata', 'Azul-Sierra', 'Verde Alpino'] },
      { name: 'iPhone 13', capacities: ['128GB', '256GB', '512GB'], colors: ['Meia-Noite', 'Estelar', 'Azul', 'Rosa', 'Vermelho', 'Verde'] },
      { name: 'iPhone 13 mini', capacities: ['128GB', '256GB', '512GB'], colors: ['Meia-Noite', 'Estelar', 'Azul', 'Rosa', 'Vermelho', 'Verde'] },
      { name: 'iPhone 12 Pro Max', capacities: ['128GB', '256GB', '512GB'], colors: ['Prata', 'Grafite', 'Ouro', 'Azul Pacífico'] },
      { name: 'iPhone 12 Pro', capacities: ['128GB', '256GB', '512GB'], colors: ['Prata', 'Grafite', 'Ouro', 'Azul Pacífico'] },
      { name: 'iPhone 12', capacities: ['64GB', '128GB', '256GB'], colors: ['Preto', 'Branco', 'Vermelho', 'Verde', 'Azul', 'Roxo'] },
      { name: 'iPhone 12 mini', capacities: ['64GB', '128GB', '256GB'], colors: ['Preto', 'Branco', 'Vermelho', 'Verde', 'Azul', 'Roxo'] },
      { name: 'iPhone 11 Pro Max', capacities: ['64GB', '256GB', '512GB'], colors: ['Prata', 'Cinza Espacial', 'Ouro', 'Verde Meia-Noite'] },
      { name: 'iPhone 11 Pro', capacities: ['64GB', '256GB', '512GB'], colors: ['Prata', 'Cinza Espacial', 'Ouro', 'Verde Meia-Noite'] },
      { name: 'iPhone 11', capacities: ['64GB', '128GB', '256GB'], colors: ['Preto', 'Branco', 'Vermelho', 'Roxo', 'Amarelo', 'Verde'] },
      { name: 'iPhone XS Max', capacities: ['64GB', '256GB', '512GB'], colors: ['Prata', 'Cinza Espacial', 'Ouro'] },
      { name: 'iPhone XS', capacities: ['64GB', '256GB', '512GB'], colors: ['Prata', 'Cinza Espacial', 'Ouro'] },
      { name: 'iPhone XR', capacities: ['64GB', '128GB', '256GB'], colors: ['Preto', 'Branco', 'Azul', 'Coral', 'Amarelo', 'Vermelho'] },
      { name: 'iPhone X', capacities: ['64GB', '256GB'], colors: ['Prata', 'Cinza Espacial'] },
      { name: 'iPhone 8 Plus', capacities: ['64GB', '256GB'], colors: ['Prata', 'Cinza Espacial', 'Ouro'] },
      { name: 'iPhone 8', capacities: ['64GB', '256GB'], colors: ['Prata', 'Cinza Espacial', 'Ouro'] },
      { name: 'iPhone SE (3ª geração)', capacities: ['64GB', '128GB', '256GB'], colors: ['Meia-Noite', 'Estelar', 'Vermelho'] },
      { name: 'iPhone SE (2ª geração)', capacities: ['64GB', '128GB', '256GB'], colors: ['Preto', 'Branco', 'Vermelho'] },
    ],
  },

  // ─── Apple iPad ────────────────────────────────────────────────────────────
  {
    brand: 'Apple', category: 'iPad',
    models: [
      { name: 'iPad Pro 13" M4', capacities: ['256GB', '512GB', '1TB', '2TB'] },
      { name: 'iPad Pro 11" M4', capacities: ['256GB', '512GB', '1TB', '2TB'] },
      { name: 'iPad Pro 13" M2', capacities: ['128GB', '256GB', '512GB', '1TB', '2TB'] },
      { name: 'iPad Pro 11" M2', capacities: ['128GB', '256GB', '512GB', '1TB', '2TB'] },
      { name: 'iPad Air 13" M2', capacities: ['128GB', '256GB', '512GB', '1TB'] },
      { name: 'iPad Air 11" M2', capacities: ['128GB', '256GB', '512GB', '1TB'] },
      { name: 'iPad Air M1', capacities: ['64GB', '256GB'] },
      { name: 'iPad (10ª geração)', capacities: ['64GB', '256GB'] },
      { name: 'iPad (9ª geração)', capacities: ['64GB', '256GB'] },
      { name: 'iPad mini 7', capacities: ['128GB', '256GB', '512GB'] },
      { name: 'iPad mini 6', capacities: ['64GB', '256GB'] },
    ],
  },

  // ─── Apple MacBook ─────────────────────────────────────────────────────────
  {
    brand: 'Apple', category: 'MacBook',
    models: [
      { name: 'MacBook Pro 16" M4 Max', capacities: ['512GB', '1TB', '2TB', '4TB'] },
      { name: 'MacBook Pro 16" M4 Pro', capacities: ['512GB', '1TB', '2TB'] },
      { name: 'MacBook Pro 14" M4 Max', capacities: ['512GB', '1TB', '2TB', '4TB'] },
      { name: 'MacBook Pro 14" M4 Pro', capacities: ['512GB', '1TB', '2TB'] },
      { name: 'MacBook Pro 14" M4', capacities: ['256GB', '512GB', '1TB'] },
      { name: 'MacBook Pro 16" M3 Max', capacities: ['512GB', '1TB', '2TB', '4TB'] },
      { name: 'MacBook Pro 16" M3 Pro', capacities: ['512GB', '1TB', '2TB'] },
      { name: 'MacBook Pro 14" M3 Max', capacities: ['512GB', '1TB', '2TB', '4TB'] },
      { name: 'MacBook Pro 14" M3 Pro', capacities: ['512GB', '1TB', '2TB'] },
      { name: 'MacBook Pro 14" M3', capacities: ['512GB', '1TB'] },
      { name: 'MacBook Air 15" M3', capacities: ['256GB', '512GB', '1TB', '2TB'] },
      { name: 'MacBook Air 13" M3', capacities: ['256GB', '512GB', '1TB', '2TB'] },
      { name: 'MacBook Air 15" M2', capacities: ['256GB', '512GB', '1TB', '2TB'] },
      { name: 'MacBook Air 13" M2', capacities: ['256GB', '512GB', '1TB', '2TB'] },
      { name: 'MacBook Air M1', capacities: ['256GB', '512GB', '1TB', '2TB'] },
    ],
  },

  // ─── Apple Watch ───────────────────────────────────────────────────────────
  {
    brand: 'Apple', category: 'Watch',
    models: [
      { name: 'Apple Watch Series 10 (46mm)', capacities: ['32GB'] },
      { name: 'Apple Watch Series 10 (42mm)', capacities: ['32GB'] },
      { name: 'Apple Watch Ultra 2', capacities: ['64GB'] },
      { name: 'Apple Watch Series 9 (45mm)', capacities: ['64GB'] },
      { name: 'Apple Watch Series 9 (41mm)', capacities: ['64GB'] },
      { name: 'Apple Watch Ultra', capacities: ['32GB'] },
      { name: 'Apple Watch Series 8 (45mm)', capacities: ['32GB'] },
      { name: 'Apple Watch Series 8 (41mm)', capacities: ['32GB'] },
      { name: 'Apple Watch SE 2 (44mm)', capacities: ['32GB'] },
      { name: 'Apple Watch SE 2 (40mm)', capacities: ['32GB'] },
      { name: 'Apple Watch Series 7 (45mm)', capacities: ['32GB'] },
      { name: 'Apple Watch Series 7 (41mm)', capacities: ['32GB'] },
    ],
  },

  // ─── Apple AirPods ─────────────────────────────────────────────────────────
  {
    brand: 'Apple', category: 'AirPods',
    models: [
      { name: 'AirPods Pro 2', capacities: ['—'] },
      { name: 'AirPods 4 (ANC)', capacities: ['—'] },
      { name: 'AirPods 4', capacities: ['—'] },
      { name: 'AirPods 3', capacities: ['—'] },
      { name: 'AirPods Max (USB-C)', capacities: ['—'] },
      { name: 'AirPods Max', capacities: ['—'] },
    ],
  },

  // ─── Samsung Galaxy S ──────────────────────────────────────────────────────
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
      { name: 'Xiaomi 14 Ultra', capacities: ['256GB', '512GB'] },
      { name: 'Xiaomi 14 Pro', capacities: ['256GB', '512GB'] },
      { name: 'Xiaomi 14', capacities: ['256GB', '512GB'] },
      { name: 'Xiaomi 13 Ultra', capacities: ['256GB', '512GB', '1TB'] },
      { name: 'Xiaomi 13 Pro', capacities: ['256GB'] },
      { name: 'Xiaomi 13', capacities: ['128GB', '256GB'] },
      { name: 'Redmi Note 13 Pro+', capacities: ['256GB', '512GB'] },
      { name: 'Redmi Note 13 Pro', capacities: ['128GB', '256GB'] },
      { name: 'Redmi Note 13', capacities: ['128GB', '256GB'] },
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
      { name: 'Nintendo Switch OLED', capacities: ['64GB'] },
      { name: 'Nintendo Switch Lite', capacities: ['32GB'] },
      { name: 'PlayStation 5 (Disc)', capacities: ['825GB SSD'] },
      { name: 'PlayStation 5 Slim (Disc)', capacities: ['1TB SSD'] },
      { name: 'PlayStation 5 Digital', capacities: ['825GB SSD'] },
      { name: 'Xbox Series X', capacities: ['1TB SSD'] },
      { name: 'Xbox Series S', capacities: ['512GB SSD'] },
      { name: 'Steam Deck OLED', capacities: ['512GB', '1TB'] },
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
