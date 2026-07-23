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
export type BusinessAccountType =
  | 'Caja en efectivo'
  | 'Cuenta bancaria'
  | 'Tarjeta'
  | 'Cuenta móvil'
  | 'Otra';
export type BusinessAccountStatus = 'Activa' | 'Archivada';

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
