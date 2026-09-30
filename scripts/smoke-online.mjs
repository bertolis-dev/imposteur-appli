import assert from 'node:assert/strict';
const origin=process.argv[2]??'http://127.0.0.1:5173';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Local test only.');
const clients=Array.from({length:3},()=>({cookie:'',view:null}));
async function action(client,type,extra={}){
 const r=await fetch(origin+'/api/room',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:client.cookie},body:JSON.stringify({type,...extra})});
 const cookie=r.headers.get('set-cookie');if(cookie)client.cookie=cookie.split(';')[0];
 const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));client.view=data;return data;
}
const a=await action(clients[0],'create',{name:'QA Alice'}),code=a.code;
for(let i=1;i<3;i++)await action(clients[i],'join',{code,name:'QA Joueur '+i});
for(const c of clients)await action(c,'ready',{code});
await action(clients[0],'start',{code});
for(const c of clients)await action(c,'heartbeat',{code});
const ids=clients.map(c=>c.view.me),secrets=clients.map(c=>c.view.round.secret.characterId);
const imp=secrets.findIndex(s=>secrets.filter(x=>x===s).length===1);assert.ok(imp>=0);
for(const c of clients){assert.equal(c.view.round.result,null);assert.ok(!('impostors' in c.view.round));await action(c,'seen',{code});}
await action(clients[0],'openVote',{code});
for(let i=0;i<3;i++)await action(clients[i],'vote',{code,target:ids[i===imp?(i+1)%3:imp]});
const final=await action(clients[0],'heartbeat',{code});assert.equal(final.round.result.winner,'innocents');
for(let i=0;i<3;i++)assert.equal(final.players.find(p=>p.id===ids[i]).points,i===imp?0:100);
await action(clients[1],'heartbeat',{code});assert.deepEqual(clients[1].view.players,final.players);
await action(clients[0],'leave',{code});const transferred=await action(clients[1],'heartbeat',{code});assert.equal(transferred.host,ids[1]);
console.log('PASS: 3 isolated cookies; create/join/ready/reveal/vote/results/reconnect/host transfer.');
