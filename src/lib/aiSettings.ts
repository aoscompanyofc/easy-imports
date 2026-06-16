// Configuração de IA conectável pelo usuário (Configurações → IA).
// A chave fica salva no navegador (localStorage) e é enviada ao endpoint
// /api/insight a cada chamada. Provedores suportados: Claude (Anthropic),
// OpenAI (ChatGPT) e Custom (qualquer endpoint compatível com OpenAI).

export type AIProvider = 'claude' | 'openai' | 'custom';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl: string; // usado apenas em 'custom'
}

const KEY = 'easy-imports-ai-settings';

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  custom: '',
};

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: 'Claude (Anthropic)',
  openai: 'ChatGPT (OpenAI)',
  custom: 'Outra IA (endpoint compatível com OpenAI)',
};

export function getAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        provider: p.provider || 'claude',
        apiKey: p.apiKey || '',
        model: p.model || DEFAULT_MODELS[(p.provider as AIProvider) || 'claude'],
        baseUrl: p.baseUrl || '',
      };
    }
  } catch { /* ignore */ }
  return { provider: 'claude', apiKey: '', model: DEFAULT_MODELS.claude, baseUrl: '' };
}

export function saveAISettings(s: AISettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

export function isAIConfigured(): boolean {
  const s = getAISettings();
  return !!s.apiKey && (s.provider !== 'custom' || !!s.baseUrl);
}

// Payload enviado ao /api/insight para que o servidor saiba qual IA chamar.
export function aiRequestExtras() {
  const s = getAISettings();
  if (!s.apiKey) return {};
  return {
    provider: s.provider,
    apiKey: s.apiKey,
    model: s.model || DEFAULT_MODELS[s.provider],
    baseUrl: s.baseUrl,
  };
}
