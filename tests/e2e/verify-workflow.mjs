import assert from 'node:assert/strict';
import { launchBrowser, repoFileUrl } from './helpers.mjs';
const browser=await launchBrowser();
try{
 const page=await browser.newPage();await page.goto(repoFileUrl('index.html'));
 // Swapping/resetting input while work is pending must cancel the old download.
 await page.locator('#fi').setInputFiles({name:'long.txt',mimeType:'text/plain',buffer:Buffer.from('取消任务\n'.repeat(5000))});
 await page.locator('#fg .fb').filter({hasText:'.pdf'}).click();
 const downloads=[];page.on('download',d=>downloads.push(d.suggestedFilename()));
 await page.locator('#go').click();
 await page.locator('#cancelConversion').click({force:true,timeout:10000});
 await page.waitForFunction(()=>!window.isConversionRunning?.(),{timeout:20000});
 assert.deepEqual(downloads,[],'cancelled work must not auto-download');
 const registry=await page.evaluate(()=>({available:typeof window.convertFile==='function',routes:window.ConversionRegistry?.entries?.length||0}));
 assert.ok(registry.available&&registry.routes>30,'all advertised routes must have executable handlers');
}finally{await browser.close()}
