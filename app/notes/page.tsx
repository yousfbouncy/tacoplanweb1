import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Notes() {
  const supabase = await createClient();
  const { data: notes } = await supabase.from('notes').select();

  return <pre>{JSON.stringify(notes, null, 2)}</pre>;
}
