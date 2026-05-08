import { getPublishedSiteContent } from '@/lib/site-content';
import { HomePageView } from '@/components/home-page-view';

export const metadata = {
  title: 'Tacoplan | App para camioneros, control de jornada, viajes y dietas',
  description: 'Tacoplan es la agenda inteligente para conductores de camión y tráiler. Registra jornada, conducción, descansos, viajes y dietas automáticamente sin cálculos manuales. La mejor app para transportistas profesionales.',
  keywords: 'app para camioneros, agenda camionero, registro jornada conductor, control tacógrafo, tiempos de conducción, descansos camión, dietas camioneros, gestión viajes camión, app transporte, app transportistas, rutas camión, jornada laboral conductor, control horas conducción, tacógrafo digital, logística transporte, app para chóferes, app para tráiler'
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
    'Registra tu jornada, conducción, descansos, viajes y dietas sin libreta ni cálculos manuales.';
  const betaNotice = content.home_beta_notice || 'Tacoplan está actualmente en fase beta gratuita.';
  const aboutText =
    content.home_about ||
    'Tacoplan es la herramienta definitiva diseñada por y para transportistas profesionales. Sustituye la agenda o libreta tradicional del conductor por una solución digital sincronizada que hace los cálculos pesados por ti, permitiéndote centrarte en lo que importa: la carretera.';
  const benefitsTitle = content.home_benefits_title || 'Diseñado para tu día a día';
  const benefitsSubtitle =
    content.home_benefits_subtitle || 'Todo lo que necesitas para gestionar tu jornada profesional';
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
