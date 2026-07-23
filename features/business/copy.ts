export const businessCopy = {
  moduleTitle: 'Mi negocio',
  moduleDescription:
    'Controla clientes, gastos y cuentas de forma sencilla. Pensado para pequeños autónomos y autoemprendedores.',
  betaNotice:
    'Tacoplan Business está en fase inicial. La información fiscal es orientativa y debe confirmarse con tu gestor o con la administración correspondiente.',
  sidebar: {
    summary: 'Resumen',
    settings: 'Configuración del negocio',
    clients: 'Clientes',
    invoices: 'Facturas',
    income: 'Ingresos',
    expenses: 'Gastos',
    accounts: 'Caja y bancos',
    reports: 'Informes',
  },
  placeholders: {
    invoices: 'La facturación se implementará en la Fase 2.',
    income: 'Los ingresos manuales y pagos llegarán en la Fase 3.',
    reports: 'Los informes y exportaciones llegarán en la Fase 4.',
  },
  emptyStates: {
    clients: 'Todavía no tienes clientes. Crea tu primer cliente para empezar a organizar tu negocio.',
    categories:
      'Todavía no tienes categorías personalizadas. Puedes usar las categorías iniciales o crear tus propias categorías.',
    accounts:
      'Todavía no has creado cuentas financieras. Añade una caja o cuenta bancaria para empezar a controlar tu saldo.',
  },
} as const;

export const businessCategories = [
  'Comercio',
  'Artesanía',
  'Servicios',
  'Transporte',
  'Construcción',
  'Profesión independiente',
  'Otra',
] as const;

export const invoiceLanguages = ['Francés', 'Árabe', 'Español'] as const;
export const declarationFrequencies = ['Mensual', 'Trimestral', 'Sin configurar'] as const;
export const clientTypes = ['Particular', 'Empresa'] as const;
export const clientStatuses = ['Activo', 'Archivado'] as const;
export const financialAccountTypes = [
  'Caja en efectivo',
  'Cuenta bancaria',
  'Tarjeta',
  'Cuenta móvil',
  'Otra',
] as const;
export const accountStatuses = ['Activa', 'Archivada'] as const;

export const defaultExpenseCategories = [
  'Combustible',
  'Vehículo',
  'Reparaciones',
  'Alquiler',
  'Electricidad',
  'Agua',
  'Teléfono e Internet',
  'Material',
  'Mercancía',
  'Transporte',
  'Personal',
  'Seguros',
  'Impuestos y tasas',
  'Gestoría',
  'Comisiones bancarias',
  'Publicidad',
  'Comida y dietas',
  'Herramientas',
  'Otros',
] as const;

export const accountTypeLabels: Record<(typeof financialAccountTypes)[number], string> = {
  'Caja en efectivo': 'Caja en efectivo',
  'Cuenta bancaria': 'Cuenta bancaria',
  Tarjeta: 'Tarjeta',
  'Cuenta móvil': 'Cuenta móvil',
  Otra: 'Otra',
};
