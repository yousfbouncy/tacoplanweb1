export const FEATURE_KEYS = ['auto','diets','manual','notify','reports','trip','widget'] as const;
export type FeatureKey = typeof FEATURE_KEYS[number];
export type PlanSlug = 'free'|'plus'|'pro';
export type PlanConfig = {
  duration_days: number|null;
  history_days: number|null;
  trial_days: number;
  features: Record<FeatureKey,boolean>;
  /** Days of introductory Free access. The first launch date is immutable. */
  free_feature_days?: Partial<Record<FeatureKey,number>>;
};
export type PlanPolicyRow = {
 slug:PlanSlug;
 draft_config:PlanConfig;
 published_config:PlanConfig;
 version:number;
 draft_updated_at:string;
 published_at:string|null;
};

const plainRecord=(x:unknown):x is Record<string,unknown> =>
 typeof x==='object'&&x!==null&&!Array.isArray(x);
const validDays=(x:unknown,max:number)=>x===null||
 (typeof x==='number'&&Number.isInteger(x)&&x>=1&&x<=max);

export function validatePlanConfig(slug:PlanSlug, value:unknown):PlanConfig|null {
 if(!plainRecord(value)||!plainRecord(value.features))return null;
 const features=value.features as Record<string,unknown>;
 const allowedKeys=['duration_days','features','history_days','trial_days','free_feature_days'];
 if(Object.keys(value).some(k=>!allowedKeys.includes(k)))return null;
 if(!['duration_days','features','history_days','trial_days'].every(k=>Object.hasOwn(value,k)))return null;
 if(Object.keys(features).sort().join(',')!==[...FEATURE_KEYS].sort().join(','))return null;
 if(!validDays(value.duration_days,3650)||!validDays(value.history_days,3650))return null;
 if(slug!=='free'&&value.duration_days!==null)return null;
 if(typeof value.trial_days!=='number'||!Number.isInteger(value.trial_days)||
    value.trial_days<0||value.trial_days>30||(slug==='free'&&value.trial_days!==0))return null;
 if(!FEATURE_KEYS.every(k=>typeof features[k]==='boolean'))return null;
 const days=value.free_feature_days;
 if(days!==undefined){
  if(!plainRecord(days)||slug!=='free')return null;
  if(Object.entries(days).some(([key,value])=> !FEATURE_KEYS.includes(key as FeatureKey)||
    typeof value!=='number'||!Number.isInteger(value)||value<1||value>3650||features[key]===true))return null;
 }
 return {
  duration_days:value.duration_days as number|null,
  history_days:value.history_days as number|null,
  trial_days:value.trial_days,
  features:Object.fromEntries(FEATURE_KEYS.map(k=>[k,features[k]])) as Record<FeatureKey,boolean>,
  ...(days?{free_feature_days:Object.fromEntries(Object.entries(days)) as Partial<Record<FeatureKey,number>>}:{}),
 };
}
export const changed=(a:PlanConfig,b:PlanConfig)=>JSON.stringify(a)!==JSON.stringify(b);
