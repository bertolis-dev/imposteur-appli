'use client';
import {useState} from 'react';
import { character, licensedImageProvider } from '@/lib/game/catalog';
import { Fingerprint, Sparkles, RefreshCw, ImageOff } from 'lucide-react';
type Props={id:string|null;blank?:boolean;onReady?:(ready:boolean)=>void};
export function CharacterCard(props:Props) {return <CardImage key={`${props.id}:${props.blank}`} {...props}/>;}
function CardImage({id,blank=false,onReady}:Props) {
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');const [attempt,setAttempt]=useState(0);
 const c=id?character(id):null;const image=c?licensedImageProvider.resolve(c):null;
 if(blank)return <article className="character-card blank"><div className="character-visual"><Fingerprint size={92} strokeWidth={1}/><span>À toi de bluffer</span><small>Écoute les indices des autres.</small></div><div className="character-caption"><span className="eyebrow">Sans personnage</span><h2>Tu es l’imposteur</h2><p>Fais comme si tu savais.</p></div></article>;
 if(!c||!image?.src)return <div className="image-error" role="alert"><ImageOff/><strong>Image non validée</strong><p>Ce personnage n’est plus disponible pour une nouvelle manche. Vos points sont conservés.</p></div>;
 const failed=status==='error';
 return <article className={`character-card illustrated ${status}`} aria-busy={status==='loading'}>
  <div className="character-visual">
   {status==='loading'&&<div className="image-loading" role="status"><span className="image-spinner"/>Chargement du portrait…</div>}
   {failed?<div className="image-error" role="alert"><ImageOff/><strong>Le portrait n’a pas chargé.</strong><p>Vérifiez la connexion puis réessayez avant de passer le téléphone.</p><button className="secondary" onClick={()=>{setStatus('loading');setAttempt(a=>a+1);onReady?.(false);}}><RefreshCw size={18}/> Réessayer</button></div>:
    /* The content-hashed WebP is resized and compressed at import, with no remote image proxy. */
    // eslint-disable-next-line @next/next/no-img-element
    <img key={attempt} src={image.src} alt={c.image_type==='REAL_PERSON'?`Portrait de ${c.character_name}`:`${c.character_name} dans l’univers ${c.work_name}`} width={c.image_review!.width} height={c.image_review!.height} loading="eager" decoding="async" fetchPriority="high" style={{opacity:status==='ready'?1:0}} onLoad={e=>{void e.currentTarget.decode().then(()=>{setStatus('ready');onReady?.(true);}).catch(()=>{setStatus('error');onReady?.(false);});}} onError={()=>{setStatus('error');onReady?.(false);}}/>
   }
  </div>
  {status==='ready'&&<div className="character-caption"><span className="eyebrow"><Sparkles size={14}/>{c.category}</span><h2>{c.character_name}</h2><p>{c.work_name}</p><details className="image-credits"><summary>Crédit de l’image</summary><small>{image.attribution} · <a href={c.image_source!} target="_blank" rel="noreferrer">Source</a> · <a href={c.image_license_url!} target="_blank" rel="noreferrer">{c.image_license}</a><br/>{c.image_review!.modifications}</small></details></div>}
 </article>;
}
