'use client';
import { useEffect, useState } from 'react';
import { Activity, Users, Globe2, FileText } from 'lucide-react';
import { AdminEmailRules } from '@/components/admin-email-rules';
import { AdminDailyActivity } from '@/components/admin-daily-activity';
import { AdminStatsDashboard } from '@/components/admin-stats-dashboard';
import { AdminUsersPanel } from '@/components/admin-users-panel';
import { AdminAcquisitionPanel } from '@/components/admin-acquisition-panel';
import { AdminReportStats } from '@/components/admin-report-stats';
type Tab='daily'|'users'|'acquisition'|'overview'|'reports'|'emails';
export function AdminDashboardTabs(){
 const [tab,setTab]=useState<Tab>('daily');
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('tab')==='emails')setTab('emails');},[]);
 return <div><div role="tablist" aria-label="Secciones de administración" className="mb-5 grid grid-cols-2 sm:grid-cols-6 gap-1 rounded-xl bg-slate-200/70 p-1">
 {([{id:'daily',text:'Actividad diaria',Icon:Activity},{id:'users',text:'Usuarios',Icon:Users},{id:'acquisition',text:'Web y altas',Icon:Globe2},{id:'overview',text:'Resumen',Icon:Activity},{id:'reports',text:'Informes',Icon:FileText},{id:'emails',text:'Correos',Icon:Activity}] as const).map(t=><button key={t.id} type="button" role="tab" aria-selected={tab===t.id} onClick={()=>setTab(t.id)} className={'flex items-center justify-center gap-1.5 rounded-lg px-2 py-3 text-xs font-semibold sm:text-sm '+(tab===t.id?'bg-white text-blue-700 shadow-sm':'text-slate-600')}><t.Icon className="h-4 w-4"/>{t.text}</button>)}</div>
 {tab==='emails'?<AdminEmailRules/>:tab==='daily'?<AdminDailyActivity/>:tab==='users'?<AdminUsersPanel/>:tab==='acquisition'?<AdminAcquisitionPanel/>:tab==='reports'?<AdminReportStats/>:<AdminStatsDashboard/>}</div>;
}
