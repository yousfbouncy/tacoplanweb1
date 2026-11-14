import type { Metadata } from 'next';
import { DriverPortal } from '@/components/driver-portal';

export const metadata: Metadata = {
 title:'Mi Tacoplan | Consulta privada de jornadas y descansos',
 description:'Consulta tus jornadas, conducción, descansos y dietas guardadas en tu cuenta de Tacoplan.',
 robots:{index:false,follow:false}
};
export default function MiTacoplanPage(){return <DriverPortal/>;}
