/**
 * Informe PDF local de Tacoplan.
 * No se envía al servidor: se prepara en el navegador tras la acción del conductor.
 */
export type ReportRow={
 date:string;start:string;end:string;driving:number|null;working:number|null;diet:number|null;
};
export type DriverReport={
 name:string;base:string;period:string;generatedAt:string;
 week:number;fortnight:number;weekMissing:number;fortnightMissing:number;rest:string;
 count:number;driving:number;work:number;diets:number;rows:ReportRow[];
};
type Line={value:string;strong?:boolean};
const hm=(n:number)=>Math.floor(n/60)+' h '+String(Math.floor(n%60)).padStart(2,'0')+' min';
const euro=(n:number)=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' EUR';
const clean=(v:string)=>v.replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim();
const pdfEscape=(v:string)=>clean(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const winAnsi=(v:string)=>{
 const result=new Uint8Array(v.length);
 for(let i=0;i<v.length;i++){
  const c=v.charCodeAt(i);
  result[i]=c===8364?128:c<=255?c:63;
 }
 return result;
};
export function buildDriverReportPdf(r:DriverReport):Uint8Array{
 const lines:Line[]=[
  {value:'INFORME DE ACTIVIDAD DEL CONDUCTOR',strong:true},
  {value:'Conductor: '+clean(r.name),strong:true},
  {value:'Base de trabajo: '+clean(r.base)},
  {value:'Periodo: '+clean(r.period)+'  |  Generado: '+r.generatedAt},
  {value:' '},
  {value:'RESUMEN DE REGISTROS',strong:true},
  {value:'Jornadas: '+r.count+'  |  Conducción anotada: '+hm(r.driving)},
  {value:'Duración de jornadas registrada: '+hm(r.work)},
  {value:'Dietas registradas: '+euro(r.diets)},
  {value:'Conducción semanal: '+hm(r.week)+(r.weekMissing?' ('+r.weekMissing+' registros sin minutos)':'')},
  {value:'Conducción bisemanal: '+hm(r.fortnight)+(r.fortnightMissing?' ('+r.fortnightMissing+' registros sin minutos)':'')},
  {value:'Tiempo desde último cierre: '+r.rest},
  {value:' '},
  {value:'DETALLE DE JORNADAS',strong:true}
 ];
 for(const row of r.rows){
  lines.push({value:row.date+' | Conducción: '+(row.driving===null?'Sin datos':hm(row.driving))+' | Jornada: '+(row.working===null?'Sin datos':hm(row.working))+' | Dieta: '+(row.diet===null?'Sin datos':euro(row.diet)),strong:true});
  const route='Origen: '+clean(row.start).slice(0,48)+'  >  Destino: '+clean(row.end).slice(0,48);
  lines.push({value:route});
 }
 lines.push({value:' '},{value:'AVISO IMPORTANTE',strong:true},
 {value:'Informe informativo basado en datos guardados por el conductor.'},
 {value:'No sustituye el tacógrafo oficial ni acredita cumplimiento legal.'},
 {value:'Los minutos y dietas pueden ser incompletos si faltan registros.'},
 {value:'El tiempo desde la última jornada no valida un descanso reglamentario.'});
 const chunkSize=42;
 const chunks:Line[][]=[];
 for(let i=0;i<lines.length;i+=chunkSize)chunks.push(lines.slice(i,i+chunkSize));
 const objects:string[]=[];
 objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
 objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
 objects[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
 const children:number[]=[];
 chunks.forEach((chunk,index)=>{
  const page=5+index*2,content=page+1;
  children.push(page);
  objects[page]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+content+' 0 R >>';
  const operations=[
   '0.055 0.12 0.24 rg 0 767 595 75 re f',
   '1 1 1 rg BT /F2 21 Tf 42 800 Td (TACOPLAN) Tj ET',
   '0.78 0.85 1 rg BT /F1 9 Tf 42 781 Td (Informe privado del conductor) Tj ET'
  ];
  chunk.forEach((line,i)=>{
   const y=740-i*16;
   const text=pdfEscape(line.value).slice(0,112);
   if(!text.trim())return;
   operations.push((line.strong?'0.05 0.12 0.25 rg':'0.24 0.31 0.43 rg')+' BT /'+(line.strong?'F2':'F1')+' '+(line.strong?'10':'9')+' Tf 42 '+y+' Td ('+text+') Tj ET');
  });
  operations.push('0.38 0.45 0.55 rg BT /F1 8 Tf 42 37 Td (Tacoplan - datos declarados por el conductor) Tj ET');
  operations.push('0.38 0.45 0.55 rg BT /F1 8 Tf 492 37 Td (Página '+(index+1)+' / '+chunks.length+') Tj ET');
  const stream=operations.join('\n')+'\n';
  objects[content]='<< /Length '+winAnsi(stream).length+' >>\nstream\n'+stream+'endstream';
 });
 objects[2]='<< /Type /Pages /Kids ['+children.map(p=>p+' 0 R').join(' ')+'] /Count '+chunks.length+' >>';
 const chunksBytes:Uint8Array[]=[];
 let offset=0;
 const push=(value:string)=>{const data=winAnsi(value);chunksBytes.push(data);offset+=data.length;};
 push('%PDF-1.4\n%PDF-Tacoplan\n');
 const offsets:number[]=[0];
 for(let i=1;i<objects.length;i++){
  offsets[i]=offset;
  push(i+' 0 obj\n'+objects[i]+'\nendobj\n');
 }
 const startXref=offset;
 push('xref\n0 '+objects.length+'\n0000000000 65535 f \n');
 for(let i=1;i<objects.length;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 push('trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+startXref+'\n%%EOF');
 const bytes=new Uint8Array(offset);let at=0;
 for(const segment of chunksBytes){bytes.set(segment,at);at+=segment.length;}
 return bytes;
}
