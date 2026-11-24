import { cookies } from 'next/headers';
import Link from 'next/link';
import { ADMIN_COOKIE_NAME, getAdminPassword, verifyAdminToken } from '@/lib/admin-auth';
import { AdminAccess } from '@/components/admin-access';
import { AdminDashboardTabs } from '@/components/admin-dashboard-tabs';

export const dynamic = 'force-dynamic';
export const metadata = {title:'Administración y estadísticas | Tacoplan',robots:{index:false,follow:false}};

export default function DesarrolloPage() {
 const password = getAdminPassword();
 if (!password) return <main className="mx-auto max-w-xl px-5 py-20"><h1 className="text-2xl font-bold">Administración de Tacoplan</h1><p className="mt-4 text-slate-600">Configura TACOPLAN_ADMIN_PASSWORD en el servidor para activar el acceso privado.</p></main>;
 const secret = process.env.TACOPLAN_ADMIN_COOKIE_SECRET?.trim() || password;
 const authorized = verifyAdminToken(secret,cookies().get(ADMIN_COOKIE_NAME)?.value,30*24*60*60*1000);
 return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
   {authorized ? <><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Panel de administrador</h1><p className="mt-1 text-sm text-slate-500">Actividad y estadísticas de Tacoplan</p></div><AdminAccess mode="logout"/></div><nav aria-label="Gestión de suscripciones" className="grid gap-3 sm:grid-cols-2"><Link href="/admin/suscriptores" className="rounded-2xl border border-blue-200 bg-white px-5 py-4 shadow-sm transition hover:border-blue-500 hover:bg-blue-50"><span className="block text-base font-bold text-blue-800">Gestionar suscripciones</span><span className="mt-1 block text-sm text-slate-600">Usuarios, accesos gratuitos Pro y suscripciones.</span></Link><Link href="/admin/planes" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-blue-500 hover:bg-blue-50"><span className="block text-base font-bold text-slate-900">Planes y cobros</span><span className="mt-1 block text-sm text-slate-600">Tarifas, activación de cobros y restricciones de planes.</span></Link></nav><AdminDashboardTabs/></> : <AdminAccess mode="login"/>}
 </div></main>;
}
