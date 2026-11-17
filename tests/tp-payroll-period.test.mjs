import test from 'node:test';
import assert from 'node:assert/strict';
import {payrollDateRange,payrollRangesOverlap} from '../lib/tp-payroll-period.ts';
test('accept arbitrary inclusive periods across calendar months',()=>{
 assert.deepEqual(payrollDateRange('2026-10-21','2026-11-21'),{from:'2026-10-21',to:'2026-11-21'});
 assert.deepEqual(payrollDateRange('2026-11-17','2026-11-17'),{from:'2026-11-17',to:'2026-11-17'});
 assert.deepEqual(payrollDateRange('2028-02-29','2028-03-02'),{from:'2028-02-29',to:'2028-03-02'});
});
test('reject invalid and reversed periods, allow long custom cycles',()=>{
 for(const range of [['2026-11-30','2026-11-29'],['2026-02-29','2026-03-01'],['2026-11-31','2026-12-01'],['17/11/2026','2026-11-17'] ]){
  assert.equal(payrollDateRange(...range),null,range.join(' / '));
 }
});
test('reject any overlap but allow adjacent, non-overlapping periods',()=>{
 assert.equal(payrollRangesOverlap('2026-10-21','2026-11-21','2026-11-21','2026-12-20'),true);
 assert.equal(payrollRangesOverlap('2026-10-21','2026-11-21','2026-11-22','2026-12-20'),false);
 assert.equal(payrollRangesOverlap('2026-10-21','2026-11-21','2026-10-01','2026-10-20'),false);
});
