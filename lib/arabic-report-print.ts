import type {SharedReportData,SharedReportRow,ReportField} from '@/lib/report-sharing';
import {reportLabel} from '@/lib/selected-report-pdf';

// Arabic uses the browser's Unicode/RTL font shaping instead of the legacy
// WinAnsi Helvetica PDF generator, which cannot correctly render Arabic.
const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));
const minutes=(value:number|null)=>value===null?'—':Math.floor(value/60)+' س '+String(Math.round(value%60)).padStart(2,'0')+' د';
const euros=(value:number|null)=>value===null?'—':new Intl.NumberFormat('ar',{style:'currency',currency:'EUR'}).format(value);
export function printArabicReport(report:SharedReportData):boolean {
 const popup=window.open('','_blank');
 if(!popup)return false;
 const tr=(x:string)=>reportLabel('ar',x);
 const row=(label:string,value:unknown)=>'<tr><th>'+escapeHtml(label)+'</th><td>'+escapeHtml(value)+'</td></tr>';
 const fields=new Set<ReportField>(report.fields);
 const cards=report.rows.map((item:SharedReportRow)=>{
   const items=[
     row('التاريخ',item.date),
     ...(fields.has('start_end')?[row('بداية العمل',(item.date||'')+' '+(item.startTime||'')),row('نهاية العمل',(item.endDate||item.date||'')+' '+(item.endTime||''))]:[]),
     ...(fields.has('locations')?[row('الانطلاق',item.start||'—'),row('الوجهة',item.end||'—')]:[]),
     ...(fields.has('route_type')?[row(tr('RUTA: '),item.routeType||'—')]:[]),
     ...(fields.has('driving')?[row(tr('Conducción: '),minutes(item.driving))]:[]),
     ...(fields.has('availability')?[row(tr('Disponibilidad: '),minutes(item.availability))]:[]),
     ...(fields.has('working')?[row('مدة العمل',minutes(item.working))]:[]),
     ...(fields.has('rest')?[row(tr('Descanso anterior: '),minutes(item.rest))]:[]),
     ...(fields.has('diet_type')?[row(tr('Dieta: '),item.dietType||'—')]:[]),
     ...(fields.has('diet_pct')?[row('نسبة البدل',item.dietPct===null?'—':item.dietPct+'%')]:[]),
     ...(fields.has('diet_rate')?[row(tr('Tarifa dieta: '),euros(item.dietRate))]:[]),
     ...(fields.has('diet_amount')?[row(tr('Importe dieta: '),euros(item.dietAmount))]:[]),
     ...(fields.has('day_flags')?[row('الأحد والعطلات',item.dayFlag||'—')]:[]),
     ...(fields.has('pluses')?[row('الإضافات',item.plusItems.map(p=>p.concept).join('، ')||'—')]:[]),
     ...(fields.has('plus_amount')?[row('مبالغ الإضافات',item.plusItems.map(p=>p.concept+' '+euros(p.amount)).join('، ')+(item.dayExtra?'، '+euros(item.dayExtra):''))]:[]),
     ...(fields.has('km')?[row(tr('Kilómetros: '),item.km===null?'—':item.km+' km')]:[]),
   ];
   return '<section class="shift"><table>'+items.join('')+'</table></section>';
 }).join('');
 const title=tr('INFORME DE ACTIVIDAD');
 const html='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>'+escapeHtml(title)+' · Tacoplan</title><style>'+
   '@page{size:A4;margin:16mm}body{font-family:Arial,Tahoma,sans-serif;color:#142842;margin:0;direction:rtl;font-size:12px}'+
   'header{background:#103b74;color:#fff;padding:20px;border-radius:9px;margin-bottom:16px}h1{font-size:21px;margin:0 0 8px}'+
   'h2{font-size:14px;margin:16px 0 8px}p{line-height:1.6}.shift{break-inside:avoid;margin:10px 0;border:1px solid #d3dce7;border-radius:6px;overflow:hidden}'+
   'table{border-collapse:collapse;width:100%}th,td{text-align:right;vertical-align:top;padding:7px 9px;border-bottom:1px solid #e5eaf0}th{width:32%;background:#f2f6fc;color:#315070}'+
   'footer{border-top:1px solid #ccc;color:#667;margin-top:20px;padding-top:10px;font-size:10px}.print{margin:12px 0;background:#1266cd;border:0;color:white;padding:10px 16px;cursor:pointer}'+
   '@media print{.print{display:none}header{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'+
   '</style></head><body><button class="print" onclick="window.print()">طباعة أو حفظ PDF</button>'+
   '<header><h1>TACOPLAN · '+escapeHtml(title)+'</h1><p>'+escapeHtml(tr('PERIODO: '))+' '+escapeHtml(report.from)+' — '+escapeHtml(report.to)+'</p>'+
   (fields.has('driver_name')&&report.driverName?'<p>'+escapeHtml(tr('Conductor: '))+escapeHtml(report.driverName)+'</p>':'')+
   '</header><h2>'+escapeHtml(tr('Jornadas'))+': '+report.rows.length+'</h2>'+
   cards+'<footer>'+escapeHtml(tr('Solo se incluyen las fechas y datos autorizados por el conductor.'))+'</footer></body></html>';
 popup.document.open();popup.document.write(html);popup.document.close();popup.focus();
 return true;
}
