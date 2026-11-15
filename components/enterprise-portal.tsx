'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Building2,Users,Truck,Wallet,ShieldCheck,LogOut,Plus,RefreshCw,CheckCircle,AlertCircle,Copy,LockKeyhole,LayoutDashboard,UserRoundPlus,Mail,Settings2,UserRoundCog} from 'lucide-react';
import {useAuth} from '@/lib/auth-context';
import {supabase} from '@/lib/supabase';
import {PLAN_PRICES} from '@/lib/tp-enterprise-plans';
import {EnterpriseDriverConfig,blankCompanyConfig} from '@/components/enterprise-driver-config';
import type {InitialEmployeeConfig} from '@/lib/tp-employee-config';
type Member={company_id:string;username:string;role:'owner'|'traffic'|'hr'|'driver'};
type Review={id:string;driver_id:string;jornada_id?:string;jornada_date?:string;status:string;original_diet_type:string|null;original_amount:number;proposed_diet_type:string|null;proposed_amount:number|null;original_pluses?:Array<{concepto:string;importe:number}>;proposed_pluses?:Array<{concepto:string;importe:number}>|null;change_reason:string|null;driver_observation:string|null;traffic_observation:string|null;created_at:string};
type Dashboard={member:Member|null;company?:{id:string;name:string;subscription_status:string;trial_ends_at:string|null;plan_price_id:string|null};team?:Array<{user_id:string;username:string;employee_name?:string;role:string;active?:boolean}>;drivers?:Array<{user_id:string;username:string;employee_name?:string|null}>;trafficMembers?:Array<{user_id:string;username:string;employee_name?:string|null}>;assignments?:Array<{driver_id:string;traffic_user_id:string;assigned_at:string}>;invites?:Array<{id:string;username:string;employee_name?:string;role:string;email:string;accepted_at:string|null;initial_settings?:InitialEmployeeConfig}>;settings?:Array<{driver_id:string;base_name:string|null;workplace?:string|null;agreement:string|null;initial_config?:InitialEmployeeConfig;diet_rates?:Record<string,unknown>;plus_rates?:Record<string,unknown>;payroll_terms?:Record<string,unknown>}>;driverSettings?:{base_name:string|null;agreement:string|null};jornadas?:Array<{id:string;user_id:string;fecha_inicio:string|null;hora_inicio:string|null;hora_fin:string|null;lugar_inicio:string|null;lugar_fin:string|null;tipo_ruta:string|null;dieta_manual_tipo:string|null;dieta_importe_eur:string|null;plus_items?:Array<{concepto:string;importe:number}>}>;reviews?:Review[];closures?:Array<{id:string;month:string;driver_id:string;total_diets:number;closed_at:string}>};
const roleLabels={owner:'Administrador de empresa',traffic:'Departamento de Tráfico',hr:'Recursos Humanos',driver:'Conductor'};
const monthNow=()=>new Date().toISOString().slice(0,7);
const euro=(n:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
const date=(v:string|null|undefined)=>v?new Date(v).toLocaleDateString('es-ES'):'—';
const button='rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50';
const input='w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900';

export function EnterprisePortal(){
 const {user,loading:authLoading,signOut}=useAuth();
 const [view,setView]=useState<Dashboard|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState('');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[authMode,setAuthMode]=useState<'login'|'register'>('login');
 const [inviteToken,setInviteToken]=useState('');
 const [inviteInfo,setInviteInfo]=useState<{companyName:string;email:string;username:string;role:string}|null>(null);
 const [inviteLoading,setInviteLoading]=useState(false);
 const [inviteError,setInviteError]=useState('');
 const autoAcceptStarted=useRef(false);
 const [signupFeedback,setSignupFeedback]=useState<'verify'|'ready'|null>(null);
 const [companyName,setCompanyName]=useState(''),[ownerUsername,setOwnerUsername]=useState(''),[planId,setPlanId]=useState<string>(PLAN_PRICES[0].priceId);
 const [staffEmail,setStaffEmail]=useState(''),[staffUsername,setStaffUsername]=useState(''),[staffName,setStaffName]=useState(''),[staffRole,setStaffRole]=useState('');
 const [staffPassword,setStaffPassword]=useState(''),[staffPasswordConfirm,setStaffPasswordConfirm]=useState('');
 const [staffConfig,setStaffConfig]=useState<InitialEmployeeConfig>(blankCompanyConfig);
 const [pendingInviteId,setPendingInviteId]=useState(''),[pendingInviteName,setPendingInviteName]=useState(''),[pendingInviteConfig,setPendingInviteConfig]=useState<InitialEmployeeConfig>(blankCompanyConfig);
 const [latestInvite,setLatestInvite]=useState('');
 const [driverId,setDriverId]=useState('');
 const [ownerTab,setOwnerTab]=useState<'resumen'|'empleados'|'invitaciones'|'configuracion'|'nuevo'>('resumen');
 const [hrTab,setHrTab]=useState<'liquidacion'|'asignaciones'>('liquidacion');
 const [assignedDriver,setAssignedDriver]=useState(''),[assignedTraffic,setAssignedTraffic]=useState('');
 const [editDriverConfig,setEditDriverConfig]=useState<InitialEmployeeConfig>(blankCompanyConfig);
 const [proposedPluses,setProposedPluses]=useState<Array<{concepto:string;importe:number}>>([]);
 const [reviewJornada,setReviewJornada]=useState(''),[mode,setMode]=useState('confirm'),[newDietAmount,setNewDietAmount]=useState(''),[reason,setReason]=useState(''),[observation,setObservation]=useState('');
 const [month,setMonth]=useState(monthNow),[responseTexts,setResponseTexts]=useState<Record<string,string>>({});
 useEffect(()=>{
  const value=new URLSearchParams(window.location.search).get('invite')||'';
  if(!value)return;
  setInviteToken(value);
  setAuthMode('register');
  setInviteLoading(true);
  fetch('/api/empresas/invite?token='+encodeURIComponent(value),{cache:'no-store'})
   .then(async res=>{const result=await res.json();if(!res.ok)throw Error(result.error||'No se pudo comprobar el enlace');
    setInviteInfo(result);setEmail(result.email);
   })
   .catch(err=>setInviteError(err instanceof Error?err.message:'Invitación no válida'))
   .finally(()=>setInviteLoading(false));
 },[]);
 const token=async()=>{const r=await supabase.auth.getSession();if(!r.data.session?.access_token)throw Error('Inicia sesión de nuevo');return r.data.session.access_token;};
 const load=useCallback(async()=>{if(!user){setView(null);return;}setLoading(true);setError('');
 try{const t=await token();const r=await fetch('/api/empresas/dashboard',{cache:'no-store',headers:{Authorization:'Bearer '+t}});const j=await r.json();if(!r.ok)throw Error(j.error||'No se pudo cargar');setView(j);}
 catch(e:unknown){setError(e instanceof Error?e.message:'Error al cargar');}finally{setLoading(false);}},[user?.id]);
 useEffect(()=>{void load();},[load]);
 const action=async(body:Record<string,unknown>)=>{setBusy(true);setError('');setMessage('');
 try{const t=await token();const r=await fetch('/api/empresas/action',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(j.error||'No se pudo guardar');await load();return j;}
 catch(e:unknown){setError(e instanceof Error?e.message:'Error');return null;}finally{setBusy(false);}};
 const login=async()=>{if(busy)return;setBusy(true);setError('');setMessage('');setSignupFeedback(null);
 try{
  if(authMode==='register'){
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw Error('Introduce una dirección de correo válida.');
   if(inviteInfo&&email.trim().toLowerCase()!==inviteInfo.email.toLowerCase())throw Error('Debes utilizar el correo que recibió la invitación.');
   if(password.length<8)throw Error('La contraseña debe tener al menos 8 caracteres.');
   const {data,error:signUpError}=await supabase.auth.signUp({
    email:email.trim().toLowerCase(),password,
    options:{emailRedirectTo:window.location.origin+'/empresas'+(inviteToken?'?invite='+encodeURIComponent(inviteToken):'')}
   });
   if(signUpError)throw signUpError;
   if(data.session){
    setSignupFeedback('ready');
    setMessage(inviteToken?'Cuenta de empleado creada. Estamos asociándola con tu empresa.':'Cuenta de acceso creada. Ahora puedes registrar tu empresa y configurar sus empleados.');
   }else{
    setSignupFeedback('verify');
    setMessage(inviteToken?'Revisa tu correo para confirmar la cuenta; regresarás a esta invitación para activarla.':'Registro recibido. Revisa tu correo electrónico para confirmar el acceso y después inicia sesión.');
   }
  }else if(email.includes('@')){
   const {error:signInError}=await supabase.auth.signInWithPassword({email:email.trim(),password});
   if(signInError)throw signInError;
  }else{
   const r=await fetch('/api/empresas/username-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:email,password})});
   const j=await r.json();if(!r.ok)throw Error(j.error||'No se pudo iniciar sesión');
   const result=await supabase.auth.setSession({access_token:j.access_token,refresh_token:j.refresh_token});
   if(result.error)throw result.error;
  }
 }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo completar la operación.');}
 finally{setBusy(false);}};
 // Once the employee authenticates, accept the specific invitation with the
 // server validating that the login email matches the invitation exactly.
 useEffect(()=>{
  if(!user||authLoading||loading||view?.member!==null||!view||!inviteToken||!inviteInfo||inviteLoading||autoAcceptStarted.current)return;
  if(user.email?.trim().toLowerCase()!==inviteInfo.email.trim().toLowerCase())return;
  autoAcceptStarted.current=true;
  void action({action:'accept_invite',token:inviteToken}).then(result=>{
   if(result){setInviteToken('');setInviteInfo(null);window.history.replaceState({},'', '/empresas');
    setMessage('Invitación aceptada. Tu acceso empresarial ya está activado.');}
  });
 },[user?.id,authLoading,loading,view?.member,inviteToken,inviteInfo?.email,inviteLoading]);
 const selectDriver=(id:string)=>{
  setDriverId(id);
  const data=view?.settings?.find(x=>x.driver_id===id);
  setEditDriverConfig(data?.initial_config&&Object.keys(data.initial_config).length?data.initial_config:blankCompanyConfig());
 };
 const selectInvite=(id:string)=>{
  setPendingInviteId(id);setLatestInvite('');
  const i=view?.invites?.find(x=>x.id===id);
  setPendingInviteName(i?.employee_name||'');
  setPendingInviteConfig(i?.initial_settings&&Object.keys(i.initial_settings).length?i.initial_settings:blankCompanyConfig());
 };
 const member=view?.member;
 const title=view?.company?.name||'Tacoplan Empresas';
 const active=view?.company?.subscription_status==='active'||(view?.company?.subscription_status==='trialing'&&Boolean(view.company.trial_ends_at)&&new Date(view.company.trial_ends_at!).getTime()>Date.now());
 const reviews=view?.reviews||[];
 const driverName=(id:string)=>{const driver=view?.drivers?.find(d=>d.user_id===id);return driver?.employee_name||driver?.username||id.slice(0,8);};
 const pending=reviews.filter(r=>r.status==='awaiting_driver');
 const hrReviews=reviews.filter(r=>r.jornada_date?.startsWith(month));
 const payable=hrReviews.filter(r=>['confirmed','accepted','closed'].includes(r.status));
 const total=payable.reduce((v,r)=>v+(r.status==='accepted'?r.proposed_amount??r.original_amount:r.original_amount),0);
 const renderError=error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>:null;
 return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12"><div className="mx-auto max-w-6xl space-y-5">
  <header className="rounded-2xl bg-gradient-to-r from-[#071b38] to-[#174477] p-6 text-white"><div className="flex items-center gap-2 text-sm font-bold text-blue-200"><Building2 className="h-5 w-5"/>TACOPLAN EMPRESAS</div><h1 className="mt-3 text-2xl font-extrabold">{title}</h1>
  <p className="mt-2 text-sm text-slate-200">{member?roleLabels[member.role]:'Gestión empresarial de conductores, Tráfico y Recursos Humanos'}</p></header>
  {renderError}{message?<p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>:null}
  {authLoading||loading?<p className="rounded-xl bg-white p-6 text-slate-500">Cargando acceso…</p>:null}
  {!authLoading&&!user?<section className="mx-auto max-w-lg rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{inviteToken?'Activar mi cuenta de empleado':authMode==='register'?'Paso 1 · Crear cuenta de acceso':'Acceder a Tacoplan Empresas'}</h2>
   {inviteToken?<div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950" role="status">
    {inviteLoading?<p>Comprobando la invitación…</p>:inviteError?<p className="font-semibold text-red-700">{inviteError}</p>:inviteInfo?<><p className="font-bold">Invitación de {inviteInfo.companyName}</p>
     <p className="mt-1">Perfil: {roleLabels[inviteInfo.role as keyof typeof roleLabels]||inviteInfo.role}</p>
     <p className="mt-1">Tu usuario: <strong>{inviteInfo.username}</strong></p>
     <p className="mt-1">Correo asignado: <strong>{inviteInfo.email}</strong></p>
     <p className="mt-2">Crea una contraseña para activar tu acceso. Si ya tienes una cuenta Tacoplan con este correo, pulsa «Ya tengo cuenta» e inicia sesión. La invitación se aceptará automáticamente.</p></>:null}
   </div>:<p className="mt-2 text-sm text-slate-600">{authMode==='register'?'Registra tu correo y contraseña. Tras confirmar tu correo, iniciarás sesión y podrás crear tu empresa en el paso 2.':'Accede con tu correo o nombre de usuario. Si todavía no tienes cuenta, primero debes crear una cuenta de acceso.'}</p>}
   <label className="mt-4 block text-sm font-semibold">{authMode==='register'?'Correo electrónico':'Correo electrónico o usuario'}<input className={input+' mt-2'} value={email} onChange={e=>setEmail(e.target.value)} type={authMode==='register'?'email':'text'} autoComplete={authMode==='register'?'email':'username'} placeholder={authMode==='register'?'tu@empresa.es':'empleado@empresa.es o usuario'}/></label>
   <label className="mt-4 block text-sm font-semibold">Contraseña<input className={input+' mt-2'} value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete={authMode==='register'?'new-password':'current-password'} minLength={authMode==='register'?8:undefined}/></label>
   {error?<p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>:null}
   {signupFeedback==='verify'?<div role="status" aria-live="polite" className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><strong>Comprueba tu correo electrónico.</strong><p className="mt-1">Sigue el enlace de confirmación y vuelve aquí para iniciar sesión. Si no llega, comprueba la carpeta de spam.</p></div>:null}
   {signupFeedback==='ready'?<p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Cuenta creada. Continuando con la activación del acceso…</p>:null}
   <button type="button" className={button+' mt-4 w-full'} onClick={()=>void login()} disabled={busy||signupFeedback==='verify'||Boolean(inviteToken&&(inviteLoading||inviteError||!inviteInfo))}>{busy?'Procesando…':authMode==='login'?'Iniciar sesión':inviteToken?'Crear mi acceso de empleado':'Registrarme con correo electrónico'}</button>
   <button type="button" className="mt-4 w-full text-sm font-semibold text-blue-700" onClick={()=>{setAuthMode(authMode==='login'?'register':'login');setSignupFeedback(null);setError('');setMessage('');}}>{authMode==='login'?'No tengo cuenta · Crear mi acceso':'Ya tengo cuenta · Iniciar sesión'}</button>
   <p className="mt-4 text-xs text-slate-500">Las empresas crean invitaciones y asignan la configuración del empleado. La contraseña definitiva la establece el propio usuario.</p>
   </section>:null}
  {!authLoading&&user&&!member?<section className="grid gap-4 lg:grid-cols-2">
   {inviteToken?<div className="rounded-2xl border border-blue-200 bg-white p-5">
    <h2 className="text-lg font-bold">Activación de la invitación</h2>
    {inviteInfo&&user.email?.toLowerCase()!==inviteInfo.email.toLowerCase()?<>
     <p className="mt-2 text-sm text-red-700">Has iniciado sesión como {user.email}. Esta invitación corresponde a {inviteInfo.email}. Cierra sesión y utiliza el correo invitado.</p>
     <button type="button" className={button+' mt-3'} onClick={()=>void signOut()}>Cambiar de cuenta</button>
    </>:<div className="mt-3 space-y-3">
     <p className="text-sm text-slate-600">{busy?'Asociando la cuenta con la empresa…':'Tu cuenta existe. Falta finalizar la incorporación a la empresa.'}</p>
     <button type="button" disabled={busy||!inviteInfo||Boolean(inviteError)} className={button} onClick={async()=>{
      const res=await action({action:'accept_invite',token:inviteToken});
      if(res){setInviteToken('');setInviteInfo(null);window.history.replaceState({},'', '/empresas');setMessage('Incorporación completada. Ya perteneces a tu empresa.');}
     }}>Finalizar mi incorporación</button>
     <p className="text-xs text-slate-500">Si indica que falta configuración, pide a tu empresa que complete tu invitación pendiente y vuelve a pulsar el botón.</p>
    </div>}
    {inviteError?<p role="alert" className="mt-2 text-sm text-red-700">{inviteError}</p>:null}
   </div>:null}
   {!inviteToken?<div className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Paso 2 · Crear empresa</h2><p className="mt-1 text-sm text-slate-600">Una empresa, con usuarios independientes de Tráfico, RRHH y conductores.</p>
    <input className={input+' mt-4'} value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Nombre de la empresa"/>
    <input className={input+' mt-3'} value={ownerUsername} onChange={e=>setOwnerUsername(e.target.value.toLowerCase())} placeholder="Tu nombre de usuario"/>
    <label className="mt-3 block text-sm font-medium">Plan de flota<select className={input+' mt-2'} value={planId} onChange={e=>setPlanId(e.target.value)}>{PLAN_PRICES.map(p=><option key={p.priceId} value={p.priceId}>{p.title} · {p.seats} conductores · {euro(p.cents/100)}/mes</option>)}</select></label>
    <p className="mt-3 text-xs text-amber-700">Al crear la empresa comienza una prueba gratuita de 7 días, sin tarjeta y sin cobros automáticos. Al terminar se suspenderán las funciones empresariales hasta contratar un plan.</p>
    <button disabled={busy} className={button+' mt-4'} onClick={async()=>{const r=await action({action:'create_company',name:companyName,username:ownerUsername,priceId:planId});if(r)setMessage('Empresa creada. La prueba gratuita de 7 días ya está activa. No se ha guardado ninguna tarjeta ni se realizarán cobros automáticos.');}}>Crear empresa</button>
   </div>:null}</section>:null}
  {member?<><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"><div><p className="text-sm font-bold text-slate-900">{member.username} · {roleLabels[member.role]}</p><p className="mt-1 text-xs text-slate-500">Estado suscripción: {view?.company?.subscription_status||'Pendiente'} · {view?.company?.trial_ends_at?'Prueba hasta '+date(view.company.trial_ends_at):'Prueba no iniciada'}</p></div><div className="flex gap-2"><button onClick={()=>void load()} className="rounded-lg border px-3 py-2 text-sm"><RefreshCw className="h-4 w-4"/></button><button onClick={()=>void signOut()} className="rounded-lg border px-3 py-2 text-sm"><LogOut className="h-4 w-4"/></button></div></div>
  {!active?<p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">El periodo de prueba ha terminado o la suscripción está inactiva. Los datos se conservan, pero las funciones empresariales quedan suspendidas. No se realizará ningún cobro automático.</p>:null}
  {member.role==='owner'&&!active?<section className="rounded-2xl border border-blue-200 bg-white p-5">
   <h2 className="text-lg font-bold text-slate-900">Prueba gratuita finalizada</h2>
   <p className="mt-2 text-sm text-slate-600">La prueba gratuita de 7 días no requiere tarjeta y no se renueva automáticamente. Para contratar un plan, contacta con el equipo de Tacoplan mientras terminamos de habilitar la facturación segura de Stripe.</p>
   <a href="/contacto" className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Contactar para activar un plan</a>
  </section>:null}
  {member.role==='owner'?<section className="space-y-4">
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3" aria-label="Secciones de la empresa">
     {([{id:'resumen',label:'Resumen',Icon:LayoutDashboard},{id:'empleados',label:'Empleados',Icon:Users},{id:'invitaciones',label:'Invitaciones',Icon:Mail},{id:'configuracion',label:'Configuración',Icon:Settings2},{id:'nuevo',label:'Nuevo empleado',Icon:UserRoundPlus}] as const).map(({id,label,Icon})=>
      <button type="button" key={id} onClick={()=>setOwnerTab(id)} aria-current={ownerTab===id?'page':undefined} className={'inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition '+(ownerTab===id?'bg-blue-700 text-white':'bg-slate-50 text-slate-700 hover:bg-blue-50')}>
       <Icon className="h-4 w-4"/>{label}
      </button>)}
    </nav>
    {ownerTab==='resumen'?<div className="space-y-4">
     <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {([{label:'Personal activo',count:view?.team?.length||0,Icon:Users},{label:'Conductores',count:(view?.team||[]).filter(m=>m.role==='driver').length,Icon:Truck},{label:'Invitaciones pendientes',count:(view?.invites||[]).filter(i=>!i.accepted_at).length,Icon:Mail},{label:'Departamentos',count:(view?.team||[]).filter(m=>m.role==='traffic'||m.role==='hr').length,Icon:ShieldCheck}] as const).map(({label,count,Icon})=>
       <div className="rounded-2xl border border-slate-200 bg-white p-4" key={label}><Icon className="h-5 w-5 text-blue-600"/><p className="mt-3 text-2xl font-bold text-slate-900">{count}</p><p className="text-sm text-slate-500">{label}</p></div>)}
     </div>
     <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Accesos rápidos</h2>
       <div className="mt-3 flex flex-wrap gap-3"><button className={button} type="button" onClick={()=>setOwnerTab('nuevo')}>+ Nuevo empleado</button><button className="rounded-xl border px-4 py-2 text-sm font-semibold" type="button" onClick={()=>setOwnerTab('invitaciones')}>Ver invitaciones</button><button className="rounded-xl border px-4 py-2 text-sm font-semibold" type="button" onClick={()=>setOwnerTab('configuracion')}>Configurar conductores</button></div>
     </div>
    </div>:null}
    <div className="grid gap-4 lg:grid-cols-2">
   {ownerTab==='nuevo'?<div className="rounded-2xl border bg-white p-5 lg:col-span-2">
    <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-blue-600"/>Alta de empleado</h2>
    <p className="mt-2 text-sm text-slate-600">Primero selecciona el tipo de empleado. Si es conductor, configura todas sus condiciones antes de crear la invitación.</p>
    <label className="mt-4 block text-sm font-semibold">Tipo de empleado <span className="text-red-600">*</span>
     <select className={input+' mt-1'} required value={staffRole} onChange={e=>setStaffRole(e.target.value)}>
      <option value="">Selecciona un tipo de empleado</option>
      <option value="driver">Conductor</option><option value="traffic">Tráfico</option><option value="hr">Recursos Humanos</option>
     </select>
    </label>
    {staffRole?<div className="mt-3 grid gap-3 sm:grid-cols-3">
     <label className="text-sm font-semibold">Nombre y apellidos <span className="text-red-600">*</span>
      <input className={input+' mt-1'} value={staffName} onChange={e=>setStaffName(e.target.value)} placeholder="Nombre completo"/></label>
     {staffRole==='driver'?<label className="text-sm font-semibold">Correo electrónico <span className="text-red-600">*</span>
      <input type="email" className={input+' mt-1'} value={staffEmail} onChange={e=>setStaffEmail(e.target.value)} placeholder="conductor@empresa.es"/></label>:null}
     <label className="text-sm font-semibold">Nombre de usuario <span className="text-red-600">*</span>
      <input className={input+' mt-1'} value={staffUsername} onChange={e=>setStaffUsername(e.target.value.toLowerCase())} placeholder="conductor15"/></label>
    </div>:null}
    {staffRole&&staffRole!=='driver'?<div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Contraseña inicial <span className="text-red-600">*</span>
       <input type="password" autoComplete="new-password" className={input+' mt-1'} value={staffPassword} onChange={e=>setStaffPassword(e.target.value)} placeholder="Mínimo 12 caracteres"/></label>
      <label className="text-sm font-semibold">Confirmar contraseña <span className="text-red-600">*</span>
       <input type="password" autoComplete="new-password" className={input+' mt-1'} value={staffPasswordConfirm} onChange={e=>setStaffPasswordConfirm(e.target.value)} placeholder="Repite la contraseña"/></label>
     </div>:null}
    {staffRole==='driver'?<div className="mt-5"><h3 className="mb-3 text-lg font-bold">Configuración inicial de Tacoplan</h3>
      <EnterpriseDriverConfig value={staffConfig} onChange={setStaffConfig} idPrefix="new-driver"/></div>:null}
    {staffRole?<button type="button" disabled={busy||staffName.trim().length<2||!staffUsername.trim()||(staffRole==='driver'?!staffEmail.trim():staffPassword.length<12||staffPassword!==staffPasswordConfirm)} className={button+' mt-5'} onClick={async()=>{
      const isDriver=staffRole==='driver';
      const result=await action(isDriver
       ?{action:'invite',email:staffEmail,username:staffUsername,employeeName:staffName,role:'driver',initialSettings:staffConfig}
       :{action:'create_staff',username:staffUsername,employeeName:staffName,role:staffRole,password:staffPassword});
      if(result){setLatestInvite(isDriver?result.url:'');setStaffName('');setStaffEmail('');setStaffUsername('');setStaffRole('');setStaffPassword('');setStaffPasswordConfirm('');setStaffConfig(blankCompanyConfig());setMessage(isDriver?'Invitación del conductor creada. Comparte el enlace.':'Cuenta de empleado creada. Ya puede iniciar sesión en /empleados/login con su usuario y contraseña.');}
     }}><Plus className="mr-1 inline h-4 w-4"/>{staffRole==='driver'?'Crear invitación de conductor':'Crear cuenta de empleado'}</button>:null}
    {latestInvite?<div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs font-semibold text-blue-900">Invitación privada · válida 7 días</p><input readOnly className={input+' mt-2 text-xs'} value={latestInvite}/><button type="button" className="mt-2 flex items-center gap-2 text-sm font-semibold text-blue-700" onClick={()=>void navigator.clipboard.writeText(latestInvite)}><Copy className="h-4 w-4"/>Copiar enlace</button></div>:null}
   </div>:null}
   {ownerTab==='empleados'?<div className="rounded-2xl border bg-white p-5 lg:col-span-2">
    <h2 className="text-lg font-bold">Personal de empresa</h2>
    <div className="mt-3 space-y-2">{(view?.team||[]).map(x=><div className="flex items-center justify-between gap-3 rounded-xl border p-3" key={x.user_id}>
     <div><p className="text-sm font-semibold">{x.employee_name||x.username}</p><p className="text-xs text-slate-500">@{x.username}</p></div>
     <span className="text-xs text-slate-500">{roleLabels[x.role as keyof typeof roleLabels]||x.role}</span>
    </div>)}</div>
   </div>:null}
   {ownerTab==='invitaciones'?<div className="rounded-2xl border bg-white p-5 lg:col-span-2">
    <h2 className="text-lg font-bold">Invitaciones pendientes de activación</h2>
    <p className="mt-1 text-xs text-slate-500">Una invitación no equivale a un empleado activo. Si el conductor ya ha creado su acceso, debe volver al enlace y finalizar la vinculación.</p>
    <div className="mt-3 space-y-2">{(view?.invites||[]).filter(x=>!x.accepted_at).map(x=><button type="button" key={x.id} className={'w-full rounded-xl border p-3 text-left text-sm '+(pendingInviteId===x.id?'border-blue-500 bg-blue-50':'')} onClick={()=>selectInvite(x.id)}>
      <strong>{x.employee_name||x.username}</strong> · @{x.username} · {roleLabels[x.role as keyof typeof roleLabels]||x.role}<span className="block text-xs text-amber-700">Pendiente — configurar o corregir antes de activar</span>
     </button>)}</div>
    {pendingInviteId?<div className="mt-4 space-y-3 rounded-xl border border-blue-200 p-4"><h4 className="font-bold">Completar invitación pendiente</h4>
     <label className="text-sm font-semibold">Nombre del empleado<input className={input} value={pendingInviteName} onChange={e=>setPendingInviteName(e.target.value)}/></label>
     {view?.invites?.find(x=>x.id===pendingInviteId)?.role==='driver'?<EnterpriseDriverConfig value={pendingInviteConfig} onChange={setPendingInviteConfig} idPrefix="pending-driver"/>:null}
     <button className={button} disabled={busy} type="button" onClick={async()=>{
      const selected=view?.invites?.find(x=>x.id===pendingInviteId);
      const res=await action({action:'update_pending_invite',inviteId:pendingInviteId,employeeName:pendingInviteName,initialSettings:selected?.role==='driver'?pendingInviteConfig:null});
      if(res){setPendingInviteId('');setMessage('Invitación actualizada. El empleado puede abrir de nuevo su enlace para finalizar la activación.');}
     }}>Guardar datos de la invitación</button>
     <button type="button" className="ml-2 rounded-xl border border-blue-600 px-4 py-2.5 text-sm font-semibold text-blue-700 disabled:opacity-50" disabled={busy} onClick={async()=>{
      const r=await action({action:'renew_invite',inviteId:pendingInviteId});
      if(r){setLatestInvite(r.url);setMessage('Nuevo enlace preparado. El enlace anterior deja de funcionar. Copia y envía el nuevo al empleado.');}
     }}>Generar nuevo enlace</button>
     {latestInvite?<div className="mt-3 rounded-lg bg-blue-50 p-3"><p className="text-xs font-semibold">Enlace actualizado de invitación</p><input readOnly className={input} value={latestInvite}/><button className="mt-2 text-sm font-semibold text-blue-700" type="button" onClick={()=>void navigator.clipboard.writeText(latestInvite)}>Copiar enlace</button></div>:null}
    </div>:null}
   </div>:null}
   {ownerTab==='configuracion'?<div className="rounded-2xl border bg-white p-5 lg:col-span-2">
    <h2 className="text-lg font-bold">Configuración de conductores activos</h2>
    <p className="mt-1 text-sm text-slate-600">El formulario siguiente es el mismo que se rellena al dar de alta. Los cambios quedan guardados y sincronizados para Tacoplan móvil.</p>
    <label className="mt-4 block text-sm font-semibold">Conductor activo<select className={input+' mt-1'} value={driverId} onChange={e=>selectDriver(e.target.value)}>
     <option value="">Selecciona un conductor activo</option>
     {(view?.team||[]).filter(x=>x.role==='driver'&&x.active!==false).map(x=><option key={x.user_id} value={x.user_id}>{x.employee_name||x.username}</option>)}
    </select></label>
    {!driverId?<p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">Solo aparecerán conductores que hayan terminado de aceptar su invitación. Los pendientes están arriba.</p>:<div className="mt-4">
      <EnterpriseDriverConfig value={editDriverConfig} onChange={setEditDriverConfig} idPrefix="existing-driver"/>
      <button type="button" className={button+' mt-4'} disabled={busy} onClick={async()=>{
       const res=await action({action:'update_settings',driverId,initialSettings:editDriverConfig});
       if(res)setMessage('Configuración guardada y sincronizada con Tacoplan del conductor.');
      }}>Guardar y sincronizar configuración</button>
    </div>}
   </div>:null}
   </div>
  </section>:null}
  {member.role==='traffic'?<section className="space-y-4"><div className="grid grid-cols-3 gap-2">{[{label:'Conductores',value:view?.drivers?.length||0},{label:'Jornadas recientes',value:view?.jornadas?.length||0},{label:'Cambios pendientes',value:pending.length}].map(x=><div key={x.label} className="rounded-xl bg-white p-4"><p className="text-2xl font-bold">{x.value}</p><p className="mt-1 text-xs text-slate-500">{x.label}</p></div>)}</div>
    <div className="rounded-2xl border bg-white p-5"><h2 className="flex items-center gap-2 font-bold"><Truck className="h-5 w-5 text-blue-600"/>Jornadas y dietas por conductor</h2><p className="mt-1 text-xs text-slate-500">Solo conductores de tu empresa.</p><div className="mt-3 max-h-80 overflow-y-auto divide-y">{(view?.jornadas||[]).slice(0,80).map(j=><button type="button" key={j.id} onClick={()=>{setReviewJornada(j.id);setDriverId(j.user_id);setNewDietAmount(j.dieta_importe_eur||'0');setProposedPluses(Array.isArray(j.plus_items)?j.plus_items.map(x=>({concepto:String(x.concepto||''),importe:Number(x.importe)||0})):[]);}} className={'w-full py-3 text-left text-sm '+(reviewJornada===j.id?'text-blue-700 font-bold':'text-slate-700')}><span>{driverName(j.user_id)} · {j.fecha_inicio||'Sin fecha'} · {j.lugar_inicio||'—'} → {j.lugar_fin||'—'}</span><span className="block text-xs text-slate-500">Dieta {j.dieta_manual_tipo||j.tipo_ruta||'—'} · {j.dieta_importe_eur||'—'} €</span></button>)}</div></div>
    <div className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Revisar dieta seleccionada</h2><p className="mt-1 text-xs text-slate-500">Jornada: {reviewJornada||'Elige una jornada arriba'}</p><div className="mt-3 flex flex-wrap gap-3"><label className="text-sm"><input type="radio" checked={mode==='confirm'} onChange={()=>setMode('confirm')}/> Confirmar sin cambios</label><label className="text-sm"><input type="radio" checked={mode==='propose'} onChange={()=>setMode('propose')}/> Proponer modificación</label></div>
    {mode==='propose'?<><label className="mt-3 block text-sm">Importe propuesto<input type="number" min="0" step="0.01" value={newDietAmount} onChange={e=>setNewDietAmount(e.target.value)} className={input+' mt-1'}/></label>
    <div className="mt-4 rounded-xl border p-3"><p className="text-sm font-bold">Pluses propuestos</p><p className="mt-1 text-xs text-slate-500">Puedes añadir, modificar o retirar conceptos. Todos los cambios requieren justificar el motivo y la aceptación del conductor.</p>
    {proposedPluses.map((p,index)=><div className="mt-2 flex items-center gap-2" key={index}>
      <input aria-label={'Concepto '+(index+1)} className={input+' min-w-0 flex-1'} value={p.concepto} onChange={e=>setProposedPluses(v=>v.map((x,i)=>i===index?{...x,concepto:e.target.value}:x))} placeholder="Concepto"/>
      <input aria-label={'Importe '+(index+1)} type="number" min="0" step="0.01" className={input+' w-28'} value={p.importe} onChange={e=>setProposedPluses(v=>v.map((x,i)=>i===index?{...x,importe:Number(e.target.value)}:x))}/>
      <button aria-label={'Quitar plus '+(index+1)} type="button" onClick={()=>setProposedPluses(v=>v.filter((_,i)=>i!==index))} className="rounded-lg border px-3 py-2 text-red-700">Quitar</button>
    </div>)}
    <button type="button" className="mt-3 rounded-lg border px-3 py-2 text-sm font-semibold text-blue-700" onClick={()=>setProposedPluses(v=>[...v,{concepto:'',importe:0}])}>Añadir plus</button>
    </div>
    <textarea value={reason} onChange={e=>setReason(e.target.value)} className={input+' mt-2'} placeholder="Motivo obligatorio del cambio (mínimo 10 caracteres)" rows={3}/></>:null}
    <textarea className={input+' mt-3'} rows={2} placeholder="Observación opcional" value={observation} onChange={e=>setObservation(e.target.value)}/>
    <button disabled={!reviewJornada||busy} className={button+' mt-3'} onClick={async()=>{const res=await action({action:'review',jornadaId:reviewJornada,driverId,mode,amount:Number(newDietAmount),pluses:proposedPluses,reason,observation});if(res){setReviewJornada('');setMessage(mode==='confirm'?'Dieta confirmada y conductor avisado.':'Propuesta registrada y enviada al conductor.');}}}>{mode==='confirm'?'Confirmar dieta':'Enviar propuesta al conductor'}</button>
    </div></section>:null}
  {member.role==='hr'?<section className="space-y-4">
    <nav className="flex flex-wrap gap-2 rounded-2xl border bg-white p-3" aria-label="Secciones de Recursos Humanos">
      <button type="button" className={'rounded-xl px-4 py-2 text-sm font-semibold '+(hrTab==='liquidacion'?'bg-blue-700 text-white':'bg-slate-100 text-slate-700')} onClick={()=>setHrTab('liquidacion')}>Liquidación mensual</button>
      <button type="button" className={'rounded-xl px-4 py-2 text-sm font-semibold '+(hrTab==='asignaciones'?'bg-blue-700 text-white':'bg-slate-100 text-slate-700')} onClick={()=>setHrTab('asignaciones')}>Asignar conductores a Tráfico</button>
    </nav>
    {hrTab==='liquidacion'?<div className="space-y-4"><div className="rounded-2xl border bg-white p-5"><h2 className="flex items-center gap-2 text-xl font-bold"><Wallet className="h-5 w-5 text-blue-600"/>Liquidación de dietas y pluses</h2><p className="mt-1 text-sm text-slate-500">Solo conceptos confirmados. Sin acceso a ubicaciones ni al panel de Tráfico.</p>
   <label className="mt-4 block text-sm font-semibold">Mes<input type="month" value={month} onChange={e=>setMonth(e.target.value)} className={input+' mt-1 max-w-xs'}/></label><div className="mt-4 grid grid-cols-3 gap-2">{[{label:'Confirmadas',value:payable.length},{label:'Pendientes',value:hrReviews.filter(r=>r.status==='awaiting_driver').length},{label:'En discrepancia',value:hrReviews.filter(r=>r.status==='disputed').length}].map(x=><div key={x.label} className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-bold">{x.value}</p><p className="text-xs text-slate-500">{x.label}</p></div>)}</div><p className="mt-3 text-xl font-bold">Dietas a liquidar: {euro(total)}</p><div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={busy||!active||hrReviews.length===0||!!view?.closures?.some(x=>x.month===month)} className={button} onClick={async()=>{
    if(!window.confirm('Cerrar el mes '+month+' con las dietas confirmadas? Las pendientes y discrepancias quedarán identificadas. Este cierre no podrá sobrescribirse.'))return;
    setBusy(true);setError('');try{const t=await token();const r=await fetch('/api/empresas/payroll',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify({month})});const j=await r.json();if(!r.ok)throw Error(j.error||'No se pudo cerrar el mes');setMessage('Cierre mensual guardado para '+j.drivers+' conductores.');await load();}catch(e:unknown){setError(e instanceof Error?e.message:'Error de cierre');}finally{setBusy(false);}
   }}>Cerrar mes confirmado</button>{view?.closures?.some(x=>x.month===month)?<span className="text-xs font-semibold text-emerald-700">Mes ya cerrado</span>:null}</div><p className="text-xs text-slate-500">Las cantidades no confirmadas no desaparecen; siguen identificadas como pendientes o discrepantes.</p></div>
   <div className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Revisiones y observaciones</h3><div className="mt-3 divide-y">{hrReviews.map(r=><div key={r.id} className="py-3 text-sm"><p className="font-semibold">{driverName(r.driver_id)} · {r.jornada_date||'Sin fecha'} · {r.status}</p><p className="text-slate-600">{r.original_diet_type||'Dieta'}: {euro(Number(r.original_amount))}{r.proposed_amount!==null?' → '+euro(Number(r.proposed_amount)):''}</p>{r.change_reason?<p className="text-xs text-amber-800">Motivo: {r.change_reason}</p>:null}{r.proposed_pluses?<p className="text-xs text-slate-600">Pluses propuestos: {r.proposed_pluses.map(p=>p.concepto+' ('+euro(Number(p.importe))+')').join(', ')||'Eliminados'}</p>:null}{r.driver_observation?<p className="text-xs text-blue-800">Conductor: {r.driver_observation}</p>:null}</div>)}</div></div></div>:null}
    {hrTab==='asignaciones'?<div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><UserRoundCog className="h-5 w-5 text-blue-600"/>Responsables de Tráfico</h2>
      <p className="mt-2 text-sm text-slate-600">Asigna cada conductor a un usuario de Tráfico. Solo ese responsable podrá ver sus jornadas y revisar sus dietas. Puedes cambiarlo o dejarlo sin asignar.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Conductor
          <select className={input+' mt-2'} value={assignedDriver} onChange={e=>{setAssignedDriver(e.target.value);setAssignedTraffic((view?.assignments||[]).find(a=>a.driver_id===e.target.value)?.traffic_user_id||'');}}>
            <option value="">Selecciona conductor</option>
            {(view?.drivers||[]).map(d=><option key={d.user_id} value={d.user_id}>{d.employee_name||d.username}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Responsable de Tráfico
          <select className={input+' mt-2'} value={assignedTraffic} onChange={e=>setAssignedTraffic(e.target.value)}>
            <option value="">Sin asignar</option>
            {(view?.trafficMembers||[]).map(t=><option key={t.user_id} value={t.user_id}>{t.employee_name||t.username}</option>)}
          </select>
        </label>
      </div>
      <button type="button" disabled={!assignedDriver||busy} className={button+' mt-4'} onClick={async()=>{
        const res=await action({action:'assign_driver',driverId:assignedDriver,trafficUserId:assignedTraffic||null});
        if(res)setMessage(assignedTraffic?'Responsable de Tráfico asignado correctamente.':'Conductor sin responsable asignado.');
      }}>Guardar asignación</button>
      <h3 className="mt-6 font-semibold">Distribución actual</h3>
      <div className="mt-3 divide-y rounded-xl border">
        {(view?.drivers||[]).map(d=>{
          const assignment=(view?.assignments||[]).find(a=>a.driver_id===d.user_id);
          const manager=(view?.trafficMembers||[]).find(t=>t.user_id===assignment?.traffic_user_id);
          return <div key={d.user_id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
           <span className="font-semibold">{d.employee_name||d.username}</span><span className={manager?'text-blue-700':'text-amber-700'}>{manager?'Tráfico: '+(manager.employee_name||manager.username):'Sin asignar'}</span>
          </div>;
        })}
      </div>
      {!(view?.trafficMembers||[]).length?<p className="mt-3 text-sm text-amber-700">Primero el administrador debe invitar y activar al personal de Tráfico con su cuenta y contraseña.</p>:null}
    </div>:null}
  </section>:null}
  {member.role==='driver'?<section className="space-y-4"><div className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Mis condiciones de empresa</h2><p className="mt-2 text-sm">Base: {view?.driverSettings?.base_name||'Pendiente'} · Convenio: {view?.driverSettings?.agreement||'Pendiente'}</p><p className="mt-2 text-xs text-slate-500">Gestionadas por la empresa. Puedes solicitar correcciones mediante una observación.</p></div>
   <div className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Revisiones de mis dietas</h2><div className="mt-3 space-y-3">{reviews.map(r=><div key={r.id} className="rounded-xl border p-4"><p className="text-sm font-bold">{r.original_diet_type||'Dieta'} · {euro(Number(r.original_amount))}{r.proposed_amount!==null?' → '+euro(Number(r.proposed_amount)):''}</p><p className="mt-1 text-xs text-slate-500">Estado: {r.status}</p>{r.change_reason?<p className="mt-2 text-sm text-slate-700">Motivo de Tráfico: {r.change_reason}</p>:null}{r.proposed_pluses?<p className="mt-2 text-xs text-slate-600">Pluses propuestos: {r.proposed_pluses.map(p=>p.concepto+' ('+euro(Number(p.importe))+')').join(', ')||'Eliminados'}</p>:null}
    {r.status==='awaiting_driver'?<div className="mt-3 space-y-2"><textarea className={input} rows={2} value={responseTexts[r.id]||''} onChange={e=>setResponseTexts({...responseTexts,[r.id]:e.target.value})} placeholder="Observación opcional al aceptar, obligatoria al discrepar"/><div className="flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={()=>void action({action:'respond',reviewId:r.id,response:'accept',observation:responseTexts[r.id]||''})}>Aceptar cambio</button><button disabled={busy} className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700" onClick={()=>void action({action:'respond',reviewId:r.id,response:'dispute',observation:responseTexts[r.id]||''})}>No estoy conforme</button></div></div>:null}
   </div>)}</div></div></section>:null}
  </>:null}
  <p className="text-xs leading-relaxed text-slate-500">Este es el módulo empresarial en preparación. Los permisos de Tráfico y RRHH se comprueban en el servidor. Las revisiones de dieta no alteran el registro original del conductor y la aceptación no implica renunciar a derechos salariales.</p>
 </div></main>;
}
