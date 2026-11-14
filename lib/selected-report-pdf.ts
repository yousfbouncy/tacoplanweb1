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
  paint(38,y-tableH,519,tableH,'0.94 0.96 0.99');
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
 text(38,y,'HISTORIAL DE VIAJES',10,true);y-=8;line(y);y-=12;

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
  const activityLines:string[]=[];
  if(has('driving'))activityLines.push('Conducción: '+(r.driving===null?'Sin datos':hours(r.driving)));
  if(has('availability'))activityLines.push('Disponibilidad: '+(r.availability===null?'Sin datos':hours(r.availability)));
  if(has('rest'))activityLines.push('Descanso anterior: '+(r.rest===null?'Sin datos':hours(r.rest)));
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
  const activityHeight=activityLines.length?16:0;
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
  if(activityLines.length){
   const width=508/activityLines.length;
   for(let n=0;n<activityLines.length;n++){
    text(46+n*width,top-headerHeight-13,activityLines[n],7.5,false,'0.24 0.33 0.49');
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
