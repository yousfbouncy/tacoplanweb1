'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HomePageView } from '@/components/home-page-view';

type SiteContentRow = {
  key: string;
  draft_value: string | null;
  published_value: string | null;
  updated_at: string | null;
};

type FieldDef = {
  key: string;
  label: string;
  kind: 'input' | 'textarea';
};

const FIELDS: FieldDef[] = [
  { key: 'home_title', label: 'Home · Título principal', kind: 'input' },
  { key: 'home_subtitle', label: 'Home · Subtítulo', kind: 'textarea' },
  { key: 'home_beta_notice', label: 'Home · Aviso beta', kind: 'input' },
  { key: 'home_about', label: 'Home · ¿Qué es Tacoplan?', kind: 'textarea' },
  { key: 'home_benefits_title', label: 'Home · Título beneficios', kind: 'input' },
  { key: 'home_benefits_subtitle', label: 'Home · Texto beneficios', kind: 'textarea' },
  { key: 'home_final_cta_title', label: 'Home · CTA final (título)', kind: 'textarea' },
];

const DEFAULT_CONTENT: Record<string, string> = {
  "home_title": "Tu jornada bajo control. Sin libreta ni cálculos manuales.",
  "home_subtitle": "Consulta tu conducción y descansos desde el móvil, recibe avisos preventivos y lleva tus dietas a mano. Menos cálculos, más tranquilidad en carretera.",
  "home_beta_notice": "Herramienta de apoyo al conductor. No sustituye al tacógrafo oficial.",
  "home_about": "Tacoplan nació de las dificultades que vivimos los camioneros para controlar nuestras horas y descansos sin recurrir constantemente al tacógrafo o a apuntes manuales. La app ayuda a organizar tus registros y anticipar posibles errores.",
  "home_benefits_title": "Todo lo que necesitas, a mano",
  "home_benefits_subtitle": "Control de jornada, descansos, dietas y avisos de posibles infracciones en una sola aplicación.",
  "home_final_cta_title": "Empieza a llevar tus jornadas con Tacoplan"
};

function toMap(rows: SiteContentRow[]): Record<string, SiteContentRow> {
  const map: Record<string, SiteContentRow> = {};
  for (const r of rows) map[r.key] = r;
  return map;
}

export function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || 'Contraseña incorrecta');
        return;
      }
      window.location.reload();
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Panel de desarrollo</CardTitle>
          <CardDescription>Acceso privado</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700">Contraseña</div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Introduce la contraseña"
                autoComplete="current-password"
              />
              {error ? <div className="text-sm text-red-600">{error}</div> : null}
            </div>
            <Button type="submit" className="w-full" disabled={loading || !password.trim()}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function SiteContentEditor() {
  const [rows, setRows] = useState<Record<string, SiteContentRow>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const keys = useMemo(() => FIELDS.map((f) => f.key), []);

  const fetchContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const search = new URLSearchParams({ keys: keys.join(',') });
      const res = await fetch(`/api/admin/site-content?${search.toString()}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as { ok?: boolean; data?: SiteContentRow[]; error?: string };
      if (!res.ok || !json.ok || !Array.isArray(json.data)) {
        throw new Error(json.error || 'No se pudo cargar el contenido');
      }
      const map = toMap(json.data);
      setRows(map);
      const nextDraft: Record<string, string> = {};
      for (const k of keys) {
        const r = map[k];
        const value = r?.draft_value ?? r?.published_value ?? DEFAULT_CONTENT[k] ?? '';
        nextDraft[k] = value;
      }
      setDraft(nextDraft);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el contenido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [keys]);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.reload();
  };

  const save = async (action: 'save_draft' | 'publish') => {
    setStatus(null);
    setError(null);
    if (action === 'save_draft') setSaving(true);
    if (action === 'publish') setPublishing(true);
    try {
      const res = await fetch('/api/admin/site-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, entries: draft }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'No se pudo guardar');
      }
      setStatus(action === 'publish' ? 'Cambios publicados' : 'Borrador guardado');
      await fetchContent();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editor de contenido</h1>
          <p className="text-sm text-slate-600">Edita borrador y publica cambios en la web.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setPreview((v) => !v)}>
            {preview ? 'Ocultar vista previa' : 'Vista previa'}
          </Button>
          <Button variant="outline" onClick={logout}>
            Salir
          </Button>
        </div>
      </div>

      {status ? (
        <div className="rounded-xl border bg-white px-4 py-3 text-sm text-emerald-700">{status}</div>
      ) : null}
      {error ? (
        <div className="rounded-xl border bg-white px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Contenido (borrador)</CardTitle>
            <CardDescription>Guarda como borrador o publica para que se vea en la web.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="text-sm text-slate-600">Cargando…</div>
            ) : (
              <div className="space-y-4">
                {FIELDS.map((field) => {
                  const value = draft[field.key] ?? '';
                  const published = rows[field.key]?.published_value ?? '';
                  const updatedAt = rows[field.key]?.updated_at ?? null;
                  return (
                    <div key={field.key} className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium text-slate-800">{field.label}</div>
                        <div className="text-xs text-slate-500">
                          Publicado: {published ? 'Sí' : 'No (se muestra el texto predeterminado)'}{updatedAt ? ` · Actualizado: ${new Date(updatedAt).toLocaleString()}` : ''}
                        </div>
                      </div>
                      {field.kind === 'textarea' ? (
                        <Textarea
                          value={value}
                          onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                          rows={4}
                        />
                      ) : (
                        <Input
                          value={value}
                          onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={loading || saving || publishing}
                onClick={() => save('save_draft')}
              >
                {saving ? 'Guardando…' : 'Guardar borrador'}
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={loading || saving || publishing}
                onClick={() => save('publish')}
              >
                {publishing ? 'Publicando…' : 'Guardar y publicar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {preview ? (<Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Vista previa del borrador</CardTitle>
            <CardDescription>
              Así quedaría la portada con los textos del borrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden rounded-2xl border bg-white p-0">
            <div className="max-h-[75vh] overflow-auto">
              <HomePageView
                heroTitle={draft.home_title || DEFAULT_CONTENT.home_title}
                heroSubtitle={draft.home_subtitle || DEFAULT_CONTENT.home_subtitle}
                betaNotice={draft.home_beta_notice || DEFAULT_CONTENT.home_beta_notice}
                aboutText={draft.home_about || DEFAULT_CONTENT.home_about}
                benefitsTitle={draft.home_benefits_title || DEFAULT_CONTENT.home_benefits_title}
                benefitsSubtitle={draft.home_benefits_subtitle || DEFAULT_CONTENT.home_benefits_subtitle}
                finalCtaTitle={draft.home_final_cta_title || DEFAULT_CONTENT.home_final_cta_title}
              />
            </div>
          </CardContent>
        </Card>) : null}
      </div>
    </div>
  );
}