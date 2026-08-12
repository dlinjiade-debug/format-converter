import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const pptxPath = process.argv[2] || 'D:/单子/_kattbo .pptx';
const expectedPages = Number(process.argv[3] || 0);
const url = 'file://' + 'D:/format-converter/index.html';

const buf = readFileSync(pptxPath);
const b64 = buf.toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
const externalRequests = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('request', request => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });

await page.goto(url, { waitUntil: 'load' });
// 库是懒加载的（ensure），主动触发 JSZip / jsPDF 就绪
await page.waitForFunction(() => typeof window.ensure === 'function', { timeout: 15000 });
await page.evaluate(async () => { await window.ensure('JSZip'); await window.ensure('jspdf'); });
await page.waitForFunction(() => typeof window.JSZip !== 'undefined' && typeof window.jspdf !== 'undefined', { timeout: 30000 });

const info = await page.evaluate(async (b64) => {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const file = new File([u], 'sample.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });

  const slides = await window.pptParse(file);
  const per = [];
  let totalNonWhite = 0;
  for (let i = 0; i < slides.length; i++) {
    const c = await window.pptRenderSlide(slides[i]);
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let nw = 0;
    for (let p = 0; p < d.length; p += 4) {
      if (!(d[p] > 250 && d[p + 1] > 250 && d[p + 2] > 250)) nw++;
    }
    per.push(nw);
    totalNonWhite += nw;
  }
  // 真正跑一遍导出，确认不抛错
  let pdfSize = 0, pdfErr = '', pdfWidth = 0, pdfHeight = 0;
  try {
    const blob = await window.ppt2pdf(file);
    pdfSize = blob.size;
    const pdf = await window.openPdf(blob);
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    pdfWidth = viewport.width;
    pdfHeight = viewport.height;
    await pdf.destroy();
  } catch (e) { pdfErr = String(e && e.message || e); }

  const totalShapes = slides.reduce((a, s) => a + s.shapes.length, 0);
  const shapesWithImg = slides.reduce((a, s) => a + s.shapes.filter(sh => sh.img && (sh.img.byteLength ?? sh.img.size) > 0).length, 0);
  const shapesWithText = slides.reduce((a, s) => a + s.shapes.filter(sh => sh.text).length, 0);
  const slideOrder = slides.map(s => {
    const text = s.shapes.map(sh => sh.text || '').join(' ');
    const match = text.match(/StressTest Line\s+(\d+)/);
    return match ? Number(match[1]) : null;
  });
  return {
    count: slides.length,
    totalShapes,
    shapesWithImg,
    shapesWithText,
    per,
    totalNonWhite,
    firstNonWhite: per[0] || 0,
    lastNonWhite: per[per.length - 1] || 0,
    pdfSize,
    pdfWidth,
    pdfHeight,
    slideRatio: slides[0] ? slides[0].w / slides[0].h : 0,
    pdfErr,
    hasImgShapes: shapesWithImg > 0,
    slideOrder,
  };
}, b64);

await browser.close();

console.log('=== PPT 验证结果 ===');
console.log('幻灯片数:', info.count);
console.log('解析形状总数:', info.totalShapes, '| 含图片:', info.shapesWithImg, '| 含文字:', info.shapesWithText);
console.log('含图片形状:', info.hasImgShapes);
console.log('首页非白像素:', info.firstNonWhite);
console.log('末页非白像素:', info.lastNonWhite);
console.log('全部非白像素合计:', info.totalNonWhite);
console.log('每页非白像素:', info.per.join(','));
console.log('PDF 字节数:', info.pdfSize, '导出错误:', info.pdfErr || '无');
if (errors.length) console.log('页面错误:', errors.slice(0, 10).join(' | '));

console.log('PDF page ratio:', info.pdfWidth, '/', info.pdfHeight, 'slide ratio:', info.slideRatio);
console.log('External requests:', externalRequests.length);
const blank = info.count > 0 && info.firstNonWhite === 0 && info.lastNonWhite === 0;
const orderValues = info.slideOrder.filter(Number.isFinite);
const orderOk = orderValues.length < 2 || orderValues.every((value, index) => index === 0 || value > orderValues[index - 1]);
const pageCountOk = !expectedPages || info.count === expectedPages;
const hasRenderableContent = info.shapesWithImg > 0 || info.shapesWithText > 0;
const ratioOk = info.slideRatio > 0 && info.pdfWidth > 0 && Math.abs(info.pdfWidth / info.pdfHeight - info.slideRatio) < 0.01;
const ok = pageCountOk && hasRenderableContent && info.totalNonWhite > 0 && info.pdfSize > 0 && !info.pdfErr && !blank && orderOk && ratioOk && externalRequests.length === 0;
console.log(ok ? '\n✅ 跑通：PPT 解析出图片、每页非白、PDF 导出正常' : '\n❌ 仍未跑通，需进一步排查');
process.exit(ok ? 0 : 1);
