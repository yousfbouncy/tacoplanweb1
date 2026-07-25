import { z } from 'zod';

const optionalTrimmedString = z.union([z.string().trim(), z.null(), z.undefined()]).transform((value) => {
  if (!value) return null;
  return value;
});

export const businessProfileSchema = z.object({
  business_name: z.string().trim().min(2, 'Indica el nombre comercial'),
  legal_name: z.string().trim().min(2, 'Indica el nombre completo o razón social'),
  activity_type: z.string().trim().min(2, 'Indica el tipo de actividad'),
  category: z.enum([
    'Comercio',
    'Artesanía',
    'Servicios',
    'Transporte',
    'Construcción',
    'Profesión independiente',
    'Otra',
  ]),
  fiscal_identifier: optionalTrimmedString,
  autoentrepreneur_identifier: optionalTrimmedString,
  phone: optionalTrimmedString,
  email: z
    .union([z.string().trim().email('Introduce un correo válido'), z.literal(''), z.null(), z.undefined()])
    .transform((value) => value || null),
  address: optionalTrimmedString,
  city: optionalTrimmedString,
  country: z.string().trim().min(2).default('Marruecos'),
  currency: z.string().trim().min(3).default('MAD'),
  invoice_language: z.enum(['Francés', 'Árabe', 'Español']),
  logo_url: z
    .union([z.string().trim().url('Introduce una URL válida para el logo'), z.literal(''), z.null(), z.undefined()])
    .transform((value) => value || null),
  invoice_prefix: z.string().trim().min(1, 'Indica un prefijo de factura').max(10),
  next_invoice_number: z.coerce.number().int().min(1, 'El número inicial debe ser mayor que 0'),
  declaration_frequency: z.enum(['Mensual', 'Trimestral', 'Sin configurar']),
  estimated_tax_percentage: z
    .union([z.coerce.number().min(0, 'El porcentaje no puede ser negativo').max(100, 'Máximo 100'), z.nan()])
    .transform((value) => (Number.isNaN(value) ? null : value)),
  calculate_tax: z.boolean(),
  timezone: z.string().trim().default('Africa/Casablanca'),
  date_format: z.string().trim().default('dd/MM/yyyy'),
  locale: z.string().trim().default('fr-MA'),
});

export const businessClientSchema = z.object({
  name: z.string().trim().min(2, 'Indica el nombre o razón social'),
  client_type: z.enum(['Particular', 'Empresa']),
  fiscal_identifier: optionalTrimmedString,
  phone: optionalTrimmedString,
  email: z
    .union([z.string().trim().email('Introduce un correo válido'), z.literal(''), z.null(), z.undefined()])
    .transform((value) => value || null),
  address: optionalTrimmedString,
  city: optionalTrimmedString,
  country: optionalTrimmedString,
  notes: optionalTrimmedString,
  status: z.enum(['Activo', 'Archivado']),
});

export const businessExpenseCategorySchema = z.object({
  name: z.string().trim().min(2, 'Indica un nombre para la categoría'),
  description: optionalTrimmedString,
  color: z.string().trim().regex(/^#([0-9a-fA-F]{6})$/, 'Usa un color hexadecimal válido'),
  status: z.enum(['Activa', 'Archivada']),
});

export const businessFinancialAccountSchema = z.object({
  name: z.string().trim().min(2, 'Indica un nombre para la cuenta'),
  account_type: z.enum(['Caja en efectivo', 'Cuenta bancaria', 'Tarjeta', 'Cuenta móvil', 'Otra']),
  opening_balance: z.coerce.number(),
  currency: z.string().trim().min(3, 'Indica una moneda válida'),
  opening_balance_date: z.string().trim().min(8, 'Indica la fecha del saldo inicial'),
  status: z.enum(['Activa', 'Archivada']),
});

export const businessInvoiceItemSchema = z.object({
  id: z.string().trim().optional(),
  product_service_id: z.union([z.string().trim().uuid(), z.literal(''), z.null(), z.undefined()]).transform((value) => value || null),
  tax_rate_id: z.union([z.string().trim().uuid(), z.literal(''), z.null(), z.undefined()]).transform((value) => value || null),
  description: z.string().trim().min(1, 'Cada línea debe tener una descripción'),
  quantity: z.coerce.number().positive('La cantidad debe ser mayor que 0'),
  unit: z.string().trim().min(1, 'Indica la unidad'),
  unit_price: z.coerce.number().min(0, 'El precio unitario no puede ser negativo'),
  discount_amount: z.coerce.number().min(0, 'El descuento no puede ser negativo').default(0),
  discount_rate: z.coerce.number().min(0, 'El descuento no puede ser negativo').max(100, 'Máximo 100').default(0),
  tax_rate: z.coerce.number().min(0, 'El impuesto no puede ser negativo').max(100, 'Máximo 100').default(0),
  withholding_rate: z.coerce.number().min(0, 'La retención no puede ser negativa').max(100, 'Máximo 100').default(0),
});

export const businessInvoiceSchema = z
  .object({
    business_profile_id: z.string().trim().uuid('Perfil de negocio no válido'),
    client_id: z.string().trim().uuid('Selecciona un cliente'),
    financial_account_id: z.union([z.string().trim().uuid(), z.literal(''), z.null(), z.undefined()]).transform((value) => value || null),
    issue_date: z.string().trim().min(8, 'Indica la fecha de emisión'),
    due_date: z.string().trim().min(8, 'Indica la fecha de vencimiento'),
    currency: z.string().trim().min(3, 'Indica una moneda válida'),
    invoice_language: z.enum(['Español', 'Francés', 'Árabe', 'Inglés']),
    sequence_series: z.string().trim().min(1, 'Indica una serie'),
    payment_method: optionalTrimmedString,
    reference: optionalTrimmedString,
    notes: optionalTrimmedString,
    payment_terms: optionalTrimmedString,
    internal_notes: optionalTrimmedString,
    footer_text: optionalTrimmedString,
    save_mode: z.enum(['draft', 'issue']),
    items: z.array(businessInvoiceItemSchema).min(1, 'Debes añadir al menos una línea'),
  })
  .superRefine((value, ctx) => {
    if (value.due_date < value.issue_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['due_date'],
        message: 'La fecha de vencimiento no puede ser anterior a la fecha de emisión',
      });
    }
  });

export const businessInvoicePaymentSchema = z.object({
  invoice_id: z.string().trim().uuid('Factura no válida'),
  financial_account_id: z.union([z.string().trim().uuid(), z.literal(''), z.null(), z.undefined()]).transform((value) => value || null),
  payment_date: z.string().trim().min(8, 'Indica la fecha del cobro'),
  amount: z.coerce.number().positive('El importe debe ser mayor que 0'),
  payment_method: optionalTrimmedString,
  reference: optionalTrimmedString,
  notes: optionalTrimmedString,
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
export type BusinessClientInput = z.infer<typeof businessClientSchema>;
export type BusinessExpenseCategoryInput = z.infer<typeof businessExpenseCategorySchema>;
export type BusinessFinancialAccountInput = z.infer<typeof businessFinancialAccountSchema>;
export type BusinessInvoiceItemInput = z.infer<typeof businessInvoiceItemSchema>;
export type BusinessInvoiceInput = z.infer<typeof businessInvoiceSchema>;
export type BusinessInvoicePaymentInput = z.infer<typeof businessInvoicePaymentSchema>;
