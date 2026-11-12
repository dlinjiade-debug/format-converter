import assert from 'node:assert/strict';
import {launchBrowser} from './helpers.mjs';
import {staticServer} from './static-server.mjs';
import {buildFixture} from './fixture-factory.mjs';
const local=process.argv[2]?null:await staticServer();
const url=process.argv[2]||local.url+'/.site/workbench/index.html';
const browser=await launchBrowser();
try{
 const page=await browser.newPage(),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(url).origin)external.push(r.url())});
 const response=await page.goto(url);assert.equal(response.status(),200);
 await page.waitForFunction(()=>!!window.ConversionWorkbench&&!!document.querySelector('#workbenchSettings'));
 assert.equal(await page.evaluate(()=>typeof desktopBridge),'undefined');
 const downloads=[];page.on('download',d=>downloads.push(d.suggestedFilename()));
 await page.locator('#fi').setInputFiles({name:'public-site-test.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:await buildFixture({pages:2,kind:'visual'})});
 await page.locator('#fg .fb').filter({hasText:'.pdf'}).click();await page.locator('#go').click();
 await page.waitForFunction(()=>document.querySelector('#previewPage')?.textContent.includes('1 / 2'),{timeout:60000});
 assert.equal(downloads.length,0);await page.locator('#previewNext').click();
 await page.waitForFunction(()=>document.querySelector('#previewPage')?.textContent.includes('2 / 2'));
 const event=page.waitForEvent('download');await page.locator('#res .dl').click();assert.equal((await event).suggestedFilename(),'public-site-test.pdf');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log({url,pages:2,manualDownload:true,externalRequests:external,pageErrors:errors});
}finally{await browser.close();if(local)await local.close()}
