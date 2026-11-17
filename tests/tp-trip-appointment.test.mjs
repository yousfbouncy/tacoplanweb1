import assert from 'node:assert/strict';
import test from 'node:test';
import {isValidTripAppointmentDate,isValidTripAppointmentTime} from '../lib/tp-trip-appointment.ts';

test('accepts dates from the browser date input, including 17 November 2026',()=>{
 for(const date of ['2026-11-17','2026-12-31','2028-02-29'])assert.equal(isValidTripAppointmentDate(date),true,date);
});
test('rejects invalid calendar dates and localized formats',()=>{
 for(const date of ['17/11/2026','2026-02-29','2026-11-31','2026-13-01','2026-00-10','2026-11-00','2026-1-7',''])assert.equal(isValidTripAppointmentDate(date),false,date);
});
test('accepts valid appointment hours in 24-hour HH:mm format',()=>{
 for(const time of ['00:00','18:00','23:59'])assert.equal(isValidTripAppointmentTime(time),true,time);
});
test('rejects invalid appointment hours',()=>{
 for(const time of ['24:00','18:60','8:00','12:30:00',''])assert.equal(isValidTripAppointmentTime(time),false,time);
});
