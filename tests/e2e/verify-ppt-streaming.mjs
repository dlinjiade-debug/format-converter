import { readFileSync } from 'node:fs';
import { launchBrowser, repoFileUrl, repoPath } from './helpers.mjs';

const fixturePath = repoPath('tests', 'fixtures', 'stress-text-25-16x9.pptx');
const b64 = readFileSync(fixturePath).toString('base64');
const browser = await launchBrowser();
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.goto(repoFileUrl('index.html'), { waitUntil: 'load' });

const result = await page.evaluate(async base64 => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const file = new File([bytes], 'streaming.pptx', {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  const warnings = [];
  let callbackCount = 0;
  let releasedCount = 0;
  const rendered = await window.renderPptWithLibrary(file, warnings, async slide => {
    callbackCount++;
    if (slide.canvas.width > 0 && slide.canvas.height > 0) {
      slide.canvas.width = 0;
      slide.canvas.height = 0;
      releasedCount++;
    }
  });
  return {
    callbackCount,
    releasedCount,
    returnedCount: rendered.count || 0,
    retainedSlides: Array.isArray(rendered.slides) ? rendered.slides.length : 0,
    warnings,
  };
}, b64);

await browser.close();
console.log(JSON.stringify({ result, pageErrors }, null, 2));
const ok = result.callbackCount === 25
  && result.releasedCount === 25
  && result.returnedCount === 25
  && result.retainedSlides === 0
  && pageErrors.length === 0;
if (!ok) process.exit(1);
