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

const isConfigured = supabaseUrl && supabaseUrl !== 'YOUR_SUPABASE_URL' && isValidUrl(supabaseUrl);

export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' ? supabaseAnonKey : 'placeholder'
);
