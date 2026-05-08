import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, getAdminPassword, verifyAdminToken } from '@/lib/admin-auth';
import { AdminLogin, SiteContentEditor } from '@/app/desarrollo/client';

export const metadata = {
  title: 'Desarrollo - Tacoplan',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesarrolloPage() {
  const password = getAdminPassword();
  if (!password) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="max-w-xl mx-auto">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">Panel de desarrollo</h1>
            <p className="mt-2 text-sm text-slate-600">
              Falta configurar la contraseña de admin en el servidor. Define{' '}
              <span className="font-mono">TACOPLAN_ADMIN_PASSWORD</span> en Vercel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const cookieSecret = process.env.TACOPLAN_ADMIN_COOKIE_SECRET?.trim() || password;
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  const authed = verifyAdminToken(cookieSecret, token, 1000 * 60 * 60 * 24 * 30);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {authed ? <SiteContentEditor /> : <AdminLogin />}
      </div>
    </div>
  );
}
