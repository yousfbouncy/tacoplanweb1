import { NextRequest } from "next/server";
import { membership, enterpriseJson, originAllowed, isPaidAccess, uuid, audit } from "@/lib/tp-enterprise";
export const dynamic = "force-dynamic";
const clean = (v: unknown, max = 1000) => typeof v === "string" ? v.trim().slice(0, max) : "";
const TYPES = ["INTERNACIONAL","NACIONAL","REGIONAL"];
const PERCENTS = [30,60,100];
const dateOK = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T12:00:00Z"));
function pluses(v:unknown): string[] | null {
 if (!Array.isArray(v) || v.length>30 || !v.every(x => typeof x==="string" && /^[a-z0-9_-]{1,50}$/.test(x))) return null;
 return Array.from(new Set(v));
}
export async function POST(req: NextRequest) {
 const browser=originAllowed(req);
 const native=!req.headers.get("origin") && req.headers.get("x-tacoplan-client")==="mobile" &&
   /^Bearer [^\s]+$/.test(req.headers.get("authorization")||"");
 if (!browser && !native) return enterpriseJson({error:"Origen no permitido"},403);
 try {
  const auth=await membership(req);
  if (!auth?.member) return enterpriseJson({error:"Acceso no autorizado"},403);
  const {db,user,member}=auth;
  const body=await req.json();
  if (!body || typeof body!=="object") return enterpriseJson({error:"Solicitud no válida"},400);
  if (body.action==="respond") {
   if(member.role!=="driver") return enterpriseJson({error:"Solo el conductor responde"},403);
   if(!uuid(body.id) || !["accept","dispute"].includes(body.response)) return enterpriseJson({error:"Respuesta inválida"},400);
   const comment=clean(body.comment,2000);
   if(body.response==="dispute" && comment.length<5) return enterpriseJson({error:"Añade el motivo del desacuerdo"},400);
   const old=await db.from("tp_diet_adjustments").select("*")
    .eq("id",body.id).eq("company_id",member.company_id).eq("driver_id",user.id).eq("status","awaiting_driver").maybeSingle();
   if(old.error) throw old.error;
   if(!old.data) return enterpriseJson({error:"No existe una propuesta pendiente"},409);
   const status=body.response==="accept"?"accepted":"disputed";
   const updated=await db.from("tp_diet_adjustments").update({
    status,driver_observation:comment,driver_decision_at:new Date().toISOString(),updated_at:new Date().toISOString(),
   }).eq("id",body.id).eq("company_id",member.company_id).eq("driver_id",user.id)
    .eq("status","awaiting_driver").select("id").maybeSingle();
   if(updated.error) throw updated.error;
   if(!updated.data) return enterpriseJson({error:"La propuesta ya fue respondida"},409);
   await audit(db,member.company_id,user.id,"diet.adjustment_"+status,"diet_adjustment",body.id,old.data,{status,comment},comment);
   return enterpriseJson({ok:true,status});
  }
  if(body.action!=="propose" || !browser) return enterpriseJson({error:"Acción no permitida"},403);
  if(member.role!=="traffic") return enterpriseJson({error:"Solo Tráfico puede proponer correcciones"},403);
  const driverId=clean(body.driverId,50),operation=clean(body.operation,12),
   targetKind=clean(body.targetKind,20),targetId=clean(body.targetId,160),
   date=clean(body.date,10),reason=clean(body.reason,2000);
  if(!uuid(driverId)||!["add","edit","delete"].includes(operation)||
    !["jornada","natural_day","manual"].includes(targetKind) || !dateOK(date) || reason.length<10)
   return enterpriseJson({error:"Revisa conductor, fecha y motivo (mínimo 10 caracteres)"},400);
  if(operation==="add" && targetKind!=="manual") return enterpriseJson({error:"Las altas nuevas deben ser por fecha"},400);
  if(operation!=="add" && targetKind==="manual") return enterpriseJson({error:"Selecciona una dieta existente"},400);
  const type=clean(body.dietType,30),pct=Number(body.percentage);
  const extras=Array.isArray(body.plusItems) ? body.plusItems.map((p:any)=>({
    concepto:typeof p?.concepto==='string'?p.concepto.trim().slice(0,120):'',
    importe:Number(p?.importe),
    source:p?.source==='automatic'?'automatic':'manual',
  })) : null;
  const validExtras=extras!==null && extras.length<=30 && extras.every((p:any)=>
    p.concepto.length>=1 && Number.isFinite(p.importe) && p.importe>=0 && p.importe<=100000);
  if(!validExtras || (operation!=="delete" && (!TYPES.includes(type)||!PERCENTS.includes(pct))))
   return enterpriseJson({error:"Selecciona la dieta, el porcentaje y los pluses configurados"},400);
  const [driver,assigned,company]=await Promise.all([
   db.from("tp_company_members").select("joined_at,history_shared_from").eq("company_id",member.company_id).eq("user_id",driverId).eq("role","driver").eq("active",true).maybeSingle(),
   db.from("tp_traffic_driver_assignments").select("driver_id").eq("company_id",member.company_id).eq("traffic_user_id",user.id).eq("driver_id",driverId).maybeSingle(),
   db.from("tp_companies").select("subscription_status,trial_ends_at").eq("id",member.company_id).single(),
  ]);
  if(driver.error||assigned.error||company.error) throw driver.error||assigned.error||company.error;
  if(!driver.data||!assigned.data) return enterpriseJson({error:"Conductor no asignado a tu cuenta"},403);
  if(!isPaidAccess(company.data)) return enterpriseJson({error:"Acceso empresarial no activo"},402);
  let originalType:string|null=null, originalPercentage:number|null=null;
  let originalPluses:Array<{concepto:string;importe:number;source:string}>=[];
  let automaticConcept:string|null=null;
  if(targetKind!=="manual") {
   if(!uuid(targetId))
    return enterpriseJson({error:"Registro inválido"},400);
   const source=targetKind==="jornada"
    ? await db.from("jornadas").select("id,user_id,created_at,fecha_inicio,tipo_ruta,dieta_manual_tipo,dieta_percent,plus_items,day_flag,day_extra_eur")
      .eq("id",targetId).eq("user_id",driverId).maybeSingle()
    : await db.from("user_natural_day_diets").select("id,user_id,created_at,date,type,percentage")
      .eq("id",targetId).eq("user_id",driverId).maybeSingle();
   if(source.error) throw source.error;
   if(!source.data) return enterpriseJson({error:"No existe la dieta indicada"},404);
   const item=source.data as Record<string,any>;
   const sourceDate=targetKind==="jornada"
      ? String(item.fecha_inicio||"").slice(0,10) : String(item.date||"").slice(0,10);
   if(sourceDate!==date) return enterpriseJson({error:"La fecha no corresponde al registro"},409);
   if(new Date(item.created_at).getTime()<new Date(driver.data.history_shared_from||driver.data.joined_at).getTime())
    return enterpriseJson({error:"Registro anterior al historial compartido con la empresa"},403);
   originalType=targetKind==="jornada"?(item.dieta_manual_tipo||item.tipo_ruta||null):item.type;
   originalPercentage=targetKind==="jornada"?Number(item.dieta_percent)||null:Number(item.percentage)||null;
   if(targetKind==="jornada"){
    originalPluses=Array.isArray(item.plus_items)?item.plus_items.filter((p:any)=>p&&typeof p.concepto==="string").map((p:any)=>({concepto:String(p.concepto),importe:Number(p.importe)||0,source:"manual"})):[];
    automaticConcept=typeof item.day_flag==="string"&&item.day_flag.trim()?item.day_flag.trim():null;
    if(automaticConcept)originalPluses.unshift({concepto:automaticConcept,importe:Number(item.day_extra_eur)||0,source:"automatic"});
   }
  } else {
   if(new Date(date+"T12:00:00Z").getTime()<new Date(driver.data.history_shared_from||driver.data.joined_at).getTime())
    return enterpriseJson({error:"Fecha anterior al historial compartido"},403);
  }
  const settings=await db.from("tp_driver_settings").select("diet_rates,plus_rates")
    .eq("company_id",member.company_id).eq("driver_id",driverId).maybeSingle();
  if(settings.error) throw settings.error;
  if(operation!=="delete" && settings.data) {
   const rates=(settings.data.diet_rates||{}) as Record<string,unknown>;
   if(rates[(type+"_"+pct).toLowerCase()]===undefined)
    return enterpriseJson({error:"Esta dieta no tiene tarifa configurada para el conductor"},409);
   const configured=(settings.data.plus_rates||{}) as Record<string,unknown>;
   // Editable plus concepts and amounts are proposals requiring driver approval.
   // No direct writes are made to the original jornada.
  }
  if(extras && extras.filter((p:any)=>p.source==="automatic").length>1)
   return enterpriseJson({error:"No se puede duplicar el plus automático"},400);
  if(extras && extras.some((p:any)=>p.source==="automatic" && p.concepto!==automaticConcept))
   return enterpriseJson({error:"El plus automático no coincide con la jornada"},400);
  const conflict=await db.from("tp_diet_adjustments").select("id").eq("company_id",member.company_id)
   .eq("driver_id",driverId).eq("diet_date",date).eq("status","awaiting_driver");
  if(conflict.error) throw conflict.error;
  if((conflict.data||[]).some((r:any)=>r.id)) return enterpriseJson({error:"Ya existe una corrección pendiente para esa fecha"},409);
  const payload={company_id:member.company_id,driver_id:driverId,target_kind:targetKind,
   target_id:targetKind==="manual"?null:targetId,diet_date:date,operation,
   original_diet_type:originalType,original_percentage:originalPercentage,
   proposed_diet_type:operation==="delete"?null:type,proposed_percentage:operation==="delete"?null:pct,
   original_pluses:originalPluses,proposed_pluses:operation==="delete"?[]:extras,
   reason,status:"awaiting_driver",created_by:user.id};
  const inserted=await db.from("tp_diet_adjustments").insert(payload).select("id").single();
  if(inserted.error) throw inserted.error;
  await audit(db,member.company_id,user.id,"diet.adjustment_proposed","diet_adjustment",inserted.data.id,null,payload,reason);
  await db.from("user_notifications").insert({user_id:driverId,type:"admin_message",
    title:"Tráfico ha propuesto un cambio en tus dietas",
    body:date+" · "+(operation==="add"?"Añadir":operation==="delete"?"Eliminar":"Modificar")+" dieta. "+reason,
    data:{kind:"enterprise_diet_adjustment",id:inserted.data.id,date}});
  return enterpriseJson({ok:true,id:inserted.data.id,status:"awaiting_driver"});
 }catch(e){console.error("diet adjustments",e);return enterpriseJson({error:"No se pudo procesar la revisión"},500);}
}
