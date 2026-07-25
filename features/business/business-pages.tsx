'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowRight, CheckCircle2, Clock3, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  downloadClientsCsv,
  formatBusinessCurrency,
  initialAccountForm,
  initialCategoryForm,
  initialClientForm,
  initialProfileForm,
  mapAccountToForm,
  mapCategoryToForm,
  mapClientToForm,
  mapProfileToForm,
  useBusinessData,
} from '@/features/business/business-context';
import {
  accountStatuses,
  businessCategories,
  businessCopy,
  clientStatuses,
  clientTypes,
  declarationFrequencies,
  financialAccountTypes,
  invoiceLanguages,
} from '@/features/business/copy';
import { businessTopActions } from '@/features/business/navigation';
import type {
  BusinessClientInput,
  BusinessExpenseCategoryInput,
  BusinessFinancialAccountInput,
  BusinessProfileInput,
} from '@/validations/business';

export function BusinessSummaryPage() {
  const { businessProfile, clients, expenseCategories, financialAccounts, stats, pendingTasks } = useBusinessData();

  const recentClients = clients.slice(0, 5);
  const recentCategories = expenseCategories.slice(0, 5);
  const recentAccounts = financialAccounts.slice(0, 5);

  return (
    <div className="space-y-6">
      {!businessProfile?.onboarding_completed ? (
        <Card className="rounded-3xl border border-dashed border-blue-200 bg-blue-50 shadow-none">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Completa la configuración inicial</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Antes de empezar con facturas, gastos y cuentas, necesitamos los datos base del negocio.
              </p>
            </div>
            <Button asChild className="w-full md:w-auto">
              <Link href="/mi-negocio/configuracion">
                Empezar configuración
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Clientes activos" value={String(stats.activeClientsCount)} helper="Base comercial preparada" />
        <SummaryCard title="Categorías activas" value={String(stats.activeCategoriesCount)} helper="Gastos listos para clasificar" />
        <SummaryCard title="Cuentas activas" value={String(stats.activeAccountsCount)} helper="Caja y bancos conectados" />
        <SummaryCard
          title="Saldo inicial total"
          value={formatBusinessCurrency(stats.totalOpeningBalance, businessProfile?.currency || 'MAD')}
          helper="Se usará como punto de partida"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle>Acciones rápidas</CardTitle>
            <CardDescription>Accesos directos a lo que sí está operativo ahora.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {businessTopActions.map((action) => {
              const Icon = action.icon;

              return (
                <Button key={action.href} asChild variant="outline" className="justify-between rounded-2xl h-auto px-4 py-4">
                  <Link href={action.href}>
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-left">{action.label}</span>
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle>Negocio listo para facturar</CardTitle>
            <CardDescription>Estado real de la base que alimentará las siguientes fases.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <StatusLine label="Configuración inicial" ready={Boolean(businessProfile?.onboarding_completed)} />
            <StatusLine label="Clientes preparados" ready={stats.activeClientsCount > 0} />
            <StatusLine label="Categorías revisadas" ready={stats.activeCategoriesCount > 0} />
            <StatusLine label="Caja y bancos" ready={stats.activeAccountsCount > 0} />
            <InfoLine label="Próximo número de factura" value={String(businessProfile?.next_invoice_number ?? 1)} />
            <InfoLine label="Prefijo" value={businessProfile?.invoice_prefix || 'FAC'} />
            <InfoLine label="Moneda" value={businessProfile?.currency || 'MAD'} />
            <InfoLine label="Idioma" value={businessProfile?.invoice_language || 'Francés'} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle>Clientes recientes</CardTitle>
            <CardDescription>Datos reales guardados en Supabase para tu negocio.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentClients.length === 0 ? (
              <EmptyState text="Todavía no tienes clientes creados." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium text-slate-900">{client.name}</TableCell>
                      <TableCell>{client.client_type}</TableCell>
                      <TableCell>{client.city || '-'}</TableCell>
                      <TableCell>{client.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle>Tareas pendientes</CardTitle>
            <CardDescription>Recordatorios generados a partir del estado real del negocio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingTasks.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                La base inicial está completa y lista para continuar con facturación y finanzas.
              </div>
            ) : (
              pendingTasks.map((task) => (
                <div key={task} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <Clock3 className="mt-0.5 h-4 w-4 text-blue-600" />
                  <span>{task}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle>Categorías activas</CardTitle>
            <CardDescription>Clasificación de gastos preparada para la siguiente fase.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCategories.length === 0 ? (
              <EmptyState text="Todavía no hay categorías disponibles." />
            ) : (
              <div className="space-y-3">
                {recentCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: category.color || '#2563eb' }} />
                      <div>
                        <p className="font-medium text-slate-900">{category.name}</p>
                        <p className="text-xs text-slate-500">{category.description || 'Sin descripción'}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{category.is_system ? 'Inicial' : 'Personalizada'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle>Cuentas y saldos iniciales</CardTitle>
            <CardDescription>Cajas y cuentas financieras ya registradas.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAccounts.length === 0 ? (
              <EmptyState text="Todavía no has añadido ninguna cuenta financiera." />
            ) : (
              <div className="space-y-3">
                {recentAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{account.name}</p>
                      <p className="text-xs text-slate-500">{account.account_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">
                        {formatBusinessCurrency(Number(account.opening_balance), account.currency)}
                      </p>
                      <p className="text-xs text-slate-500">{account.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function BusinessSettingsPage() {
  const { businessProfile, saveProfile, saving } = useBusinessData();
  const [profileForm, setProfileForm] = useState<BusinessProfileInput>(initialProfileForm);

  useEffect(() => {
    setProfileForm(businessProfile ? mapProfileToForm(businessProfile) : initialProfileForm);
  }, [businessProfile]);

  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader>
        <CardTitle>Configuración del negocio</CardTitle>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
            <Input type="email" value={profileForm.email ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value || null }))} />
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
          Este cálculo es únicamente orientativo. Tacoplan no sustituye a un asesor fiscal ni garantiza que el importe coincida con la declaración oficial.
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
          <Button onClick={() => void saveProfile(profileForm)} disabled={saving}>
            Guardar configuración
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function BusinessClientsPage() {
  const { clients, saveClient, archiveClient, saving } = useBusinessData();
  const [clientForm, setClientForm] = useState<BusinessClientInput>(initialClientForm);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<'Todos' | 'Activo' | 'Archivado'>('Todos');

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

  async function handleSaveClient() {
    const ok = await saveClient(clientForm, editingClientId);

    if (ok) {
      setClientForm(initialClientForm);
      setEditingClientId(null);
    }
  }

  return (
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
                          <Button variant="outline" size="sm" onClick={() => void archiveClient(client.id)}>
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
          <CardDescription>Los clientes con movimientos futuros deberán archivarse y conservar el histórico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Nombre o razón social">
            <Input value={clientForm.name} onChange={(e) => setClientForm((prev) => ({ ...prev, name: e.target.value }))} />
          </Field>
          <Field label="Tipo">
            <Select value={clientForm.client_type} onValueChange={(value) => setClientForm((prev) => ({ ...prev, client_type: value as BusinessClientInput['client_type'] }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
            <Button onClick={() => void handleSaveClient()} disabled={saving} className="flex-1">
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
  );
}

export function BusinessCategoriesPage() {
  const { expenseCategories, saveCategory, archiveCategory, saving } = useBusinessData();
  const [categoryForm, setCategoryForm] = useState<BusinessExpenseCategoryInput>(initialCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  async function handleSaveCategory() {
    const ok = await saveCategory(categoryForm, editingCategoryId);

    if (ok) {
      setCategoryForm(initialCategoryForm);
      setEditingCategoryId(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader>
          <CardTitle>Categorías de gasto</CardTitle>
          <CardDescription>Base preparada para registrar gastos y tickets en la siguiente fase.</CardDescription>
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
                          <Button variant="outline" size="sm" onClick={() => void archiveCategory(category.id)}>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Activa">Activa</SelectItem>
                <SelectItem value="Archivada">Archivada</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button onClick={() => void handleSaveCategory()} disabled={saving} className="flex-1">
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
  );
}

export function BusinessAccountsPage() {
  const { businessProfile, financialAccounts, saveAccount, archiveAccount, saving } = useBusinessData();
  const [accountForm, setAccountForm] = useState<BusinessFinancialAccountInput>(initialAccountForm);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  async function handleSaveAccount() {
    const ok = await saveAccount(accountForm, editingAccountId);

    if (ok) {
      setAccountForm(initialAccountForm);
      setEditingAccountId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Cuentas activas" value={String(financialAccounts.filter((account) => account.status === 'Activa').length)} helper="Disponibles para la operativa" />
        <SummaryCard
          title="Saldo inicial total"
          value={formatBusinessCurrency(
            financialAccounts
              .filter((account) => account.status === 'Activa')
              .reduce((sum, account) => sum + Number(account.opening_balance), 0),
            businessProfile?.currency || 'MAD'
          )}
          helper="Suma de saldos iniciales"
        />
        <SummaryCard title="Moneda principal" value={businessProfile?.currency || 'MAD'} helper="Definida en configuración" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle>Caja y bancos</CardTitle>
            <CardDescription>Registra tus cajas, cuentas bancarias o tarjetas. El saldo actual arrancará desde el saldo inicial.</CardDescription>
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
                      <TableCell>{formatBusinessCurrency(Number(account.opening_balance), account.currency)}</TableCell>
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
                            <Button variant="outline" size="sm" onClick={() => void archiveAccount(account.id)}>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Button onClick={() => void handleSaveAccount()} disabled={saving} className="flex-1">
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
    </div>
  );
}

export function BusinessFuturePage({ slug }: { slug: string[] }) {
  const title = slug
    .map((part) => part.replace(/-/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ');

  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Esta ruta ya existe dentro de la nueva estructura del panel, pero su implementación funcional llegará en las siguientes fases.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-blue-800">
          No se muestran datos simulados. Esta sección quedará conectada cuando existan las tablas, servicios y validaciones de su fase correspondiente.
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <QuickLink href="/mi-negocio/resumen" label="Volver al resumen" />
          <QuickLink href="/mi-negocio/configuracion" label="Revisar configuración" />
          <QuickLink href="/mi-negocio/clientes" label="Gestionar clientes" />
          <QuickLink href="/mi-negocio/caja-bancos" label="Revisar caja y bancos" />
        </div>
      </CardContent>
    </Card>
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

function StatusLine({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-600">{label}</span>
      <span className="flex items-center gap-2">
        <CheckCircle2 className={ready ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-slate-300'} />
        <span className={ready ? 'text-emerald-700' : 'text-slate-500'}>{ready ? 'Activo' : 'Pendiente'}</span>
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

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="outline" className="justify-between rounded-2xl">
      <Link href={href}>
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}
