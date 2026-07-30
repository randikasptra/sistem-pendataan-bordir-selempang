import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const need=(k:string)=>{const v=process.env[k]?.trim();if(!v)throw new Error(`Missing ${k}`);return v}
const url=need('NEXT_PUBLIC_SUPABASE_URL'), admin=createClient(url,need('SUPABASE_SERVICE_ROLE_KEY'),{auth:{autoRefreshToken:false,persistSession:false}})
const check=(v:unknown,m:string)=>{if(!v)throw new Error(m)}
async function main(){const tag=randomUUID().slice(0,8);let vendorId='',userId='';const ids:string[]=[];try{
 const {data:v,error:ve}=await admin.from('vendors').insert({code:`DL-${tag}`,name:'Deadline test',is_active:true}).select('id').single();if(ve||!v)throw ve;vendorId=v.id
 const {data:u,error:ue}=await admin.auth.admin.createUser({email:`deadline-${tag}@example.test`,password:`${randomUUID()}A1!`,email_confirm:true});if(ue||!u)throw ue;userId=u.user.id
 await admin.from('profiles').insert({id:userId,full_name:'Deadline test',role:'vendor',vendor_id:vendorId,is_active:true})
 const today=new Date();const day=(n:number)=>new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()+n,12)).toISOString()
 for(const [n,deadline] of [['tomorrow',day(1)],['today',day(0)],['overdue',day(-1)]] as const){const {data:p,error}=await admin.from('purchase_orders').insert({vendor_id:vendorId,status:'SENT',created_by:userId,po_deadline:deadline,notes:n}).select('id').single();if(error||!p)throw error;ids.push(p.id);if(n==='tomorrow')await admin.from('po_items').insert({po_id:p.id,title:'Different item deadline',quantity:1,item_deadline:day(-1),sort_order:0})}
 const {error:rpc}=await admin.rpc('enqueue_po_deadline_notifications');if(rpc)throw rpc;await admin.rpc('enqueue_po_deadline_notifications')
 const {data:n,error:ne}=await admin.from('notifications').select('type,entity_type,entity_id').eq('user_id',userId);if(ne)throw ne
 check(n?.filter(x=>x.type==='deadline_tomorrow').length===1,`H-1 notification mismatch: ${JSON.stringify(n)}`);check(n?.filter(x=>x.type==='deadline_overdue').length===1,`overdue notification mismatch: ${JSON.stringify(n)}`);check(n?.filter(x=>x.type==='item_deadline_overdue').length===1,`item overdue notification mismatch: ${JSON.stringify(n)}`);check(!n?.some(x=>x.entity_id===ids[1]&&x.type==='deadline_overdue'),'today must not be overdue');check(n?.length===3,`notifications duplicated: ${JSON.stringify(n)}`)
 console.log('✅ Deadline notification smoke test passed')
 }finally{if(userId)await admin.from('notifications').delete().eq('user_id',userId);if(ids.length)await admin.from('purchase_orders').delete().in('id',ids);if(userId)await admin.auth.admin.deleteUser(userId);if(vendorId)await admin.from('vendors').delete().eq('id',vendorId)}}
main().catch(e=>{console.error('❌ Deadline notification test failed');console.error(JSON.stringify(e, Object.getOwnPropertyNames(e), 2));process.exitCode=1})
