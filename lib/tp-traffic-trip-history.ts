/** Associate a recorded trip to each authorized jornada's calendar span.
 * The trip table stores creation and last-update timestamps, not a definitive
 * journey-start event nor (yet) an explicit completion timestamp. Therefore
 * its chronology is a record-based approximation, never tachograph telemetry.
 */
export type HistoricalTrip = {
 id:string; user_id:string; cliente?:string|null; estado?:string|null;
 created_at:string; updated_at?:string|null; completed_at?:string|null;
};
export type HistoricalJornada = {
 id:string;user_id:string;fecha_inicio?:string|null;fecha_fin?:string|null;
};
export type TripAtJornada = {trip:HistoricalTrip;status:'en_curso'|'finalizado';startDay:boolean;estimatedCompletion:boolean};

const TERMINAL=/^(finalizad[oa]|terminad[oa]|completad[oa]|completed|finished|done|closed|cerrad[oa])$/i;
function dateAt(iso:string|null|undefined,timeZone:string):string|null{
 if(!iso||!Number.isFinite(Date.parse(iso)))return null;
 const parts=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',timeZone})
  .formatToParts(new Date(iso));
 const read=(type:string)=>parts.find(p=>p.type===type)?.value||'';
 const year=read('year'),month=read('month'),day=read('day');
 return year&&month&&day?year+'-'+month+'-'+day:null;
}
function validDay(x:string|null|undefined):x is string{return !!x&&/^\d{4}-\d{2}-\d{2}$/.test(x);}
export function tripsForJornada(j:HistoricalJornada,trips:HistoricalTrip[],timeZone='Europe/Madrid'):TripAtJornada[]{
 if(!validDay(j.fecha_inicio))return [];
 const dayStart=j.fecha_inicio;
 const dayEnd=validDay(j.fecha_fin)&&j.fecha_fin>=dayStart?j.fecha_fin:dayStart;
 const matches:TripAtJornada[]=[];
 for(const trip of trips){
  if(trip.user_id!==j.user_id)continue;
  const begin=dateAt(trip.created_at,timeZone);
  if(!begin||begin>dayEnd)continue;
  const final=TERMINAL.test((trip.estado||'').trim());
  const end=final?dateAt(trip.completed_at||trip.updated_at,timeZone):null;
  if(final&&!end)continue; // No identifiable completion date: don't invent one.
  if(final&&end!==null&&end<dayStart)continue;
  // If the closure and start fall within one jornada, its status is Finalizado.
  const finishHere=final&&end!==null&&end>=dayStart&&end<=dayEnd;
  matches.push({trip,status:finishHere?'finalizado':'en_curso',startDay:begin>=dayStart&&begin<=dayEnd,estimatedCompletion:finishHere&&!trip.completed_at});
 }
 return matches.sort((a,b)=>Date.parse(a.trip.created_at)-Date.parse(b.trip.created_at));
}
