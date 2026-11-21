import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
const cache=new Map();
function load(name){
 if(cache.has(name))return cache.get(name);
 const source=fs.readFileSync(path.join(process.cwd(),'lib',name+'.ts'),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};
 cache.set(name,mod.exports);
 new Function('module','exports','require',js)(mod,mod.exports,(requested)=>{
  if(requested==='./plan-policy')return load('plan-policy');
  if(requested==='./feature-entitlements')return load('feature-entitlements');
  throw Error('Unexpected import '+requested);
 });
 cache.set(name,mod.exports);
 return mod.exports;
}
const {validatePlanConfig}=load('plan-policy');
const {calculateTimedFreeFeatures,trialEligibility}=load('feature-entitlements');
const {dueMoment,featureNotice}=load('feature-plan-notifications');
const common={duration_days:null,history_days:14,trial_days:0,
 features:{auto:false,diets:false,manual:false,notify:true,reports:false,trip:true,widget:true}};
test('old policies remain valid without feature durations',()=>{
 const result=validatePlanConfig('free',common);
 assert.equal(result.features.notify,true);
 assert.equal(result.free_feature_days,undefined);
});
test('free Dietas 30 days, existing users begin on first launch not old registration',()=>{
 const policy=validatePlanConfig('free',{...common,free_feature_days:{diets:30}});
 assert.ok(policy);
 const launch='2026-11-21T10:00:00.000Z';
 const created='2026-03-01T10:00:00.000Z';
 const at=(day)=>Date.parse('2026-11-'+day+'T10:00:00.000Z');
 assert.equal(calculateTimedFreeFeatures(policy,{diets:launch},created,at('22')).features.diets,true);
 assert.equal(calculateTimedFreeFeatures(policy,{diets:launch},created,at('30')).feature_status.diets.days_left,21);
 assert.equal(calculateTimedFreeFeatures(policy,{diets:launch},created,Date.parse('2026-12-21T10:00:00Z')).features.diets,false);
});
test('new users get 30 days from their own signup, reactivating restrictions does not restart it',()=>{
 const policy=validatePlanConfig('free',{...common,free_feature_days:{diets:30}});
 const launch={diets:'2026-11-21T10:00:00Z'};
 const created='2026-12-01T10:00:00Z';
 const expired=calculateTimedFreeFeatures(policy,launch,created,Date.parse('2026-12-31T10:00:00Z'));
 assert.equal(expired.features.diets,false);
 assert.equal(expired.feature_status.diets.days_left,0);
 // Same immutable launch after disabling and re-enabling global restrictions.
 assert.equal(calculateTimedFreeFeatures(policy,launch,created,Date.parse('2027-01-10T10:00:00Z')).features.diets,false);
});
test('published feature cannot be forever and time-limited simultaneously',()=>{
 assert.equal(validatePlanConfig('free',{...common,features:{...common.features,diets:true},free_feature_days:{diets:30}}),null);
 assert.equal(validatePlanConfig('plus',{...common,trial_days:14,free_feature_days:{diets:30}}),null);
});
test('canceled trial remains spent even if account has no current subscription',()=>{
 assert.equal(trialEligibility(null,true,14),false);
 assert.equal(trialEligibility({status:'canceled',trial_used:true},false,14),false);
 assert.equal(trialEligibility({status:'canceled',trial_used:false},false,14),true);
 assert.equal(trialEligibility(null,false,0),false);
});
test('expiry messages only at milestones and mention trial only if unused',()=>{
 assert.equal(dueMoment(7,30*86400000),'seven_days');
 assert.equal(dueMoment(1,29*86400000),'one_day');
 assert.equal(dueMoment(0,30*86400000),'expired');
 assert.equal(dueMoment(12,11*86400000),null);
 assert.match(featureNotice('diets','one_day',1,true).body,/prueba gratuita/);
 assert.doesNotMatch(featureNotice('diets','one_day',1,false).body,/Tienes una prueba gratuita/);
});
