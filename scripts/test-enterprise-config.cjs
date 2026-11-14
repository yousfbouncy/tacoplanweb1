const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync('lib/tp-employee-config.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const moduleObj={exports:{}};
vm.runInNewContext(compiled,{module:moduleObj,exports:moduleObj.exports,require,console,Date,Number,String,Math,Object,Array,Error,JSON});
const {normalizeEmployeeConfig,mobileDietRates,mobileProfileConfig,emptyEmployeeConfig}=moduleObj.exports;
const basics=()=>{
 const cfg=emptyEmployeeConfig();cfg.base_name='Abrera';cfg.base_city='Abrera';cfg.base_country='España';cfg.payment_mode='dietas';return cfg;
};
const fixed=basics();fixed.diet_scheme='fixed';
fixed.diet_rates={nacional_fija:54.3,internacional_fija:72.77,regional_fija:26};
const fixedConfig=normalizeEmployeeConfig(fixed);
for(const name of ['nacional','internacional','regional'])
 for(const pct of [100,60,30])assert.equal(fixedConfig.diet_rates[name+'_'+pct],fixed.diet_rates[name+'_fija']);
assert.equal(mobileDietRates(fixedConfig).length,9);
const percentage=basics();percentage.diet_rates={nacional_100:55,nacional_60:30,nacional_30:15};
assert.equal(normalizeEmployeeConfig(percentage).diet_rates.nacional_60,30);
const km=basics();km.payment_mode='km';km.km_rates={nacional:0.15,internacional:0.2};
const kmCfg=normalizeEmployeeConfig(km);
assert.equal(mobileProfileConfig(kmCfg,'Conductor de prueba').price_per_km_nacional,0.15);
const trip=basics();trip.payment_mode='viaje';trip.trip_rates={nacional:100,internacional:250};
assert.equal(normalizeEmployeeConfig(trip).trip_rates.internacional,250);
const missing=basics();missing.payment_mode='';assert.throws(()=>normalizeEmployeeConfig(missing),/Selecciona cómo paga/);
const noBase=basics();noBase.base_name='';assert.throws(()=>normalizeEmployeeConfig(noBase),/base/);
console.log('Enterprise onboarding configuration: 6 scenarios passed');
