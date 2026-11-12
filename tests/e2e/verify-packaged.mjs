import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'node:net';
const executable=resolve(process.argv[2]||'dist/FormatConverter-1.1.0-windows-x64.exe');
const listener=createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
const child=spawn(executable,['--remote-debugging-port='+port],{windowsHide:true,stdio:'ignore',env:{...process.env,FORMAT_CONVERTER_TEST_DATA:mkdtempSync(join(tmpdir(),'converter-portable-')),FORMAT_CONVERTER_TEST_HIDDEN:'1'}});
let browser;
try{
 let version;
 const deadline=Date.now()+60000;
 while(Date.now()<deadline){try{const response=await fetch('http://127.0.0.1:'+port+'/json/version');if(response.ok){version=await response.json();break}}catch(e){}await new Promise(r=>setTimeout(r,250))}
 assert.ok(version,'portable executable must extract and open its own renderer');
 browser=await chromium.connectOverCDP(version.webSocketDebuggerUrl);
 let page;
 await new Promise(async(resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Packaged app page missing')),30000);
  while(!page){page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('http://127.0.0.1:'));if(page)break;await new Promise(r=>setTimeout(r,100))}
  clearTimeout(timer);resolve();
 });
 await page.waitForFunction(()=>typeof desktopBridge?.getSettings==='function'&&!!document.querySelector('#workbenchSettings'));
 const actual=await page.evaluate(async()=>({title:document.title,node:typeof require,paths:(await desktopBridge.getSettings()).paths,preview:typeof ConversionWorkbench.attachPreview}));
 assert.equal(actual.node,'undefined');assert.equal(actual.preview,'function');assert.deepEqual(Object.keys(actual.paths).sort(),['input','output','reference']);
 console.log({executable,packagedStartup:actual});
}finally{
 if(browser){try{const cdp=await browser.newBrowserCDPSession();await cdp.send('Browser.close')}catch(e){}await browser.close().catch(()=>{})}
 if(child.exitCode===null){await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);if(child.exitCode===null)child.kill()}
}
