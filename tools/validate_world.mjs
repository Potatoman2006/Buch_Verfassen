import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
export function validateWorld(){
 const manifest=JSON.parse(read('world/manifest.json')),map=JSON.parse(read('world/cartography.json'));
 const errors=[],warnings=[],ids=new Set(),files=new Set();let words=0,links=0;
 for(const m of manifest.modules){
  if(ids.has(m.id))errors.push(`Duplicate id ${m.id}`);ids.add(m.id);
  if(files.has(m.file))errors.push(`Duplicate source ${m.file}`);files.add(m.file);
  if(!/^world\/(core|regions)\/[a-z0-9-]+\.md$/.test(m.file))errors.push(`Invalid module path ${m.file}`);
 }
 for(const m of manifest.modules){
  for(const dep of m.dependsOn)if(!ids.has(dep))errors.push(`${m.id}: missing dependency ${dep}`);
  if(!fs.existsSync(path.join(root,m.file))){errors.push(`Missing source ${m.file}`);continue;}
  const text=read(m.file),count=(text.match(/\b[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*\b/gu)||[]).length;words+=count;
  if(count<500)errors.push(`${m.id}: only ${count} words; incomplete module`);
  if((text.match(/^# /gm)||[]).length!==1)errors.push(`${m.id}: requires exactly one title`);
  if(!text.includes('## Connections'))errors.push(`${m.id}: missing Connections section`);
  if(/\b(TODO|TBD|FIXME|lorem ipsum)\b/i.test(text))errors.push(`${m.id}: unfinished placeholder`);
  if(/\bledgers?\b/i.test(text))warnings.push(`${m.id}: check ledger reference against requested change`);
  for(const link of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){
   const href=link[1];if(/^(https?:|#)/.test(href))continue;
   const target=path.posix.normalize(path.posix.join(path.posix.dirname(m.file),href.split('#')[0]));links++;
   if(!files.has(target))errors.push(`${m.id}: link outside active canon or missing module: ${href}`);
  }
 }
 const visiting=new Set(),visited=new Set(),byId=new Map(manifest.modules.map(m=>[m.id,m]));
 const visit=id=>{if(visiting.has(id)){errors.push(`Dependency cycle at ${id}`);return;}if(visited.has(id)||!byId.has(id))return;visiting.add(id);for(const d of byId.get(id).dependsOn)visit(d);visiting.delete(id);visited.add(id);};ids.forEach(visit);
 const features=[...Object.values(map.maps).flatMap(m=>m.features),...map.wonders,...map.routes];const featureIds=new Set();
 for(const f of features){if(featureIds.has(f.id))errors.push(`Duplicate feature ${f.id}`);featureIds.add(f.id);if(!ids.has(f.entry))errors.push(`Map feature ${f.id}: missing lore ${f.entry}`);if(f.x!==undefined&&(!Number.isFinite(f.x)||f.x<0||f.x>1536||!Number.isFinite(f.y)||f.y<0||f.y>1024))errors.push(`Map feature ${f.id}: invalid coordinates`);}
 for(const m of Object.values(map.maps))if(m.image&&!fs.existsSync(path.join(root,'atlas',m.image)))errors.push(`Missing terrain ${m.image}`);
 for(const f of ['atlas/index.html','atlas/app.js','atlas/styles.css'])if(/https?:\/\/|fetch\(|XMLHttpRequest|WebSocket/.test(read(f).replace('http://www.w3.org/2000/svg','')))errors.push(`${f}: network dependency or call`);
 const result={valid:errors.length===0,edition:manifest.edition,modules:manifest.modules.length,loreWords:words,internalLinks:links,mapFeatures:features.length,errors,warnings};return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const r=validateWorld();console.log(JSON.stringify(r,null,2));if(!r.valid)process.exitCode=1;}
