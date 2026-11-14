import { REPORT_FIELD_OPTIONS, SharedReportData,ReportField,labelValue,hours,money } from '@/lib/report-sharing';
type Op=string;
const safe=(v:string)=>v.replace(/[\r\n\t]/g,' ').replace(/\s+/g,' ').replace(/[()\\]/g,' ').trim();
const fit=(v:string,n:number)=>v.length>n?v.slice(0,n-1)+'…':v;
const esc=(v:string)=>safe(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const encode=(s:string)=>{const arr=new Uint8Array(s.length);for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);arr[i]=c===8364?128:c<=255?c:63;}return arr;};
const formatDate=(d:string)=>{const [y,m,day]=d.split('-');return day+'/'+m+'/'+y;};
export function buildSelectedReportPdf(report:SharedReportData):Uint8Array{
 const pages:Op[][]=[];
 let ops:Op[]=[];
 let y=0;
 const t=(x:number,yy:number,s:string,size=10,bold=false,color='0.14 0.21 0.34')=>{
  ops.push(color+' rg BT /'+(bold?'F2':'F1')+' '+size+' Tf '+x+' '+yy+' Td ('+esc(s)+') Tj ET');
 };
 const rect=(x:number,yy:number,w:number,h:number,color:string)=>ops.push(color+' rg '+x+' '+yy+' '+w+' '+h+' re f');
 const stroke=(x1:number,y1:number,x2:number,y2:number,c='0.86 0.90 0.95')=>ops.push(c+' RG 0.7 w '+x1+' '+y1+' m '+x2+' '+y2+' l S');
 const header=(page:number)=>{
  rect(0,0,595,842,'1 1 1');rect(0,750,595,92,'0.035 0.094 0.19');
  rect(42,778,7,36,'0.15 0.44 0.95');t(63,798,'TACOPLAN',24,true,'1 1 1');
  t(64,778,'INFORME PROFESIONAL DE ACTIVIDAD',9,false,'0.76 0.84 0.96');
  t(43,33,'Informe basado en los registros del conductor · No sustituye al tacógrafo',8,false,'0.40 0.46 0.55');
  t(517,33,'Pag. '+page,8,false,'0.40 0.46 0.55');
  y=725;
 };
 const start=()=>{ops=[];header(pages.length+1);};
 const next=()=>{pages.push(ops);start();};
 start();
 t(43,y,'PERIODO AUTORIZADO',9,true,'0.19 0.43 0.85');y-=28;
 t(43,y,formatDate(report.from)+'  —  '+formatDate(report.to),19,true);y-=27;
 if(report.fields.includes('driver_name')&&report.driverName){t(43,y,fit('Conductor: '+report.driverName,83),11);y-=24;}
 t(43,y,'Generado: '+new Date(report.generatedAt).toLocaleString('es-ES'),9,false,'0.38 0.46 0.56');y-=28;
 const summary:[string,string][]=[['VIAJES / JORNADAS',String(report.rows.length)]];
 if(report.fields.includes('driving'))summary.push(['CONDUCCIÓN ANOTADA',hours(report.rows.reduce((n,j)=>n+(j.driving||0),0))]);
 if(report.fields.includes('working'))summary.push(['TIEMPO JORNADA',hours(report.rows.reduce((n,j)=>n+(j.working||0),0))]);
 if(report.fields.includes('diet_amount'))summary.push(['DIETAS REGISTRADAS',money(report.rows.reduce((n,j)=>n+(j.dietAmount||0),0))]);
 if(report.fields.includes('km'))summary.push(['KILÓMETROS REGISTRADOS',new Intl.NumberFormat('es-ES').format(report.rows.reduce((n,j)=>n+(j.km||0),0))+' km']);
 for(let i=0;i<summary.length;i+=2){
  summary.slice(i,i+2).forEach(([label,value],j)=>{
   const x=43+j*258;rect(x,y-70,248,64,'0.945 0.963 0.992');
   rect(x,y-70,3,64,'0.17 0.42 0.92');
   t(x+14,y-27,fit(label,32),8,true,'0.35 0.46 0.64');
   t(x+14,y-52,fit(value,24),15,true);
  });
  y-=79;
 }
 y-=9;
 t(43,y,'HISTORIAL DE VIAJES',12,true);y-=16;stroke(43,y,551,y);y-=22;
 const labels=Object.fromEntries(REPORT_FIELD_OPTIONS.map(x=>[x.key,x.label])) as Record<ReportField,string>;
 const fields=report.fields.filter(x=>x!=='driver_name');
 for(let index=0;index<report.rows.length;index++){
  const row=report.rows[index];
  const pairs=fields.length?Math.ceil(fields.length/2):0;
  const height=44+pairs*27+9;
  if(y-height<72){next();t(43,y,'HISTORIAL DE VIAJES · CONTINUACIÓN',11,true);y-=30;}
  const top=y;
  rect(43,y-height,508,height,'0.965 0.975 0.989');
  rect(43,y-28,508,28,'0.91 0.94 0.985');
  t(56,y-19,formatDate(row.date),11,true);
  t(430,y-19,'Registro '+(index+1),8,false,'0.35 0.46 0.64');
  for(let i=0;i<fields.length;i++){
   const key=fields[i],col=i%2,line=Math.floor(i/2);
   const x=56+col*245, yy=top-48-line*27;
   t(x,yy,fit(labels[key],35),8,false,'0.36 0.45 0.58');
   t(x,yy-13,fit(labelValue(row,key),36),10,true);
  }
  y-=height+12;
 }
 if(!report.rows.length){t(43,y,'No hay jornadas registradas dentro de estas fechas.',11);y-=40;}
 if(y<132)next();
 y-=16;stroke(43,y,551,y);y-=23;
 t(43,y,'Documento informativo. Solo muestra los campos autorizados por el conductor.',9,false,'0.38 0.46 0.56');y-=15;
 t(43,y,'Los importes y tiempos pueden estar incompletos; verifique los datos oficiales.',9,false,'0.38 0.46 0.56');
 pages.push(ops);
 const objects:string[]=[];
 objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
 objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
 objects[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
 const kids:number[]=[];
 pages.forEach((p,i)=>{
  const page=5+i*2,contents=page+1;kids.push(page);
  objects[page]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+contents+' 0 R >>';
  const stream=p.join('\n')+'\n';objects[contents]='<< /Length '+encode(stream).length+' >>\nstream\n'+stream+'endstream';
 });
 objects[2]='<< /Type /Pages /Kids ['+kids.map(i=>i+' 0 R').join(' ')+'] /Count '+pages.length+' >>';
 const chunks:Uint8Array[]=[];let len=0;
 const push=(s:string)=>{const b=encode(s);chunks.push(b);len+=b.length;};
 push('%PDF-1.4\n%Tacoplan-Report\n');
 const offsets=[0];
 for(let i=1;i<objects.length;i++){offsets[i]=len;push(i+' 0 obj\n'+objects[i]+'\nendobj\n');}
 const xref=len;push('xref\n0 '+objects.length+'\n0000000000 65535 f \n');
 for(let i=1;i<objects.length;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 push('trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
 const bytes=new Uint8Array(len);let at=0;for(const b of chunks){bytes.set(b,at);at+=b.length;}
 return bytes;
}
export function saveReportPdf(report:SharedReportData){
 const bytes=buildSelectedReportPdf(report);
 const blob=new Blob([bytes],{type:'application/pdf'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='Tacoplan-informe-'+report.from+'-'+report.to+'.pdf';
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
