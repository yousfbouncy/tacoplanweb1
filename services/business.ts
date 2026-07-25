import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { defaultExpenseCategories } from '@/features/business/copy';
import type {
  BusinessClient,
  BusinessExpenseCategory,
  BusinessFinancialAccount,
  BusinessInvoiceDetail,
  BusinessInvoiceListItem,
  BusinessProductService,
  BusinessProfile,
  BusinessTaxRate,
} from '@/types/business';
import type {
  BusinessClientInput,
  BusinessExpenseCategoryInput,
  BusinessFinancialAccountInput,
  BusinessInvoiceInput,
  BusinessInvoicePaymentInput,
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

export async function listBusinessTaxRates(userId: string) {
  const { data, error } = await supabase
    .from('business_tax_rates')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as BusinessTaxRate[];
}

export async function listBusinessProductsServices(userId: string) {
  const { data, error } = await supabase
    .from('business_products_services')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as BusinessProductService[];
}

export async function listBusinessInvoices(
  userId: string,
  filters?: {
    status?: string;
    search?: string;
    issueDateFrom?: string | null;
    issueDateTo?: string | null;
  }
) {
  let query = supabase
    .from('business_invoices')
    .select(
      `
      *,
      client:business_clients (
        id,
        name,
        email,
        fiscal_identifier
      )
    `
    )
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.issueDateFrom) {
    query = query.gte('issue_date', filters.issueDateFrom);
  }

  if (filters?.issueDateTo) {
    query = query.lte('issue_date', filters.issueDateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const invoices = ((data ?? []) as BusinessInvoiceListItem[]).filter((invoice) => {
    if (!filters?.search) return true;

    const term = filters.search.toLowerCase();
    return (
      (invoice.invoice_number ?? '').toLowerCase().includes(term) ||
      (invoice.reference ?? '').toLowerCase().includes(term) ||
      (invoice.client?.name ?? '').toLowerCase().includes(term) ||
      (invoice.client?.email ?? '').toLowerCase().includes(term) ||
      (invoice.client?.fiscal_identifier ?? '').toLowerCase().includes(term)
    );
  });

  return invoices;
}

export async function getBusinessInvoice(userId: string, invoiceId: string) {
  const { data, error } = await supabase
    .from('business_invoices')
    .select(
      `
      *,
      client:business_clients (*),
      account:business_financial_accounts (*),
      items:business_invoice_items (*),
      payments:business_invoice_payments (*)
    `
    )
    .eq('user_id', userId)
    .eq('id', invoiceId)
    .is('deleted_at', null)
    .single();

  if (error && !isNotFound(error)) {
    throw error;
  }

  return (data as BusinessInvoiceDetail | null) ?? null;
}

export async function createBusinessInvoice(userId: string, input: BusinessInvoiceInput) {
  const { data, error } = await supabase.rpc('business_create_invoice', {
    p_business_profile_id: input.business_profile_id,
    p_client_id: input.client_id,
    p_issue_date: input.issue_date,
    p_due_date: input.due_date,
    p_currency: input.currency,
    p_invoice_language: input.invoice_language,
    p_series: input.sequence_series,
    p_payment_method: input.payment_method,
    p_financial_account_id: input.financial_account_id,
    p_reference: input.reference,
    p_notes: input.notes,
    p_payment_terms: input.payment_terms,
    p_internal_notes: input.internal_notes,
    p_footer_text: input.footer_text,
    p_save_mode: input.save_mode,
    p_items: input.items,
  });

  if (error) {
    throw error;
  }

  const invoiceId = String(data);

  await createAuditLog(userId, 'business_invoice', invoiceId, input.save_mode === 'draft' ? 'create_draft_ui' : 'create_issue_ui', {
    client_id: input.client_id,
  });

  return invoiceId;
}

export async function registerBusinessInvoicePayment(userId: string, input: BusinessInvoicePaymentInput) {
  const { data, error } = await supabase.rpc('business_register_invoice_payment', {
    p_invoice_id: input.invoice_id,
    p_payment_date: input.payment_date,
    p_amount: input.amount,
    p_financial_account_id: input.financial_account_id,
    p_payment_method: input.payment_method,
    p_reference: input.reference,
    p_notes: input.notes,
  });

  if (error) {
    throw error;
  }

  const paymentId = String(data);

  await createAuditLog(userId, 'business_invoice_payment', paymentId, 'create_ui', {
    invoice_id: input.invoice_id,
    amount: input.amount,
  });

  return paymentId;
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
