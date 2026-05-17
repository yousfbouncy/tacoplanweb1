import { getPublishedSiteContent } from '@/lib/site-content';
import { HomePageView } from '@/components/home-page-view';

export const metadata = {
  title: 'Tacoplan | Agenda para conductores: jornadas, conducción, descansos y dietas',
  description:
    'Tacoplan es la agenda inteligente para conductores profesionales. Registro de jornadas, tiempos de conducción y disponibilidad, descansos diarios y semanales, resumen semanal/bisemanal y dietas en un clic, sin cálculos manuales.',
  keywords:
    'agenda para conductores, app conductores, registro jornadas, tiempos de conducción, disponibilidad, descansos diarios, descansos semanales, descanso reducido, extensión de conducción, dietas en un clic, resumen dietas, resumen semanal, resumen bisemanal, avisos infracciones, informe, tacógrafo, app camioneros, chófer'
};

export default async function Home() {
  const content = await getPublishedSiteContent([
    'home_title',
    'home_subtitle',
    'home_beta_notice',
    'home_about',
    'home_benefits_title',
    'home_benefits_subtitle',
    'home_final_cta_title',
  ]);

  const heroTitle = content.home_title || 'La agenda inteligente para camioneros';
  const heroSubtitle =
    content.home_subtitle ||
    'Registro de jornadas, tiempos de conducción y disponibilidad, descansos diarios/semanales y dietas en un clic, sin cálculos manuales.';
  const betaNotice = content.home_beta_notice || 'Tacoplan está actualmente en fase beta gratuita.';
  const aboutText =
    content.home_about ||
    'Tacoplan es una agenda pensada para el conductor profesional (no para gestionar una empresa). Registra jornadas y tiempos de conducción, genera resúmenes semanales/bisemanal, calcula dietas en tiempo real y te ayuda a detectar posibles infracciones de descansos y disponibilidad.';
  const benefitsTitle = content.home_benefits_title || 'Diseñado para tu día a día';
  const benefitsSubtitle =
    content.home_benefits_subtitle ||
    'Jornadas, conducción, descansos y dietas con resúmenes automáticos, sin cálculos manuales';
  const finalCtaTitle =
    content.home_final_cta_title ||
    'Empieza a controlar tu jornada\nsin libreta hoy mismo';

  return (
    <HomePageView
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      betaNotice={betaNotice}
      aboutText={aboutText}
      benefitsTitle={benefitsTitle}
      benefitsSubtitle={benefitsSubtitle}
      finalCtaTitle={finalCtaTitle}
    />
  );
}
