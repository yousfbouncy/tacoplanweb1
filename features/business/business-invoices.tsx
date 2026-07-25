'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { useBusinessData, formatBusinessCurrency, initialClientForm } from '@/features/business/business-context';
import {
  createBusinessInvoice,
  getBusinessInvoice,
  getSupabaseErrorMessage,
  listBusinessInvoices,
  listBusinessProductsServices,
  listBusinessTaxRates,
  registerBusinessInvoicePayment,
  saveBusinessClient,
} from '@/services/business';
import type {
  BusinessClient,
  BusinessInvoiceDetail,
  BusinessInvoiceListItem,
  BusinessProductService,
  BusinessTaxRate,
} from '@/types/business';
import {
  businessClientSchema,
  businessInvoicePaymentSchema,
  businessInvoiceSchema,
  type BusinessClientInput,
  type BusinessInvoiceInput,
  type BusinessInvoicePaymentInput,
} from '@/validations/business';

const invoiceStatuses = ['draft', 'issued', 'pending', 'partially_paid', 'paid', 'overdue', 'cancelled'] as const;
const invoiceLanguages = ['Español', 'Francés', 'Árabe', 'Inglés'] as const;
const NO_ACCOUNT_VALUE = '__none_account__';
const MANUAL_LINE_VALUE = '__manual_line__';
const NO_TAX_VALUE = '__none_tax__';

type InvoiceEditorProps = {
  mode: 'create' | 'edit';
  invoice?: BusinessInvoiceDetail | null;
};

type InvoiceEditorState = {
  client_id: string;
  sequence_series: string;
  issue_date: string;
  due_date: string;
  currency: string;
  invoice_language: (typeof invoiceLanguages)[number];
  payment_method: string;
  financial_account_id: string;
  reference: string;
  notes: string;
  payment_terms: string;
  internal_notes: string;
  footer_text: string;
  items: InvoiceEditorLine[];
};

type InvoiceEditorLine = {
  id: string;
  product_service_id: string;
  tax_rate_id: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  discount_amount: string;
  discount_rate: string;
  tax_rate: string;
  withholding_rate: string;
};

export function BusinessInvoicesListPage() {
  const { user } = useAuth();
  const { businessProfile } = useBusinessData();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [invoices, setInvoices] = useState<BusinessInvoiceListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void loadInvoices();
  }, [user, status, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadInvoices() {
    if (!user) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await listBusinessInvoices(user.id, {
        status,
        search,
        issueDateFrom: dateFrom || null,
        issueDateTo: dateTo || null,
      });
      setInvoices(data);
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, 'No se pudo cargar el listado de facturas.'));
    } finally {
      setLoading(false);
    }
  }

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return invoices;

    return invoices.filter((invoice) => {
      return (
        (invoice.invoice_number ?? '').toLowerCase().includes(term) ||
        (invoice.client?.name ?? '').toLowerCase().includes(term) ||
        (invoice.client?.email ?? '').toLowerCase().includes(term) ||
        (invoice.reference ?? '').toLowerCase().includes(term)
      );
    });
  }, [invoices, search]);

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Facturas</CardTitle>
            <CardDescription>Listado real de facturas emitidas y borradores de tu negocio.</CardDescription>
          </div>
          <Button asChild className="rounded-2xl">
            <Link href="/mi-negocio/facturas/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Nueva factura
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_170px_170px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Buscar por número, cliente o referencia"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {invoiceStatuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {getInvoiceStatusLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => void loadInvoices()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Actualizar
            </Button>
          </div>

          {errorMessage ? <ErrorBanner text={errorMessage} /> : null}

          {loading ? (
            <InvoicesLoading />
          ) : filteredInvoices.length === 0 ? (
            <EmptyInvoicesState
              title="Todavía no tienes facturas"
              description="Crea tu primera factura para empezar a facturar desde Tacoplan."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pendiente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium text-slate-900">{invoice.invoice_number ?? 'Borrador'}</TableCell>
                    <TableCell>{invoice.client?.name ?? '-'}</TableCell>
                    <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell>{formatBusinessCurrency(Number(invoice.total_amount), invoice.currency || businessProfile?.currency || 'MAD')}</TableCell>
                    <TableCell>{formatBusinessCurrency(Number(invoice.balance_due_amount), invoice.currency || businessProfile?.currency || 'MAD')}</TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/mi-negocio/facturas/${invoice.id}`}>
                            <Eye className="mr-1 h-4 w-4" />
                            Ver
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function BusinessInvoiceCreatePage() {
  return <BusinessInvoiceEditor mode="create" />;
}

export function BusinessInvoiceEditPage({ invoiceId }: { invoiceId: string }) {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<BusinessInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, invoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    if (!user) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await getBusinessInvoice(user.id, invoiceId);
      setInvoice(data);
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, 'No se pudo cargar la factura.'));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <InvoicesLoading />;
  }

  if (errorMessage) {
    return <ErrorBanner text={errorMessage} />;
  }

  if (!invoice) {
    return <EmptyInvoicesState title="Factura no encontrada" description="La factura no existe o no pertenece a tu negocio." />;
  }

  return <BusinessInvoiceEditor mode="edit" invoice={invoice} />;
}

export function BusinessInvoiceDetailPage({ invoiceId }: { invoiceId: string }) {
  const { user } = useAuth();
  const { businessProfile, financialAccounts } = useBusinessData();
  const [invoice, setInvoice] = useState<BusinessInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    amount: '',
    financial_account_id: '',
    payment_method: '',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, invoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    if (!user) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await getBusinessInvoice(user.id, invoiceId);
      setInvoice(data);
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, 'No se pudo cargar el detalle de la factura.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterPayment() {
    if (!user || !invoice) return;

    try {
      setSavingPayment(true);
      setErrorMessage(null);
      setStatusMessage(null);
      const parsed = businessInvoicePaymentSchema.parse({
        invoice_id: invoice.id,
        payment_date: paymentForm.payment_date,
        amount: Number(paymentForm.amount),
        financial_account_id: paymentForm.financial_account_id,
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      } satisfies BusinessInvoicePaymentInput);

      await registerBusinessInvoicePayment(user.id, parsed);
      setStatusMessage('Cobro registrado correctamente.');
      setPaymentForm({
        payment_date: new Date().toISOString().slice(0, 10),
        amount: '',
        financial_account_id: '',
        payment_method: '',
        reference: '',
        notes: '',
      });
      await load();
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, 'No se pudo registrar el cobro.'));
    } finally {
      setSavingPayment(false);
    }
  }

  if (loading) {
    return <InvoicesLoading />;
  }

  if (errorMessage && !invoice) {
    return <ErrorBanner text={errorMessage} />;
  }

  if (!invoice) {
    return <EmptyInvoicesState title="Factura no encontrada" description="La factura no existe o no pertenece a tu negocio." />;
  }

  return (
    <div className="space-y-6">
      {statusMessage ? <SuccessBanner text={statusMessage} /> : null}
      {errorMessage ? <ErrorBanner text={errorMessage} /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Estado" value={getInvoiceStatusLabel(invoice.status)} helper={invoice.invoice_number ?? 'Borrador'} />
        <MetricCard
          title="Total"
          value={formatBusinessCurrency(Number(invoice.total_amount), invoice.currency || businessProfile?.currency || 'MAD')}
          helper="Importe de la factura"
        />
        <MetricCard
          title="Cobrado"
          value={formatBusinessCurrency(Number(invoice.paid_amount), invoice.currency || businessProfile?.currency || 'MAD')}
          helper="Pagos registrados"
        />
        <MetricCard
          title="Pendiente"
          value={formatBusinessCurrency(Number(invoice.balance_due_amount), invoice.currency || businessProfile?.currency || 'MAD')}
          helper="Saldo pendiente"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{invoice.invoice_number ?? 'Borrador de factura'}</CardTitle>
              <CardDescription>
                Emitida el {formatDate(invoice.issue_date)} · Vence el {formatDate(invoice.due_date)}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={invoice.status} />
              <Button asChild variant="outline">
                <Link href={`/mi-negocio/facturas/${invoice.id}/editar`}>Editar</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <InfoBlock
                title="Datos del negocio"
                lines={[
                  businessProfile?.business_name || 'Sin configurar',
                  businessProfile?.legal_name || null,
                  businessProfile?.fiscal_identifier || null,
                  businessProfile?.address || null,
                  businessProfile?.city || null,
                  businessProfile?.email || null,
                ]}
              />
              <InfoBlock
                title="Cliente"
                lines={[
                  invoice.client?.name || 'Sin cliente',
                  invoice.client?.fiscal_identifier || null,
                  invoice.client?.address || null,
                  invoice.client?.city || null,
                  invoice.client?.email || null,
                  invoice.client?.phone || null,
                ]}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Impuesto</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-slate-900">{item.description}</TableCell>
                    <TableCell>{formatNumber(item.quantity, 3)}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{formatBusinessCurrency(Number(item.unit_price), invoice.currency)}</TableCell>
                    <TableCell>{formatNumber(item.tax_rate, 2)}%</TableCell>
                    <TableCell>{formatBusinessCurrency(Number(item.line_total_amount), invoice.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-3 text-sm text-slate-600">
                <InfoBlock title="Notas visibles" lines={[invoice.notes || 'Sin notas para el cliente']} />
                <InfoBlock title="Condiciones de pago" lines={[invoice.payment_terms || 'Sin condiciones de pago']} />
                <InfoBlock title="Notas internas" lines={[invoice.internal_notes || 'Sin notas internas']} />
              </div>
              <div className="rounded-3xl border border-slate-200 p-5">
                <TotalsLine label="Subtotal" value={formatBusinessCurrency(Number(invoice.subtotal_amount), invoice.currency)} />
                <TotalsLine label="Descuentos" value={formatBusinessCurrency(Number(invoice.discount_amount), invoice.currency)} />
                <TotalsLine label="Base imponible" value={formatBusinessCurrency(Number(invoice.taxable_base_amount), invoice.currency)} />
                <TotalsLine label="Impuestos" value={formatBusinessCurrency(Number(invoice.tax_amount), invoice.currency)} />
                <TotalsLine label="Retenciones" value={formatBusinessCurrency(Number(invoice.withholding_amount), invoice.currency)} />
                <TotalsLine label="Total" value={formatBusinessCurrency(Number(invoice.total_amount), invoice.currency)} strong />
                <TotalsLine label="Cobrado" value={formatBusinessCurrency(Number(invoice.paid_amount), invoice.currency)} />
                <TotalsLine label="Pendiente" value={formatBusinessCurrency(Number(invoice.balance_due_amount), invoice.currency)} strong />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-sm">
            <CardHeader>
              <CardTitle>Registrar cobro</CardTitle>
              <CardDescription>Añade cobros parciales o completos sobre esta factura.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Fecha del cobro">
                <Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))} />
              </Field>
              <Field label="Importe">
                <Input type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))} />
              </Field>
              <Field label="Cuenta bancaria">
                <Select
                  value={paymentForm.financial_account_id || NO_ACCOUNT_VALUE}
                  onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, financial_account_id: value === NO_ACCOUNT_VALUE ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ACCOUNT_VALUE}>Sin cuenta</SelectItem>
                    {financialAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Método de pago">
                <Input value={paymentForm.payment_method} onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_method: e.target.value }))} />
              </Field>
              <Field label="Referencia">
                <Input value={paymentForm.reference} onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))} />
              </Field>
              <Field label="Notas">
                <Textarea value={paymentForm.notes} onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </Field>
              <Button onClick={() => void handleRegisterPayment()} disabled={savingPayment} className="w-full">
                {savingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Registrar cobro
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm">
            <CardHeader>
              <CardTitle>Historial de pagos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-slate-500">Todavía no hay cobros registrados.</p>
              ) : (
                invoice.payments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-900">{formatBusinessCurrency(Number(payment.amount), payment.currency)}</span>
                      <span className="text-slate-500">{formatDate(payment.payment_date)}</span>
                    </div>
                    <p className="mt-1 text-slate-500">{payment.payment_method || 'Sin método indicado'}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BusinessInvoiceEditor({ mode, invoice }: InvoiceEditorProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { businessProfile, clients, financialAccounts } = useBusinessData();
  const [taxRates, setTaxRates] = useState<BusinessTaxRate[]>([]);
  const [products, setProducts] = useState<BusinessProductService[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invoiceState, setInvoiceState] = useState<InvoiceEditorState>(() =>
    invoice ? mapInvoiceToEditorState(invoice, businessProfile) : buildInitialInvoiceState(businessProfile)
  );
  const [clientForm, setClientForm] = useState<BusinessClientInput>(initialClientForm);
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    setInvoiceState(invoice ? mapInvoiceToEditorState(invoice, businessProfile) : buildInitialInvoiceState(businessProfile));
  }, [invoice, businessProfile?.id]);

  useEffect(() => {
    if (!user) return;
    void loadAuxiliaryData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useUnsavedChanges(hasUnsavedChanges(mode, invoice, invoiceState, businessProfile));

  async function loadAuxiliaryData() {
    if (!user) return;

    try {
      setLoadingData(true);
      const [taxes, productRows] = await Promise.all([
        listBusinessTaxRates(user.id),
        listBusinessProductsServices(user.id),
      ]);
      setTaxRates(taxes);
      setProducts(productRows);
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, 'No se pudieron cargar los catálogos de factura.'));
    } finally {
      setLoadingData(false);
    }
  }

  const lineTotals = useMemo(() => invoiceState.items.map((item) => computeLineAmounts(item)), [invoiceState.items]);
  const totals = useMemo(() => computeInvoiceTotals(lineTotals), [lineTotals]);
  const invoiceNumberPreview = useMemo(() => {
    const prefix = businessProfile?.invoice_prefix || 'FAC';
    const year = new Date(invoiceState.issue_date || new Date().toISOString().slice(0, 10)).getFullYear();
    const next = String(businessProfile?.next_invoice_number ?? 1).padStart(4, '0');
    const series = invoiceState.sequence_series.trim() || businessProfile?.default_invoice_series || 'GENERAL';
    return series === 'GENERAL' ? `${prefix}-${year}-${next}` : `${prefix}-${series}-${year}-${next}`;
  }, [businessProfile?.default_invoice_series, businessProfile?.invoice_prefix, businessProfile?.next_invoice_number, invoiceState.issue_date, invoiceState.sequence_series]);

  async function handleCreateInvoice(saveMode: 'draft' | 'issue') {
    if (!user || !businessProfile?.id) return;

    try {
      setSaving(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const parsed = businessInvoiceSchema.parse({
        business_profile_id: businessProfile.id,
        client_id: invoiceState.client_id,
        financial_account_id: invoiceState.financial_account_id,
        issue_date: invoiceState.issue_date,
        due_date: invoiceState.due_date,
        currency: invoiceState.currency,
        invoice_language: invoiceState.invoice_language,
        sequence_series: invoiceState.sequence_series,
        payment_method: invoiceState.payment_method,
        reference: invoiceState.reference,
        notes: invoiceState.notes,
        payment_terms: invoiceState.payment_terms,
        internal_notes: invoiceState.internal_notes,
        footer_text: invoiceState.footer_text,
        save_mode: saveMode,
        items: invoiceState.items.map((item) => ({
          product_service_id: item.product_service_id,
          tax_rate_id: item.tax_rate_id,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: Number(item.unit_price),
          discount_amount: Number(item.discount_amount),
          discount_rate: Number(item.discount_rate),
          tax_rate: Number(item.tax_rate),
          withholding_rate: Number(item.withholding_rate),
        })),
      } satisfies BusinessInvoiceInput);

      const invoiceId = await createBusinessInvoice(user.id, parsed);
      setStatusMessage(saveMode === 'draft' ? 'Borrador guardado correctamente.' : 'Factura creada correctamente.');
      router.push(`/mi-negocio/facturas/${invoiceId}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, 'No se pudo guardar la factura.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateClient() {
    if (!user || !businessProfile?.id) return;

    try {
      setSavingClient(true);
      const parsed = businessClientSchema.parse(clientForm);
      const saved = await saveBusinessClient(user.id, businessProfile.id, null, parsed);
      setInvoiceState((prev) => ({ ...prev, client_id: saved.id }));
      setClientForm(initialClientForm);
      setShowClientDialog(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(getSupabaseErrorMessage(error, 'No se pudo crear el cliente.'));
    } finally {
      setSavingClient(false);
    }
  }

  function updateLine(id: string, patch: Partial<InvoiceEditorLine>) {
    setInvoiceState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function applyProduct(id: string, productId: string) {
    const product = products.find((entry) => entry.id === productId);
    if (!product) {
      updateLine(id, { product_service_id: '', description: '', unit: 'unidad', unit_price: '0', tax_rate: '0', tax_rate_id: '' });
      return;
    }

    updateLine(id, {
      product_service_id: product.id,
      description: product.description || product.name,
      unit: product.unit,
      unit_price: String(product.unit_price),
      tax_rate: String(product.tax_rate ?? 0),
      tax_rate_id: product.tax_rate_id || '',
    });
  }

  function addLine() {
    setInvoiceState((prev) => ({ ...prev, items: [...prev.items, createEmptyLine()] }));
  }

  function duplicateLine(id: string) {
    setInvoiceState((prev) => {
      const current = prev.items.find((item) => item.id === id);
      if (!current) return prev;
      return {
        ...prev,
        items: prev.items.flatMap((item) => (item.id === id ? [item, { ...item, id: createLineId() }] : [item])),
      };
    });
  }

  function removeLine(id: string) {
    setInvoiceState((prev) => {
      if (prev.items.length === 1) return prev;
      return { ...prev, items: prev.items.filter((item) => item.id !== id) };
    });
  }

  function moveLine(id: string, direction: 'up' | 'down') {
    setInvoiceState((prev) => {
      const index = prev.items.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.items.length) return prev;
      const copy = [...prev.items];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return { ...prev, items: copy };
    });
  }

  return (
    <div className="space-y-6">
      {statusMessage ? <SuccessBanner text={statusMessage} /> : null}
      {errorMessage ? <ErrorBanner text={errorMessage} /> : null}

      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{mode === 'edit' ? 'Editar factura' : 'Nueva factura'}</CardTitle>
            <CardDescription>
              Crea una factura real y guárdala en Supabase. Puedes guardar borrador o emitirla directamente.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className={cn('rounded-2xl border px-3 py-2 text-sm', hasUnsavedChanges(mode, invoice, invoiceState, businessProfile) ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
              {hasUnsavedChanges(mode, invoice, invoiceState, businessProfile) ? 'Cambios sin guardar' : 'Todo guardado'}
            </div>
            <Button variant="outline" onClick={() => router.push('/mi-negocio/facturas')}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={() => void handleCreateInvoice('draft')} disabled={saving || loadingData}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar borrador
            </Button>
            <Button onClick={() => void handleCreateInvoice('issue')} disabled={saving || loadingData}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Crear factura
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="space-y-6">
              <SectionCard title="Datos de la factura" description="Datos generales, cliente y forma de cobro.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Cliente">
                    <div className="flex gap-2">
                      <ClientSelect
                        clients={clients}
                        value={invoiceState.client_id}
                        onValueChange={(value) => setInvoiceState((prev) => ({ ...prev, client_id: value }))}
                      />
                      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" type="button">
                            Crear cliente
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Nuevo cliente</DialogTitle>
                            <DialogDescription>Crea un cliente sin salir del formulario y selecciónalo automáticamente.</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Nombre o razón social">
                              <Input value={clientForm.name} onChange={(e) => setClientForm((prev) => ({ ...prev, name: e.target.value }))} />
                            </Field>
                            <Field label="Tipo">
                              <Select value={clientForm.client_type} onValueChange={(value) => setClientForm((prev) => ({ ...prev, client_type: value as BusinessClientInput['client_type'] }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Particular">Particular</SelectItem>
                                  <SelectItem value="Empresa">Empresa</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field label="Identificador fiscal">
                              <Input value={clientForm.fiscal_identifier ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, fiscal_identifier: e.target.value || null }))} />
                            </Field>
                            <Field label="Correo electrónico">
                              <Input type="email" value={clientForm.email ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, email: e.target.value || null }))} />
                            </Field>
                            <Field label="Teléfono">
                              <Input value={clientForm.phone ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, phone: e.target.value || null }))} />
                            </Field>
                            <Field label="Ciudad">
                              <Input value={clientForm.city ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, city: e.target.value || null }))} />
                            </Field>
                            <Field label="País">
                              <Input value={clientForm.country ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, country: e.target.value || null }))} />
                            </Field>
                            <Field label="Dirección">
                              <Input value={clientForm.address ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, address: e.target.value || null }))} />
                            </Field>
                            <div className="md:col-span-2">
                              <Field label="Notas">
                                <Textarea value={clientForm.notes ?? ''} onChange={(e) => setClientForm((prev) => ({ ...prev, notes: e.target.value || null }))} />
                              </Field>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowClientDialog(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={() => void handleCreateClient()} disabled={savingClient}>
                              {savingClient ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Guardar cliente
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </Field>
                  <Field label="Serie">
                    <Input value={invoiceState.sequence_series} onChange={(e) => setInvoiceState((prev) => ({ ...prev, sequence_series: e.target.value.toUpperCase() }))} />
                  </Field>
                  <Field label="Número de factura">
                    <Input value={invoiceNumberPreview} readOnly />
                  </Field>
                  <Field label="Fecha de emisión">
                    <Input type="date" value={invoiceState.issue_date} onChange={(e) => setInvoiceState((prev) => ({ ...prev, issue_date: e.target.value }))} />
                  </Field>
                  <Field label="Fecha de vencimiento">
                    <Input type="date" value={invoiceState.due_date} onChange={(e) => setInvoiceState((prev) => ({ ...prev, due_date: e.target.value }))} />
                  </Field>
                  <Field label="Moneda">
                    <Input value={invoiceState.currency} onChange={(e) => setInvoiceState((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} />
                  </Field>
                  <Field label="Idioma de factura">
                    <Select value={invoiceState.invoice_language} onValueChange={(value) => setInvoiceState((prev) => ({ ...prev, invoice_language: value as InvoiceEditorState['invoice_language'] }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {invoiceLanguages.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Estado inicial">
                    <Input value={mode === 'edit' ? invoice?.status || 'draft' : 'draft / pending'} readOnly />
                  </Field>
                  <Field label="Método de pago">
                    <Input value={invoiceState.payment_method} onChange={(e) => setInvoiceState((prev) => ({ ...prev, payment_method: e.target.value }))} />
                  </Field>
                  <Field label="Cuenta bancaria">
                    <Select
                      value={invoiceState.financial_account_id || NO_ACCOUNT_VALUE}
                      onValueChange={(value) => setInvoiceState((prev) => ({ ...prev, financial_account_id: value === NO_ACCOUNT_VALUE ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_ACCOUNT_VALUE}>Sin cuenta</SelectItem>
                        {financialAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Referencia opcional">
                    <Input value={invoiceState.reference} onChange={(e) => setInvoiceState((prev) => ({ ...prev, reference: e.target.value }))} />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard title="Líneas de factura" description="Añade productos o líneas manuales, duplica y reordena.">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="pb-3 pr-3">Producto o servicio</th>
                        <th className="pb-3 pr-3">Descripción</th>
                        <th className="pb-3 pr-3">Cantidad</th>
                        <th className="pb-3 pr-3">Unidad</th>
                        <th className="pb-3 pr-3">Precio</th>
                        <th className="pb-3 pr-3">Desc.</th>
                        <th className="pb-3 pr-3">Impuesto</th>
                        <th className="pb-3 pr-3">Total línea</th>
                        <th className="pb-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="align-top">
                      {invoiceState.items.map((item, index) => {
                        const amounts = lineTotals[index];
                        return (
                          <tr key={item.id} className="border-b">
                            <td className="py-3 pr-3">
                              <Select value={item.product_service_id || MANUAL_LINE_VALUE} onValueChange={(value) => applyProduct(item.id, value === MANUAL_LINE_VALUE ? '' : value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Manual" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={MANUAL_LINE_VALUE}>Línea manual</SelectItem>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-3 pr-3">
                              <Textarea value={item.description} onChange={(e) => updateLine(item.id, { description: e.target.value })} />
                            </td>
                            <td className="py-3 pr-3">
                              <Input type="number" step="0.001" value={item.quantity} onChange={(e) => updateLine(item.id, { quantity: e.target.value })} />
                            </td>
                            <td className="py-3 pr-3">
                              <Input value={item.unit} onChange={(e) => updateLine(item.id, { unit: e.target.value })} />
                            </td>
                            <td className="py-3 pr-3">
                              <Input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateLine(item.id, { unit_price: e.target.value })} />
                            </td>
                            <td className="py-3 pr-3">
                              <div className="space-y-2">
                                <Input type="number" step="0.01" value={item.discount_amount} onChange={(e) => updateLine(item.id, { discount_amount: e.target.value })} placeholder="Importe" />
                                <Input type="number" step="0.01" value={item.discount_rate} onChange={(e) => updateLine(item.id, { discount_rate: e.target.value })} placeholder="%" />
                              </div>
                            </td>
                            <td className="py-3 pr-3">
                              <div className="space-y-2">
                                <Select
                                  value={item.tax_rate_id || NO_TAX_VALUE}
                                  onValueChange={(value) => {
                                    const nextValue = value === NO_TAX_VALUE ? '' : value;
                                    const tax = taxRates.find((entry) => entry.id === nextValue);
                                    updateLine(item.id, { tax_rate_id: nextValue, tax_rate: String(tax?.rate ?? (Number(item.tax_rate) || 0)) });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sin impuesto" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={NO_TAX_VALUE}>Sin impuesto</SelectItem>
                                    {taxRates.map((tax) => (
                                      <SelectItem key={tax.id} value={tax.id}>
                                        {tax.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input type="number" step="0.01" value={item.tax_rate} onChange={(e) => updateLine(item.id, { tax_rate: e.target.value })} placeholder="%" />
                              </div>
                            </td>
                            <td className="py-3 pr-3">
                              <div className="font-medium text-slate-900">{formatBusinessCurrency(amounts.total / 100, invoiceState.currency)}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                Base {formatBusinessCurrency(amounts.taxableBase / 100, invoiceState.currency)}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" size="icon" onClick={() => moveLine(item.id, 'up')}>
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="outline" size="icon" onClick={() => moveLine(item.id, 'down')}>
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="outline" size="icon" onClick={() => duplicateLine(item.id)}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="outline" size="icon" onClick={() => removeLine(item.id)} disabled={invoiceState.items.length === 1}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <Button type="button" variant="outline" onClick={addLine}>
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir línea
                  </Button>
                </div>
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard title="Totales" description="Cálculo en tiempo real con importes seguros.">
                <div className="space-y-3">
                  <TotalsLine label="Subtotal" value={formatBusinessCurrency(totals.subtotal / 100, invoiceState.currency)} />
                  <TotalsLine label="Descuentos" value={formatBusinessCurrency(totals.discount / 100, invoiceState.currency)} />
                  <TotalsLine label="Base imponible" value={formatBusinessCurrency(totals.taxableBase / 100, invoiceState.currency)} />
                  <TotalsLine label="Impuestos" value={formatBusinessCurrency(totals.tax / 100, invoiceState.currency)} />
                  <TotalsLine label="Retenciones" value={formatBusinessCurrency(totals.withholding / 100, invoiceState.currency)} />
                  <TotalsLine label="Total final" value={formatBusinessCurrency(totals.total / 100, invoiceState.currency)} strong />
                  <TotalsLine label="Importe pagado" value={formatBusinessCurrency(invoice?.paid_amount ?? 0, invoiceState.currency)} />
                  <TotalsLine label="Pendiente de cobro" value={formatBusinessCurrency(Math.max((totals.total - toCents(invoice?.paid_amount ?? 0)) / 100, 0), invoiceState.currency)} strong />
                </div>
              </SectionCard>

              <SectionCard title="Notas y condiciones" description="Textos visibles y notas internas.">
                <div className="space-y-4">
                  <Field label="Notas visibles para el cliente">
                    <Textarea value={invoiceState.notes} onChange={(e) => setInvoiceState((prev) => ({ ...prev, notes: e.target.value }))} />
                  </Field>
                  <Field label="Condiciones de pago">
                    <Textarea value={invoiceState.payment_terms} onChange={(e) => setInvoiceState((prev) => ({ ...prev, payment_terms: e.target.value }))} />
                  </Field>
                  <Field label="Notas internas">
                    <Textarea value={invoiceState.internal_notes} onChange={(e) => setInvoiceState((prev) => ({ ...prev, internal_notes: e.target.value }))} />
                  </Field>
                  <Field label="Pie de factura">
                    <Textarea value={invoiceState.footer_text} onChange={(e) => setInvoiceState((prev) => ({ ...prev, footer_text: e.target.value }))} />
                  </Field>
                </div>
              </SectionCard>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ClientSelect({
  clients,
  value,
  onValueChange,
}: {
  clients: BusinessClient[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) => {
      return (
        client.name.toLowerCase().includes(term) ||
        (client.email ?? '').toLowerCase().includes(term) ||
        (client.fiscal_identifier ?? '').toLowerCase().includes(term)
      );
    });
  }, [clients, search]);

  return (
    <div className="w-full space-y-2">
      <Input placeholder="Buscar cliente por nombre, email o identificador fiscal" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={clients.length === 0 ? 'No hay clientes' : 'Selecciona un cliente'} />
        </SelectTrigger>
        <SelectContent>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No hay clientes que coincidan con la búsqueda.</div>
          ) : (
            filtered.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 p-5">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
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

function TotalsLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? 'font-semibold text-slate-900' : 'text-slate-600'}>{label}</span>
      <span className={strong ? 'font-semibold text-slate-900' : 'text-slate-700'}>{value}</span>
    </div>
  );
}

function MetricCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardContent className="space-y-2 p-6">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ title, lines }: { title: string; lines: Array<string | null | undefined> }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="font-semibold text-slate-900">{title}</p>
      <div className="mt-3 space-y-1 text-sm text-slate-600">
        {lines.filter(Boolean).map((line, index) => (
          <p key={`${title}-${index}`}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
        status === 'paid' && 'bg-emerald-100 text-emerald-700',
        status === 'partially_paid' && 'bg-amber-100 text-amber-800',
        status === 'pending' && 'bg-blue-100 text-blue-700',
        status === 'issued' && 'bg-indigo-100 text-indigo-700',
        status === 'overdue' && 'bg-red-100 text-red-700',
        status === 'cancelled' && 'bg-slate-200 text-slate-700',
        status === 'draft' && 'bg-slate-100 text-slate-700'
      )}
    >
      {getInvoiceStatusLabel(status)}
    </span>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{text}</div>;
}

function SuccessBanner({ text }: { text: string }) {
  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{text}</div>;
}

function EmptyInvoicesState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function InvoicesLoading() {
  return (
    <div className="space-y-4">
      <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

function createEmptyLine(): InvoiceEditorLine {
  return {
    id: createLineId(),
    product_service_id: '',
    tax_rate_id: '',
    description: '',
    quantity: '1',
    unit: 'unidad',
    unit_price: '0',
    discount_amount: '0',
    discount_rate: '0',
    tax_rate: '0',
    withholding_rate: '0',
  };
}

function buildInitialInvoiceState(profile: ReturnType<typeof useBusinessData>['businessProfile']): InvoiceEditorState {
  const today = new Date().toISOString().slice(0, 10);
  const dueDays = profile?.default_due_days ?? 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  return {
    client_id: '',
    sequence_series: profile?.default_invoice_series || 'GENERAL',
    issue_date: today,
    due_date: dueDate.toISOString().slice(0, 10),
    currency: profile?.currency || 'MAD',
    invoice_language: ((profile?.invoice_language as 'Español' | 'Francés' | 'Árabe') || 'Español'),
    payment_method: profile?.default_payment_method || '',
    financial_account_id: '',
    reference: '',
    notes: profile?.default_invoice_notes || '',
    payment_terms: profile?.default_payment_terms || '',
    internal_notes: profile?.default_internal_notes || '',
    footer_text: profile?.default_invoice_footer || '',
    items: [createEmptyLine()],
  };
}

function mapInvoiceToEditorState(
  invoice: BusinessInvoiceDetail,
  profile: ReturnType<typeof useBusinessData>['businessProfile']
): InvoiceEditorState {
  return {
    client_id: invoice.client_id,
    sequence_series: invoice.sequence_series || profile?.default_invoice_series || 'GENERAL',
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    currency: invoice.currency,
    invoice_language: invoice.invoice_language,
    payment_method: invoice.payment_method || '',
    financial_account_id: invoice.financial_account_id || '',
    reference: invoice.reference || '',
    notes: invoice.notes || '',
    payment_terms: invoice.payment_terms || '',
    internal_notes: invoice.internal_notes || '',
    footer_text: invoice.footer_text || '',
    items:
      invoice.items.length > 0
        ? invoice.items
            .sort((a, b) => a.position - b.position)
            .map((item) => ({
              id: item.id,
              product_service_id: item.product_service_id || '',
              tax_rate_id: item.tax_rate_id || '',
              description: item.description,
              quantity: String(item.quantity),
              unit: item.unit,
              unit_price: String(item.unit_price),
              discount_amount: String(item.discount_amount),
              discount_rate: String(item.discount_rate),
              tax_rate: String(item.tax_rate),
              withholding_rate: String(item.withholding_rate),
            }))
        : [createEmptyLine()],
  };
}

function computeLineAmounts(item: InvoiceEditorLine) {
  const quantity = parsePositiveToMillis(item.quantity);
  const unitPrice = parseMoneyToCents(item.unit_price);
  const discountAmount = parseMoneyToCents(item.discount_amount);
  const discountRate = parsePercentBasisPoints(item.discount_rate);
  const taxRate = parsePercentBasisPoints(item.tax_rate);
  const withholdingRate = parsePercentBasisPoints(item.withholding_rate);

  const subtotal = Math.round((quantity * unitPrice) / 1000);
  const discountFromRate = Math.round((subtotal * discountRate) / 10000);
  const discount = Math.min(subtotal, discountAmount > 0 ? discountAmount : discountFromRate);
  const taxableBase = Math.max(subtotal - discount, 0);
  const tax = Math.round((taxableBase * taxRate) / 10000);
  const withholding = Math.round((taxableBase * withholdingRate) / 10000);
  const total = Math.max(taxableBase + tax - withholding, 0);

  return {
    subtotal,
    discount,
    taxableBase,
    tax,
    withholding,
    total,
  };
}

function computeInvoiceTotals(lines: Array<ReturnType<typeof computeLineAmounts>>) {
  return lines.reduce(
    (acc, current) => ({
      subtotal: acc.subtotal + current.subtotal,
      discount: acc.discount + current.discount,
      taxableBase: acc.taxableBase + current.taxableBase,
      tax: acc.tax + current.tax,
      withholding: acc.withholding + current.withholding,
      total: acc.total + current.total,
    }),
    { subtotal: 0, discount: 0, taxableBase: 0, tax: 0, withholding: 0, total: 0 }
  );
}

function parseMoneyToCents(value: string | number | null | undefined) {
  const normalized = Number.parseFloat(String(value ?? 0).replace(',', '.'));
  if (!Number.isFinite(normalized) || normalized < 0) return 0;
  return Math.round(normalized * 100);
}

function parsePositiveToMillis(value: string | number | null | undefined) {
  const normalized = Number.parseFloat(String(value ?? 0).replace(',', '.'));
  if (!Number.isFinite(normalized) || normalized <= 0) return 0;
  return Math.round(normalized * 1000);
}

function parsePercentBasisPoints(value: string | number | null | undefined) {
  const normalized = Number.parseFloat(String(value ?? 0).replace(',', '.'));
  if (!Number.isFinite(normalized) || normalized < 0) return 0;
  return Math.round(normalized * 100);
}

function toCents(value: string | number | null | undefined) {
  return parseMoneyToCents(value);
}

function hasUnsavedChanges(
  mode: 'create' | 'edit',
  invoice: BusinessInvoiceDetail | null | undefined,
  current: InvoiceEditorState,
  profile: ReturnType<typeof useBusinessData>['businessProfile']
) {
  const baseline = mode === 'edit' && invoice ? mapInvoiceToEditorState(invoice, profile) : buildInitialInvoiceState(profile);
  return JSON.stringify(baseline) !== JSON.stringify(current);
}

function useUnsavedChanges(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);
}

function getInvoiceStatusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Borrador';
    case 'issued':
      return 'Emitida';
    case 'pending':
      return 'Pendiente';
    case 'partially_paid':
      return 'Parcialmente cobrada';
    case 'paid':
      return 'Pagada';
    case 'overdue':
      return 'Vencida';
    case 'cancelled':
      return 'Anulada';
    default:
      return status;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-ES');
}

function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(Number(value));
}

function createLineId() {
  return `line_${Math.random().toString(36).slice(2, 11)}`;
}
