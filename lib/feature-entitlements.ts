import {FEATURE_KEYS,type FeatureKey,type PlanConfig} from './plan-policy';

export const DAY_MS=86400000;
export type FeatureTimeStatus={allowed:boolean;expires_at:string|null;days_left:number|null;limited:boolean;expired:boolean};
export type FeatureTimeMap=Record<FeatureKey,FeatureTimeStatus>;
export type LaunchMap=Partial<Record<FeatureKey,string>>;

/** Legacy account dates are NOT used for already-existing drivers when an
 * administrator first launches a limited feature. The launch timestamp is
 * immutable across re-publication and global restrictions toggles.
 * Account creation is the anchor for users registered after that launch. */
export function calculateTimedFreeFeatures(
 config:PlanConfig,
 launches:LaunchMap,
 accountCreatedAt:string,
 now=Date.now(),
):{features:Record<FeatureKey,boolean>;feature_status:FeatureTimeMap}{
 const features={} as Record<FeatureKey,boolean>;
 const feature_status={} as FeatureTimeMap;
 for(const key of FEATURE_KEYS){
  const forever=config.features[key]===true;
  const duration=config.free_feature_days?.[key];
  const launch=launches[key]?Date.parse(launches[key]!):NaN;
  const account=Date.parse(accountCreatedAt);
  const validLimited=Number.isInteger(duration)&&duration!>0&&duration!<=3650&&Number.isFinite(launch)&&Number.isFinite(account);
  const start=validLimited?Math.max(launch,account):NaN;
  const end=validLimited?start+duration!*DAY_MS:NaN;
  const allowed=forever||(validLimited&&now<end);
  const expired=!forever&&validLimited&&now>=end;
  features[key]=Boolean(allowed);
  feature_status[key]={
   allowed:Boolean(allowed),
   expires_at:validLimited&&!forever?new Date(end).toISOString():null,
   days_left:validLimited&&!forever?Math.max(0,Math.ceil((end-now)/DAY_MS)):null,
   limited:!forever&&Boolean(validLimited),expired:Boolean(expired),
  };
 }
 return {features,feature_status};
}
export type FeatureReminderStage='start'|'7d'|'3d'|'1d'|'expired';
export function reminderStage(daysLeft:number,alreadyNotified:Set<string>):FeatureReminderStage|null{
 const stages:Array<FeatureReminderStage>=daysLeft<=0?['expired']:daysLeft===1?['1d']:daysLeft===3?['3d']:daysLeft===7?['7d']:[];
 return stages.find(x=>!alreadyNotified.has(x))||null;
}
export function trialEligibility(
 subscription:{trial_used?:boolean;status?:string;trial_ends_at?:string|null}|null,
 hasHistoricalTrial:boolean,
 trialDays:number,
):boolean{
 return trialDays>0&&!hasHistoricalTrial&&subscription?.trial_used!==true&&
 subscription?.status!=='trialing'&&!subscription?.trial_ends_at;
}
