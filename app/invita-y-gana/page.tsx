'use client';
import { useState } from 'react';

export default function ReferralPage() {
  const [monthly, setMonthly] = useState(5);
  const [annual, setAnnual] = useState(2);
  const count = monthly + annual;
  const reward = monthly + annual * 5;
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <section className="rounded-3xl bg-slate-900 p-8 text-white sm:p-12">
        <p className="text-sm font-semibold tracking-widest text-sky-300">TACOPLAN · PROGRAMA DE RECOMENDACIONES</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Invita y gana</h1>
        <p className="mt-4 max-w-xl text-lg text-slate-200">Comparte Tacoplan con otros conductores y consigue recompensas cuando contraten Pro.</p>
        <p className="mt-6 inline-block rounded-full bg-white/10 px-4 py-2 text-sm">Próximamente · programa aún no disponible</p>
      </section>
      <section className="my-8 grid gap-4 sm:grid-cols-3">
        {[
          ['1. Comparte', 'Tendrás un enlace y un código personal.'],
          ['2. Invita', 'Un nuevo conductor se registra con tu código y realiza su primer pago de Pro.'],
          ['3. Gana', 'La recompensa se confirma después de 30 días sin devolución.']
        ].map(([title, description]) => <article key={title} className="rounded-2xl border p-6"><h2 className="font-bold text-lg">{title}</h2><p className="mt-2 text-sm opacity-80">{description}</p></article>)}
      </section>
      <section className="rounded-3xl border p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Calcula tus posibles recompensas</h2>
        <p className="mt-2 text-sm opacity-80">Simulación orientativa de comisiones únicas por nuevos clientes que pagan.</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <label className="block font-medium">Suscripciones mensuales: {monthly}
            <input className="mt-3 block w-full accent-blue-600" type="range" min="0" max="50" value={monthly} onChange={e => setMonthly(Number(e.target.value))}/>
            <span className="text-sm font-normal">1 € por cada nuevo suscriptor</span>
          </label>
          <label className="block font-medium">Suscripciones anuales: {annual}
            <input className="mt-3 block w-full accent-blue-600" type="range" min="0" max="50" value={annual} onChange={e => setAnnual(Number(e.target.value))}/>
            <span className="text-sm font-normal">5 € por cada nuevo suscriptor</span>
          </label>
        </div>
        <div className="mt-8 rounded-2xl bg-blue-50 p-6 text-slate-900" aria-live="polite">
          <p className="text-sm">Recompensa estimada por {count} suscriptores</p>
          <p className="mt-2 text-4xl font-bold">{reward.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
          <p className="mt-3 text-sm">{count >= 5 && reward >= 10 ? 'La simulación alcanza ambos mínimos de retirada.' : 'Para retirar necesitarás al menos 5 referidos confirmados y 10 € de saldo disponible.'}</p>
        </div>
      </section>
      <section className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-bold">Condiciones previstas</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
          <li>Disponible para cuentas gratuitas y Pro cuando se active el programa.</li>
          <li>Una recompensa por cada nuevo cliente; no se remunera el registro, la prueba gratuita ni las renovaciones.</li>
          <li>Sin autorreferencias ni cuentas duplicadas. Los pagos devueltos o disputados no generan saldo disponible.</li>
          <li>Retirada por transferencia, previa revisión, con un mínimo acumulado de 5 referidos y 10 € disponibles.</li>
          <li>Importes y requisitos provisionales, sujetos a condiciones definitivas y revisión fiscal. No se garantizan ingresos.</li>
        </ul>
        <button disabled className="mt-6 rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-600 cursor-not-allowed">Participación aún no disponible</button>
      </section>
    </div>
  );
}
