'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Language = 'es' | 'en' | 'fr' | 'ar';
const translations = {
  es: { title: 'Restablecer contraseña', subtitle: 'Introduce y confirma tu nueva contraseña de Tacoplan.', password: 'Nueva contraseña', confirm: 'Confirmar contraseña', save: 'Guardar contraseña', saving: 'Guardando...', loading: 'Comprobando enlace de recuperación...', success: 'Contraseña actualizada. Ya puedes iniciar sesión en Tacoplan.', invalid: 'El enlace no es válido o ha caducado. Solicita otro desde la aplicación.', mismatch: 'Las contraseñas no coinciden.', short: 'La contraseña debe tener al menos 8 caracteres.', login: 'Iniciar sesión', retry: 'Volver a Tacoplan' },
  en: { title: 'Reset password', subtitle: 'Enter and confirm your new Tacoplan password.', password: 'New password', confirm: 'Confirm password', save: 'Save password', saving: 'Saving...', loading: 'Checking recovery link...', success: 'Password updated. You can now sign in to Tacoplan.', invalid: 'This link is invalid or has expired. Request another from the app.', mismatch: 'Passwords do not match.', short: 'Password must have at least 8 characters.', login: 'Sign in', retry: 'Back to Tacoplan' },
  fr: { title: 'Réinitialiser le mot de passe', subtitle: 'Saisissez et confirmez votre nouveau mot de passe Tacoplan.', password: 'Nouveau mot de passe', confirm: 'Confirmer le mot de passe', save: 'Enregistrer le mot de passe', saving: 'Enregistrement...', loading: 'Vérification du lien...', success: 'Mot de passe mis à jour. Vous pouvez vous connecter à Tacoplan.', invalid: 'Ce lien est invalide ou expiré. Demandez-en un autre dans l’application.', mismatch: 'Les mots de passe ne correspondent pas.', short: 'Le mot de passe doit comporter au moins 8 caractères.', login: 'Se connecter', retry: 'Retour à Tacoplan' },
  ar: { title: 'إعادة تعيين كلمة المرور', subtitle: 'أدخل كلمة المرور الجديدة لتاكوبلان وأكدها.', password: 'كلمة المرور الجديدة', confirm: 'تأكيد كلمة المرور', save: 'حفظ كلمة المرور', saving: 'جارٍ الحفظ...', loading: 'جارٍ التحقق من رابط الاستعادة...', success: 'تم تحديث كلمة المرور. يمكنك الآن تسجيل الدخول إلى تاكوبلان.', invalid: 'الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا من التطبيق.', mismatch: 'كلمتا المرور غير متطابقتين.', short: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.', login: 'تسجيل الدخول', retry: 'العودة إلى تاكوبلان' },
} as const;

export default function ResetPasswordPage() {
  const [language, setLanguage] = useState<Language>('es');
  const [status, setStatus] = useState<'checking' | 'ready' | 'saving' | 'success' | 'error'>('checking');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const t = translations[language];

  useEffect(() => {
    const url = new URL(window.location.href);
    const queryLang = url.searchParams.get('lang');
    const browserLang = navigator.language.split('-')[0];
    const candidate = queryLang || browserLang;
    if (candidate === 'es' || candidate === 'en' || candidate === 'fr' || candidate === 'ar') setLanguage(candidate);

    let active = true;
    const checkRecovery = async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const authError = hash.get('error_description') || hash.get('error') || url.searchParams.get('error_description') || url.searchParams.get('error');
        if (authError) throw new Error(authError);
        const type = hash.get('type') || url.searchParams.get('type');
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        const tokenHash = url.searchParams.get('token_hash');
        const code = url.searchParams.get('code');

        if (type && type !== 'recovery') throw new Error('Not a recovery link');
        if (accessToken && refreshToken && type === 'recovery') {
          const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionError) throw sessionError;
        } else if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
          if (verifyError) throw verifyError;
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (type !== 'recovery') {
          throw new Error('Missing recovery credentials');
        }

        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) throw userError || new Error('No session');
        if (!active) return;
        // Remove credentials from the visible browser URL after verification.
        window.history.replaceState(null, '', window.location.pathname + '?lang=' + candidate);
        setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    };
    void checkRecovery();
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) { setError(t.short); return; }
    if (password !== confirm) { setError(t.mismatch); return; }
    setStatus('saving');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError(updateError.message); setStatus('ready'); return; }
    setPassword('');
    setConfirm('');
    await supabase.auth.signOut();
    setStatus('success');
  };

  return (
    <main dir={language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-5">
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7 shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-6">
          <Link href="/" className="font-bold text-xl text-white">Tacoplan</Link>
          <select aria-label="Language" className="bg-slate-800 border border-slate-600 rounded p-2 text-sm" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            <option value="es">Español</option><option value="en">English</option><option value="fr">Français</option><option value="ar">العربية</option>
          </select>
        </div>
        <h1 className="text-2xl font-bold mb-2">{t.title}</h1>
        <p className="text-slate-300 mb-6">{t.subtitle}</p>
        {status === 'checking' && <p role="status">{t.loading}</p>}
        {status === 'error' && <div role="alert" className="text-red-300 space-y-4"><p>{t.invalid}</p><a href="tacoplan://login" className="underline block">{t.retry}</a></div>}
        {status === 'success' && <div role="status" className="space-y-4"><p className="text-emerald-300">{t.success}</p><Link className="underline block" href="/login">{t.login}</Link><a href="tacoplan://login" className="underline block">{t.retry}</a></div>}
        {(status === 'ready' || status === 'saving') && (
          <form className="space-y-4" onSubmit={submit}>
            <label className="block text-sm">{t.password}<input className="mt-2 w-full rounded-lg p-3 bg-slate-800 border border-slate-600" type="password" autoComplete="new-password" minLength={8} required value={password} disabled={status === 'saving'} onChange={(e) => setPassword(e.target.value)} /></label>
            <label className="block text-sm">{t.confirm}<input className="mt-2 w-full rounded-lg p-3 bg-slate-800 border border-slate-600" type="password" autoComplete="new-password" minLength={8} required value={confirm} disabled={status === 'saving'} onChange={(e) => setConfirm(e.target.value)} /></label>
            {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
            <button type="submit" disabled={status === 'saving'} className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 py-3 font-semibold">{status === 'saving' ? t.saving : t.save}</button>
          </form>
        )}
      </section>
    </main>
  );
}
