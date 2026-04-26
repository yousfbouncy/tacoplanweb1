import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dutgxjwfjtqxmqonnjlp.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dGd4andmanRxeG1xb25uamxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTczNDIsImV4cCI6MjA4Njc5MzM0Mn0.-ZMc99z9_OBsvDgszIZ8c_y4RfS8B79D7c7hpGio7HA';

  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}
