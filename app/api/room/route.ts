import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {createRoom,joinRoom,actRoom,roomView,type Room} from '@/lib/game/room';
export const dynamic='force-dynamic';
const schema=z.object({type:z.enum(['create','join','heartbeat','ready','configure','start','seen','openVote','vote','replay','lobby','message','leave']),code:z.string().regex(/^[A-Z2-9]{6}$/).optional(),name:z.string().trim().min(1).max(24).optional(),target:z.string().max(80).optional(),text:z.string().max(300).optional(),config:z.object({mode:z.enum(['different','blank']),impostors:z.number().int().min(1).max(3),difficulty:z.enum(['easy','medium','hard']),themes:z.array(z.string().max(80)).max(100),randomOrder:z.boolean(),revealEliminated:z.boolean(),chat:z.boolean()}).optional()});
async function identity(req:Request){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)demasq_player=([a-f0-9]{64})(?:;|$)/)?.[1]??Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),x=>x.toString(16).padStart(2,'0')).join('');return {id,token};}
function json(data:unknown,status=200,token?:string,secure=true){const headers:Record<string,string>={'Cache-Control':'no-store','Content-Type':'application/json'};if(token)headers['Set-Cookie']=`demasq_player=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${secure?'; Secure':''}`;return new Response(JSON.stringify(data),{status,headers});}
export async function POST(req:Request){
 try {
  const url=new URL(req.url);if(req.headers.get('origin')!==url.origin)return json({error:'Origine refusée.'},403);
  const raw=await req.text();if(raw.length>8192)return json({error:'Requête trop volumineuse.'},413);
  const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return json({error:'Requête invalide.'},400);const body=parsed.data;
  const db=env.DB;if(!db)return json({error:'Le service en ligne est temporairement indisponible.'},503);
  const {id,token}=await identity(req);const respond=(data:unknown,status=200)=>json(data,status,token,url.protocol==='https:');
  const now=Date.now(),window=Math.floor(now/60000);const ip=req.headers.get('cf-connecting-ip')??id;
  const key=`${body.type==='create'?'create':'action'}:${ip}:${window}`;
  const limit=body.type==='create'?5:180;
  const counter=await db.prepare('INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+120000).first<{count:number}>();
  if((counter?.count??0)>limit)return respond({error:'Trop de demandes. Réessayez dans une minute.'},429);
  if(body.type==='create'){
   if(!body.name)return respond({error:'Choisissez un pseudo.'},400);
   await db.prepare('DELETE FROM rate_limits WHERE expires < ?').bind(now).run();
   const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const code=Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>alphabet[b%32]).join('');
   const room=createRoom(code,id,body.name,now);await db.prepare('INSERT INTO rooms (code,state,revision,updated_at) VALUES (?,?,0,?)').bind(code,JSON.stringify(room),now).run();return respond(roomView(room,id,now));
  }
  if(!body.code)return respond({error:'Code manquant.'},400);
  for(let attempt=0;attempt<5;attempt++){
   const row=await db.prepare('SELECT state,revision FROM rooms WHERE code=?').bind(body.code).first<{state:string;revision:number}>();if(!row)return respond({error:'Salon introuvable. Vérifiez le code.'},404);
   const room:Room=JSON.parse(row.state);
   if(body.type==='join'){if(!body.name)return respond({error:'Choisissez un pseudo.'},400);joinRoom(room,id,body.name,now);}
   else actRoom(room,id,body,now);
   const updated=await db.prepare('UPDATE rooms SET state=?,revision=revision+1,updated_at=? WHERE code=? AND revision=?').bind(JSON.stringify(room),now,body.code,row.revision).run();
   if(updated.meta.changes===1)return respond(body.type==='leave'?{left:true}:roomView(room,id,now));
  }
  return respond({error:'Le salon vient de changer. Réessayez votre action.'},409);
 }catch(e){console.error('room action failed',e instanceof Error?e.message:'unknown');return json({error:e instanceof Error&&!/SQL|D1|database|JSON/i.test(e.message)?e.message:'Le service n’a pas pu répondre. Réessayez.'},400);}
}
