import assert from 'node:assert/strict';
import { launchBrowser, repoFileUrl } from './helpers.mjs';
const browser=await launchBrowser();
try{
 const page=await browser.newPage();await page.goto(repoFileUrl('index.html'));
 const result=await page.evaluate(async()=>{
  await ensureDocx();
  const {Document,Packer,Paragraph,TextRun,Header,Footer,PageBreak}=docx;
  const file=new File([await Packer.toBlob(new Document({sections:[{properties:{page:{size:{width:16838,height:11906},margin:{top:720,bottom:720,left:720,right:720}}},headers:{default:new Header({children:[new Paragraph('Visible header')]})},footers:{default:new Footer({children:[new Paragraph('Visible footer')]})},children:[new Paragraph('Landscape source'),new Paragraph({children:[new TextRun('First page'),new PageBreak()]}),new Paragraph('Second page')]}]}))],'landscape.docx');
  if(typeof word2pdfResult!=='function')return {available:false};
  const result=await word2pdfResult(file,true);const pdf=await openPdf(result.blob);
  try{const vp=(await pdf.getPage(1)).getViewport({scale:1});return{available:true,pages:pdf.numPages,width:vp.width,height:vp.height,warnings:result.warnings}}finally{await pdf.destroy()}
 });
 assert.ok(result.available,'layout-priority Word export must exist');assert.equal(result.pages,2);assert.ok(result.width>result.height,'landscape must survive');
 console.log(result);
}finally{await browser.close()}
