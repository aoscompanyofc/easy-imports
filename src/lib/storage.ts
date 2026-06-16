export const getStorage = <T>(key: string, fallback: T): T => {
  const item = localStorage.getItem(key);
  if (!item) return fallback;
  try {
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error parsing localStorage key "${key}":`, error);
    return fallback;
  }
};

export const setStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
};

export const removeStorage = (key: string): void => {
  localStorage.removeItem(key);
};

export const clearAllStorage = (): void => {
  localStorage.clear();
};

/**
 * Gera um UUID de forma segura. `crypto.randomUUID()` só existe em contextos
 * seguros (HTTPS/localhost) e navegadores recentes — em http via IP local ou
 * navegadores antigos ele é undefined e quebraria o fluxo (ex: toda venda).
 * Faz fallback para crypto.getRandomValues e, por fim, Math.random.
 */
export const safeUUID = (): string => {
  try {
    const c: any = typeof crypto !== 'undefined' ? crypto : undefined;
    if (c?.randomUUID) return c.randomUUID();
    if (c?.getRandomValues) {
      const b = c.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      const h = Array.from(b, (x: number) => x.toString(16).padStart(2, '0'));
      return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
    }
  } catch { /* cai no fallback abaixo */ }
  // Fallback final — não-criptográfico, mas suficiente para IDs locais/tokens
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
