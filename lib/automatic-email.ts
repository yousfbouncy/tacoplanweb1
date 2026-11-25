import crypto from 'crypto';
export const emailReady=()=>Boolean(process.env.RESEND_API_KEY&&process.env.TP_EMAIL_FROM&&process.env.TP_EMAIL_UNSUBSCRIBE_SECRET&&process.env.TP_EMAIL_ENABLED==='true');
export function unsubscribeToken(id:string){const secret=process.env.TP_EMAIL_UNSUBSCRIBE_SECRET;if(!secret)throw Error('Missing unsubscribe secret');return id+'.'+crypto.createHmac('sha256',secret).update(id).digest('hex');}
export function verifyUnsubscribe(token:string){const [id,sig,extra]=token.split('.');if(extra||!id||!sig||!/^[0-9a-f-]{36}$/i.test(id)||!/^[0-9a-f]{64}$/.test(sig)||!process.env.TP_EMAIL_UNSUBSCRIBE_SECRET)return null;const expected=unsubscribeToken(id).split('.')[1];return crypto.timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(expected,'hex'))?id:null;}
