import {verifiedImages,type VerifiedImage} from './verified-images.ts';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Character = {
  id: string; character_name: string; actor_name: string | null; work_name: string;
  category: string; subcategory: string; tags: string[]; difficulty: Difficulty;
  image_url: string | null; image_source: string | null; image_license: string | null;
  image_attribution: string | null; image_type: 'CHARACTER' | 'REAL_PERSON' | 'ANIMATION' | 'VIDEO_GAME';
  image_status:'verified'|'pending'; image_license_url:string|null; image_review:VerifiedImage|null;
};
export type Pair = { a: string; b: string; difficulty: Difficulty };
const groups: [string, string, Character['image_type'], string[]][] = [
  ['Séries','Breaking Bad','CHARACTER',['Walter White|Bryan Cranston','Jesse Pinkman|Aaron Paul','Saul Goodman|Bob Odenkirk','Gus Fring|Giancarlo Esposito']],
  ['Films','Harry Potter','CHARACTER',['Harry Potter|Daniel Radcliffe','Hermione Granger|Emma Watson','Ron Weasley|Rupert Grint','Drago Malefoy|Tom Felton']],
  ['Films','Star Wars','CHARACTER',['Luke Skywalker|Mark Hamill','Dark Vador|David Prowse','Leia Organa|Carrie Fisher','Han Solo|Harrison Ford']],
  ['Films','Marvel','CHARACTER',['Iron Man|Robert Downey Jr.','Doctor Strange|Benedict Cumberbatch','Thor|Chris Hemsworth','Loki|Tom Hiddleston']],
  ['Séries','Stranger Things','CHARACTER',['Eleven|Millie Bobby Brown','Dustin Henderson|Gaten Matarazzo','Mike Wheeler|Finn Wolfhard','Will Byers|Noah Schnapp']],
  ['Anime','Naruto','ANIMATION',['Naruto Uzumaki','Sasuke Uchiha','Sakura Haruno','Kakashi Hatake']],
  ['Anime','One Piece','ANIMATION',['Monkey D. Luffy','Roronoa Zoro','Nami','Sanji']],
  ['Anime','Dragon Ball','ANIMATION',['Son Goku','Vegeta','Piccolo','Son Gohan']],
  ['Dessins animés','Disney','ANIMATION',['Mickey Mouse','Donald Duck','Dingo','Minnie Mouse']],
  ['Dessins animés','Toy Story','ANIMATION',['Woody','Buzz l’Éclair','Jessie','Rex']],
  ['Jeux vidéo','Super Mario','VIDEO_GAME',['Mario','Luigi','Peach','Bowser']],
  ['Jeux vidéo','Pokémon','VIDEO_GAME',['Pikachu','Salamèche','Carapuce','Bulbizarre']],
  ['Sportifs','Football','REAL_PERSON',['Lionel Messi','Cristiano Ronaldo','Kylian Mbappé','Erling Haaland']],
  ['Sportifs','Tennis','REAL_PERSON',['Rafael Nadal','Roger Federer','Novak Djokovic','Carlos Alcaraz']],
  ['Musique','Pop internationale','REAL_PERSON',['Taylor Swift','Beyoncé','Ariana Grande','Rihanna']],
  ['Créateurs Internet','Créateurs français','REAL_PERSON',['Squeezie','Cyprien','Léna Situations','Mister V']],
  ['Acteurs / Actrices','Cinéma français','REAL_PERSON',['Omar Sy','Jean Dujardin','Marion Cotillard','Audrey Tautou']],
  ['Célébrités','Télévision française','REAL_PERSON',['Alain Chabat','Jamel Debbouze','Éric Antoine','Camille Combal']],
  ['Personnages fictifs','Détectives','CHARACTER',['Sherlock Holmes','Hercule Poirot','Arsène Lupin','Miss Marple']],
];
export const characters: Character[] = groups.flatMap(([category, work_name, image_type, names], g) => names.map((value,i) => {
  const [character_name, actor_name] = value.split('|');
  const id=`c${g}-${i}`,image=verifiedImages[id];
  return { id, character_name, actor_name:actor_name ?? null, work_name, category, subcategory:work_name, tags:[work_name,category], difficulty:'easy', image_url:image?.asset??null,image_source:image?.source??null,image_license:image?.license??null,image_attribution:image?[...new Set([image.author,image.attribution].filter(Boolean))].join(' · '):null,image_type,image_status:image?.visualVerified?'verified':'pending',image_license_url:image?.licenseUrl??null,image_review:image??null };
}));
// Curated within each universe; all three difficulties have explicit pair records.
export const pairs: Pair[] = groups.flatMap((_,g) => [
  {a:`c${g}-0`,b:`c${g}-3`,difficulty:'easy' as const},
  {a:`c${g}-0`,b:`c${g}-1`,difficulty:'medium' as const},
  {a:`c${g}-1`,b:`c${g}-2`,difficulty:'medium' as const},
  {a:`c${g}-0`,b:`c${g}-2`,difficulty:'hard' as const},
  {a:`c${g}-2`,b:`c${g}-3`,difficulty:'hard' as const},
]);
export function hasVerifiedImage(c:Character) {return c.image_status==='verified'&&c.image_review?.visualVerified===true&&Boolean(c.image_url?.startsWith('/characters/')&&c.image_source?.startsWith('https://commons.wikimedia.org/')&&c.image_license&&c.image_license_url&&c.image_attribution);}
export const illustratedCharacters=characters.filter(hasVerifiedImage);
export const playablePairs=pairs.filter(p=>[p.a,p.b].every(id=>illustratedCharacters.some(c=>c.id===id)));
export const playableCharacters=illustratedCharacters.filter(c=>playablePairs.some(p=>p.a===c.id||p.b===c.id));
export const categories = [...new Set(playableCharacters.map(c=>c.category))];
export const collections = [...new Set(playableCharacters.map(c=>c.work_name))];
export function character(id:string) { const c=characters.find(c=>c.id===id); if(!c) throw new Error('Personnage introuvable.'); return c; }
export interface ImageProvider { resolve(character: Character): {src:string|null; attribution:string|null}; }
export const licensedImageProvider:ImageProvider = { resolve(c) { return {src:hasVerifiedImage(c)?c.image_url:null,attribution:c.image_attribution}; } };
