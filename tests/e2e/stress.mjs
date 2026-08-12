import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const files = process.argv.slice(2).length ? process.argv.slice(2) : [
  'D:/单子/_kattbo .pptx',
  'D:/format-converter/tests/fixtures/stress-text-25-16x9.pptx',
  'D:/format-converter/tests/fixtures/stress-image-25-4x3.pptx',
  'D:/format-converter/tests/fixtures/stress-mixed-40-16x9.pptx',
];
const url = 'file://' + 'D:/format-converter/index.html';

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.ensure === 'function', { timeout: 15000 });
await page.evaluate(async () => { await window.ensure('JSZip'); await window.ensure('jspdf'); });
await page.waitForFunction(() => typeof window.JSZip !== 'undefined' && typeof window.jspdf !== 'undefined', { timeout: 30000 });

console.log('文件 | 页数 | 解析ms | 渲染ms | 导出ms | PDF(KB) | 图片形状 | 非白页/总页 | 报错');
console.log('---');
let allOk = true;
for (const f of files) {
  let b64;
  try { b64 = readFileSync(f).toString('base64'); }
  catch (e) { console.log(`${f} 读取失败: ${e.message}`); allOk = false; continue; }
  const r = await page.evaluate(async (b64) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const file = new File([u], 'x.pptx');
    const t0 = performance.now();
    const slides = await window.pptParse(file);
    const parseMs = performance.now() - t0;
    let nonWhite = 0, blankPages = 0, imgShapes = 0;
    const t1 = performance.now();
    for (const s of slides) {
      imgShapes += s.shapes.filter(sh => sh.img && (sh.img.byteLength ?? sh.img.size) > 0).length;
      const c = await window.pptRenderSlide(s);
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let nw = 0; for (let p = 0; p < d.length; p += 4) if (!(d[p] > 250 && d[p+1] > 250 && d[p+2] > 250)) nw++;
      if (nw === 0) blankPages++; nonWhite += nw;
    }
    const renderMs = performance.now() - t1;
    const t2 = performance.now();
    let pdfSize = 0, pdfErr = '';
    try { pdfSize = (await window.ppt2pdf(file)).size; } catch (e) { pdfErr = String(e && e.message || e); }
    const pdfMs = performance.now() - t2;
    return { count: slides.length, parseMs, renderMs, pdfMs, pdfSize, imgShapes, blankPages, pdfErr };
  }, b64);
  const ok = r.count > 0 && r.blankPages === 0 && r.pdfSize > 0 && !r.pdfErr;
  if (!ok) allOk = false;
  console.log(
    `${f.split('/').pop()} | ${r.count} | ${r.parseMs.toFixed(0)} | ${r.renderMs.toFixed(0)} | ${r.pdfMs.toFixed(0)} | ${(r.pdfSize/1024).toFixed(0)} | ${r.imgShapes} | ${r.count - r.blankPages}/${r.count} | ${r.pdfErr || '无'}` + (ok ? ' ✅' : ' ❌')
  );
}
await browser.close();
if (pageErrors.length) console.log('\n页面级错误:', pageErrors.slice(0,5).join(' | '));
console.log('\n' + (allOk ? '✅ 压测全部通过：无空白、无报错' : '❌ 存在失败项，需排查'));
process.exit(allOk ? 0 : 1);
