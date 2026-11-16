import assert from 'node:assert/strict';
import test from 'node:test';
import {elapsedRestSinceClose,previousRest,restReferenceLabel} from '../lib/tp-traffic-rest';

test('previous rest is rendered from stored minutes and legal label',()=>{
 assert.deepEqual(previousRest({descanso_anterior_min:1811,tipo_descanso_anterior:'DESCANSO_SEMANAL_REDUCIDO',previous_rest_valid:null}),
 {minutes:1811,type:'Semanal reducido',verified:false});
 assert.equal(restReferenceLabel('DESCANSO_DIARIO_REDUCIDO'),'Diario reducido');
 assert.equal(previousRest({descanso_anterior_min:null}),null);
});
test('closed jornada provides rolling provisional rest timer and target',()=>{
 const start=new Date('2026-11-16T08:53:00');
 const now=start.getTime()+2*60*60000;
 const data=elapsedRestSinceClose({fecha_fin:'2026-11-16',hora_fin:'08:53',planned_rest_min:540,planned_rest_type:'daily'},now);
 assert.equal(data?.elapsedMinutes,120);
 assert.equal(data?.remainingMinutes,420);
 assert.equal(data?.targetReached,false);
 assert.equal(data?.startTime,'08:53');
 const complete=elapsedRestSinceClose({fecha_fin:'2026-11-16',hora_fin:'08:53',planned_rest_min:540},start.getTime()+540*60000);
 assert.equal(complete?.targetReached,true);
 assert.equal(complete?.remainingMinutes,0);
});
test('missing closure or future end does not invent rest',()=>{
 assert.equal(elapsedRestSinceClose({fecha_fin:null,hora_fin:null}),null);
 assert.equal(elapsedRestSinceClose({fecha_fin:'2030-01-01',hora_fin:'09:00'},0),null);
});

test('historical rest preserves beginning and end and complete/reduced classification',()=>{
 const data=previousRest({
  descanso_anterior_min:571,tipo_descanso_anterior:'DESCANSO_DIARIO_COMPLETO',
  previous_rest_start_at:'2026-11-16T08:53:00Z',previous_rest_end_at:'2026-11-16T18:24:00Z',
  previous_rest_valid:null,
 });
 assert.deepEqual(data,{
  minutes:571,type:'Diario completo',verified:false,
  startAt:'2026-11-16T08:53:00Z',endAt:'2026-11-16T18:24:00Z',
 });
});
test('historical rest uses stored timestamps only when minutes missing',()=>{
 assert.deepEqual(previousRest({
  descanso_anterior_min:null,previous_rest_legal_type:'DESCANSO_SEMANAL_REDUCIDO',
  previous_rest_start_at:'2026-11-14T12:29:00Z',
  previous_rest_end_at:'2026-11-15T18:40:00Z',
 }),{minutes:1811,type:'Semanal reducido',verified:false,startAt:'2026-11-14T12:29:00Z',endAt:'2026-11-15T18:40:00Z'});
 assert.equal(previousRest({previous_rest_start_at:'2026-11-15T12:00:00Z'}),null);
});
