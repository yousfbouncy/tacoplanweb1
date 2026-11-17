import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewAmounts,groupConfirmedDays,sumConfirmedReviews} from '../lib/tp-hr-diet-breakdown.ts';

const r=(id,date,diet,plus,status='confirmed')=>({
 id,jornada_date:date,original_amount:diet,original_pluses:plus?[{concepto:'domingo',importe:plus}]:[],status
});

test('daily rows show diet, plus and total as separate amounts, including zero plus',()=>{
 const days=groupConfirmedDays([r('1','2026-11-02',54.30,0),r('2','2026-11-15',72.77,82.38)]);
 assert.deepEqual(days,[
  {date:'2026-11-15',diet:72.77,plus:82.38,total:155.15,records:1},
  {date:'2026-11-02',diet:54.30,plus:0,total:54.30,records:1}
 ]);
});
test('groups multiple confirmed records on the same day with consistent totals',()=>{
 const rows=[r('1','2026-11-15',54.30,80),r('2','2026-11-15',21.83,2.38),r('3','2026-11-16',72.77,0)];
 assert.deepEqual(groupConfirmedDays(rows),[
  {date:'2026-11-16',diet:72.77,plus:0,total:72.77,records:1},
  {date:'2026-11-15',diet:76.13,plus:82.38,total:158.51,records:2}
 ]);
 assert.deepEqual(sumConfirmedReviews(rows),{diet:148.90,plus:82.38,total:231.28});
});
test('does not liquidate unapproved items, and applies accepted correction',()=>{
 const pending=r('1','2026-11-17',100,0,'awaiting_driver');
 const disputed=r('2','2026-11-17',80,0,'disputed');
 const accepted={...r('3','2026-11-17',100,5,'accepted'),proposed_amount:120,
   proposed_pluses:[{concepto:'festivo',importe:7}]};
 assert.deepEqual(groupConfirmedDays([pending,disputed,accepted]),[
  {date:'2026-11-17',diet:120,plus:7,total:127,records:1}
 ]);
 assert.deepEqual(reviewAmounts(pending),{diet:0,plus:0,total:0});
});
test('automatic extras contained in original gross are not counted twice',()=>{
 const day={...r('4','2026-11-15',136.68,0),automatic_plus:82.38};
 assert.deepEqual(reviewAmounts(day),{diet:54.30,plus:82.38,total:136.68});
});
