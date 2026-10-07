import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [entry,...rest]=process.argv.slice(2);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'world/manifest.json'),'utf8'));
const modules=new Map(manifest.modules.map(m=>[m.id,m]));
if(!entry||!modules.has(entry)){console.error('Usage: node tools/export_packet.mjs <module-id> [output-directory]\nModule IDs: '+[...modules.keys()].join(', '));process.exit(1);}
const selected=new Set(),visiting=new Set();
function visit(id){
 if(selected.has(id))return;
 if(visiting.has(id))throw Error(`Dependency cycle at ${id}. Run npm run validate and repair the manifest.`);
 const module=modules.get(id);if(!module)throw Error(`Missing dependency ${id}. Run npm run validate and repair the manifest.`);
 visiting.add(id);for(const dep of module.dependsOn)visit(dep);visiting.delete(id);selected.add(id);
}visit(entry);
const output=path.resolve(root,rest[0]??`tmp/packets/${entry}`);
if(!output.startsWith(root+path.sep))throw Error('Packet output must stay inside this project.');
fs.mkdirSync(output,{recursive:true});
const sources=[...selected].map(id=>{const m=modules.get(id),text=fs.readFileSync(path.join(root,m.file),'utf8');return{id,file:m.file,sha256:crypto.createHash('sha256').update(text).digest('hex'),text};});
fs.writeFileSync(path.join(output,'WORLD_PACKET.md'),`# Aetherra world packet: ${entry}\n\nEdition ${manifest.edition}; baseline ${manifest.baseline}. Exact source snapshot for a bounded story or expansion. Module dependencies are included below. A story does not alter these baseline facts.\n\n`+sources.map(s=>`\n---\n\nSource: ${s.file}\n\n${s.text}`).join('\n'));
fs.writeFileSync(path.join(output,'world_snapshot.json'),JSON.stringify({edition:manifest.edition,baseline:manifest.baseline,entry,sources:sources.map(({text,...s})=>s)},null,2)+'\n');
console.log(`Exported ${sources.length} modules to ${path.relative(root,output)}.`);
