import assert from 'node:assert/strict';
import { launchBrowser, repoFileUrl } from './helpers.mjs';
import { buildFixture } from './fixture-factory.mjs';
const browser=await launchBrowser();
try{
 const page=await browser.newPage();await page.goto(repoFileUrl('index.html'));
 const result=await page.evaluate(async b64=>{
  const file=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'visual.pptx');
  const {blob,warnings}=await ppt2pdfResult(file),pdf=await openPdf(blob);
  try{const c=await renderPage(pdf,1,1),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let green=0,red=0;for(let i=0;i<data.length;i+=4){if(data[i]<90&&data[i+1]>140&&data[i+2]<160)green++;if(data[i]>90&&data[i+1]<70&&data[i+2]<70)red++}return{green,red,warnings}}finally{await pdf.destroy()}
 },(await buildFixture({kind:'visual'})).toString('base64'));
 console.log(result);assert.ok(result.green>10000,'ellipse geometry must survive export');assert.ok(result.red>100&&result.red<3000,'digits must be glyphs, not a solid colored rectangle');assert.ok(result.warnings.some(w=>/渐变文字/.test(w)),'solid text fallback must be disclosed');
 const png=await page.evaluate(async b64=>{const file=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'two.pptx'),blob=await ppt2png(file);await ensure('JSZip');const zip=await JSZip.loadAsync(await blob.arrayBuffer());return Object.keys(zip.files).filter(n=>n.endsWith('.png'))},(await buildFixture({pages:2,kind:'visual'})).toString('base64'));
 assert.equal(png.length,2,'PNG export must include every slide');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const spacer=document.createElement('div');spacer.style.height='3000px';document.body.appendChild(spacer);window.scrollTo(0,1800)});
 const mobileInk=await page.evaluate(async b64=>{
  const file=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'mobile.pptx'),result=await ppt2pdfResult(file),pdf=await openPdf(result.blob);
  try{const c=await renderPage(pdf,1,1),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0;for(let i=0;i<data.length;i+=4)if(data[i+1]>140&&data[i]<90)ink++;return ink}finally{await pdf.destroy()}
 },(await buildFixture({kind:'visual'})).toString('base64'));
 assert.ok(mobileInk>10000,'scroll position and mobile viewport must not blank the slide');
}finally{await browser.close()}
