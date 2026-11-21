import type {FeatureKey} from './plan-policy';
export type ReminderMoment='started'|'seven_days'|'three_days'|'one_day'|'expired';
export const FEATURE_LABELS:Record<FeatureKey,string>={
 auto:'AutoStart',diets:'Dietas y pluses',manual:'Actividades de jornada',
 notify:'Avisos y notificaciones',reports:'Informes',trip:'Registro de jornadas',
 widget:'Widgets'
};
export function dueMoment(daysLeft:number,elapsedMs:number):ReminderMoment|null{
 if(daysLeft<=0)return 'expired';
 if(daysLeft===1)return 'one_day';
 if(daysLeft===3)return 'three_days';
 if(daysLeft===7)return 'seven_days';
 if(elapsedMs>=0&&elapsedMs<86400000)return 'started';
 return null;
}
export function featureNotice(feature:FeatureKey,moment:ReminderMoment,daysLeft:number,trialAvailable:boolean){
 const label=FEATURE_LABELS[feature];
 const endings=trialAvailable
  ?' Si todavía no has usado tu prueba gratuita de Plus o Pro, puedes utilizarla.'
  :' Consulta los planes Plus y Pro para seguir usándola.';
 if(moment==='started')return {
  title:label+' gratis por tiempo limitado',
  body:label+' está disponible temporalmente en el plan Gratis. Te quedan '+daysLeft+' días.'+endings
 };
 if(moment==='expired')return {
  title:'Finalizó el acceso gratis a '+label,
  body:'La función '+label+' ya no está incluida en tu plan Gratis. Tus registros están conservados.'+endings
 };
 return {title:label+': '+daysLeft+' días gratis restantes',
  body:'En '+daysLeft+' día'+(daysLeft===1?'':'s')+' finalizará el acceso gratuito a '+label+
   '. Tus datos se conservarán.'+endings};
}
