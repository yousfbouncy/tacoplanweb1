import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
 const base='https://tacoplan.es';
 const pages=[['',1],['/soporte',.7],['/contacto',.5],['/politica-privacidad',.2],['/terminos-condiciones',.2],['/eliminar-cuenta',.2]] as const;
 return pages.map(([path,priority])=>({url:base+path,changeFrequency:path?'monthly':'weekly',priority}));
}
