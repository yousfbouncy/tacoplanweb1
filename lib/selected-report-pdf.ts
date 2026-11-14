import { REPORT_FIELD_OPTIONS, SharedReportData, ReportField, labelValue, hours, money } from '@/lib/report-sharing';

// Compact A4 report. All drawing coordinates are PDF points; every field is kept
// inside the printable area and a new page is started only when needed.
type Page = string[];
const latin=(s:string)=>s.replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').replace(/[\u2013\u2014\u2192]/g,'-').replace(/[\u2022]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u00a0]/g,' ').replace(/[^\u0020-\u00ff\u20ac]/g,'?').trim();
const truncate=(s:string,n:number)=>s.length>n?s.slice(0,n-2)+'..':s;
const escapePdf=(v:string)=>latin(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const winAnsi=(s:string)=>{const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);b[i]=c===8364?128:c<=255?c:63;}return b;};
const formattedDate=(d:string)=>{const [yy,mm,dd]=d.split('-');return dd&&mm&&yy?dd+'/'+mm+'/'+yy:d;};
const dateTime=(d:string|null,t:string|null)=>formattedDate(d||'')+(t?' '+t:'');
const routeLabel=(type:string|null)=>truncate((type||'Sin tipo de ruta').toUpperCase(),24);

export function buildSelectedReportPdf(report:SharedReportData):Uint8Array {
 const pages:Page[]=[];
 let ops:Page=[],y=0;
 const paint=(x:number,base:number,w:number,h:number,color:string)=>ops.push(color+' rg '+x+' '+base+' '+w+' '+h+' re f');
 const text=(x:number,base:number,value:string,size=8,bold=false,color='0.12 0.19 0.32')=>
  ops.push(color+' rg BT /'+(bold?'F2':'F1')+' '+size+' Tf '+x+' '+base+' Td ('+escapePdf(value)+') Tj ET');
 const line=(yy:number)=>paint(38,yy,519,.5,'0.84 0.89 0.95');
 const startPage=()=>{
  ops=[];
  paint(0,0,595,842,'1 1 1');
  paint(0,783,595,59,'0.04 0.10 0.21');
  paint(38,799,4,25,'0.17 0.43 0.95');
  text(52,811,'TACOPLAN',17,true,'1 1 1');
  text(52,796,'INFORME DE ACTIVIDAD',8,false,'0.78 0.86 0.98');
  text(38,26,'Datos del conductor. Informe orientativo, no sustituye al tacógrafo.',7,false,'0.42 0.48 0.59');
  text(505,26,'Pág. '+(pages.length+1),7,false,'0.42 0.48 0.59');
  y=763;
 };
 const nextPage=()=>{pages.push(ops);startPage();};
 startPage();

 // A compact summary leaves room for journeys on the FIRST page.
 text(38,y,'PERIODO: '+formattedDate(report.from)+' - '+formattedDate(report.to),11,true);y-=17;
 if(report.fields.includes('driver_name')&&report.driverName){
  text(38,y,truncate('Conductor: '+report.driverName,93),8);y-=15;
 }
 text(38,y,'Generado: '+new Date(report.generatedAt).toLocaleString('es-ES'),7,false,'0.38 0.46 0.56');y-=20;

 const fields=report.fields;
 const summaries:[string,string][]=[['Jornadas',String(report.rows.length)]];
 if(fields.includes('driving'))summaries.push(['Conducción',hours(report.rows.reduce((n,j)=>n+(j.driving||0),0))]);
 if(fields.includes('working'))summaries.push(['Tiempo jornada',hours(report.rows.reduce((n,j)=>n+(j.working||0),0))]);
 if(fields.includes('diet_type')||fields.includes('diet_amount'))
  summaries.push(['Dietas',String(report.rows.filter(j=>(fields.includes('diet_type')&&!!j.dietType)||(fields.includes('diet_amount')&&j.dietAmount!==null)).length)]);
 if(fields.includes('diet_amount'))summaries.push(['Importe dietas',money(report.rows.reduce((n,j)=>n+(j.dietAmount||0),0))]);
 if(fields.includes('day_flags')){
  summaries.push(['Domingos',String(report.rows.filter(j=>/DOMINGO/i.test(j.dayFlag||'')).length)]);
  summaries.push(['Festivos',String(report.rows.filter(j=>/FESTIV|FIESTA|HOLIDAY/i.test(j.dayFlag||'')).length)]);
 }
 if(fields.includes('pluses')||fields.includes('plus_amount'))
  summaries.push(['Con pluses',String(report.rows.filter(j=>j.plusItems.length>0||(j.dayExtra!==null&&j.dayExtra>0)).length)]);
 if(fields.includes('plus_amount'))
  summaries.push(['Importe pluses',money(report.rows.reduce((n,j)=>n+(j.dayExtra||0)+j.plusItems.reduce((sum,p)=>sum+(p.amount||0),0),0))]);
 if(fields.includes('km'))
  summaries.push(['Kilómetros',new Intl.NumberFormat('es-ES').format(report.rows.reduce((n,j)=>n+(j.km||0),0))+' km']);

 const summaryHeight=Math.ceil(summaries.length/3)*29+10;
 paint(38,y-summaryHeight+7,519,summaryHeight,'0.948 0.968 0.993');
 for(let i=0;i<summaries.length;i++){
  const [label,value]=summaries[i],column=i%3,row=Math.floor(i/3),x=48+column*172;
  text(x,y-10-row*29,truncate(label.toUpperCase(),27),7,true,'0.37 0.46 0.60');
  text(x,y-24-row*29,truncate(value,24),10,true);
 }
 y-=summaryHeight+18;
 text(38,y,'HISTORIAL DE VIAJES',10,true);y-=8;line(y);y-=12;

 const labels=Object.fromEntries(REPORT_FIELD_OPTIONS.map(x=>[x.key,x.label])) as Record<ReportField,string>;
 // The header already contains date, route type and optionally start/end times.
 const visible=fields.filter(f=>f!=='driver_name'&&f!=='route_type'&&f!=='start_end');
 for(let index=0;index<report.rows.length;index++){
  const r=report.rows[index];
  const rowLines=Math.ceil(visible.length/2);
  const height=25+rowLines*13+10;
  if(y-height<55){
   nextPage();
   text(38,y,'HISTORIAL DE VIAJES · CONTINUACIÓN',9,true);y-=18;
  }
  const top=y;
  paint(38,top-height,519,height,'0.965 0.976 0.991');
  paint(38,top-25,519,25,'0.89 0.93 0.98');
  let header=formattedDate(r.date);
  if(fields.includes('route_type'))header+='  |  '+routeLabel(r.routeType);
  text(46,top-16,truncate(header,54),9,true);
  if(fields.includes('start_end')){
   const starts=r.startTime||'--:--',ends=r.endTime||'--:--';
   const isOtherDay=r.endDate&&r.endDate!==r.date;
   const when=starts+' - '+(isOtherDay?formattedDate(r.endDate||'')+' ':'')+ends;
   text(413,top-16,truncate(when,25),8,true,'0.21 0.34 0.55');
  }
  for(let i=0;i<visible.length;i++){
   const f=visible[i],col=i%2,row=Math.floor(i/2),xx=46+col*256,yy=top-40-row*13;
   const val=labelValue(r,f);
   // Single-line compact label/value. Missing values remain visible as dashes.
   const shortened=truncate(labels[f]+': '+val,48);
   text(xx,yy,shortened,7.6,false);
  }
  y-=height+7;
 }
 if(report.rows.length===0){text(38,y,'No hay jornadas en el periodo seleccionado.',9);y-=22;}
 if(y<82)nextPage();
 y-=10;line(y);y-=14;
 text(38,y,'Solo se incluyen las fechas y datos autorizados por el conductor.',7,false,'0.38 0.46 0.56');
 pages.push(ops);

 const objects:string[]=[];
 objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
 objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
 objects[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
 const children:number[]=[];
 pages.forEach((ops,index)=>{
  const page=5+index*2,streamID=page+1;children.push(page);
  objects[page]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+streamID+' 0 R >>';
  const stream=ops.join('\n')+'\n';
  objects[streamID]='<< /Length '+winAnsi(stream).length+' >>\nstream\n'+stream+'endstream';
 });
 objects[2]='<< /Type /Pages /Kids ['+children.map(n=>n+' 0 R').join(' ')+'] /Count '+pages.length+' >>';
 const chunks:Uint8Array[]=[];let total=0;
 const push=(s:string)=>{const b=winAnsi(s);chunks.push(b);total+=b.length;};
 push('%PDF-1.4\n%Tacoplan-report\n');
 const offsets=[0];
 for(let i=1;i<objects.length;i++){offsets[i]=total;push(i+' 0 obj\n'+objects[i]+'\nendobj\n');}
 const xref=total;push('xref\n0 '+objects.length+'\n0000000000 65535 f \n');
 for(let i=1;i<objects.length;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 push('trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
 const pdf=new Uint8Array(total);let at=0;for(const c of chunks){pdf.set(c,at);at+=c.length;}
 return pdf;
}
export function saveReportPdf(report:SharedReportData){
 const bytes=buildSelectedReportPdf(report),blob=new Blob([bytes],{type:'application/pdf'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='Tacoplan-informe-'+report.from+'-'+report.to+'.pdf';
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
