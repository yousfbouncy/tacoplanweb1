/** Validates inclusive local calendar dates without converting them to device time zones. */
export function isPayrollDate(value:unknown):value is string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T12:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function payrollDateRange(from:unknown,to:unknown):{from:string;to:string}|null{
 if(!isPayrollDate(from)||!isPayrollDate(to)||from>to)return null;
 // Query bounds: at most 366 calendar days, including both endpoints.
 const length=(Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400000;
 return length>=0&&length<=365?{from,to}:null;
}
/** Inclusive overlap: adjacent ranges with no repeated date are allowed. */
export function payrollRangesOverlap(aFrom:string,aTo:string,bFrom:string,bTo:string):boolean{
 return aFrom<=bTo&&bFrom<=aTo;
}
