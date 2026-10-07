import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const story=path.join(root,'stories/five_years_of_night');
const text=fs.readFileSync(path.join(story,'manuscript.md'),'utf8');
const continuity=JSON.parse(fs.readFileSync(path.join(story,'continuity.json'),'utf8'));
const canon=JSON.parse(fs.readFileSync(path.join(root,'world/manifest.json'),'utf8'));
const ids=new Set(canon.modules.map(m=>m.id));
const errors=[];
const countWords=s=>(s.match(/\b[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*\b/gu)||[]).length;
const words=countWords(text);
const headings=[...text.matchAll(/^## (.+)$/gm)];
const chapters=headings.map((m,i)=>({heading:m[1],text:text.slice(m.index+m[0].length,headings[i+1]?.index??text.length)}));
if((text.match(/^# /gm)||[]).length!==1)errors.push('Manuscript requires one H1 title.');
if(words<15000||words>21000)errors.push(`Manuscript ${words} words is outside the intended novella range (15,000-21,000).`);
if(chapters.length<10||chapters.length>12)errors.push(`Expected 10-12 chapters, found ${chapters.length}.`);
if(continuity.chapters.length!==chapters.length)errors.push('Continuity chapter count differs from manuscript.');
if(continuity.durationMonths!==60)errors.push('The story must cover five full years.');
if(continuity.protagonist?.ageAtTurning!==20)errors.push('Mara must be twenty at turning.');
if(continuity.chapters[0]?.elapsedMonths!==0||continuity.chapters.at(-1)?.elapsedMonths!==60)errors.push('Timeline must open at turning and end on the fifth anniversary.');
let previous=-1;
for(let i=0;i<chapters.length;i++){
 const c=chapters[i],meta=continuity.chapters[i];if(!meta)continue;
 if(meta.number!==i+1)errors.push(`Chapter ${i+1}: incorrect continuity numbering.`);
 if(!Number.isFinite(meta.elapsedMonths)||meta.elapsedMonths<previous||meta.elapsedMonths>60)errors.push(`Chapter ${i+1}: invalid timeline order.`);previous=meta.elapsedMonths;
 if(countWords(c.text)<(i===chapters.length-1?200:400))errors.push(`Chapter ${i+1}: appears to be an incomplete chapter.`);
 if(!c.text.trimStart().startsWith('*'))errors.push(`Chapter ${i+1}: missing visible date line.`);
 if(!meta.feedingNotes||!meta.injuryNotes||!meta.places?.length||!meta.canonModules?.length)errors.push(`Chapter ${i+1}: incomplete continuity review notes.`);
 for(const id of meta.canonModules??[])if(!ids.has(id))errors.push(`Chapter ${i+1}: unknown canon module ${id}.`);
}
if(/\b(TODO|TBD|FIXME|lorem ipsum)\b/i.test(text))errors.push('Unfinished manuscript placeholder.');
const paragraphs=text.split(/\r?\n\s*\r?\n/).map(p=>p.trim().replace(/\s+/g,' ')).filter(p=>p.length>240),seen=new Set();
for(const p of paragraphs){if(seen.has(p))errors.push(`Duplicated long paragraph: ${p.slice(0,90)}`);seen.add(p);}
for(const filename of ['world_snapshot.json','world_gate_snapshot.json']){
 const snapshot=JSON.parse(fs.readFileSync(path.join(story,'world_packet',filename),'utf8'));
 for(const s of snapshot.sources){const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,s.file))).digest('hex');if(hash!==s.sha256)errors.push(`Canon changed after pre-draft snapshot: ${s.file}`);}
}
const result={valid:errors.length===0,manuscriptSha256:crypto.createHash('sha256').update(text).digest('hex'),title:text.match(/^# (.+)/m)?.[1],words,chapters:chapters.map((c,i)=>({number:i+1,heading:c.heading,words:countWords(c.text),elapsedMonths:continuity.chapters[i]?.elapsedMonths})),durationMonths:continuity.durationMonths,errors,note:'Structural/source-snapshot checks only. Literary quality and narrative adherence require the separate editorial read.'};
fs.writeFileSync(path.join(story,'validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;
