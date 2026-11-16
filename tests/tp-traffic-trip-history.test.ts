import assert from 'node:assert/strict';
import test from 'node:test';
import {tripsForJornada} from '../lib/tp-traffic-trip-history';

const start='2026-11-15T17:45:00Z';
const trip={id:'t1',user_id:'driver',cliente:'ZF Bieruń',estado:'EN_CURSO',created_at:start,updated_at:start};
const day=(d:string)=>({id:d,user_id:'driver',fecha_inicio:d,fecha_fin:d});

test('same trip appears in every jornada while ongoing across multiple days',()=>{
 assert.deepEqual(tripsForJornada(day('2026-11-14'),[trip]),[]);
 assert.deepEqual(tripsForJornada(day('2026-11-15'),[trip]).map(x=>[x.status,x.startDay]),[['en_curso',true]]);
 assert.deepEqual(tripsForJornada(day('2026-11-16'),[trip]).map(x=>[x.status,x.startDay]),[['en_curso',false]]);
 assert.deepEqual(tripsForJornada(day('2026-11-17'),[trip]).map(x=>[x.status,x.startDay]),[['en_curso',false]]);
});

test('completed trip remains in progress in previous day and finalizes on closure day',()=>{
 const completed={...trip,estado:'FINALIZADO',updated_at:'2026-11-17T16:10:00Z'};
 assert.equal(tripsForJornada(day('2026-11-16'),[completed])[0].status,'en_curso');
 assert.deepEqual(tripsForJornada(day('2026-11-17'),[completed]).map(x=>[x.status,x.estimatedCompletion]),[['finalizado',true]]);
 assert.equal(tripsForJornada(day('2026-11-18'),[completed]).length,0);
});

test('do not share another drivers trips or infer completion without recorded end',()=>{
 assert.equal(tripsForJornada({...day('2026-11-16'),user_id:'other'},[trip]).length,0);
 assert.equal(tripsForJornada(day('2026-11-16'),[{...trip,estado:'FINALIZADO',updated_at:null}]).length,0);
});

test('journey spanning midnight can include trip registered on its second calendar day',()=>{
 assert.equal(tripsForJornada({...day('2026-11-15'),fecha_fin:'2026-11-16'},[{...trip,created_at:'2026-11-16T01:15:00Z'}]).length,1);
});
