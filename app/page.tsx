import { getPublishedSiteContent } from '@/lib/site-content';
import { HomePageView } from '@/components/home-page-view';
import type { Metadata } from 'next';

export const metadata:Metadata = {
 title:'Tacoplan | App para camioneros: jornada, tacógrafo, descansos y dietas',
 description:'Tacoplan, la app para camioneros creada por un conductor. Controla tus jornadas, conducción y descansos, recibe avisos preventivos y calcula dietas desde el móvil.',
 keywords:['app camioneros','app para conductores de camión','control horas conducción','descanso tacógrafo','tiempos de conducción y descanso','registro jornada camioneros','cálculo de dietas transportistas','normativa tacógrafo','Tacoplan'],
 alternates:{canonical:'https://tacoplan.es/'},
 openGraph:{title:'Tacoplan: controla tu jornada y descansos desde el móvil',description:'Menos cálculos y más control en carretera. Jornadas, conducción, descansos, avisos preventivos y dietas para camioneros.',url:'https://tacoplan.es/',siteName:'Tacoplan',locale:'es_ES',type:'website'},
 twitter:{card:'summary',title:'Tacoplan, la app hecha por un camionero para camioneros',description:'Jornadas, conducción, descansos y dietas desde el móvil.'}
};
const structuredData = {
 '@context':'https://schema.org','@type':'SoftwareApplication',
 name:'Tacoplan',applicationCategory:'BusinessApplication',
 operatingSystem:'Android, iOS',
 url:'https://tacoplan.es/',
 description:'Aplicación de apoyo para conductores profesionales de transporte por carretera: registro de jornadas, control de tiempos de conducción y descanso, avisos preventivos y cálculo de dietas.',
 inLanguage:'es',publisher:{'@type':'Organization',name:'Tacoplan',url:'https://tacoplan.es/'}
};
export default async function Home() {
 const content=await getPublishedSiteContent(['home_title','home_subtitle','home_beta_notice','home_about','home_benefits_title','home_benefits_subtitle','home_final_cta_title']);
 return <>
 <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replace(/</g,'\\u003c')}}/>
 <HomePageView
 heroTitle={content.home_title||'Tu jornada bajo control. Sin libreta ni cálculos manuales.'}
 heroSubtitle={content.home_subtitle||'Consulta tu conducción y descansos desde el móvil, recibe avisos preventivos y lleva tus dietas a mano. Menos cálculos, más tranquilidad en carretera.'}
 betaNotice={content.home_beta_notice||'Herramienta de apoyo al conductor. No sustituye al tacógrafo oficial.'}
 aboutText={content.home_about||'Tacoplan nació de las dificultades que vivimos los camioneros para controlar nuestras horas y descansos sin recurrir constantemente al tacógrafo o a apuntes manuales. La app ayuda a organizar tus registros y anticipar posibles errores.'}
 benefitsTitle={content.home_benefits_title||'Todo lo que necesitas, a mano'}
 benefitsSubtitle={content.home_benefits_subtitle||'Control de jornada, descansos, dietas y avisos de posibles infracciones en una sola aplicación.'}
 finalCtaTitle={content.home_final_cta_title||'Empieza a llevar tus jornadas con Tacoplan'}
 />
 </>;
}
