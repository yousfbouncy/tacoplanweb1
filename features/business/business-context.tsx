'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  archiveBusinessClient,
  archiveExpenseCategory,
  archiveFinancialAccount,
  getBusinessProfile,
  getSupabaseErrorMessage,
  listBusinessClients,
  listExpenseCategories,
  listFinancialAccounts,
  saveBusinessClient,
  saveBusinessProfile,
  saveExpenseCategory,
  saveFinancialAccount,
} from '@/services/business';
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
import {
  businessClientSchema,
  businessExpenseCategorySchema,
  businessFinancialAccountSchema,
  businessProfileSchema,
} from '@/validations/business';

export type BusinessStatusMessage = {
  type: 'success' | 'error';
  text: string;
} | null;

type BusinessDataContextValue = {
  userId: string | null;
  authLoading: boolean;
  dataLoading: boolean;
  saving: boolean;
  businessProfile: BusinessProfile | null;
  clients: BusinessClient[];
  expenseCategories: BusinessExpenseCategory[];
  financialAccounts: BusinessFinancialAccount[];
  statusMessage: BusinessStatusMessage;
  setStatusMessage: React.Dispatch<React.SetStateAction<BusinessStatusMessage>>;
  refreshData: () => Promise<void>;
  saveProfile: (input: BusinessProfileInput) => Promise<boolean>;
  saveClient: (input: BusinessClientInput, clientId?: string | null) => Promise<boolean>;
  archiveClient: (clientId: string) => Promise<boolean>;
  saveCategory: (input: BusinessExpenseCategoryInput, categoryId?: string | null) => Promise<boolean>;
  archiveCategory: (categoryId: string) => Promise<boolean>;
  saveAccount: (input: BusinessFinancialAccountInput, accountId?: string | null) => Promise<boolean>;
  archiveAccount: (accountId: string) => Promise<boolean>;
  stats: {
    activeClientsCount: number;
    activeCategoriesCount: number;
    activeAccountsCount: number;
    totalOpeningBalance: number;
    notificationsCount: number;
  };
  pendingTasks: string[];
};

const BusinessDataContext = createContext<BusinessDataContextValue | null>(null);

export const initialProfileForm: BusinessProfileInput = {
  business_name: '',
  legal_name: '',
  activity_type: '',
  category: 'Servicios',
  fiscal_identifier: null,
  autoentrepreneur_identifier: null,
  phone: null,
  email: null,
  address: null,
  city: null,
  country: 'Marruecos',
  currency: 'MAD',
  invoice_language: 'Francés',
  logo_url: null,
  invoice_prefix: 'FAC',
  next_invoice_number: 1,
  declaration_frequency: 'Sin configurar',
  estimated_tax_percentage: null,
  calculate_tax: true,
  timezone: 'Africa/Casablanca',
  date_format: 'dd/MM/yyyy',
  locale: 'fr-MA',
};

export const initialClientForm: BusinessClientInput = {
  name: '',
  client_type: 'Particular',
  fiscal_identifier: null,
  phone: null,
  email: null,
  address: null,
  city: null,
  country: 'Marruecos',
  notes: null,
  status: 'Activo',
};

export const initialCategoryForm: BusinessExpenseCategoryInput = {
  name: '',
  description: null,
  color: '#2563eb',
  status: 'Activa',
};

export const initialAccountForm: BusinessFinancialAccountInput = {
  name: '',
  account_type: 'Caja en efectivo',
  opening_balance: 0,
  currency: 'MAD',
  opening_balance_date: new Date().toISOString().slice(0, 10),
  status: 'Activa',
};

export function BusinessDataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<BusinessStatusMessage>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [clients, setClients] = useState<BusinessClient[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<BusinessExpenseCategory[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<BusinessFinancialAccount[]>([]);

  useEffect(() => {
    if (!user) {
      if (!loading) {
        setDataLoading(false);
      }
      return;
    }

    void refreshData(user.id);
  }, [user, loading]);

  async function refreshData(nextUserId?: string) {
    const userId = nextUserId ?? user?.id;

    if (!userId) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    try {
      const [profileData, clientsData, categoriesData, accountsData] = await Promise.all([
        getBusinessProfile(userId),
        listBusinessClients(userId),
        listExpenseCategories(userId),
        listFinancialAccounts(userId),
      ]);

      setBusinessProfile(profileData);
      setClients(clientsData);
      setExpenseCategories(categoriesData);
      setFinancialAccounts(accountsData);
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo cargar la información de Mi negocio.'),
      });
    } finally {
      setDataLoading(false);
    }
  }

  async function saveProfileData(input: BusinessProfileInput) {
    if (!user) return false;

    try {
      setSaving(true);
      setStatusMessage(null);
      const parsed = businessProfileSchema.parse(input);
      const saved = await saveBusinessProfile(user.id, parsed);
      setBusinessProfile(saved);
      await refreshData(user.id);
      setStatusMessage({ type: 'success', text: 'Configuración del negocio guardada correctamente.' });
      return true;
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo guardar la configuración del negocio.'),
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveClientData(input: BusinessClientInput, clientId?: string | null) {
    if (!user) return false;

    try {
      setSaving(true);
      setStatusMessage(null);
      const parsed = businessClientSchema.parse(input);
      const saved = await saveBusinessClient(user.id, businessProfile?.id ?? null, clientId ?? null, parsed);
      setClients((current) => mergeRecord(current, saved));
      setStatusMessage({ type: 'success', text: clientId ? 'Cliente actualizado correctamente.' : 'Cliente guardado correctamente.' });
      return true;
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo guardar el cliente.'),
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function archiveClientData(clientId: string) {
    if (!user) return false;

    try {
      setSaving(true);
      const archived = await archiveBusinessClient(user.id, clientId);
      setClients((current) => current.map((item) => (item.id === archived.id ? archived : item)));
      setStatusMessage({ type: 'success', text: 'Cliente archivado correctamente.' });
      return true;
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo archivar el cliente.'),
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveCategoryData(input: BusinessExpenseCategoryInput, categoryId?: string | null) {
    if (!user) return false;

    try {
      setSaving(true);
      setStatusMessage(null);
      const parsed = businessExpenseCategorySchema.parse(input);
      const saved = await saveExpenseCategory(user.id, businessProfile?.id ?? null, categoryId ?? null, parsed);
      setExpenseCategories((current) => mergeRecord(current, saved));
      setStatusMessage({ type: 'success', text: categoryId ? 'Categoría actualizada correctamente.' : 'Categoría guardada correctamente.' });
      return true;
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo guardar la categoría.'),
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function archiveCategoryData(categoryId: string) {
    if (!user) return false;

    try {
      setSaving(true);
      const archived = await archiveExpenseCategory(user.id, categoryId);
      setExpenseCategories((current) => current.map((item) => (item.id === archived.id ? archived : item)));
      setStatusMessage({ type: 'success', text: 'Categoría archivada correctamente.' });
      return true;
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo archivar la categoría.'),
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveAccountData(input: BusinessFinancialAccountInput, accountId?: string | null) {
    if (!user) return false;

    try {
      setSaving(true);
      setStatusMessage(null);
      const parsed = businessFinancialAccountSchema.parse(input);
      const saved = await saveFinancialAccount(user.id, businessProfile?.id ?? null, accountId ?? null, parsed);
      setFinancialAccounts((current) => mergeRecord(current, saved));
      setStatusMessage({ type: 'success', text: accountId ? 'Cuenta actualizada correctamente.' : 'Cuenta guardada correctamente.' });
      return true;
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo guardar la cuenta financiera.'),
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function archiveAccountData(accountId: string) {
    if (!user) return false;

    try {
      setSaving(true);
      const archived = await archiveFinancialAccount(user.id, accountId);
      setFinancialAccounts((current) => current.map((item) => (item.id === archived.id ? archived : item)));
      setStatusMessage({ type: 'success', text: 'Cuenta archivada correctamente.' });
      return true;
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo archivar la cuenta.'),
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  const activeClientsCount = clients.filter((client) => client.status === 'Activo').length;
  const activeCategoriesCount = expenseCategories.filter((category) => category.status === 'Activa').length;
  const activeAccountsCount = financialAccounts.filter((account) => account.status === 'Activa').length;
  const totalOpeningBalance = financialAccounts
    .filter((account) => account.status === 'Activa')
    .reduce((sum, account) => sum + Number(account.opening_balance ?? 0), 0);

  const pendingTasks = useMemo(() => {
    const tasks: string[] = [];

    if (!businessProfile?.onboarding_completed) {
      tasks.push('Completa la configuración inicial del negocio para desbloquear la facturación y los resúmenes.');
    }

    if (activeClientsCount === 0) {
      tasks.push('Crea tu primer cliente para empezar a organizar futuras facturas.');
    }

    if (activeAccountsCount === 0) {
      tasks.push('Añade una cuenta de caja o banco para empezar con el control financiero.');
    }

    if (activeCategoriesCount < 3) {
      tasks.push('Revisa tus categorías de gasto para dejar la base preparada para la Fase 3.');
    }

    if (!businessProfile?.calculate_tax) {
      tasks.push('Activa o revisa el cálculo estimado de impuestos si quieres un panel fiscal básico.');
    }

    return tasks;
  }, [activeAccountsCount, activeCategoriesCount, activeClientsCount, businessProfile]);

  const value = useMemo<BusinessDataContextValue>(
    () => ({
      userId: user?.id ?? null,
      authLoading: loading,
      dataLoading,
      saving,
      businessProfile,
      clients,
      expenseCategories,
      financialAccounts,
      statusMessage,
      setStatusMessage,
      refreshData: async () => refreshData(),
      saveProfile: saveProfileData,
      saveClient: saveClientData,
      archiveClient: archiveClientData,
      saveCategory: saveCategoryData,
      archiveCategory: archiveCategoryData,
      saveAccount: saveAccountData,
      archiveAccount: archiveAccountData,
      stats: {
        activeClientsCount,
        activeCategoriesCount,
        activeAccountsCount,
        totalOpeningBalance,
        notificationsCount: pendingTasks.length,
      },
      pendingTasks,
    }),
    [
      user?.id,
      loading,
      dataLoading,
      saving,
      businessProfile,
      clients,
      expenseCategories,
      financialAccounts,
      statusMessage,
      pendingTasks,
      activeClientsCount,
      activeCategoriesCount,
      activeAccountsCount,
      totalOpeningBalance,
    ]
  );

  return <BusinessDataContext.Provider value={value}>{children}</BusinessDataContext.Provider>;
}

export function useBusinessData() {
  const context = useContext(BusinessDataContext);

  if (!context) {
    throw new Error('useBusinessData debe usarse dentro de BusinessDataProvider');
  }

  return context;
}

export function mapProfileToForm(profile: BusinessProfile): BusinessProfileInput {
  return {
    business_name: profile.business_name,
    legal_name: profile.legal_name,
    activity_type: profile.activity_type,
    category: profile.category,
    fiscal_identifier: profile.fiscal_identifier,
    autoentrepreneur_identifier: profile.autoentrepreneur_identifier,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    city: profile.city,
    country: profile.country,
    currency: profile.currency,
    invoice_language: profile.invoice_language,
    logo_url: profile.logo_url,
    invoice_prefix: profile.invoice_prefix,
    next_invoice_number: profile.next_invoice_number,
    declaration_frequency: profile.declaration_frequency,
    estimated_tax_percentage: profile.estimated_tax_percentage,
    calculate_tax: profile.calculate_tax,
    timezone: profile.timezone,
    date_format: profile.date_format,
    locale: profile.locale,
  };
}

export function mapClientToForm(client: BusinessClient): BusinessClientInput {
  return {
    name: client.name,
    client_type: client.client_type,
    fiscal_identifier: client.fiscal_identifier,
    phone: client.phone,
    email: client.email,
    address: client.address,
    city: client.city,
    country: client.country,
    notes: client.notes,
    status: client.status,
  };
}

export function mapCategoryToForm(category: BusinessExpenseCategory): BusinessExpenseCategoryInput {
  return {
    name: category.name,
    description: category.description,
    color: category.color || '#2563eb',
    status: category.status,
  };
}

export function mapAccountToForm(account: BusinessFinancialAccount): BusinessFinancialAccountInput {
  return {
    name: account.name,
    account_type: account.account_type,
    opening_balance: Number(account.opening_balance),
    currency: account.currency,
    opening_balance_date: account.opening_balance_date,
    status: account.status,
  };
}

export function formatBusinessCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function downloadClientsCsv(clients: BusinessClient[]) {
  const header = ['Nombre', 'Tipo', 'Email', 'Teléfono', 'Ciudad', 'País', 'Estado'];
  const rows = clients.map((client) => [
    client.name,
    client.client_type,
    client.email ?? '',
    client.phone ?? '',
    client.city ?? '',
    client.country ?? '',
    client.status,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'clientes-mi-negocio.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function mergeRecord<T extends { id: string }>(collection: T[], record: T) {
  const exists = collection.some((item) => item.id === record.id);

  if (!exists) {
    return [record, ...collection];
  }

  return collection.map((item) => (item.id === record.id ? record : item));
}
