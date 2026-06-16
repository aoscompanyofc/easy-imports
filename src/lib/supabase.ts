import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const _configured =
  !!supabaseUrl &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  isValidUrl(supabaseUrl) &&
  !!supabaseAnonKey &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

/** Single source of truth — import this instead of re-declaring in every file. */
export const isSupabaseConfigured = () => _configured;

export const supabase = createClient(
  _configured ? supabaseUrl : 'https://placeholder.supabase.co',
  _configured ? supabaseAnonKey : 'placeholder',
  { auth: { storageKey: 'easy-imports-auth-v1' } }
);
