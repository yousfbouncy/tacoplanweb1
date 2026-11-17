import { test } from 'node:test';
import assert from 'node:assert/strict';
import {buildTripPushMessages, countAcceptedExpoTickets, isExpoPushToken} from '../lib/tp-trip-push.ts';

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
 assert.equal(result[0].sound,'tacoplan_viaje.wav');
 assert.equal(result[0].channelId,'traffic-assigned-v1');
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
