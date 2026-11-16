import assert from 'node:assert/strict';
import test from 'node:test';
import {jornadaActivityMinutes} from '../lib/tp-jornada-activity-minutes';

test('manual driving is not overwritten by empty tachograph defaults',()=>{
 assert.deepEqual(jornadaActivityMinutes({conduccion_min:431,tacho_driving_min:0,tacho_available_min:0,tacho_rest_min:0,tacho_work_min:0}),
 {driving:431,available:null,rest:null,work:null});
});
test('tachograph driving is used when there is no manual driving',()=>{
 assert.equal(jornadaActivityMinutes({conduccion_min:null,tacho_driving_min:120}).driving,120);
});
test('recorded auxiliary activities are displayed once tachograph telemetry exists',()=>{
 assert.deepEqual(jornadaActivityMinutes({conduccion_min:20,tacho_driving_min:25,tacho_available_min:70,tacho_rest_min:30,tacho_work_min:10}),
 {driving:20,available:70,rest:30,work:10});
});
test('missing manual and tachograph data are not invented',()=>{
 assert.deepEqual(jornadaActivityMinutes({}),{driving:null,available:null,rest:null,work:null});
});
