import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, getAdminPassword, verifyAdminToken } from '@/lib/admin-auth';
import { AdminLogin, SiteContentEditor } from '@/app/desarrollo/client';
import { AdminStatsDashboard } from '@/components/admin-stats-dashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Panel privado | Tacoplan', robots: { index: false, follow: false } };

export default function DesarrolloPage() {
  const password = getAdminPassword();
  if (!password) return <div className="mx-auto max-w-lg px-6 py-20"><h1 className="text-xl font-bold">Panel privado</h1><p className="mt-3">Configura TACOPLAN_ADMIN_PASSWORD en Vercel para habilitar el acceso.</p></div>;
  const secret = process.env.TACOPLAN_ADMIN_COOKIE_SECRET?.trim() || password;
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  const authed = verifyAdminToken(secret,token,1000*60*60*24*30);
  return <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6"><div className="mx-auto max-w-6xl space-y-10">
    {authed?<><AdminStatsDashboard/><div className="border-t border-slate-200 pt-8"><SiteContentEditor/></div></>:<AdminLogin/>}
  </div></div>;
}
