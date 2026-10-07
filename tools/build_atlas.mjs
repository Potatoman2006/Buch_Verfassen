import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function renderMarkdown(source, filename, manifest) {
  const inline = text => escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(filename), href.split('#')[0]));
      const found = manifest.modules.find(m => m.file === target);
      return found ? `<a href="#entry/${found.id}">${label}</a>` : `<span>${label}</span>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  const lines = source.replace(/\r/g, '').split('\n');
  let html = '', paragraph = [], list = null, table = false;
  const flush = () => { if (paragraph.length) {html += `<p>${inline(paragraph.join(' '))}</p>\n`; paragraph = [];} };
  const closeList = () => {if (list) {html += `</${list}>\n`; list = null;}};
  const closeTable = () => {if (table) {html += '</tbody></table></div>\n';table=false;}};
  for (const line of lines) {
    if (!line.trim()) {flush();closeList();closeTable();continue;}
    const h = line.match(/^(#{1,4})\s+(.+)/);
    if(h) {flush();closeList();closeTable();html += `<h${h[1].length} id="section-${slug(h[2])}">${inline(h[2])}</h${h[1].length}>\n`;continue;}
    if (/^\|/.test(line)) {
      flush();closeList();
      if (/^\|[\s:|\-]+\|?$/.test(line)) continue;
      const cells = line.replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
      if(!table) {html += '<div class="table-wrap"><table><tbody>';table=true;}
      html += `<tr>${cells.map(c=>`<td>${inline(c)}</td>`).join('')}</tr>`;continue;
    }
    closeTable();
    const li = line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)/);
    if(li) {flush();const kind=li[1]?'ul':'ol';if(list!==kind){closeList();list=kind;html+=`<${kind}>`;}html+=`<li>${inline(li[2])}</li>\n`;continue;}
    if (/^---+$/.test(line)){flush();closeList();html+='<hr>';continue;}
    if(line.startsWith('> ')){flush();closeList();html+=`<blockquote>${inline(line.slice(2))}</blockquote>`;continue;}
    closeList();paragraph.push(line.trim());
  }
  flush();closeList();closeTable();return html;
}

export function buildAtlas() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'world/manifest.json'), 'utf8'));
  const cartography = JSON.parse(fs.readFileSync(path.join(root, 'world/cartography.json'), 'utf8'));
  const modules = manifest.modules.map(m=>{
    const text=fs.readFileSync(path.join(root,m.file),'utf8');
    const title=text.match(/^# (.+)/m)?.[1]??m.id;
    const summary=text.replace(/^# .+\r?\n+/,'').split(/\r?\n\r?\n/)[0].replace(/\r?\n/g,' ');
    return {...m,title,summary,text,words:text.match(/\b[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*\b/gu)?.length??0,html:renderMarkdown(text,m.file,manifest)};
  });
  const storyPath=path.join(root,'stories/five_years_of_night/manuscript.md');
  const validationPath=path.join(root,'stories/five_years_of_night/validation.json');
  const validation=fs.existsSync(validationPath)?JSON.parse(fs.readFileSync(validationPath,'utf8')):null;
  const storyReady=fs.existsSync(storyPath)&&validation?.valid&&validation.manuscriptSha256===crypto.createHash('sha256').update(fs.readFileSync(storyPath)).digest('hex');
  const story=storyReady?{
    title:fs.readFileSync(storyPath,'utf8').match(/^# (.+)/m)?.[1]??'Five Years of Night',
    html:renderMarkdown(fs.readFileSync(storyPath,'utf8'),'stories/five_years_of_night/manuscript.md',manifest)
  }:null;
  const payload={edition:manifest.edition,baseline:manifest.baseline,modules,cartography,story};
  fs.writeFileSync(path.join(root,'atlas/content.js'),`// Generated from world/manifest.json by tools/build_atlas.mjs. Do not edit.\nwindow.AETHERRA = ${JSON.stringify(payload).replace(/</g,'\\u003c')};\n`);
  const rebase = m => m.text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(all,label,href)=>{
    if(/^(?:https?:|#)/.test(href))return all;
    const [file,anchor]=href.split('#');
    const target=path.posix.normalize(path.posix.join(path.posix.dirname(m.file),file));
    return `[${label}](${path.posix.relative('world',target)}${anchor?'#'+anchor:''})`;
  });
  fs.writeFileSync(path.join(root,'world/WORLD_BOOK.md'),`# Aetherra: The Inner Salt\n\nEdition ${manifest.edition}. Baseline ${manifest.baseline}. Generated reading edition; edit the linked source modules.\n\n`+modules.map(m=>`\n---\n\n${rebase(m)}`).join('\n'));
  console.log(`Built offline atlas: ${modules.length} modules, ${modules.reduce((n,m)=>n+m.words,0).toLocaleString()} lore words${story?', story included':''}.`);
  return payload;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildAtlas();
