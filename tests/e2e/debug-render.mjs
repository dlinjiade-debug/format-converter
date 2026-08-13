import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchBrowser, repoFileUrl, repoPath } from './helpers.mjs';

const pptxPath = resolve(process.argv[2] || repoPath('tests', 'fixtures', 'stress-text-25-16x9.pptx'));
const outputDir = repoPath('tests', 'e2e', 'debug');
mkdirSync(outputDir, { recursive: true });
const b64 = readFileSync(pptxPath).toString('base64');

const browser = await launchBrowser();
const page = await browser.newPage();
await page.goto(repoFileUrl('index.html'), { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.ensure === 'function', { timeout: 15000 });
await page.evaluate(async () => { await window.ensure('JSZip'); await window.ensure('jspdf'); });

const out = await page.evaluate(async base64 => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const file = new File([bytes], 'sample.pptx');
  const slides = await window.pptParse(file);
  const dump = [];
  const pngs = [];
  for (let i = 0; i < Math.min(2, slides.length); i++) {
    const slide = slides[i];
    const canvas = await window.pptRenderSlide(slide);
    pngs.push(canvas.toDataURL('image/png'));
    dump.push({
      slide: i + 1,
      canvas: { width: canvas.width, height: canvas.height },
      slideSize: { width: slide.w, height: slide.h },
      shapes: slide.shapes.map(shape => ({
        type: shape.img ? 'picture' : (shape.text ? 'text' : 'other'),
        x: shape.x, y: shape.y, width: shape.w, height: shape.h,
        text: shape.text ? shape.text.slice(0, 80) : '',
      })),
    });
    canvas.width = 0;
    canvas.height = 0;
  }
  return { dump, pngs };
}, b64);

out.pngs.forEach((png, index) => {
  writeFileSync(resolve(outputDir, `slide${index + 1}.png`), Buffer.from(png.split(',')[1], 'base64'));
});
writeFileSync(resolve(outputDir, 'layout.json'), JSON.stringify(out.dump, null, 2));
await browser.close();
console.log(`Debug output written to ${outputDir}`);
