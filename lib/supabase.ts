import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

const SUPABASE_URL = 'https://dutgxjwfjtqxmqonnjlp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dGd4andmanRxeG1xb25uamxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTczNDIsImV4cCI6MjA4Njc5MzM0Mn0.-ZMc99z9_OBsvDgszIZ8c_y4RfS8B79D7c7hpGio7HA';

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  // Forzamos el uso del proyecto dutgx... para evitar conflictos con .env locales de otros proyectos
  const url = SUPABASE_URL;
  const key = SUPABASE_ANON_KEY;

  console.log('Supabase Client forced initialization (Tacoplan v3):', {
    url: url,
    key: key ? 'Present (Tacoplan v3)' : 'MISSING',
  });

  cachedClient = createClient(url, key);
  return cachedClient;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as never)[prop as never];
  },
});
