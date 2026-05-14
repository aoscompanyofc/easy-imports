// Google Calendar integration via Google Identity Services (GIS)
// Uses token model — no client_secret needed in the browser.

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID_KEY = 'google_calendar_client_id';
const TOKEN_KEY = 'google_calendar_token';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

// ─── Client ID (stored by the user in Settings) ──────────────────────────────

export function getClientId(): string {
  return localStorage.getItem(CLIENT_ID_KEY) || '';
}

export function setClientId(id: string): void {
  if (id) localStorage.setItem(CLIENT_ID_KEY, id.trim());
  else localStorage.removeItem(CLIENT_ID_KEY);
}

// ─── Token management ─────────────────────────────────────────────────────────

interface TokenData {
  access_token: string;
  expires_at: number;
}

export function getStoredToken(): TokenData | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t: TokenData = JSON.parse(raw);
    if (Date.now() > t.expires_at) { sessionStorage.removeItem(TOKEN_KEY); return null; }
    return t;
  } catch { return null; }
}

function storeToken(access_token: string, expires_in: number): void {
  const data: TokenData = { access_token, expires_at: Date.now() + expires_in * 1000 - 60_000 };
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(data));
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isConnected(): boolean {
  return !!getStoredToken();
}

// ─── Load GIS library lazily ──────────────────────────────────────────────────

let gisReady = false;
function loadGIS(): Promise<void> {
  if (gisReady || window.google?.accounts?.oauth2) { gisReady = true; return Promise.resolve(); }
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('gis-script');
    if (existing) {
      existing.addEventListener('load', () => { gisReady = true; resolve(); });
      return;
    }
    const s = document.createElement('script');
    s.id = 'gis-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => { gisReady = true; resolve(); };
    s.onerror = () => reject(new Error('Falha ao carregar Google Identity Services.'));
    document.head.appendChild(s);
  });
}

// ─── Connect (OAuth popup handled entirely by Google) ─────────────────────────

export function connect(clientId: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      await loadGIS();
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp: any) => {
          if (resp.error) { reject(new Error(resp.error_description || resp.error)); return; }
          storeToken(resp.access_token, Number(resp.expires_in) || 3600);
          resolve();
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'Erro na autenticação do Google.'));
        },
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      reject(e);
    }
  });
}

// ─── Revoke / disconnect ──────────────────────────────────────────────────────

export async function disconnect(): Promise<void> {
  const t = getStoredToken();
  if (t) {
    try { await loadGIS(); window.google?.accounts?.oauth2?.revoke(t.access_token, () => {}); } catch { /* ignore */ }
  }
  clearToken();
}

// ─── Create calendar event ────────────────────────────────────────────────────

export async function createCalendarEvent(params: {
  title: string;
  description: string;
  startISO: string;   // e.g. "2026-05-14T14:30:00"
  durationMinutes?: number;
  timeZone?: string;
}): Promise<{ htmlLink: string }> {
  const token = getStoredToken();
  if (!token) throw new Error('not_connected');

  const tz = params.timeZone || 'America/Sao_Paulo';
  const start = new Date(params.startISO);
  const end = new Date(start.getTime() + (params.durationMinutes ?? 30) * 60_000);

  const body = {
    summary: params.title,
    description: params.description,
    start: { dateTime: start.toISOString(), timeZone: tz },
    end: { dateTime: end.toISOString(), timeZone: tz },
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) { clearToken(); throw new Error('not_connected'); }
    throw new Error(err?.error?.message || `Erro ${res.status} ao criar evento.`);
  }

  return res.json();
}
