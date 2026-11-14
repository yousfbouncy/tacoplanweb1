import type {Metadata} from 'next';
import {EnterprisePortal} from '@/components/enterprise-portal';
export const metadata:Metadata={title:'Tacoplan Empresas | Tráfico y RRHH',description:'Gestión de conductores, jornadas, dietas y liquidaciones para empresas de transporte.',robots:{index:false,follow:false}};
export default function EmpresasPage(){return <EnterprisePortal/>;}
