import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
 return { rules: [{userAgent:'*',allow:'/',disallow:['/desarrollo','/mi-tacoplan','/api/','/perfil','/mi-negocio','/login','/registro','/auth','/notes']}], sitemap:'https://tacoplan.es/sitemap.xml',host:'https://tacoplan.es' };
}
