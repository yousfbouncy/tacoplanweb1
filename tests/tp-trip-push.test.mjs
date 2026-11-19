import { test } from 'node:test';
import assert from 'node:assert/strict';
import {buildTripPushMessages, countAcceptedExpoTickets, isExpoPushToken, notifyTripAssigned} from '../lib/tp-trip-push.ts';

const trip={
 driverId:'driver-1',tripId:'traffic-trip-1',cliente:'Cliente',
 firstStop:'Centro logístico',operation:'assigned'
};

test('traffic push accepts both Expo token formats and deduplicates devices',()=>{
 assert.equal(isExpoPushToken('ExponentPushToken[abc]'),true);
 assert.equal(isExpoPushToken('ExpoPushToken[xyz]'),true);
 assert.equal(isExpoPushToken('not-a-token'),false);
 const result=buildTripPushMessages([
  'ExponentPushToken[abc]','ExponentPushToken[abc]','ExpoPushToken[xyz]','invalid'
 ],trip);
 assert.equal(result.length,2);
 assert.equal(result[0].sound,'tacoplan_viaje_3.wav');
 assert.equal(result[0].channelId,'traffic-assigned-v2');
 assert.equal(result[0].data.target,'viaje');
 assert.equal(result[0].data.tripId,'traffic-trip-1');
 assert.equal(result[0].data.eventId,'assigned:traffic-trip-1');
});

test('Expo tickets count acceptance, not delivery',()=>{
 assert.equal(countAcceptedExpoTickets([{status:'ok',id:'ticket-a'},{status:'error',details:{error:'DeviceNotRegistered'}}]),1);
 assert.equal(countAcceptedExpoTickets([{status:'error'}]),0);
 assert.equal(countAcceptedExpoTickets(null),0);
});

test('transferred trip gets distinct event ID and title',()=>{
 const [message]=buildTripPushMessages(['ExponentPushToken[abc]'],{...trip,operation:'transferred'});
 assert.equal(message.data.eventId,'transferred:traffic-trip-1');
 assert.match(message.title,/transferido/);
});


test('repeated traffic alert retry reuses inbox record and does not create duplicate',async()=>{
 const notices=[];
 const db={
  from(table){
   let operation='find',payload;
   const q={
    select(){return q;},
    eq(){return q;},
    contains(){return q;},
    limit(){return q;},
    insert(row){operation='insert';payload=row;return q;},
    update(row){operation='update';payload=row;return q;},
    async maybeSingle(){
     if(operation==='insert'){
      const row={...payload,id:'inbox-'+(notices.length+1)};
      notices.push(row);return {data:{id:row.id},error:null};
     }
     return {data:notices.length?{id:notices[0].id}:null,error:null};
    },
    then(resolve,reject){
     const data=table==='push_tokens'?[]:null;
     return Promise.resolve({data,error:null}).then(resolve,reject);
    }
   };
   return q;
  }
 };
 const first=await notifyTripAssigned(db,trip);
 const retried=await notifyTripAssigned(db,trip);
 assert.equal(notices.length,1);
 assert.equal(first.inboxCreated,true);
 assert.equal(retried.inboxCreated,true);
 assert.equal(retried.pushStatus,'no_tokens');
 assert.equal(notices[0].data.eventId,'assigned:traffic-trip-1');
});
