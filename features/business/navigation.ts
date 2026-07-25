import {
  Banknote,
  BriefcaseBusiness,
  CircleHelp,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  HandCoins,
  LayoutDashboard,
  Receipt,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';

export type BusinessNavLink = {
  label: string;
  href: string;
  phase: 'Fase 1' | 'Fase 2' | 'Fase 3' | 'Fase 4' | 'Disponible';
  available: boolean;
};

export type BusinessNavGroup = {
  label: string;
  icon: typeof LayoutDashboard;
  items: BusinessNavLink[];
};

export const businessNavigation: BusinessNavGroup[] = [
  {
    label: 'Resumen',
    icon: LayoutDashboard,
    items: [{ label: 'Resumen', href: '/mi-negocio/resumen', phase: 'Disponible', available: true }],
  },
  {
    label: 'Ventas',
    icon: FileText,
    items: [
      { label: 'Facturas', href: '/mi-negocio/facturas', phase: 'Fase 2', available: false },
      { label: 'Presupuestos', href: '/mi-negocio/presupuestos', phase: 'Fase 4', available: false },
      { label: 'Clientes', href: '/mi-negocio/clientes', phase: 'Disponible', available: true },
      { label: 'Productos y servicios', href: '/mi-negocio/productos-servicios', phase: 'Fase 2', available: false },
    ],
  },
  {
    label: 'Gastos',
    icon: Receipt,
    items: [
      { label: 'Gastos', href: '/mi-negocio/gastos', phase: 'Fase 3', available: false },
      { label: 'Categorías', href: '/mi-negocio/gastos/categorias', phase: 'Disponible', available: true },
      { label: 'Proveedores', href: '/mi-negocio/proveedores', phase: 'Fase 3', available: false },
    ],
  },
  {
    label: 'Finanzas',
    icon: Wallet,
    items: [
      { label: 'Ingresos', href: '/mi-negocio/ingresos', phase: 'Fase 3', available: false },
      { label: 'Caja y bancos', href: '/mi-negocio/caja-bancos', phase: 'Disponible', available: true },
      { label: 'Transferencias', href: '/mi-negocio/transferencias', phase: 'Fase 3', available: false },
    ],
  },
  {
    label: 'Contabilidad',
    icon: FileSpreadsheet,
    items: [
      { label: 'Asientos contables', href: '/mi-negocio/asientos-contables', phase: 'Fase 4', available: false },
      { label: 'Impuestos', href: '/mi-negocio/impuestos', phase: 'Fase 4', available: false },
    ],
  },
  {
    label: 'Informes',
    icon: FileBarChart2,
    items: [
      { label: 'Resumen financiero', href: '/mi-negocio/informes/resumen-financiero', phase: 'Fase 4', available: false },
      { label: 'Balance', href: '/mi-negocio/informes/balance', phase: 'Fase 4', available: false },
      { label: 'Pérdidas y ganancias', href: '/mi-negocio/informes/perdidas-ganancias', phase: 'Fase 4', available: false },
      { label: 'Ingresos y gastos', href: '/mi-negocio/informes/ingresos-gastos', phase: 'Fase 4', available: false },
      { label: 'Facturas pendientes', href: '/mi-negocio/informes/facturas-pendientes', phase: 'Fase 4', available: false },
      { label: 'Exportaciones', href: '/mi-negocio/informes/exportaciones', phase: 'Fase 4', available: false },
    ],
  },
  {
    label: 'Configuración',
    icon: Settings,
    items: [
      { label: 'Mi negocio', href: '/mi-negocio/configuracion', phase: 'Disponible', available: true },
      { label: 'Numeración de facturas', href: '/mi-negocio/configuracion/numeracion', phase: 'Fase 2', available: false },
      { label: 'Impuestos', href: '/mi-negocio/configuracion/impuestos', phase: 'Fase 4', available: false },
      { label: 'Métodos de pago', href: '/mi-negocio/configuracion/metodos-pago', phase: 'Fase 2', available: false },
      { label: 'Usuarios', href: '/mi-negocio/configuracion/usuarios', phase: 'Fase 4', available: false },
      { label: 'Preferencias', href: '/mi-negocio/configuracion/preferencias', phase: 'Fase 4', available: false },
    ],
  },
  {
    label: 'Ayuda y soporte',
    icon: CircleHelp,
    items: [{ label: 'Ayuda y soporte', href: '/mi-negocio/ayuda', phase: 'Fase 4', available: false }],
  },
];

export const businessTopActions = [
  { label: 'Nueva factura', href: '/mi-negocio/facturas/nueva', icon: FileText },
  { label: 'Nuevo cliente', href: '/mi-negocio/clientes', icon: Users },
  { label: 'Nuevo gasto', href: '/mi-negocio/gastos', icon: Banknote },
  { label: 'Añadir cuenta', href: '/mi-negocio/caja-bancos', icon: HandCoins },
  { label: 'Configurar negocio', href: '/mi-negocio/configuracion', icon: BriefcaseBusiness },
  { label: 'Categorías', href: '/mi-negocio/gastos/categorias', icon: ShoppingBag },
];

export function findBusinessLink(pathname: string) {
  const normalized = pathname.replace(/\/$/, '') || '/mi-negocio/resumen';
  let match: BusinessNavLink | null = null;

  for (const group of businessNavigation) {
    for (const item of group.items) {
      if (normalized === item.href || normalized.startsWith(`${item.href}/`)) {
        if (!match || item.href.length > match.href.length) {
          match = item;
        }
      }
    }
  }

  return match;
}

export function getBusinessPageMeta(pathname: string) {
  const current = findBusinessLink(pathname);
  const defaultTitle = pathname
    .replace('/mi-negocio', '')
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/-/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ');

  return {
    title: current?.label ?? (defaultTitle || 'Mi negocio'),
    phase: current?.phase ?? 'Fase 4',
    available: current?.available ?? false,
  };
}
