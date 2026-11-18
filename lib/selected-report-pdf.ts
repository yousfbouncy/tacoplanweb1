import { SharedReportData, ReportField, hours, money } from '@/lib/report-sharing';

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

// Original illustration adapted from the approved Tacoplan report preview.
// Embedded once so PDF exports work offline and retain their visual identity.
const TRUCK_HEADER_JPEG = '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';
export function buildSelectedReportPdf(report:SharedReportData):Uint8Array {
 const pages:Page[]=[];
 let ops:Page=[],y=0;
 const paint=(x:number,base:number,w:number,h:number,color:string)=>ops.push(color+' rg '+x+' '+base+' '+w+' '+h+' re f');
 const text=(x:number,base:number,value:string,size=8,bold=false,color='0.12 0.19 0.32')=>
  ops.push(color+' rg BT /'+(bold?'F2':'F1')+' '+size+' Tf '+x+' '+base+' Td ('+escapePdf(value)+') Tj ET');
 const line=(yy:number)=>paint(38,yy,519,.5,'0.84 0.89 0.95');
 const startPage=()=>{
  ops=[];
  const first=pages.length===0;
  paint(0,0,595,842,'1 1 1');
  if(first){
   paint(0,730,595,112,'0.018 0.094 0.205');
   // Photographic truck artwork, included in the PDF rather than a web dependency.
   ops.push('q 145 0 0 108 450 734 cm /TruckHeader Do Q');
   // Tone the transition from the blue background to the photo.
   paint(447,734,4,108,'0.018 0.094 0.205');
   paint(188,754,1.1,70,'0.16 0.53 0.84');
   paint(327,754,1.1,70,'0.16 0.53 0.84');
   // Truck-inspired brand icon.
   ops.push('0.33 0.74 0.99 RG 1.8 w 29 791 m 46 791 l 51 799 l 62 799 l 62 815 l 29 815 l h S');
   paint(35,786,6,3,'0.39 0.79 1');
   paint(53,786,6,3,'0.39 0.79 1');
   text(69,805,'TACOPLAN',17,true,'1 1 1');
   text(69,789,'INFORME DE ACTIVIDAD',9.1,true,'0.42 0.76 1');
   text(200,809,'APLICACIÓN Y LIBRETA DIGITAL',7.8,true,'1 1 1');
   text(200,797,'AUTOMATIZADA',8.2,true,'1 1 1');
   text(200,785,'PARA CONDUCTORES',8.2,true,'1 1 1');
   text(200,765,'Control de jornadas y apoyo',7.1,false,'0.83 0.91 0.99');
   text(200,755,'para prevenir infracciones',7.1,false,'0.83 0.91 0.99');
   text(200,745,'del tacógrafo',7.1,false,'0.83 0.91 0.99');
   text(339,809,'TACOPLAN',8.3,true,'1 1 1');
   text(339,797,'PARA EMPRESAS',8.3,true,'1 1 1');
   text(339,780,'Conexión y transparencia',7.1,false,'0.90 0.94 1');
   text(339,769,'entre conductores,',7.1,false,'0.90 0.94 1');
   text(339,758,'Tráfico y RRHH',7.1,false,'0.90 0.94 1');
   // Website label integrated in the dark banner.
   paint(444,736,140,19,'0.05 0.37 0.73');
   text(453,742,'tacoplan.es/empresas',8.5,true,'1 1 1');
   // Blue road-like line curves into the white document.
   ops.push('0.09 0.62 0.98 RG 5 w 0 729 m 145 711 405 717 595 727 c S');
   y=704;
  } else {
   paint(0,783,595,59,'0.018 0.094 0.205');
   paint(0,783,595,3,'0.09 0.62 0.98');
   text(38,808,'TACOPLAN',17,true,'1 1 1');
   text(38,792,'INFORME DE ACTIVIDAD',8,false,'0.73 0.85 0.99');
   text(358,805,'CONEXIÓN Y TRANSPARENCIA',8,true,'1 1 1');
   text(358,791,'tacoplan.es/empresas',8,false,'0.48 0.76 1');
   y=764;
  }
  paint(38,40,519,.6,'0.79 0.87 0.96');
  text(38,26,'Datos del conductor. Informe orientativo, no sustituye al tacógrafo.',7,false,'0.42 0.48 0.59');
  text(505,26,'Pág. '+(pages.length+1),7,true,'0.15 0.30 0.53');
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

 // Seven compact KPI columns reproduce the approved PDF layout.
 const summaryCols=Math.min(7,Math.max(1,summaries.length));
 const summaryRows=Math.ceil(summaries.length/summaryCols);
 const rowHeight=58;
 const summaryHeight=summaryRows*rowHeight+6;
 paint(38,y-summaryHeight+7,519,summaryHeight,'0.926 0.951 0.981');
 for(let i=0;i<summaries.length;i++){
  const [label,value]=summaries[i],column=i%summaryCols,row=Math.floor(i/summaryCols);
  const cellWidth=519/summaryCols,x=44+column*cellWidth,offset=row*rowHeight;
  if(column>0)paint(x-6,y-summaryHeight+11+offset,0.5,42,'0.75 0.84 0.94');
  // Accent glyph above each result, kept in PDF vector format.
  ops.push('0.10 0.36 0.66 RG 1.2 w '+(x+12)+' '+(y-13-offset)+' m '+(x+27)+' '+(y-13-offset)+' l S');
  text(x,y-29-offset,truncate(label.toUpperCase(),16),6.45,true,'0.12 0.30 0.54');
  text(x,y-44-offset,truncate(value,17),8.9,true,'0.04 0.12 0.26');
 }
 y-=summaryHeight+12;
 // Compact breakdown by recorded diet type, for the current authorised/filtered rows only.
 if(fields.includes('diet_type')){
  const categories=[
   {label:'NACIONAL',test:(kind:string)=>kind.includes('NACIONAL')&&!kind.includes('INTERNACIONAL')},
   {label:'INTERNACIONAL',test:(kind:string)=>kind.includes('INTERNACIONAL')||kind.includes('INTERNATIONAL')},
   {label:'REGIONAL',test:(kind:string)=>kind.includes('REGIONAL')}
  ];
  const counts=categories.map(cat=>{
   const matches=report.rows.filter(r=>cat.test((r.dietType||'').toUpperCase()));
   return {label:cat.label,count:matches.length,amount:matches.reduce((sum,r)=>sum+(r.dietAmount||0),0)};
  });
  const classified=counts.reduce((sum,cat)=>sum+cat.count,0);
  const recorded=report.rows.filter(r=>!!r.dietType||(fields.includes('diet_amount')&&r.dietAmount!==null));
  const unknown=Math.max(0,recorded.length-classified);
  const tableH=fields.includes('diet_amount')?49:38;
  if(y-tableH<72)nextPage();
  text(38,y,'CANTIDAD DE DIETAS POR TIPO',9,true);y-=9;
  paint(38,y-tableH,519,tableH,'0.92 0.96 0.99');
  paint(427,y-tableH,130,tableH,'0.07 0.25 0.46');
  const cells=[
   ...counts,
   {label:'TOTAL',count:recorded.length,amount:recorded.reduce((sum,r)=>sum+(r.dietAmount||0),0)}
  ];
  cells.forEach((cell,index)=>{
   const xx=48+index*129;
   text(xx,y-13,cell.label,7,true,'0.38 0.46 0.59');
   text(xx,y-28,String(cell.count),12,true);
   if(fields.includes('diet_amount'))text(xx,y-41,money(cell.amount),7,false,'0.14 0.40 0.31');
  });
  y-=tableH+11;
  if(unknown>0){text(38,y,'Sin tipo identificado: '+unknown,7,false,'0.41 0.48 0.59');y-=13;}
 }
 text(38,y,'HISTORIAL DE VIAJES',10,true);y-=8;line(y);paint(38,y-1,155,2,'0.07 0.58 0.94');y-=12;

 // Compact journey sections. Only authorised fields are rendered.
 // The blue band contains start/end with locations and the diet type.
 const has=(key:ReportField)=>fields.includes(key);
 const wrap=(value:string,limit:number):string[]=>{
  const source=latin(value);
  if(source.length<=limit)return [source];
  const words=source.split(' '),lines:string[]=[];
  let current='';
  for(const word of words){
   if((current+' '+word).trim().length>limit&&current){lines.push(current);current=word;}
   else current=(current+' '+word).trim();
  }
  if(current)lines.push(current);
  return lines.length?lines:['-'];
 };
 for(let index=0;index<report.rows.length;index++){
  const r=report.rows[index];
  // Preserve 8.2 pt blue-band typography; put start and end side by side when they fit.
  const estimatedWidth=(value:string)=>latin(value).split('').reduce((sum,ch)=>sum+(ch===' '?2.2:/[ilI1.,:;|]/.test(ch)?2.4:/[mwMW@]/.test(ch)?6:4.25),0);
  type BlueRow={left:string;right?:string;bold?:boolean;route?:string};
  const blueRows:BlueRow[]=[];
  const location=(v:string|null)=>has('locations')?(v||'Lugar no registrado'):'';
  if(has('start_end')||has('locations')){
   const startText='INICIO: '+(has('start_end')?dateTime(r.date,r.startTime):formattedDate(r.date))+(has('locations')?' | '+location(r.start):'');
   const endText='FIN: '+(has('start_end')?dateTime(r.endDate||r.date,r.endTime):formattedDate(r.endDate||r.date))+(has('locations')?' | '+location(r.end):'');
   if(estimatedWidth(startText)<=245&&estimatedWidth(endText)<=245){
    blueRows.push({left:startText,right:endText,bold:true});
   }else{
    blueRows.push(...wrap(startText,104).map(left=>({left,bold:true})));
    blueRows.push(...wrap(endText,104).map(left=>({left,bold:true})));
   }
  }else blueRows.push({left:'FECHA: '+formattedDate(r.date),bold:true});
  const dietParts:string[]=[];
  if(has('diet_type'))dietParts.push('Dieta: '+(r.dietType||'Sin tipo registrado'));
  if(has('diet_pct'))dietParts.push(r.dietPct===null?'Porcentaje: —':r.dietPct+'%');
  const dietLine=dietParts.join(' | ');
  const route=has('route_type')?'RUTA: '+(r.routeType||'No registrada').toUpperCase():'';
  if(dietLine&&route&&estimatedWidth(dietLine)+estimatedWidth(route)+16<=500){
   blueRows.push({left:dietLine,route});
  }else{
   if(dietLine)blueRows.push(...wrap(dietLine,104).map(left=>({left})));
   if(route)blueRows.push(...wrap(route,104).map(left=>({left,bold:true})));
  }

  // One compact row: conducción, disponibilidad real y descanso anterior.
  // Fixed positions across every journey, even when a shared field is absent.
  // Never fill unavailable tachograph data with the jornada duration.
  const activityColumns:[
   string|null,string|null,string|null
  ]=[
   has('driving')?'Conducción: '+(r.driving===null?'Sin datos':hours(r.driving)):null,
   has('availability')?'Disponibilidad: '+(r.availability===null?'Sin datos':hours(r.availability)):null,
   has('rest')?'Descanso anterior: '+(r.rest===null?'Sin datos':hours(r.rest)):null
  ];
  const hasActivities=activityColumns.some(value=>value!==null);
  const detailLines:string[]=[];
  // This PDF prioritises driving, actual availability and previous rest.
  // Never replace missing availability with the full jornada duration.
  if(has('diet_rate'))detailLines.push('Tarifa dieta: '+(r.dietRate===null?'Sin datos':money(r.dietRate)));
  if(has('diet_amount'))detailLines.push('Importe dieta: '+(r.dietAmount===null?'Sin datos':money(r.dietAmount)));
  if(has('km'))detailLines.push('Kilómetros: '+(r.km===null?'Sin datos':r.km.toLocaleString('es-ES')+' km'));

  // Only actual recorded pluses and special days are printed. Never infer a holiday.
  const extras:string[]=[];
  if(has('day_flags')&&/DOMINGO/i.test(r.dayFlag||''))extras.push('Domingo');
  if(has('day_flags')&&/FESTIV|FIESTA|HOLIDAY/i.test(r.dayFlag||''))extras.push('Festivo');
  if(has('pluses')){
   for(const plus of r.plusItems){
    extras.push(plus.concept+(has('plus_amount')&&plus.amount!==null?' ('+money(plus.amount)+')':''));
   }
  }
  if(has('plus_amount')&&r.dayExtra!==null&&r.dayExtra>0){
   extras.push('Plus día especial: '+money(r.dayExtra));
  }
  if(has('plus_amount')&&!has('pluses')){
   const sum=r.plusItems.reduce((acc,p)=>acc+(p.amount||0),0);
   if(sum>0)extras.push('Otros pluses: '+money(sum));
  }
  if(extras.length)detailLines.push('Pluses: '+extras.join(' · '));
  const details=detailLines.flatMap(value=>wrap(value,49));
  const headerHeight=10+blueRows.length*11;
  const detailRows=Math.ceil(details.length/2);
  const activityHeight=hasActivities?16:0;
  const detailHeight=activityHeight+(detailRows>0?7+detailRows*11:6);
  const height=headerHeight+detailHeight;
  if(y-height<55){
   nextPage();
   text(38,y,'HISTORIAL DE VIAJES - CONTINUACIÓN',9,true);y-=18;
  }
  const top=y;
  paint(38,top-height,519,height,'0.965 0.976 0.991');
  paint(38,top-headerHeight,519,headerHeight,'0.87 0.92 0.99');
  for(let n=0;n<blueRows.length;n++){
   const line=blueRows[n],baseline=top-15-n*11;
   text(46,baseline,line.left,8.2,!!line.bold,'0.12 0.24 0.43');
   if(line.right)text(302,baseline,line.right,8.2,!!line.bold,'0.12 0.24 0.43');
   if(line.route)text(46+estimatedWidth(line.left)+16,baseline,line.route,8.2,true,'0.12 0.24 0.43');
  }
  if(hasActivities){
   // Left / middle / right: always the same X positions, never stacked.
   const xPositions=[46,213,383];
   for(let n=0;n<activityColumns.length;n++){
    const label=activityColumns[n];
    if(label!==null)text(xPositions[n],top-headerHeight-13,label,7.5,false,'0.24 0.33 0.49');
   }
  }
  for(let n=0;n<details.length;n++){
   const col=n%2,lineNo=Math.floor(n/2);
   text(46+col*255,top-headerHeight-activityHeight-11-lineNo*11,details[n],7.5,false,'0.24 0.33 0.49');
  }
  y-=height+6;
 }
 if(report.rows.length===0){text(38,y,'No hay jornadas en el periodo seleccionado.',9);y-=22;}
 if(y<82)nextPage();
 y-=10;line(y);y-=14;
 text(38,y,'Solo se incluyen las fechas y datos autorizados por el conductor.',7,false,'0.38 0.46 0.56');
 pages.push(ops);

 const objects:(string|Uint8Array)[]=[];
 const truckBytes=Uint8Array.from(atob(TRUCK_HEADER_JPEG),c=>c.charCodeAt(0));
 const joinBytes=(parts:Uint8Array[])=>{const out=new Uint8Array(parts.reduce((total,p)=>total+p.length,0));let pos=0;for(const part of parts){out.set(part,pos);pos+=part.length;}return out;};
 objects[5]=joinBytes([winAnsi('<< /Type /XObject /Subtype /Image /Width 210 /Height 156 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+truckBytes.length+' >>\nstream\n'),truckBytes,winAnsi('\nendstream')]);
 objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
 objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
 objects[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
 const children:number[]=[];
 pages.forEach((ops,index)=>{
  const page=6+index*2,streamID=page+1;children.push(page);
  objects[page]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /TruckHeader 5 0 R >> >> /Contents '+streamID+' 0 R >>';
  const stream=ops.join('\n')+'\n';
  objects[streamID]='<< /Length '+winAnsi(stream).length+' >>\nstream\n'+stream+'endstream';
 });
 objects[2]='<< /Type /Pages /Kids ['+children.map(n=>n+' 0 R').join(' ')+'] /Count '+pages.length+' >>';
 const chunks:Uint8Array[]=[];let total=0;
 const push=(s:string|Uint8Array)=>{const b=typeof s==='string'?winAnsi(s):s;chunks.push(b);total+=b.length;};
 push('%PDF-1.4\n%Tacoplan-report\n');
 const offsets=[0];
 for(let i=1;i<objects.length;i++){offsets[i]=total;push(i+' 0 obj\n');push(objects[i]);push('\nendobj\n');}
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
