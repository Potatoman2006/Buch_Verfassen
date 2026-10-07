(() => {
  'use strict';
  const data=window.AETHERRA;
  if(!data){document.getElementById('status').textContent='Content is missing. Run npm run build in the project folder.';return;}
  const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
  const entries=new Map(data.modules.map(m=>[m.id,m]));
  const state={map:'inner-salt',entry:'world-frame',filter:'all',query:'',layer:'realms',zoom:1,x:0,y:0,drag:null,initialized:false,focusReader:false};
  const storage={get:(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set:(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}}};
  let bookmarks=new Set(storage.get('aetherra.bookmarks',[]));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function svg(tag,attrs={},parent=$('map-content')){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));parent.append(e);return e;}
  function openEntry(id){state.focusReader=true;if(id==='story'){if(location.hash==='#story')renderStory();else location.hash='story';return;}if(entries.has(id)){if(location.hash===`#entry/${id}`)renderEntry(id);else location.hash=`entry/${id}`;}}
  function readingStart(){document.querySelector('.reader-scroll').scrollTop=0;if(state.focusReader){$('reader').focus({preventScroll:true});state.focusReader=false;}if(state.initialized&&matchMedia('(max-width:900px)').matches)$('reader').scrollIntoView({block:'start',behavior:'instant'});}
  function renderDirectory(){
    const q=state.query.trim().toLocaleLowerCase();
    const list=data.modules.filter(m=>(state.filter==='all'||m.category===state.filter)&&(!q||`${m.title} ${m.navTitle??''} ${m.text}`.toLocaleLowerCase().includes(q)));
    $('result-count').textContent=`${list.length} ${q?'MATCHING ARTICLES':'LORE MODULES'}`;
    $('directory').innerHTML=list.length?list.map(m=>`<button data-entry="${m.id}" class="${m.id===state.entry?'selected':''}" ${m.id===state.entry?'aria-current="page"':''}><span class="dir-title">${bookmarks.has(m.id)?'<span class="star">✧</span>':''}${esc(m.navTitle??m.title.replace(/^The /,''))}</span><span class="dir-kind">${m.category==='core'?'WORLD FOUNDATION':'INNER SALT'} · ${Math.max(1,Math.round(m.words/230))} MIN</span></button>`).join(''):'<p class="empty-state">No matching lore. Try a place, people, custom, or magical practice.</p>';
  }
  function renderEntry(id){
    const m=entries.get(id);if(!m)return;
    state.entry=id;document.title=`${m.title} · Aetherra`;
    $('article').innerHTML=m.html;
    $('entry-kind').textContent=m.category==='core'?'WORLD FOUNDATION':'REGIONAL LORE';
    $('reader-meta').textContent=`250 IS · ${m.words.toLocaleString()} words · ${Math.max(1,Math.round(m.words/230))} min read`;
    $('source-link').href='../'+m.file;$('source-link').setAttribute('aria-label','Open Markdown source');
    const headings=[...$('article').querySelectorAll('h2')];
    if(headings.length>3){const toc=document.createElement('details');toc.className='toc';toc.innerHTML='<summary>IN THIS ARTICLE</summary>'+headings.map(h=>`<a href="#${h.id}" data-section="${h.id}">${esc(h.textContent)}</a>`).join('');$('article').querySelector('h1')?.nextElementSibling?.after(toc);}
    $('related').innerHTML='<p>READ ALONGSIDE</p>'+m.dependsOn.map(id=>`<a href="#entry/${id}">${esc(entries.get(id).title)} ↗</a>`).join('');
    $('bookmark').hidden=false;updateBookmark();renderDirectory();renderMap();
    document.body.classList.remove('map-wide');
    readingStart();
  }
  function renderStory(){
    if(!data.story){$('article').innerHTML='<h1>The story is being prepared</h1><p>The world modules are available to explore.</p>';return;}
    state.entry='story';document.title=`${data.story.title} · Aetherra`;
    $('article').innerHTML=`<div class="story-links"><a href="../stories/five_years_of_night/output/pdf/five_years_of_night.pdf">Read the PDF ↗</a><a href="../stories/five_years_of_night/manuscript.md">Markdown ↗</a></div>${data.story.html}`;
    const chapters=[...$('article').querySelectorAll('h2')];
    const contents=document.createElement('details');contents.className='toc';contents.innerHTML='<summary>CHAPTERS</summary>'+chapters.map(h=>`<a href="#${h.id}" data-section="${h.id}">${esc(h.textContent)}</a>`).join('');$('article').querySelector('h1').after(contents);
    $('entry-kind').textContent='A STORY OF THE INNER SALT';$('reader-meta').textContent='AUTUMN 250 – AUTUMN 255 IS · A COMPLETE NOVELLA';$('source-link').href='../stories/five_years_of_night/manuscript.md';
    $('bookmark').hidden=true;$('related').innerHTML='<p>THE WORLD BEHIND THE STORY</p><a href="#entry/story-ground">Explore the Rookharbour coast ↗</a><a href="#entry/vampirism">Vampirism in Aetherra ↗</a>';
    document.body.classList.remove('map-wide');document.body.classList.add('read-wide');renderDirectory();readingStart();
  }
  function updateBookmark(){const active=bookmarks.has(state.entry);$('bookmark').textContent=active?'★':'☆';$('bookmark').setAttribute('aria-pressed',String(active));$('bookmark').setAttribute('aria-label',active?'Remove article bookmark':'Bookmark this article');}
  function featureList(){const m=data.cartography.maps[state.map];if(state.map==='rookharbour')return m.features;if(state.map==='greater-meridian')return m.features;
    if(state.layer==='magic')return data.cartography.wonders;
    if(state.layer==='story')return[{id:'story-district',entry:'story-ground',label:'Rookharbour coast',x:352,y:367,color:'#e2b978'}];
    return m.features;
  }
  function node(f){
    const e=svg('g',{class:`map-node ${state.entry===f.entry?'selected':''}`,tabindex:'0',role:'button','aria-label':`Read ${f.label}`,'data-map-feature':f.id});
    const left=f.x>1180,hitWidth=Math.max(50,f.label.length*10+35);
    svg('rect',{x:left?f.x-hitWidth+12:f.x-12,y:f.y-17,width:hitWidth,height:state.layer==='peoples'?47:34,fill:'transparent','pointer-events':'all'},e);
    svg('circle',{cx:f.x,cy:f.y,r:6,class:'dot'},e);
    const label=svg('text',{x:f.x+(left?-13:13),y:f.y+5,class:'map-label','text-anchor':left?'end':'start'},e);label.textContent=f.label;
    if(state.layer==='peoples'&&state.map==='inner-salt'){const t=svg('text',{x:f.x+13,y:f.y+24,class:'map-sub'},e);t.textContent='People, customs & belonging';}
    const activate=()=>{if(state.drag?.moved)return;openEntry(f.entry);};e.addEventListener('click',e=>{e.stopPropagation();activate();});e.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
  }
  function renderLocal(){
    svg('rect',{x:0,y:0,width:1536,height:1024,fill:'#23444b'});
    svg('path',{d:'M0 0H1536V320L1400 345L1315 340L1210 460L1150 400L1115 440L1100 530L1000 590L950 570L930 650L790 730L735 745L680 780L570 750L490 830L365 875L200 920L0 980Z',class:'local-land'});
    svg('path',{d:'M0 0H1000L1100 170L1020 280L850 340L610 350L480 500L210 600L0 540Z',class:'local-forest'});
    svg('path',{d:'M80 30Q270 120 385 280T510 510T695 770',class:'local-river'});
    for(const r of data.cartography.localRoutes){svg('polyline',{points:r.points.map(p=>p.join(',')).join(' '),class:'local-road'});const mid=r.points[Math.floor(r.points.length/2)];const t=svg('text',{x:mid[0]+12,y:mid[1]-18,class:'map-sub'});t.textContent=r.label;}
    for(const [x,y]of [[75,160],[170,280],[265,120],[540,100],[720,100],[170,480],[850,135],[940,90]])svg('path',{d:`M${x} ${y-30}l-20 50h40Z`,fill:'#213d32',opacity:.7});
    const t=svg('text',{x:200,y:195,class:'water-label',style:'font-size:23px;letter-spacing:3px;fill:#d4ddba'});t.textContent='THE BRIAR WOODS';
  }
  function renderMap(){
    const m=data.cartography.maps[state.map];$('map-content').replaceChildren();
    $('layer').disabled=state.map!=='inner-salt';$('layer').options[0].textContent=state.map==='rookharbour'?'Places & roads':state.map==='greater-meridian'?'Regions & horizons':'Realms & places';
    if(m.image)svg('image',{href:m.image,x:0,y:0,width:1536,height:1024,preserveAspectRatio:'none'});else renderLocal();
    if(state.layer==='realms'&&state.map==='inner-salt')for(const f of m.features){if(!f.area)continue;const e=svg('path',{d:f.area,fill:f.color,stroke:f.color,class:`territory ${state.entry===f.entry?'selected':''}`,'aria-hidden':'true'});e.addEventListener('click',()=>{if(!state.drag?.moved)openEntry(f.entry);});}
    if(state.layer==='routes'&&state.map==='inner-salt')for(const r of data.cartography.routes)svg('polyline',{points:r.points.map(p=>p.join(',')).join(' '),class:'route'});
    const water=svg('text',{x:state.map==='rookharbour'?870:650,y:state.map==='rookharbour'?850:655,class:'water-label','text-anchor':'middle'});water.textContent=m.waterLabel;
    const features=featureList();features.forEach(node);
    $('map-title').textContent=m.title;$('map-caption').textContent=m.caption;
    $('map-key').innerHTML=features.map(f=>`<button data-entry="${f.entry}"><i style="background:${f.color}"></i>${esc(f.label)}</button>`).join('');
    $('layer-note').textContent=state.map==='rookharbour'?'Three places · one small district':state.layer==='peoples'?'Read each region’s communities and customs':state.layer==='routes'?'Travel times are explained in regional lore':'Select a place to open its lore';
    $('world-note').textContent=state.map==='rookharbour'?'Mara’s first five years unfold here. The wider world continues beyond the headland.':'Beyond these shores lie older empires, uncharted seas, and histories that never touched the Inner Salt.';
    document.querySelectorAll('[data-map]').forEach(b=>{b.classList.toggle('active',b.dataset.map===state.map);b.setAttribute('aria-pressed',String(b.dataset.map===state.map));});
    transform();
  }
  function transform(){state.x=Math.max(-1536*(state.zoom-.5),Math.min(768,state.x));state.y=Math.max(-1024*(state.zoom-.5),Math.min(512,state.y));$('map-content').setAttribute('transform',`translate(${state.x} ${state.y}) scale(${state.zoom})`);$('zoom-label').value=`${Math.round(state.zoom*100)}%`;}
  function zoom(delta){const old=state.zoom;state.zoom=Math.max(1,Math.min(4,state.zoom+delta));state.x=768-(768-state.x)*state.zoom/old;state.y=512-(512-state.y)*state.zoom/old;transform();}
  function reset(){state.zoom=1;state.x=state.y=0;transform();}
  function readHash(){let hash;try{hash=decodeURIComponent(location.hash);}catch{hash='';}if(state.initialized&&/^#(?:reader|section-)/.test(hash))return;if(hash==='#story'){renderStory();return;}const match=hash.match(/^#entry\/([a-z0-9-]+)$/);renderEntry(match&&entries.has(match[1])?match[1]:'world-frame');}
  document.addEventListener('click',e=>{if(e.target.closest('.skip')){e.preventDefault();$('reader').focus();$('reader').scrollIntoView({block:'start'});return;}const t=e.target.closest('[data-entry],[data-open],[data-map],[data-filter],[data-section]');if(!t)return;if(t.dataset.entry||t.dataset.open){openEntry(t.dataset.entry||t.dataset.open);}if(t.dataset.map){state.map=t.dataset.map;if(state.map!=='inner-salt'){state.layer='realms';$('layer').value='realms';}reset();renderMap();}if(t.dataset.filter){state.filter=t.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===t));renderDirectory();}if(t.dataset.section){e.preventDefault();document.getElementById(t.dataset.section)?.scrollIntoView({behavior:'smooth',block:'start'});}});
  document.addEventListener('click',e=>{const link=e.target.closest('a[href^="#entry/"]');if(link){e.preventDefault();openEntry(link.getAttribute('href').slice(7));}},true);
  $('search').addEventListener('input',e=>{state.query=e.target.value;renderDirectory();});
  $('layer').addEventListener('change',e=>{state.layer=e.target.value;renderMap();});
  $('bookmark').addEventListener('click',()=>{if(bookmarks.has(state.entry))bookmarks.delete(state.entry);else bookmarks.add(state.entry);storage.set('aetherra.bookmarks',[...bookmarks]);updateBookmark();renderDirectory();});
  $('reading-mode').addEventListener('click',()=>{document.body.classList.remove('map-wide');document.body.classList.toggle('read-wide');});
  $('toggle-reader').addEventListener('click',()=>{document.body.classList.remove('read-wide');document.body.classList.toggle('map-wide');});
  $('read-story').addEventListener('click',()=>openEntry('story'));
  $('zoom-in').addEventListener('click',()=>zoom(.25));$('zoom-out').addEventListener('click',()=>zoom(-.25));$('zoom-reset').addEventListener('click',reset);
  const stage=$('map-stage');stage.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?.12:-.12);},{passive:false});
  stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;state.drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:state.x,oy:state.y,moved:false};});
  stage.addEventListener('pointermove',e=>{const d=state.drag;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>5){d.moved=true;stage.setPointerCapture(e.pointerId);stage.classList.add('dragging');const scale=Math.min(stage.clientWidth/1536,stage.clientHeight/1024);state.x=d.ox+dx/scale;state.y=d.oy+dy/scale;transform();}});
  const endDrag=()=>{stage.classList.remove('dragging');setTimeout(()=>{state.drag=null;},0);};stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
  stage.addEventListener('keydown',e=>{if(e.target.closest('.map-node'))return;const actions={'+':()=>zoom(.25),'=':()=>zoom(.25),'-':()=>zoom(-.25),'0':reset,ArrowLeft:()=>{state.x+=60;transform();},ArrowRight:()=>{state.x-=60;transform();},ArrowUp:()=>{state.y+=60;transform();},ArrowDown:()=>{state.y-=60;transform();}};if(actions[e.key]){e.preventDefault();actions[e.key]();}});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('search').focus();}if(e.key==='Escape'){document.body.classList.remove('read-wide','map-wide');$('search').blur();}});
  addEventListener('hashchange',readHash);readHash();state.initialized=true;
  $('status').textContent=`AETHERRA ${data.edition} · ${data.modules.length} connected modules · ${data.modules.reduce((n,m)=>n+m.words,0).toLocaleString()} lore words`;
})();
