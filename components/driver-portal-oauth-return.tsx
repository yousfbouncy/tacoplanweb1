'use client';
import {useEffect} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {useAuth} from '@/lib/auth-context';
export function DriverPortalOAuthReturn(){
 const {user,loading}=useAuth();const path=usePathname();const router=useRouter();
 useEffect(()=>{
  if(loading||!user||path!=='/')return;
  try{if(sessionStorage.getItem('tp_driver_portal_after_oauth')==='1'){sessionStorage.removeItem('tp_driver_portal_after_oauth');router.replace('/mi-tacoplan');}}catch{}
 },[loading,user?.id,path,router]);
 return null;
}
