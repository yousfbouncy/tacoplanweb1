import { createClient } from '@/utils/supabase/server';

export type SiteContentMap = Record<string, string>;

export async function getPublishedSiteContent(keys: string[]): Promise<SiteContentMap> {
  if (!keys.length) return {};
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('site_content')
    .select('key,published_value')
    .in('key', keys);

  if (error) return {};

  const result: SiteContentMap = {};
  for (const row of data ?? []) {
    if (!row?.key) continue;
    const value = (row as { published_value: string | null }).published_value;
    if (typeof value === 'string') result[row.key] = value;
  }
  return result;
}
