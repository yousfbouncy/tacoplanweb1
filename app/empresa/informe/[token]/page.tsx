import type {Metadata} from 'next';
import {CompanyReport} from '@/components/company-report';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Informe privado · Tacoplan',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function ReportPage({params}:{params:{token:string}}){return <CompanyReport token={params.token}/>;}
