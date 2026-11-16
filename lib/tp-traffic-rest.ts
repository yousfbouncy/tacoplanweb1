/**
 * Operational time since last recorded shift end. This is not proof that a
 * legally valid rest actually took place: the app can be offline or a driver
 * may work elsewhere. Never turn elapsed clock time into confirmed activity.
 */
export type ShiftForRest={
 fecha_inicio?:string|null;hora_inicio?:string|null;
 fecha_fin?:string|null;hora_fin?:string|null;
 planned_rest_min?:number|null;planned_rest_type?:string|null;
 descanso_anterior_min?:number|null;tipo_descanso_anterior?:string|null;
 previous_rest_valid?:boolean|null;
};
export function restReferenceLabel(kind?:string|null):string{
 const value=(kind||'').toUpperCase();
 if(value.includes('SEMANAL')||value.includes('WEEKLY'))return value.includes('REDUC')?'Semanal reducido':'Semanal';
 if(value.includes('DIARIO')||value.includes('DAILY'))return value.includes('REDUC')?'Diario reducido':'Diario';
 return 'Sin clasificación';
}
export function previousRest(j:ShiftForRest){
 const minutes=j.descanso_anterior_min;
 if(typeof minutes!=='number'||!Number.isFinite(minutes)||minutes<0)return null;
 return {minutes,type:restReferenceLabel(j.tipo_descanso_anterior),verified:j.previous_rest_valid===true};
}
export function elapsedRestSinceClose(j:ShiftForRest,now=Date.now()){
 if(!j.fecha_fin||!j.hora_fin)return null;
 // These date/time fields are saved in the driver's local wall-clock format.
 // Interpret as local time, matching the display of the associated shift.
 const end=new Date(j.fecha_fin+'T'+j.hora_fin.slice(0,8));
 if(!Number.isFinite(end.getTime())||end.getTime()>now)return null;
 const elapsedMinutes=Math.floor((now-end.getTime())/60000);
 const target=typeof j.planned_rest_min==='number'&&Number.isFinite(j.planned_rest_min)&&j.planned_rest_min>0?j.planned_rest_min:null;
 return {elapsedMinutes,targetMinutes:target,remainingMinutes:target===null?null:Math.max(0,target-elapsedMinutes),
   targetReached:target!==null&&elapsedMinutes>=target,
   startTime:j.hora_fin.slice(0,5),referenceType:(j.planned_rest_type||'').toLowerCase()};
}
