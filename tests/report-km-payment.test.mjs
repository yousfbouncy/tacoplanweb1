import assert from 'node:assert/strict';
import {test} from 'node:test';
import {rateForRoute,attachKmPayment,kmPaymentTotal} from '../lib/report-km-payment.ts';

const profile={
 payment_mode:'km',
 price_per_km:0,
 price_per_km_nacional:0.09,
 price_per_km_internacional:0.09,
 price_per_km_regional:0.09,
};
const row=(km,route='NACIONAL',hidden=false)=>({
 date:'2026-07-01',start:null,end:null,routeType:route,startTime:null,endTime:null,endDate:null,
 dayFlag:null,dayExtra:null,plusItems:[],driving:null,availability:null,working:null,
 dietType:null,dietPct:null,dietRate:null,dietAmount:null,km,rest:null,paymentAmountHidden:hidden,
});
test('per-route rates override generic price',()=>{
 assert.equal(rateForRoute(profile,'NACIONAL'),0.09);
 assert.equal(rateForRoute(profile,'NAC_INTL'),0.09);
 assert.equal(rateForRoute({...profile,price_per_km_internacional:0.13},'INTERNACIONAL'),0.13);
 assert.equal(rateForRoute({...profile,price_per_km_nacional:0,price_per_km:0},'NACIONAL'),null);
});
test('July driver: 15,378 km at 0.09 EUR/km produces 1,384.02 EUR',()=>{
 const rows=attachKmPayment([row(12671),row(2036,'NAC_INTL'),row(671,'INTERNACIONAL')],profile,['km','km_rate','km_amount']);
 assert.equal(kmPaymentTotal(rows).total,1384.02);
 assert.equal(rows[0].kmRate,0.09);
});
test('cannot disclose prices without selected consent fields',()=>{
 const rows=attachKmPayment([row(100)],profile,['km']);
 assert.equal(rows[0].kmAmount,undefined);
 assert.equal(rows[0].kmRate,undefined);
});
test('never estimate hidden or missing distance as paid',()=>{
 const rows=attachKmPayment([row(100,'NACIONAL',true),row(null)],profile,['km_rate','km_amount']);
 assert.equal(rows[0].kmAmount,null);
 assert.equal(rows[0].kmRate,null);
 assert.equal(rows[1].kmAmount,null);
 assert.equal(kmPaymentTotal(rows).missing,2);
});
test('diet-only driver is never accidentally assigned km remuneration',()=>{
 const rows=attachKmPayment([row(100)],{...profile,payment_mode:'dietas'},['km','km_amount']);
 assert.equal(rows[0].kmAmount,undefined);
});
