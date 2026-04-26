import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dutgxjwfjtqxmqonnjlp.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dGd4andmanRxeG1xb25uamxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTczNDIsImV4cCI6MjA4Njc5MzM0Mn0.-ZMc99z9_OBsvDgszIZ8c_y4RfS8B79D7c7hpGio7HA';

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = SUPABASE_URL;
  const key = SUPABASE_ANON_KEY;

  console.log('Supabase Client initialization:', {
    url: url ? `Using ${url.substring(0, 30)}...` : 'MISSING',
    key: key ? 'Present' : 'MISSING',
    source: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'env' : 'hardcoded-fallback',
  });

  if (!url || !key) {
    console.error('Supabase env vars are missing!', { url, key });
    if (typeof window !== 'undefined') {
      console.warn('ALERTA: No se detectaron variables de entorno ni fallback. El registro fallará.');
    }
  }

  cachedClient = createClient(url, key);
  return cachedClient;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as never)[prop as never];
  },
});
