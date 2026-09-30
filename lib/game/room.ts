import {active,revealFor,newPlayer,startRound,markSeen,openVote,castVote,defaults,validateConfig,type Session,type Config} from './engine.ts';
export type Member={id:string;name:string;ready:boolean;joined:number;lastSeen:number;left:boolean};
export type Message={id:string;sender:string;name:string;text:string;at:number};
export type Room={code:string;host:string;members:Member[];session:Session;messages:Message[];lobby:boolean};
export function createRoom(code:string,id:string,name:string,now=Date.now()):Room {return {code,host:id,members:[{id,name,ready:false,joined:now,lastSeen:now,left:false}],session:{version:1,players:[newPlayer(name,id)],config:{...defaults},round:null,history:[],usedCharacters:[],usedPairs:[]},messages:[],lobby:true};}
export function transferHost(room:Room,now=Date.now()) {const host=room.members.find(m=>m.id===room.host);if(host&&!host.left&&now-host.lastSeen<45000)return;const next=room.members.filter(m=>!m.left&&now-m.lastSeen<45000).sort((a,b)=>a.joined-b.joined)[0];if(next&&next.id!==room.host){room.host=next.id;room.messages.push({id:crypto.randomUUID(),sender:'system',name:'Démasq',text:`${next.name} est maintenant l’hôte.`,at:now});}}
export function joinRoom(room:Room,id:string,name:string,now=Date.now()) {const existing=room.members.find(m=>m.id===id);if(existing){existing.left=false;existing.lastSeen=now;return;}if(!room.lobby)throw new Error('Cette manche est en cours. Réessayez au prochain lobby.');if(room.session.players.length>=12)throw new Error('Ce salon est complet.');if(room.session.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw new Error('Ce pseudo est déjà utilisé.');room.members.push({id,name,ready:false,joined:now,lastSeen:now,left:false});room.session.players.push(newPlayer(name,id));}
export type RoomAction={type:string;target?:string;text?:string;config?:Config};
export function actRoom(room:Room,id:string,action:RoomAction,now=Date.now()) {
 const member=room.members.find(m=>m.id===id&&!m.left);if(!member)throw new Error('Rejoignez ce salon pour continuer.');member.lastSeen=now;transferHost(room,now);
 const host=()=>{if(room.host!==id)throw new Error('Cette action est réservée à l’hôte.');};
 switch(action.type){
 case 'heartbeat':break;
 case 'ready':if(!room.lobby)throw new Error('La manche a déjà commencé.');member.ready=!member.ready;break;
 case 'configure':host();if(!room.lobby||!action.config)throw new Error('Paramètres indisponibles.');validateConfig(action.config,Math.max(3,room.session.players.length));room.session.config=action.config;room.members.forEach(m=>m.ready=false);break;
 case 'start':host();if(!room.lobby)throw new Error('Manche déjà lancée.');if(room.members.some(m=>!m.left&&!m.ready))throw new Error('Tous les joueurs doivent être prêts.');if(room.members.some(m=>m.left))throw new Error('Un joueur a quitté le salon. Il doit revenir pour continuer cette session.');room.session=startRound(room.session);room.lobby=false;break;
 case 'seen':room.session=markSeen(room.session,id);break;
 case 'openVote':host();room.session=openVote(room.session);break;
 case 'vote':room.session=castVote(room.session,id,action.target??'');break;
 case 'replay':host();room.session=startRound(room.session);room.lobby=false;break;
 case 'lobby':host();if(room.session.round?.phase!=='result')throw new Error('Terminez la manche.');room.lobby=true;room.members.forEach(m=>m.ready=false);break;
 case 'message':{if(!room.lobby&&!room.session.config.chat)throw new Error('Le chat est désactivé pendant la manche.');const text=action.text?.trim()??'';if(!text||text.length>300)throw new Error('Écrivez entre 1 et 300 caractères.');const last=room.messages.filter(m=>m.sender===id).at(-1);if(last&&now-last.at<1500)throw new Error('Un message à la fois. Réessayez dans un instant.');room.messages.push({id:crypto.randomUUID(),sender:id,name:member.name,text,at:now});break;}
 case 'leave':member.left=true;member.ready=false;room.messages.push({id:crypto.randomUUID(),sender:'system',name:'Démasq',text:`${member.name} a quitté la partie.`,at:now});transferHost(room,now);break;
 default:throw new Error('Action inconnue.');
 }
 room.messages=room.messages.slice(-100);return room;
}
// This is the only payload sent to an online participant. Never return Room or Session directly.
export function roomView(room:Room,id:string,now=Date.now()) {
 if(!room.members.some(m=>m.id===id&&!m.left))throw new Error('Accès au salon refusé.');
 const s=room.session,r=s.round,finished=r?.phase==='result';
 return {code:room.code,me:id,host:room.host,lobby:room.lobby,config:s.config,
  members:room.members.map(m=>({id:m.id,name:m.name,ready:m.ready,online:!m.left&&now-m.lastSeen<45000,left:m.left})),
  players:s.players.map(p=>({id:p.id,name:p.name,points:p.points,wins:p.wins,played:p.played})),messages:room.messages,
  round:r?{number:r.number,phase:r.phase,order:r.order,eliminated:r.eliminated,seen:r.seen,hasVoted:r.currentVotes.some(v=>v.voter===id),voteCount:r.currentVotes.length,alive:active(s).map(p=>p.id),lastEliminated:r.lastEliminated,tied:r.tied,ballotCount:r.ballots.length,
   eliminatedRole:s.config.revealEliminated&&r.lastEliminated?(r.impostors.includes(r.lastEliminated)?'impostor':'innocent'):null,
   secret:revealFor(s,id),result:finished?{winner:r.winner,main:r.main,alternate:s.config.mode==='blank'?null:r.alternate,impostors:r.impostors,awards:r.awards,ballots:r.ballots}:null}:null};
}
export type RoomView=ReturnType<typeof roomView>;
