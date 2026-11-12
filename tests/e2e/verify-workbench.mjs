import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { launchBrowser, repoFileUrl, repoPath } from './helpers.mjs';
import { buildFixture } from './fixture-factory.mjs';
const browser=await launchBrowser();let failures=0;
try{
 const page=await browser.newPage();await page.goto(repoFileUrl('index.html'));
 const test=async(name,run)=>{try{await run();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}};
 await test('preflight reports page count and missing fonts',async()=>{
  const r=await page.evaluate(async b64=>{
   if(!window.ConversionWorkbench)return null;
   await ensure('JSZip');const zip=await JSZip.loadAsync(Uint8Array.from(atob(b64),c=>c.charCodeAt(0)));
   zip.file('ppt/theme/font-test.xml','<a:font xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" typeface="MissingWorkbenchFont91823"/>');
   return ConversionWorkbench.preflight(new File([await zip.generateAsync({type:'blob'})],'sample.pptx'));
  },(await buildFixture({pages:2})).toString('base64'));
  assert.equal(r?.pageCount,2);assert.ok(r.missingFonts.includes('MissingWorkbenchFont91823'));
 });
 await test('PPT PDF contains searchable source text',async()=>{
  const text=await page.evaluate(async b64=>{const result=await ppt2pdfResult(new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'text.pptx')),pdf=await openPdf(result.blob);try{return(await(await pdf.getPage(1)).getTextContent()).items.map(x=>x.str).join('')}finally{await pdf.destroy()}},(await buildFixture()).toString('base64'));
  assert.match(text,/StressTest Line 1 2019/);
 });
 await test('local TTF gives a searchable Chinese layer',async()=>{
  const text=await page.evaluate(async b64=>{
   if(!window.ConversionWorkbench)return '';
   await ConversionWorkbench.loadFont(new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'Noto-test.ttf'),'LocalChinese');
   const blob=await txt2pdf(new File(['数学选择题'],'chinese.txt')),pdf=await openPdf(blob);
   try{return(await(await pdf.getPage(1)).getTextContent()).items.map(x=>x.str).join('')}finally{await pdf.destroy()}
  },readFileSync(repoPath('tests/fixtures/NotoSansSC-TestSubset.ttf')).toString('base64'));
  assert.match(text,/数学选择题/);
 });
 await test('large page respects capture pixel budget',async()=>{
  const r=await page.evaluate(()=>window.ConversionWorkbench?.captureScale(8000,8000,{mobile:true,quality:'auto'}));
  assert.ok(r>0&&r<=2);assert.ok(8000*8000*r*r<=6000000);
 });
 await test('conversion previews each page before explicit download',async()=>{
  await page.locator('#fi').setInputFiles({name:'preview.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:await buildFixture({pages:2,kind:'visual'})});
  await page.locator('#fg .fb').filter({hasText:'.pdf'}).click();
  const downloads=[];page.on('download',d=>downloads.push(d.suggestedFilename()));await page.locator('#go').click();
  await page.locator('#previewPage').waitFor({timeout:20000});await page.waitForFunction(()=>document.querySelector('#previewPage')?.textContent.includes('/ 2'));
  assert.equal(downloads.length,0);await page.locator('#previewNext').click();await page.waitForFunction(()=>document.querySelector('#previewPage')?.textContent.includes('2 / 2'));
  const event=page.waitForEvent('download');await page.locator('#res .dl').click();assert.equal((await event).suggestedFilename(),'preview.pdf');
 });
}finally{await browser.close()}
if(failures)process.exitCode=1;
