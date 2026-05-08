import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, getAdminPassword, verifyAdminToken } from '@/lib/admin-auth';

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dutgxjwfjtqxmqonnjlp.supabase.co';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    '';

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function isAdmin(req: NextRequest): boolean {
  const password = getAdminPassword();
  if (!password) return false;
  const cookieSecret = process.env.TACOPLAN_ADMIN_COOKIE_SECRET?.trim() || password;
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminToken(cookieSecret, token, 1000 * 60 * 60 * 24 * 30);
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const keysParam = url.searchParams.get('keys');
  const keys = keysParam
    ? keysParam
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  try {
    const supabase = getSupabaseAdmin();
    const query = supabase
      .from('site_content')
      .select('key,draft_value,published_value,updated_at')
      .order('key', { ascending: true });

    const { data, error } = keys.length ? await query.in('key', keys) : await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const action = (body as { action?: unknown })?.action;
  const entries = (body as { entries?: unknown })?.entries;
  if (action !== 'save_draft' && action !== 'publish') {
    return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
  }
  if (!entries || typeof entries !== 'object') {
    return NextResponse.json({ ok: false, error: 'Entries required' }, { status: 400 });
  }

  const updates: Array<{ key: string; draft_value?: string; published_value?: string; updated_at: string }> = [];
  const now = new Date().toISOString();

  for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
    if (!key || typeof key !== 'string') continue;
    if (typeof value !== 'string') continue;
    if (action === 'save_draft') {
      updates.push({ key, draft_value: value, updated_at: now });
    } else {
      updates.push({ key, draft_value: value, published_value: value, updated_at: now });
    }
  }

  if (!updates.length) {
    return NextResponse.json({ ok: false, error: 'No valid entries' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('site_content').upsert(updates, { onConflict: 'key' });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
