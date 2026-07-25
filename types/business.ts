export type BusinessCategory =
  | 'Comercio'
  | 'Artesanía'
  | 'Servicios'
  | 'Transporte'
  | 'Construcción'
  | 'Profesión independiente'
  | 'Otra';

export type BusinessInvoiceLanguage = 'Francés' | 'Árabe' | 'Español';
export type BusinessDeclarationFrequency = 'Mensual' | 'Trimestral' | 'Sin configurar';
export type BusinessClientType = 'Particular' | 'Empresa';
export type BusinessClientStatus = 'Activo' | 'Archivado';
export type BusinessDocumentType = 'invoice';
export type BusinessAccountType =
  | 'Caja en efectivo'
  | 'Cuenta bancaria'
  | 'Tarjeta'
  | 'Cuenta móvil'
  | 'Otra';
export type BusinessAccountStatus = 'Activa' | 'Archivada';
export type BusinessInvoiceStatus =
  | 'draft'
  | 'issued'
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';
export type BusinessItemType = 'product' | 'service';

export type BusinessProfile = {
  id: string;
  user_id: string;
  business_name: string;
  legal_name: string;
  activity_type: string;
  category: BusinessCategory;
  fiscal_identifier: string | null;
  autoentrepreneur_identifier: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string;
  currency: string;
  invoice_language: BusinessInvoiceLanguage;
  logo_url: string | null;
  invoice_prefix: string;
  next_invoice_number: number;
  default_invoice_series?: string;
  default_due_days?: number;
  default_invoice_notes?: string | null;
  default_payment_terms?: string | null;
  default_internal_notes?: string | null;
  default_invoice_footer?: string | null;
  default_payment_method?: string | null;
  declaration_frequency: BusinessDeclarationFrequency;
  estimated_tax_percentage: number | null;
  calculate_tax: boolean;
  timezone: string;
  date_format: string;
  locale: string;
  onboarding_completed: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export type BusinessClient = {
  id: string;
  user_id: string;
  business_profile_id: string | null;
  name: string;
  client_type: BusinessClientType;
  fiscal_identifier: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  status: BusinessClientStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type BusinessExpenseCategory = {
  id: string;
  user_id: string;
  business_profile_id: string | null;
  name: string;
  description: string | null;
  color: string | null;
  is_system: boolean;
  status: 'Activa' | 'Archivada';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type BusinessFinancialAccount = {
  id: string;
  user_id: string;
  business_profile_id: string | null;
  name: string;
  account_type: BusinessAccountType;
  opening_balance: number;
  currency: string;
  opening_balance_date: string;
  status: BusinessAccountStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type BusinessAuditLog = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type BusinessDocumentSequence = {
  id: string;
  user_id: string;
  business_profile_id: string;
  document_type: BusinessDocumentType;
  series: string;
  document_year: number;
  last_number: number;
  created_at: string;
  updated_at: string;
};

export type BusinessTaxRate = {
  id: string;
  user_id: string;
  business_profile_id: string;
  name: string;
  country_code: string | null;
  rate: number;
  is_default: boolean;
  is_withholding: boolean;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type BusinessProductService = {
  id: string;
  user_id: string;
  business_profile_id: string;
  item_type: BusinessItemType;
  name: string;
  description: string | null;
  reference: string | null;
  unit: string;
  unit_price: number;
  tax_rate_id: string | null;
  tax_rate: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type BusinessInvoice = {
  id: string;
  user_id: string;
  business_profile_id: string;
  client_id: string;
  financial_account_id: string | null;
  invoice_number: string | null;
  sequence_series: string;
  sequence_year: number | null;
  sequence_number: number | null;
  issue_date: string;
  due_date: string;
  currency: string;
  invoice_language: 'Español' | 'Francés' | 'Árabe' | 'Inglés';
  status: BusinessInvoiceStatus;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  payment_terms: string | null;
  internal_notes: string | null;
  footer_text: string | null;
  subtotal_amount: number;
  discount_amount: number;
  taxable_base_amount: number;
  tax_amount: number;
  withholding_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due_amount: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  cancelled_at: string | null;
};

export type BusinessInvoiceItem = {
  id: string;
  user_id: string;
  business_profile_id: string;
  invoice_id: string;
  product_service_id: string | null;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_amount: number;
  discount_rate: number;
  tax_rate_id: string | null;
  tax_rate: number;
  withholding_rate: number;
  line_subtotal_amount: number;
  line_taxable_base_amount: number;
  line_tax_amount: number;
  line_withholding_amount: number;
  line_total_amount: number;
  created_at: string;
  updated_at: string;
};

export type BusinessInvoicePayment = {
  id: string;
  user_id: string;
  business_profile_id: string;
  invoice_id: string;
  financial_account_id: string | null;
  payment_date: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessInvoiceListItem = BusinessInvoice & {
  client: Pick<BusinessClient, 'id' | 'name' | 'email' | 'fiscal_identifier'> | null;
};

export type BusinessInvoiceDetail = BusinessInvoice & {
  client: BusinessClient | null;
  account: BusinessFinancialAccount | null;
  items: BusinessInvoiceItem[];
  payments: BusinessInvoicePayment[];
};
