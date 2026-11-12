import assert from 'node:assert/strict';
import { launchBrowser, repoFileUrl } from './helpers.mjs';
import { buildFixture } from './fixture-factory.mjs';
const browser=await launchBrowser();let failures=0;
try{
 const page=await browser.newPage();await page.goto(repoFileUrl('index.html'));
 async function test(name,run){try{await run();console.log('PASS',name)}catch(error){failures++;console.error('FAIL',name,error.message)}}
 await test('Word keeps source black text and final red marker',async()=>{
  const r=await page.evaluate(async()=>{
   await ensureDocx();const {Document,Packer,Paragraph,TextRun}=docx;
   const children=Array.from({length:71},(_,i)=>new Paragraph({spacing:{after:0,line:240,lineRule:'exact'},children:[new TextRun({text:'Paragraph '+i,color:'000000',size:24})]}));
   children.push(new Paragraph({children:[new TextRun({text:'FINAL RED MARKER',color:'FF0000',size:24})]}));
   const f=new File([await Packer.toBlob(new Document({sections:[{children}]}))],'styled.docx');
   const result=await word2pdfResult(f,true),pdf=await openPdf(result.blob);let red=0,black=0;
   try{for(let i=1;i<=pdf.numPages;i++){const c=await renderPage(pdf,i,1),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let j=0;j<d.length;j+=4){if(d[j]>170&&d[j+1]<80&&d[j+2]<80)red++;if(d[j]<90&&d[j+1]<90&&d[j+2]<90)black++}}return{red,black}}finally{await pdf.destroy()}
  });assert.ok(r.red>50,JSON.stringify(r));assert.ok(r.black>1000,JSON.stringify(r));
 });
 await test('PPT print images remain loaded until print cleanup',async()=>{
  const r=await page.evaluate(async b64=>{
   if(typeof preparePptPrint!=='function')return false;
   const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'image.pptx'),prepared=await preparePptPrint(f);
   try{const img=prepared.nodes[0].querySelector('img');await img.decode();return img.naturalWidth>0}finally{prepared.dispose()}
  },(await buildFixture({kind:'image'})).toString('base64'));assert.equal(r,true);
 });
 await test('tight two-column text is not interleaved as a table',async()=>{
  const r=await page.evaluate(async()=>{await ensure('jspdf');const pdf=new jspdf.jsPDF({unit:'pt'});pdf.setFontSize(12);for(let i=1;i<=7;i++){pdf.text('Left '+i,60,60+i*14);pdf.text('Right '+i,330,60+i*14)}const pages=await pdfPages(new File([pdf.output('blob')],'tight.pdf'));try{return pages[0].text}finally{await pages._doc.destroy()}});
  assert.ok(r.indexOf('Left 7')<r.indexOf('Right 1'),r);
 });
 await test('layout HTML stops between PDF pages',async()=>{
  const r=await page.evaluate(async()=>{
   await ensure('jspdf');const pdf=new jspdf.jsPDF();for(let i=1;i<8;i++)pdf.addPage();
   const f=new File([pdf.output('blob')],'eight.pdf'),job={controller:new AbortController()};activeConversion=job;
   let rendered=0;const original=window.renderPage;
   window.renderPage=async(...args)=>{rendered++;const c=await original(...args);if(rendered===2)job.controller.abort();return c};
   try{await pdf2htmlLayout(f)}catch(error){if(error.name!=='AbortError')throw error}finally{window.renderPage=original;activeConversion=null}
   return rendered;
  });assert.equal(r,2);
 });
}finally{await browser.close()}
if(failures)process.exitCode=1;
