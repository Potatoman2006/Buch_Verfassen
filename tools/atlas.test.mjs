import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderMarkdown} from './build_atlas.mjs';
import {validateWorld} from './validate_world.mjs';

test('all canon links, map entries, source paths and dependency graph resolve',()=>{
 const r=validateWorld();assert.deepEqual(r.errors,[]);assert.ok(r.modules>=23,'The established foundations and regions must remain available');assert.ok(r.loreWords>18000,'Substantial lore must exist before story publication');
});
test('combined reading edition rebases every module link to an existing file',()=>{
 const book=new URL('../world/WORLD_BOOK.md',import.meta.url),text=fs.readFileSync(book,'utf8');
 for(const m of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){
  if(/^(?:https?:|#)/.test(m[1]))continue;
  assert.ok(fs.existsSync(path.resolve(path.dirname(fileURLToPath(book)),m[1].split('#')[0])),`Broken world book link: ${m[1]}`);
 }
});
test('reader safely renders text, paragraph/list transitions and real module links',()=>{
 const manifest={modules:[{id:'magic',file:'world/core/magic.md'}]};
 const html=renderMarkdown('# A title\n\n<script>bad()</script> & text\n\n- First\n- Second\n\n## Next\n\n[Magic](../core/magic.md) and [Untrusted](javascript:alert(1))','world/regions/example.md',manifest);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('</ul>'));assert.ok(html.includes('href="#entry/magic"'));assert.ok(!html.includes('href="javascript:'));assert.ok(html.includes('id="section-next"'));
});
test('offline content contains exactly the current source modules',()=>{
 const c={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../atlas/content.js',import.meta.url),'utf8'),c);
 const manifest=JSON.parse(fs.readFileSync(new URL('../world/manifest.json',import.meta.url),'utf8'));
 assert.equal(c.window.AETHERRA.modules.length,manifest.modules.length);
 for(const m of c.window.AETHERRA.modules){assert.equal(m.text,fs.readFileSync(new URL('../'+m.file,import.meta.url),'utf8'));assert.ok(m.html.includes('<h1'));}
 assert.ok(!JSON.stringify(c.window.AETHERRA).includes('legacy_story_world'));
});
