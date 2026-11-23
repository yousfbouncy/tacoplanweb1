import type {Metadata} from 'next';
import {EnterprisePortal} from '@/components/enterprise-portal';
export const metadata:Metadata={title:'Panel privado · Tacoplan Empresas',robots:{index:false,follow:false}};
export default function PrivateCompanyPanel(){return <EnterprisePortal/>;}
