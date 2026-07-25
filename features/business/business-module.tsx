'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CreditCard,
  FileText,
  Landmark,
  LayoutDashboard,
  Loader2,
  PiggyBank,
  Receipt,
  Save,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { accountStatuses, businessCategories, businessCopy, clientStatuses, clientTypes, declarationFrequencies, financialAccountTypes, invoiceLanguages } from '@/features/business/copy';
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
import {
  businessClientSchema,
  businessExpenseCategorySchema,
  businessFinancialAccountSchema,
  businessProfileSchema,
  type BusinessClientInput,
  type BusinessExpenseCategoryInput,
  type BusinessFinancialAccountInput,
  type BusinessProfileInput,
} from '@/validations/business';

type SectionKey =
  | 'summary'
  | 'settings'
  | 'clients'
  | 'invoices'
  | 'income'
  | 'expenses'
  | 'accounts'
  | 'reports';

const sidebarItems: Array<{
  key: SectionKey;
  label: string;
  icon: typeof LayoutDashboard;
  available: boolean;
}> = [
  { key: 'summary', label: businessCopy.sidebar.summary, icon: LayoutDashboard, available: true },
  { key: 'settings', label: businessCopy.sidebar.settings, icon: Settings, available: true },
  { key: 'clients', label: businessCopy.sidebar.clients, icon: Users, available: true },
  { key: 'invoices', label: businessCopy.sidebar.invoices, icon: FileText, available: false },
  { key: 'income', label: businessCopy.sidebar.income, icon: PiggyBank, available: false },
  { key: 'expenses', label: businessCopy.sidebar.expenses, icon: Receipt, available: true },
  { key: 'accounts', label: businessCopy.sidebar.accounts, icon: Landmark, available: true },
  { key: 'reports', label: businessCopy.sidebar.reports, icon: BriefcaseBusiness, available: false },
];

const initialProfileForm: BusinessProfileInput = {
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

const initialClientForm: BusinessClientInput = {
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

const initialCategoryForm: BusinessExpenseCategoryInput = {
  name: '',
  description: null,
  color: '#2563eb',
  status: 'Activa',
};

const initialAccountForm: BusinessFinancialAccountInput = {
  name: '',
  account_type: 'Caja en efectivo',
  opening_balance: 0,
  currency: 'MAD',
  opening_balance_date: new Date().toISOString().slice(0, 10),
  status: 'Activa',
};

export function BusinessModule() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionKey>('summary');
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [clients, setClients] = useState<BusinessClient[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<BusinessExpenseCategory[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<BusinessFinancialAccount[]>([]);
  const [profileForm, setProfileForm] = useState<BusinessProfileInput>(initialProfileForm);
  const [clientForm, setClientForm] = useState<BusinessClientInput>(initialClientForm);
  const [categoryForm, setCategoryForm] = useState<BusinessExpenseCategoryInput>(initialCategoryForm);
  const [accountForm, setAccountForm] = useState<BusinessFinancialAccountInput>(initialAccountForm);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<'Todos' | 'Activo' | 'Archivado'>('Todos');

  useEffect(() => {
    if (!user) {
      if (!loading) {
        setDataLoading(false);
      }
      return;
    }

    void refreshData(user.id);
  }, [user, loading]);

  useEffect(() => {
    if (!businessProfile?.onboarding_completed) {
      setActiveSection('settings');
    }
  }, [businessProfile?.onboarding_completed]);

  async function refreshData(userId: string) {
    setDataLoading(true);
    setStatusMessage(null);

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

      if (profileData) {
        setProfileForm(mapProfileToForm(profileData));
      } else {
        setProfileForm(initialProfileForm);
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo cargar la información de Mi negocio.'),
      });
    } finally {
      setDataLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!user) return;

    try {
      setSaving(true);
      setStatusMessage(null);
      const parsed = businessProfileSchema.parse(profileForm);
      const saved = await saveBusinessProfile(user.id, parsed);
      setBusinessProfile(saved);
      setProfileForm(mapProfileToForm(saved));
      await refreshData(user.id);
      setStatusMessage({ type: 'success', text: 'Configuración del negocio guardada correctamente.' });
      setActiveSection('summary');
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo guardar la configuración del negocio.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveClient() {
    if (!user) return;

    try {
      setSaving(true);
      setStatusMessage(null);
      const parsed = businessClientSchema.parse(clientForm);
      const saved = await saveBusinessClient(user.id, businessProfile?.id ?? null, editingClientId, parsed);
      setClients((current) => mergeRecord(current, saved));
      setClientForm(initialClientForm);
      setEditingClientId(null);
      setStatusMessage({ type: 'success', text: 'Cliente guardado correctamente.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo guardar el cliente.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCategory() {
    if (!user) return;

    try {
      setSaving(true);
      setStatusMessage(null);
      const parsed = businessExpenseCategorySchema.parse(categoryForm);
      const saved = await saveExpenseCategory(user.id, businessProfile?.id ?? null, editingCategoryId, parsed);
      setExpenseCategories((current) => mergeRecord(current, saved));
      setCategoryForm(initialCategoryForm);
      setEditingCategoryId(null);
      setStatusMessage({ type: 'success', text: 'Categoría guardada correctamente.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo guardar la categoría.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAccount() {
    if (!user) return;

    try {
      setSaving(true);
      setStatusMessage(null);
      const parsed = businessFinancialAccountSchema.parse(accountForm);
      const saved = await saveFinancialAccount(user.id, businessProfile?.id ?? null, editingAccountId, parsed);
      setFinancialAccounts((current) => mergeRecord(current, saved));
      setAccountForm(initialAccountForm);
      setEditingAccountId(null);
      setStatusMessage({ type: 'success', text: 'Cuenta guardada correctamente.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo guardar la cuenta financiera.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveClient(clientId: string) {
    if (!user) return;

    try {
      setSaving(true);
      const archived = await archiveBusinessClient(user.id, clientId);
      setClients((current) => mergeRecord(current, archived));
      setStatusMessage({ type: 'success', text: 'Cliente archivado correctamente.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo archivar el cliente.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveCategory(categoryId: string) {
    if (!user) return;

    try {
      setSaving(true);
      const archived = await archiveExpenseCategory(user.id, categoryId);
      setExpenseCategories((current) => mergeRecord(current, archived));
      setStatusMessage({ type: 'success', text: 'Categoría archivada correctamente.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo archivar la categoría.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveAccount(accountId: string) {
    if (!user) return;

    try {
      setSaving(true);
      const archived = await archiveFinancialAccount(user.id, accountId);
      setFinancialAccounts((current) => mergeRecord(current, archived));
      setStatusMessage({ type: 'success', text: 'Cuenta archivada correctamente.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: getSupabaseErrorMessage(error, 'No se pudo archivar la cuenta.'),
      });
    } finally {
      setSaving(false);
    }
  }

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (client.city ?? '').toLowerCase().includes(clientSearch.toLowerCase()) ||
        (client.email ?? '').toLowerCase().includes(clientSearch.toLowerCase());

      const matchesStatus = clientStatusFilter === 'Todos' || client.status === clientStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clientSearch, clientStatusFilter, clients]);

  const activeClientsCount = clients.filter((client) => client.status === 'Activo').length;
  const activeCategoriesCount = expenseCategories.filter((category) => category.status === 'Activa').length;
  const activeAccountsCount = financialAccounts.filter((account) => account.status === 'Activa').length;
  const totalOpeningBalance = financialAccounts
    .filter((account) => account.status === 'Activa')
    .reduce((sum, account) => sum + Number(account.opening_balance ?? 0), 0);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
        <Card className="w-full max-w-lg rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle>Acceso restringido</CardTitle>
            <CardDescription>Inicia sesión para acceder al módulo Mi negocio.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Ir al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{businessCopy.moduleTitle}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{businessCopy.moduleDescription}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {businessCopy.betaNotice}
          </div>
        </div>

        {statusMessage ? (
          <div
            className={cn(
              'mb-6 rounded-2xl border px-4 py-3 text-sm',
              statusMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            )}
          >
            {statusMessage.text}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BriefcaseBusiness className="h-5 w-5 text-blue-600" />
                  Mi negocio
                </CardTitle>
                <CardDescription>
                  {businessProfile?.business_name || 'Configura tu negocio para empezar a guardar datos propios.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={!item.available}
                      onClick={() => item.available && setActiveSection(item.key)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition',
                        activeSection === item.key
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                        !item.available && 'cursor-not-allowed opacity-50 hover:bg-slate-100'
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      {!item.available ? <span className="text-[10px] uppercase">Próx.</span> : null}
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Estado de la Fase 1</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <StatusRow label="Configuración inicial" ready={Boolean(businessProfile?.onboarding_completed)} />
                <StatusRow label="Clientes" ready={true} />
                <StatusRow label="Categorías de gasto" ready={true} />
                <StatusRow label="Caja y bancos" ready={true} />
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-6">
            {activeSection === 'summary' ? (
              <>
                {!businessProfile?.onboarding_completed ? (
                  <Card className="rounded-3xl border border-dashed border-blue-200 bg-blue-50 shadow-none">
                    <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Completa la configuración inicial</h2>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600">
                          Antes de empezar, necesitamos los datos básicos de tu negocio para guardar clientes,
                          categorías y cuentas correctamente.
                        </p>
                      </div>
                      <Button onClick={() => setActiveSection('settings')} className="w-full md:w-auto">
                        Empezar configuración
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard title="Clientes activos" value={String(activeClientsCount)} helper="Clientes listos para facturar" />
                  <SummaryCard title="Categorías activas" value={String(activeCategoriesCount)} helper="Categorías listas para gastos" />
                  <SummaryCard title="Cuentas activas" value={String(activeAccountsCount)} helper="Caja y bancos disponibles" />
                  <SummaryCard
                    title="Saldo inicial total"
                    value={formatCurrency(totalOpeningBalance, businessProfile?.currency || 'MAD')}
                    helper="Se actualizará con ingresos y gastos en fases siguientes"
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                      <CardTitle>Accesos rápidos</CardTitle>
                      <CardDescription>Empieza por lo esencial para tu negocio.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      <QuickActionButton label="Configurar negocio" onClick={() => setActiveSection('settings')} />
                      <QuickActionButton label="Crear cliente" onClick={() => setActiveSection('clients')} />
                      <QuickActionButton label="Crear categoría" onClick={() => setActiveSection('expenses')} />
                      <QuickActionButton label="Crear cuenta" onClick={() => setActiveSection('accounts')} />
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-none shadow-sm">
                    <CardHeader>
                      <CardTitle>Resumen del negocio</CardTitle>
                      <CardDescription>Base preparada para las siguientes fases.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-600">
                      <InfoLine label="Nombre comercial" value={businessProfile?.business_name || 'Sin configurar'} />
                      <InfoLine label="Actividad" value={businessProfile?.activity_type || 'Sin configurar'} />
                      <InfoLine label="Categoría" value={businessProfile?.category || 'Sin configurar'} />
                      <InfoLine label="Idioma facturas" value={businessProfile?.invoice_language || 'Sin configurar'} />
                      <InfoLine
                        label="Fiscalidad"
                        value={
                          businessProfile?.calculate_tax
                            ? `${businessProfile.estimated_tax_percentage ?? 0}% estimado`
                            : 'No calcular impuestos'
                        }
                      />
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}

            {activeSection === 'settings' ? (
              <Card className="rounded-3xl border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Configuración inicial del negocio</CardTitle>
                  <CardDescription>
                    Guarda la información base que usarán las futuras facturas, cobros, gastos y resúmenes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Field label="Nombre comercial">
                      <Input value={profileForm.business_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, business_name: e.target.value }))} />
                    </Field>
                    <Field label="Nombre completo o razón social">
                      <Input value={profileForm.legal_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, legal_name: e.target.value }))} />
                    </Field>
                    <Field label="Tipo de actividad">
                      <Input value={profileForm.activity_type} onChange={(e) => setProfileForm((prev) => ({ ...prev, activity_type: e.target.value }))} />
                    </Field>
                    <Field label="Categoría">
                      <Select value={profileForm.category} onValueChange={(value) => setProfileForm((prev) => ({ ...prev, category: value as BusinessProfileInput['category'] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {businessCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Identificador fiscal">
                      <Input value={profileForm.fiscal_identifier ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, fiscal_identifier: e.target.value || null }))} />
                    </Field>
                    <Field label="Identificador autoentrepreneur">
                      <Input
                        value={profileForm.autoentrepreneur_identifier ?? ''}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, autoentrepreneur_identifier: e.target.value || null }))}
                      />
                    </Field>
                    <Field label="Teléfono">
                      <Input value={profileForm.phone ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value || null }))} />
                    </Field>
                    <Field label="Correo electrónico">
                      <Input
                        type="email"
                        value={profileForm.email ?? ''}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value || null }))}
                      />
                    </Field>
                    <Field label="Dirección">
                      <Input value={profileForm.address ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value || null }))} />
                    </Field>
                    <Field label="Ciudad">
                      <Input value={profileForm.city ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value || null }))} />
                    </Field>
                    <Field label="País">
                      <Input value={profileForm.country} onChange={(e) => setProfileForm((prev) => ({ ...prev, country: e.target.value }))} />
                    </Field>
                    <Field label="Moneda">
                      <Input value={profileForm.currency} onChange={(e) => setProfileForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} />
                    </Field>
                    <Field label="Idioma de las facturas">
                      <Select
                        value={profileForm.invoice_language}
                        onValueChange={(value) => {
                          const nextValue = value as BusinessProfileInput['invoice_language'];
                          setProfileForm((prev) => ({
                            ...prev,
                            invoice_language: nextValue,
                            locale: nextValue === 'Árabe' ? 'ar-MA' : nextValue === 'Español' ? 'es-MA' : 'fr-MA',
                          }));
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {invoiceLanguages.map((language) => (
                            <SelectItem key={language} value={language}>
                              {language}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Logo del negocio (URL opcional)">
                      <Input value={profileForm.logo_url ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, logo_url: e.target.value || null }))} />
                    </Field>
                    <Field label="Prefijo de facturas">
                      <Input value={profileForm.invoice_prefix} onChange={(e) => setProfileForm((prev) => ({ ...prev, invoice_prefix: e.target.value.toUpperCase() }))} />
                    </Field>
                    <Field label="Número inicial de factura">
                      <Input
                        type="number"
                        min={1}
                        value={profileForm.next_invoice_number}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, next_invoice_number: Number(e.target.value || 1) }))}
                      />
                    </Field>
                    <Field label="Forma de declaración">
                      <Select
                        value={profileForm.declaration_frequency}
                        onValueChange={(value) => setProfileForm((prev) => ({ ...prev, declaration_frequency: value as BusinessProfileInput['declaration_frequency'] }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {declarationFrequencies.map((frequency) => (
                            <SelectItem key={frequency} value={frequency}>
                              {frequency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Porcentaje estimado sobre facturación">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={profileForm.estimated_tax_percentage ?? ''}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            estimated_tax_percentage: e.target.value === '' ? null : Number(e.target.value),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Zona horaria">
                      <Input value={profileForm.timezone} onChange={(e) => setProfileForm((prev) => ({ ...prev, timezone: e.target.value }))} />
                    </Field>
                    <Field label="Formato de fecha">
                      <Input value={profileForm.date_format} onChange={(e) => setProfileForm((prev) => ({ ...prev, date_format: e.target.value }))} />
                    </Field>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Este cálculo es únicamente orientativo. Tacoplan no sustituye a un asesor fiscal ni garantiza que el
                    importe coincida con la declaración oficial.
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={profileForm.calculate_tax}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, calculate_tax: e.target.checked }))}
                      />
                      Calcular impuestos estimados
                    </label>
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Guardar configuración
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === 'clients' ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>Clientes</CardTitle>
                      <CardDescription>Gestiona clientes, archiva los que ya no uses y exporta tu agenda.</CardDescription>
                    </div>
                    <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
                      <div className="relative min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input className="pl-9" placeholder="Buscar cliente" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
                      </div>
                      <Select value={clientStatusFilter} onValueChange={(value) => setClientStatusFilter(value as typeof clientStatusFilter)}>
                        <SelectTrigger className="w-full md:w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Todos">Todos</SelectItem>
                          {clientStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={() => downloadClientsCsv(filteredClients)}>
                        Exportar CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredClients.length === 0 ? (
                      <EmptyState text={businessCopy.emptyStates.clients} />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Ciudad</TableHead>
                            <TableHead>Contacto</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredClients.map((client) => (
                            <TableRow key={client.id}>
                              <TableCell className="font-medium text-slate-900">{client.name}</TableCell>
                              <TableCell>{client.client_type}</TableCell>
                              <TableCell>{client.city || '-'}</TableCell>
                              <TableCell>{client.email || client.phone || '-'}</TableCell>
                              <TableCell>{client.status}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingClientId(client.id);
                                      setClientForm(mapClientToForm(client));
                                    }}
                                  >
                                    Editar
                                  </Button>
                                  {client.status !== 'Archivado' ? (
                                    <Button variant="outline" size="sm" onClick={() => handleArchiveClient(client.id)}>
                                      <Archive className="mr-1 h-4 w-4" />
                                      Archivar
                                    </Button>
                                  ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>{editingClientId ? 'Editar cliente' : 'Nuevo cliente'}</CardTitle>
                    <CardDescription>Los clientes con facturas futuras solo podrán archivarse, no eliminarse.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Field label="Nombre o razón social">
                      <Input value={clientForm.name} onChange={(e) => setClientForm((prev) => ({ ...prev, name: e.target.value }))} />
                    </Field>
                    <Field label="Tipo">
                      <Select value={clientForm.client_type} onValueChange={(value) => setClientForm((prev) => ({ ...prev, client_type: value as BusinessClientInput['client_type'] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {clientTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Identificador fiscal">
                      <Input value={clientForm.fiscal_identifier ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, fiscal_identifier: e.target.value || null }))} />
                    </Field>
                    <Field label="Teléfono">
                      <Input value={clientForm.phone ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, phone: e.target.value || null }))} />
                    </Field>
                    <Field label="Correo electrónico">
                      <Input type="email" value={clientForm.email ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, email: e.target.value || null }))} />
                    </Field>
                    <Field label="Dirección">
                      <Input value={clientForm.address ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, address: e.target.value || null }))} />
                    </Field>
                    <Field label="Ciudad">
                      <Input value={clientForm.city ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, city: e.target.value || null }))} />
                    </Field>
                    <Field label="País">
                      <Input value={clientForm.country ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, country: e.target.value || null }))} />
                    </Field>
                    <Field label="Estado">
                      <Select value={clientForm.status} onValueChange={(value) => setClientForm((prev) => ({ ...prev, status: value as BusinessClientInput['status'] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {clientStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Notas">
                      <Textarea value={clientForm.notes ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, notes: e.target.value || null }))} />
                    </Field>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveClient} disabled={saving} className="flex-1">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {editingClientId ? 'Guardar cambios' : 'Crear cliente'}
                      </Button>
                      {editingClientId ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingClientId(null);
                            setClientForm(initialClientForm);
                          }}
                        >
                          Cancelar
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activeSection === 'expenses' ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>Categorías de gasto</CardTitle>
                    <CardDescription>Base preparada para registrar gastos y tickets en la Fase 3.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {expenseCategories.length === 0 ? (
                      <EmptyState text={businessCopy.emptyStates.categories} />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenseCategories.map((category) => (
                            <TableRow key={category.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: category.color || '#2563eb' }} />
                                  <span className="font-medium text-slate-900">{category.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>{category.description || '-'}</TableCell>
                              <TableCell>{category.is_system ? 'Inicial' : 'Personalizada'}</TableCell>
                              <TableCell>{category.status}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingCategoryId(category.id);
                                      setCategoryForm(mapCategoryToForm(category));
                                    }}
                                  >
                                    Editar
                                  </Button>
                                  {!category.is_system && category.status !== 'Archivada' ? (
                                    <Button variant="outline" size="sm" onClick={() => handleArchiveCategory(category.id)}>
                                      Archivar
                                    </Button>
                                  ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>{editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}</CardTitle>
                    <CardDescription>Puedes mantener las categorías iniciales y añadir las tuyas propias.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Field label="Nombre">
                      <Input value={categoryForm.name} onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))} />
                    </Field>
                    <Field label="Descripción">
                      <Textarea value={categoryForm.description ?? ''} onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value || null }))} />
                    </Field>
                    <Field label="Color">
                      <div className="flex gap-3">
                        <Input type="color" className="h-10 w-16 p-1" value={categoryForm.color} onChange={(e) => setCategoryForm((prev) => ({ ...prev, color: e.target.value }))} />
                        <Input value={categoryForm.color} onChange={(e) => setCategoryForm((prev) => ({ ...prev, color: e.target.value }))} />
                      </div>
                    </Field>
                    <Field label="Estado">
                      <Select value={categoryForm.status} onValueChange={(value) => setCategoryForm((prev) => ({ ...prev, status: value as BusinessExpenseCategoryInput['status'] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Activa">Activa</SelectItem>
                          <SelectItem value="Archivada">Archivada</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveCategory} disabled={saving} className="flex-1">
                        {editingCategoryId ? 'Guardar cambios' : 'Crear categoría'}
                      </Button>
                      {editingCategoryId ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingCategoryId(null);
                            setCategoryForm(initialCategoryForm);
                          }}
                        >
                          Cancelar
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activeSection === 'accounts' ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>Caja y bancos</CardTitle>
                    <CardDescription>
                      Registra tus cajas, cuentas bancarias o tarjetas. El saldo actual arrancará desde el saldo inicial.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {financialAccounts.length === 0 ? (
                      <EmptyState text={businessCopy.emptyStates.accounts} />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cuenta</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Saldo inicial</TableHead>
                            <TableHead>Moneda</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {financialAccounts.map((account) => (
                            <TableRow key={account.id}>
                              <TableCell className="font-medium text-slate-900">{account.name}</TableCell>
                              <TableCell>{account.account_type}</TableCell>
                              <TableCell>{formatCurrency(Number(account.opening_balance), account.currency)}</TableCell>
                              <TableCell>{account.currency}</TableCell>
                              <TableCell>{account.status}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingAccountId(account.id);
                                      setAccountForm(mapAccountToForm(account));
                                    }}
                                  >
                                    Editar
                                  </Button>
                                  {account.status !== 'Archivada' ? (
                                    <Button variant="outline" size="sm" onClick={() => handleArchiveAccount(account.id)}>
                                      Archivar
                                    </Button>
                                  ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>{editingAccountId ? 'Editar cuenta' : 'Nueva cuenta'}</CardTitle>
                    <CardDescription>Añade una caja, cuenta bancaria, tarjeta u otra cuenta financiera.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Field label="Nombre">
                      <Input value={accountForm.name} onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))} />
                    </Field>
                    <Field label="Tipo">
                      <Select value={accountForm.account_type} onValueChange={(value) => setAccountForm((prev) => ({ ...prev, account_type: value as BusinessFinancialAccountInput['account_type'] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {financialAccountTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Saldo inicial">
                      <Input
                        type="number"
                        step="0.01"
                        value={accountForm.opening_balance}
                        onChange={(e) => setAccountForm((prev) => ({ ...prev, opening_balance: Number(e.target.value || 0) }))}
                      />
                    </Field>
                    <Field label="Moneda">
                      <Input value={accountForm.currency} onChange={(e) => setAccountForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} />
                    </Field>
                    <Field label="Fecha del saldo inicial">
                      <Input type="date" value={accountForm.opening_balance_date} onChange={(e) => setAccountForm((prev) => ({ ...prev, opening_balance_date: e.target.value }))} />
                    </Field>
                    <Field label="Estado">
                      <Select value={accountForm.status} onValueChange={(value) => setAccountForm((prev) => ({ ...prev, status: value as BusinessFinancialAccountInput['status'] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {accountStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveAccount} disabled={saving} className="flex-1">
                        {editingAccountId ? 'Guardar cambios' : 'Crear cuenta'}
                      </Button>
                      {editingAccountId ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingAccountId(null);
                            setAccountForm(initialAccountForm);
                          }}
                        >
                          Cancelar
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activeSection === 'invoices' ? <ComingSoonCard title="Facturas" description={businessCopy.placeholders.invoices} /> : null}
            {activeSection === 'income' ? <ComingSoonCard title="Ingresos" description={businessCopy.placeholders.income} /> : null}
            {activeSection === 'reports' ? <ComingSoonCard title="Informes" description={businessCopy.placeholders.reports} /> : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardContent className="space-y-2 p-6">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function QuickActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" className="justify-between rounded-2xl" onClick={onClick}>
      {label}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}

function StatusRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={cn('rounded-full px-2 py-1 text-xs font-medium', ready ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
        {ready ? 'Activo' : 'Pendiente'}
      </span>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
      {text}
    </div>
  );
}

function ComingSoonCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">
        Esta sección quedará conectada a las siguientes fases sin romper la estructura creada ahora.
      </CardContent>
    </Card>
  );
}

function mapProfileToForm(profile: BusinessProfile): BusinessProfileInput {
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

function mapClientToForm(client: BusinessClient): BusinessClientInput {
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

function mapCategoryToForm(category: BusinessExpenseCategory): BusinessExpenseCategoryInput {
  return {
    name: category.name,
    description: category.description,
    color: category.color || '#2563eb',
    status: category.status,
  };
}

function mapAccountToForm(account: BusinessFinancialAccount): BusinessFinancialAccountInput {
  return {
    name: account.name,
    account_type: account.account_type,
    opening_balance: Number(account.opening_balance),
    currency: account.currency,
    opening_balance_date: account.opening_balance_date,
    status: account.status,
  };
}

function mergeRecord<T extends { id: string }>(collection: T[], record: T) {
  const exists = collection.some((item) => item.id === record.id);
  if (!exists) {
    return [record, ...collection];
  }

  return collection.map((item) => (item.id === record.id ? record : item));
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function downloadClientsCsv(clients: BusinessClient[]) {
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
