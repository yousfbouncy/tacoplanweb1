import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { defaultExpenseCategories } from '@/features/business/copy';
import type {
  BusinessClient,
  BusinessExpenseCategory,
  BusinessFinancialAccount,
  BusinessProfile,
} from '@/types/business';
import type {
  BusinessClientInput,
  BusinessExpenseCategoryInput,
  BusinessFinancialAccountInput,
  BusinessProfileInput,
} from '@/validations/business';

function isNotFound(error: PostgrestError | null) {
  return error?.code === 'PGRST116';
}

export function getSupabaseErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

export async function getBusinessProfile(userId: string) {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single();

  if (error && !isNotFound(error)) {
    throw error;
  }

  return (data as BusinessProfile | null) ?? null;
}

export async function saveBusinessProfile(userId: string, input: BusinessProfileInput) {
  const payload = {
    user_id: userId,
    created_by: userId,
    business_name: input.business_name,
    legal_name: input.legal_name,
    activity_type: input.activity_type,
    category: input.category,
    fiscal_identifier: input.fiscal_identifier,
    autoentrepreneur_identifier: input.autoentrepreneur_identifier,
    phone: input.phone,
    email: input.email,
    address: input.address,
    city: input.city,
    country: input.country,
    currency: input.currency,
    invoice_language: input.invoice_language,
    logo_url: input.logo_url,
    invoice_prefix: input.invoice_prefix,
    next_invoice_number: input.next_invoice_number,
    declaration_frequency: input.declaration_frequency,
    estimated_tax_percentage: input.calculate_tax ? input.estimated_tax_percentage : null,
    calculate_tax: input.calculate_tax,
    timezone: input.timezone,
    date_format: input.date_format,
    locale: input.locale,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('business_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await ensureDefaultExpenseCategories(userId, data.id as string);
  await createAuditLog(userId, 'business_profile', data.id as string, 'upsert', {
    business_name: input.business_name,
  });

  return data as BusinessProfile;
}

export async function listBusinessClients(userId: string) {
  const { data, error } = await supabase
    .from('business_clients')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as BusinessClient[];
}

export async function saveBusinessClient(userId: string, businessProfileId: string | null, clientId: string | null, input: BusinessClientInput) {
  const payload = {
    id: clientId ?? undefined,
    user_id: userId,
    created_by: userId,
    business_profile_id: businessProfileId,
    name: input.name,
    client_type: input.client_type,
    fiscal_identifier: input.fiscal_identifier,
    phone: input.phone,
    email: input.email,
    address: input.address,
    city: input.city,
    country: input.country,
    notes: input.notes,
    status: input.status,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('business_clients').upsert(payload).select('*').single();

  if (error) {
    throw error;
  }

  await createAuditLog(userId, 'business_client', data.id as string, clientId ? 'update' : 'create', {
    name: input.name,
  });

  return data as BusinessClient;
}

export async function archiveBusinessClient(userId: string, clientId: string) {
  const { data, error } = await supabase
    .from('business_clients')
    .update({
      status: 'Archivado',
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await createAuditLog(userId, 'business_client', clientId, 'archive', null);
  return data as BusinessClient;
}

export async function listExpenseCategories(userId: string) {
  const { data, error } = await supabase
    .from('business_expense_categories')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as BusinessExpenseCategory[];
}

export async function ensureDefaultExpenseCategories(userId: string, businessProfileId: string) {
  const { count, error } = await supabase
    .from('business_expense_categories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) {
    throw error;
  }

  if ((count ?? 0) > 0) {
    return;
  }

  const rows = defaultExpenseCategories.map((name, index) => ({
    user_id: userId,
    created_by: userId,
    business_profile_id: businessProfileId,
    name,
    description: null,
    color: defaultCategoryColors[index % defaultCategoryColors.length],
    is_system: true,
    status: 'Activa',
  }));

  const { error: insertError } = await supabase.from('business_expense_categories').insert(rows);

  if (insertError) {
    throw insertError;
  }
}

export async function saveExpenseCategory(
  userId: string,
  businessProfileId: string | null,
  categoryId: string | null,
  input: BusinessExpenseCategoryInput
) {
  const payload = {
    id: categoryId ?? undefined,
    user_id: userId,
    created_by: userId,
    business_profile_id: businessProfileId,
    name: input.name,
    description: input.description,
    color: input.color,
    status: input.status,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('business_expense_categories')
    .upsert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await createAuditLog(userId, 'business_expense_category', data.id as string, categoryId ? 'update' : 'create', {
    name: input.name,
  });

  return data as BusinessExpenseCategory;
}

export async function archiveExpenseCategory(userId: string, categoryId: string) {
  const { data, error } = await supabase
    .from('business_expense_categories')
    .update({
      status: 'Archivada',
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', categoryId)
    .eq('user_id', userId)
    .eq('is_system', false)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await createAuditLog(userId, 'business_expense_category', categoryId, 'archive', null);
  return data as BusinessExpenseCategory;
}

export async function listFinancialAccounts(userId: string) {
  const { data, error } = await supabase
    .from('business_financial_accounts')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as BusinessFinancialAccount[];
}

export async function saveFinancialAccount(
  userId: string,
  businessProfileId: string | null,
  accountId: string | null,
  input: BusinessFinancialAccountInput
) {
  const payload = {
    id: accountId ?? undefined,
    user_id: userId,
    created_by: userId,
    business_profile_id: businessProfileId,
    name: input.name,
    account_type: input.account_type,
    opening_balance: input.opening_balance,
    currency: input.currency,
    opening_balance_date: input.opening_balance_date,
    status: input.status,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('business_financial_accounts')
    .upsert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await createAuditLog(userId, 'business_financial_account', data.id as string, accountId ? 'update' : 'create', {
    name: input.name,
  });

  return data as BusinessFinancialAccount;
}

export async function archiveFinancialAccount(userId: string, accountId: string) {
  const { data, error } = await supabase
    .from('business_financial_accounts')
    .update({
      status: 'Archivada',
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await createAuditLog(userId, 'business_financial_account', accountId, 'archive', null);
  return data as BusinessFinancialAccount;
}

export async function createAuditLog(
  userId: string,
  entityType: string,
  entityId: string | null,
  action: string,
  details: Record<string, unknown> | null
) {
  const { error } = await supabase.from('business_audit_logs').insert({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    details,
  });

  if (error) {
    console.error('Error registrando auditoría business:', error);
  }
}

const defaultCategoryColors = ['#2563eb', '#0f766e', '#9333ea', '#ea580c', '#dc2626', '#0891b2'];
