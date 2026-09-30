import { playablePairs, characters, hasVerifiedImage, type Difficulty } from './catalog.ts';
export type Config = { mode:'different'|'blank'; impostors:number; difficulty:Difficulty; themes:string[]; randomOrder:boolean; revealEliminated:boolean; chat:boolean };
export const defaults:Config = { mode:'different', impostors:1, difficulty:'medium', themes:[], randomOrder:true, revealEliminated:false, chat:true };
export type Player = {id:string;name:string;points:number;wins:number;played:number;impostorCount:number;impostorWins:number;correctVotes:number;totalVotes:number;titles:string[]};
export type Ballot = {voter:string;target:string};
export type Round = { number:number; phase:'reveal'|'discussion'|'vote'|'result'; impostors:string[]; main:string; alternate:string; order:string[]; seen:string[]; eliminated:string[]; ballots:Ballot[][]; currentVotes:Ballot[]; awards:Record<string,number>; voteAwards:Record<string,number>; winner:'innocents'|'impostors'|null; lastEliminated:string|null; tied:boolean };
export type Session = {version:1;players:Player[];config:Config;round:Round|null;history:Round[];usedCharacters:string[];usedPairs:string[]};
export function randomInt(max:number) { if(max<1) throw new Error('Tirage impossible.'); const limit=0x100000000-(0x100000000%max); let n:number; do { n=crypto.getRandomValues(new Uint32Array(1))[0]; } while(n>=limit); return n%max; }
export function shuffle<T>(items:T[]):T[] { const out=[...items]; for(let i=out.length-1;i>0;i--){ const j=randomInt(i+1); [out[i],out[j]]=[out[j],out[i]]; } return out; }
export function maxImpostors(n:number) { return Math.min(3,Math.floor((n-1)/2)); }
export function newPlayer(name:string,id=crypto.randomUUID()):Player { return {id,name,points:0,wins:0,played:0,impostorCount:0,impostorWins:0,correctVotes:0,totalVotes:0,titles:[]}; }
export function validateConfig(config:Config,n:number) { if(n<3||n>12) throw new Error('Choisissez entre 3 et 12 joueurs.'); if(!Number.isInteger(config.impostors)||config.impostors<1||config.impostors>maxImpostors(n)) throw new Error('Trop d’imposteurs pour ce groupe.'); if(!['different','blank'].includes(config.mode)||!['easy','medium','hard'].includes(config.difficulty)||!Array.isArray(config.themes)) throw new Error('Paramètres invalides.'); }
export function createSession(names:string[],config:Config=defaults):Session {
  validateConfig(config,names.length); const clean=names.map(n=>n.trim());
  if(clean.some(n=>!n||n.length>24)||new Set(clean.map(n=>n.toLocaleLowerCase())).size!==clean.length) throw new Error('Choisissez des pseudos différents, de 1 à 24 caractères.');
  return {version:1,players:clean.map(n=>newPlayer(n)),config:{...config},round:null,history:[],usedCharacters:[],usedPairs:[]};
}
function clone(s:Session):Session { return structuredClone(s); }
export function startRound(input:Session):Session {
 const s=clone(input); validateConfig(s.config,s.players.length);
 if(s.round&&s.round.phase!=='result') throw new Error('Terminez la manche en cours.');
 if(s.round) s.history.push(s.round);
 const valid=playablePairs.filter(p=>p.difficulty===s.config.difficulty&&[p.a,p.b].every(id=>{const c=characters.find(c=>c.id===id)!;return !s.config.themes.length||s.config.themes.includes(c.category)||s.config.themes.includes(c.work_name);}));
 if(!valid.length) throw new Error('Aucune paire avec deux images vérifiées pour ces paramètres. Choisissez un autre thème ou une autre difficulté.');
 const pair=shuffle(valid).sort((a,b)=>pairCost(a)-pairCost(b))[0];
 function pairCost(p:{a:string;b:string}) { return (s.usedPairs.includes([p.a,p.b].sort().join(':'))?4:0)+(s.usedCharacters.includes(p.a)?1:0)+(s.usedCharacters.includes(p.b)?1:0); }
 const [main,alternate]=shuffle([pair.a,pair.b]);
 const previous=s.history.at(-1)?.impostors??[];
 const chosen=shuffle(s.players).sort((a,b)=>a.impostorCount-b.impostorCount||Number(previous.includes(a.id))-Number(previous.includes(b.id))).slice(0,s.config.impostors).map(p=>p.id);
 s.players.forEach(p=>{if(chosen.includes(p.id))p.impostorCount++;});
 const ids=s.players.map(p=>p.id); const first=randomInt(ids.length);
 s.round={number:s.history.length+1,phase:'reveal',impostors:chosen,main,alternate,order:s.config.randomOrder?shuffle(ids):[...ids.slice(first),...ids.slice(0,first)],seen:[],eliminated:[],ballots:[],currentVotes:[],awards:{},voteAwards:{},winner:null,lastEliminated:null,tied:false};
 s.usedCharacters.push(main,alternate);s.usedPairs.push([pair.a,pair.b].sort().join(':'));return s;
}
export function active(s:Session) { return s.players.filter(p=>!s.round?.eliminated.includes(p.id)); }
export function roundHasImages(s:Session) {return !s.round||[s.round.main,...(s.config.mode==='different'?[s.round.alternate]:[])].every(id=>{const c=characters.find(c=>c.id===id);return !!c&&hasVerifiedImage(c);});}
export function replaceUnillustratedRound(s:Session) {if(roundHasImages(s))throw new Error('Cette manche possède déjà ses images.');return startRound({...s,history:s.round?[...s.history,s.round]:s.history,round:null});}
export function revealFor(s:Session,id:string):{characterId:string|null;isBlank:boolean} {
 if(!s.round||!s.players.some(p=>p.id===id)) throw new Error('Joueur introuvable.');
 const imp=s.round.impostors.includes(id); return {characterId:imp?(s.config.mode==='blank'?null:s.round.alternate):s.round.main,isBlank:imp&&s.config.mode==='blank'};
}
export function markSeen(input:Session,id:string) { const s=clone(input);const r=s.round!;if(!r||r.phase!=='reveal'||!s.players.some(p=>p.id===id))throw new Error('Révélation indisponible.');if(!r.seen.includes(id))r.seen.push(id);if(r.seen.length===s.players.length)r.phase='discussion';return s; }
export function openVote(input:Session) { const s=clone(input);if(s.round?.phase!=='discussion') throw new Error('Le vote n’est pas disponible.');s.round.phase='vote';s.round.currentVotes=[];return s; }
export function castVote(input:Session,voter:string,target:string) {
 const s=clone(input),r=s.round; if(!r||r.phase!=='vote')throw new Error('Le vote est fermé.');
 const alive=active(s).map(p=>p.id);if(voter===target||!alive.includes(voter)||!alive.includes(target))throw new Error('Vote invalide.');
 if(r.currentVotes.some(v=>v.voter===voter))throw new Error('Vote déjà enregistré.');r.currentVotes.push({voter,target});
 if(r.currentVotes.length===alive.length) resolveBallot(s);return s;
}
function resolveBallot(s:Session) {
 const r=s.round!;const alive=active(s);const innocent=alive.filter(p=>!r.impostors.includes(p.id));
 const good=r.currentVotes.filter(v=>!r.impostors.includes(v.voter)&&r.impostors.includes(v.target));
 const unanimous=good.length===innocent.length;
 good.forEach(v=>{r.voteAwards[v.voter]=Math.max(r.voteAwards[v.voter]??0,unanimous?100:50);});
 r.currentVotes.forEach(v=>{const p=s.players.find(p=>p.id===v.voter)!;if(!r.impostors.includes(p.id)){p.totalVotes++;if(r.impostors.includes(v.target))p.correctVotes++;}});
 const counts:Record<string,number>={};r.currentVotes.forEach(v=>counts[v.target]=(counts[v.target]??0)+1);
 const best=Math.max(...Object.values(counts));const top=Object.keys(counts).filter(id=>counts[id]===best);
 r.ballots.push(r.currentVotes);r.currentVotes=[];r.tied=top.length!==1;r.lastEliminated=r.tied?null:top[0];
 if(r.lastEliminated)r.eliminated.push(r.lastEliminated);
 const survivors=active(s);const imps=survivors.filter(p=>r.impostors.includes(p.id)).length;
 r.winner=imps===0?'innocents':imps>=survivors.length-imps?'impostors':null;
 if(!r.winner){r.phase='discussion';return;}
 r.phase='result';r.awards={...r.voteAwards};
 s.players.forEach(p=>{
   const isImp=r.impostors.includes(p.id),won=(r.winner==='impostors')===isImp;
   if(isImp&&won) r.awards[p.id]=r.ballots.flat().some(v=>v.target===p.id)?150:250;
   p.points+=r.awards[p.id]??0;p.played++;if(won)p.wins++;if(isImp&&won)p.impostorWins++;
   const titles=roundTitles(s,p.id);p.titles=[...new Set([...p.titles,...titles])];
 });
}
export function roundTitles(s:Session,id:string) {const r=s.round!;const out:string[]=[];if(r.voteAwards[id]===100)out.push('Œil de lynx');if(r.awards[id]===250)out.push('Intouchable');else if(r.impostors.includes(id)&&r.winner==='impostors')out.push('Roi du bluff');if(r.winner&&!r.eliminated.includes(id))out.push('Survivant');return out;}
export function ranking(s:Session) { const sorted=[...s.players].sort((a,b)=>b.points-a.points);return sorted.map(p=>({...p,rank:sorted.findIndex(x=>x.points===p.points)+1})); }
export function assertSession(value:unknown): value is Session { if(!value||typeof value!=='object')return false;const s=value as Session;return s.version===1&&Array.isArray(s.players)&&s.players.length>=3&&s.players.length<=12&&Array.isArray(s.history)&&!!s.config; }
