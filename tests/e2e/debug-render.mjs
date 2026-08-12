import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';

const pptxPath = process.argv[2] || 'D:/单子/_kattbo .pptx';
const url = 'file://' + 'D:/format-converter/index.html';
const NODE = 'C:/Users/34472/.workbuddy/binaries/node/versions/22.22.2/node.exe';

mkdirSync('D:/format-converter/tests/e2e/debug', { recursive: true });
const buf = readFileSync(pptxPath);
const b64 = buf.toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.ensure === 'function', { timeout: 15000 });
await page.evaluate(async () => { await window.ensure('JSZip'); await window.ensure('jspdf'); });
await page.waitForFunction(() => typeof window.JSZip !== 'undefined' && typeof window.jspdf !== 'undefined', { timeout: 30000 });

const out = await page.evaluate(async (b64) => {
  const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const file = new File([u], 'sample.pptx');
  const slides = await window.pptParse(file);
  const sf = 2;
  const dump = [];
  for (let i = 0; i < Math.min(2, slides.length); i++) {
    const s = slides[i];
    const c = await window.pptRenderSlide(s);
    const png = c.toDataURL('image/png');
    const shapes = s.shapes.map(sh => ({
      type: sh.img ? 'pic' : (sh.text ? 'text' : 'other'),
      xEMU: sh.x, yEMU: sh.y, wEMU: sh.w, hEMU: sh.h,
      xpx: Math.round(sh.x/9525*sf), ypx: Math.round(sh.y/9525*sf),
      wpx: Math.round(sh.w/9525*sf), hpx: Math.round(sh.h/9525*sf),
      text: sh.text ? sh.text.slice(0,20) : ''
    }));
    dump.push({ slide: i+1, cw: c.width, ch: c.height, swEMU: s.w, shEMU: s.h, shapes });
    // 保存 PNG（去掉 data:前缀）
    window.__save = window.__save || [];
    window.__pngs = window.__pngs || [];
    window.__pngs.push(png);
  }
  return { dump, pngs: window.__pngs };
}, b64);

out.pngs.forEach((png, i) => {
  const data = png.split(',')[1];
  writeFileSync(`D:/format-converter/tests/e2e/debug/slide${i+1}.png`, Buffer.from(data, 'base64'));
});
writeFileSync('D:/format-converter/tests/e2e/debug/layout.json', JSON.stringify(out.dump, null, 1));
console.log('已保存 layout.json (slide1/2 全部 shape 坐标) 与 slide1.png / slide2.png');
await browser.close();
