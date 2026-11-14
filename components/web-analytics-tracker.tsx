'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
type Event='page_view'|'store_click_ios'|'store_click_android';
function getSession(){try{let s=sessionStorage.getItem('tp_web_session');if(!s){s=crypto.randomUUID();sessionStorage.setItem('tp_web_session',s);}return s;}catch{return crypto.randomUUID();}}
export function trackWebsiteEvent(type:Event){
 if(typeof window==='undefined')return;
 const path=window.location.pathname;
 if(path.startsWith('/desarrollo')||path.startsWith('/api'))return;
 const body=JSON.stringify({type,path,session:getSession()});
 try{if(navigator.sendBeacon&&navigator.sendBeacon('/api/track',new Blob([body],{type:'application/json'})))return;}catch{}
 void fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});
}
export function WebAnalyticsTracker(){const pathname=usePathname();useEffect(()=>{if(pathname&&!pathname.startsWith('/desarrollo'))trackWebsiteEvent('page_view');},[pathname]);return null;}
