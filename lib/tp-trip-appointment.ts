/** Appointment dates are local calendar dates at the stop, not UTC timestamps. */
export function isValidTripAppointmentDate(value:string):boolean {
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
 if(!match)return false;
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 if(year<1||month<1||month>12)return false;
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 return day>=1&&day<=days[month-1];
}

export function isValidTripAppointmentTime(value:string):boolean {
 return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
