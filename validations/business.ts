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

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
export type BusinessClientInput = z.infer<typeof businessClientSchema>;
export type BusinessExpenseCategoryInput = z.infer<typeof businessExpenseCategorySchema>;
export type BusinessFinancialAccountInput = z.infer<typeof businessFinancialAccountSchema>;
