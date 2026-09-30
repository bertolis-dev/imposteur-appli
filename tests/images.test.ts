import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {characters,hasVerifiedImage,licensedImageProvider} from '../lib/game/catalog.ts';
test('each verified image is a local decodable WebP with matching hash and complete credit',()=>{
 const illustrated=characters.filter(hasVerifiedImage);assert.ok(illustrated.length>=24);
 for(const c of illustrated){const file=new URL('../public'+c.image_url,import.meta.url);assert.ok(existsSync(file),c.id);const b=readFileSync(file);assert.equal(b.toString('ascii',0,4),'RIFF',c.id);assert.equal(b.toString('ascii',8,12),'WEBP',c.id);assert.equal(createHash('sha256').update(b).digest('hex'),c.image_review!.sha256);assert.ok(b.length<300000);assert.ok(c.image_review!.width>=400);assert.ok(c.image_source);assert.ok(c.image_license_url);assert.ok(c.image_attribution);assert.equal(licensedImageProvider.resolve(c).src,c.image_url);}
});
test('unverified records cannot resolve to an image, even if a URL is injected',()=>{const c={...characters[0],image_url:'/characters/fake.webp',image_license:'CC BY 4.0',image_source:'https://commons.wikimedia.org/wiki/File:fake.webp'};assert.equal(licensedImageProvider.resolve(c).src,null);});
test('fiction never borrows the image of an actor outside a role',()=>{for(const c of characters.filter(c=>c.image_type!=='REAL_PERSON'&&hasVerifiedImage(c))){assert.equal(c.actor_name,null);assert.match(c.image_review!.description,new RegExp(c.character_name.split(' ')[0],'i'));}});
