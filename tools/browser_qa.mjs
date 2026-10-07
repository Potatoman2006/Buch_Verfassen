// Browser integration checks. Pass PLAYWRIGHT_MODULE_DIR if not installed locally.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_DIR?path.join(process.env.PLAYWRIGHT_MODULE_DIR,'playwright'): 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const errors=[],requests=[];
try{
 const context=await browser.newContext({viewport:{width:1600,height:1000}});
 fs.mkdirSync(path.join(root,'tmp/qa'),{recursive:true});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.goto(pathToFileURL(path.join(root,'atlas/index.html')).href);
 await page.locator('#article h1').waitFor();assert.match(await page.locator('#article h1').textContent(),/Aetherra/);
 const totalModules=await page.evaluate(()=>window.AETHERRA.modules.length);
 await page.locator('#search').fill('Yseld');assert.ok(await page.locator('#directory button').count()>0);assert.ok(await page.locator('#directory button').count()<totalModules);
 await page.locator('#search').fill('a word impossible to find zqx');assert.equal(await page.locator('#directory button').count(),0);
 await page.locator('#search').fill('');
 await page.locator('[data-map-feature="salt-merenne"]').click();await page.locator('#article h1').filter({hasText:'Merenne'}).waitFor();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'reader');
 await page.locator('.skip').focus();await page.keyboard.press('Enter');assert.match(await page.locator('#article h1').textContent(),/Merenne/);
 await page.locator('#bookmark').click();assert.equal(await page.locator('#bookmark').getAttribute('aria-pressed'),'true');await page.reload();assert.equal(await page.locator('#bookmark').getAttribute('aria-pressed'),'true');
 await page.locator('[data-map="greater-meridian"]').click();assert.equal(await page.locator('#map-title').textContent(),'The Greater Meridian');
 assert.equal(await page.locator('#layer').isDisabled(),true);await page.screenshot({path:path.join(root,'tmp/qa/atlas-wider.png'),fullPage:true});
 await page.locator('[data-map="rookharbour"]').click();assert.equal(await page.locator('[data-map-feature]').count(),3);
 await page.screenshot({path:path.join(root,'tmp/qa/atlas-local.png'),fullPage:true});
 await page.locator('[data-map-feature="local-monastery"]').focus();await page.keyboard.press('Enter');await page.locator('#article h1').filter({hasText:'Rookharbour'}).waitFor();
 await page.locator('#zoom-in').click();assert.equal(await page.locator('#zoom-label').textContent(),'125%');await page.locator('#zoom-reset').click();
 await page.locator('[data-map="inner-salt"]').click();await page.locator('#layer').selectOption('magic');assert.equal(await page.locator('[data-map-feature]').count(),4);
 await page.locator('#layer').selectOption('realms');
 await page.locator('[data-open="world-frame"]').first().click();await page.locator('#article h1').filter({hasText:'Aetherra'}).waitFor();await page.locator('.toc summary').click();await page.locator('[data-section]').first().click();assert.ok((await page.url()).endsWith('#entry/world-frame'));
 await page.locator('#reading-mode').click();assert.equal(await page.locator('.map-panel').isVisible(),false);await page.keyboard.press('Escape');
 fs.mkdirSync(path.join(root,'tmp/qa'),{recursive:true});
 await page.screenshot({path:path.join(root,'tmp/qa/atlas-desktop.png'),fullPage:true});
 if(await page.evaluate(()=>Boolean(window.AETHERRA.story))){
  await page.locator('#read-story').click();await page.locator('#article h1').filter({hasText:'The House That Kept the Night'}).waitFor();
  assert.equal(await page.locator('#article h2').count(),12);assert.equal(await page.locator('#article .toc a').count(),12);
  const pdf=await page.locator('.story-links a').first().getAttribute('href');assert.ok(fs.existsSync(path.resolve(root,'atlas',pdf)),'Story PDF is available offline');
  await page.locator('.toc summary').click();await page.locator('[data-section]').last().click();assert.ok((await page.url()).endsWith('#story'));
  await page.locator('#read-story').click();await page.screenshot({path:path.join(root,'tmp/qa/atlas-story.png'),fullPage:true});
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:390,height:844});await page.locator('[data-open="world-frame"]').first().click();
 await page.locator('#article h1').filter({hasText:'Aetherra'}).waitFor();
 await page.locator('#article a[href="#entry/peoples"]').click();await page.locator('#article h1').filter({hasText:'peoples'}).waitFor();
 assert.ok(await page.locator('#article h1').evaluate(e=>e.getBoundingClientRect().top)<230,'Mobile article navigation returns to the reading start');
 await page.locator('[data-open="world-frame"]').first().click();await page.locator('#article h1').filter({hasText:'Aetherra'}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'No horizontal overflow on mobile');
 await page.screenshot({path:path.join(root,'tmp/qa/atlas-mobile.png'),fullPage:true});
 if(await page.evaluate(()=>Boolean(window.AETHERRA.story))){
  await page.locator('#read-story').click();await page.locator('#article h1').filter({hasText:'The House That Kept the Night'}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Story has no horizontal overflow on mobile');
  assert.ok(await page.locator('#article h1').evaluate(e=>e.getBoundingClientRect().top)<300,'Mobile story opens at the reader');
  await page.screenshot({path:path.join(root,'tmp/qa/atlas-mobile-story.png')});
 }
 await context.close();assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 console.log(JSON.stringify({passed:true,checks:['file URL startup','full-text search and empty state','map selection','keyboard map activation and focus','skip link preserves article','bookmark persistence','three map scales','zoom/reset','magic layer','contents navigation','reading mode','mobile article links and overflow','zero runtime errors','zero HTTP requests'],screenshots:'tmp/qa'},null,2));
}finally{await browser.close();}
