import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dutgxjwfjtqxmqonnjlp.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = SUPABASE_URL;
  const key = SUPABASE_ANON_KEY;

  console.log('Supabase Client initialization:', {
    url: url ? `Using ${url.substring(0, 30)}...` : 'MISSING',
    key: key ? 'Present' : 'MISSING',
    source: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'env' : 'fallback',
  });

  if (!url || !key) {
    console.error('Supabase env vars are missing!', { url, key });
    // En cliente (browser), si falta la key, el error Failed to fetch suele ser por esto
    if (typeof window !== 'undefined') {
      console.warn('ALERTA: Faltan variables de entorno NEXT_PUBLIC en el navegador. El registro fallará.');
    }
  }

  cachedClient = createClient(url, key || 'placeholder_key');
  return cachedClient;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as never)[prop as never];
  },
});
