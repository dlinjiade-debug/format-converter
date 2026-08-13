import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchBrowser, repoFileUrl, repoPath } from './helpers.mjs';

const defaults = [
  repoPath('tests', 'fixtures', 'stress-text-25-16x9.pptx'),
  repoPath('tests', 'fixtures', 'stress-image-25-4x3.pptx'),
  repoPath('tests', 'fixtures', 'stress-mixed-40-16x9.pptx'),
];
const files = process.argv.slice(2).length ? process.argv.slice(2).map(resolve) : defaults;

const browser = await launchBrowser();
const page = await browser.newPage();
const pageErrors = [];
const externalRequests = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('request', request => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });
await page.goto(repoFileUrl('index.html'), { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.ensure === 'function', { timeout: 15000 });

const results = [];
for (const filePath of files) {
  const b64 = readFileSync(filePath).toString('base64');
  const result = await page.evaluate(async base64 => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const file = new File([bytes], 'stress.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    const slides = await window.pptParse(file);
    const started = performance.now();
    const blob = await window.ppt2pdf(file);
    const pdfMs = performance.now() - started;
    const pdf = await window.openPdf(blob);
    const pages = [];
    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const pdfPage = await pdf.getPage(pageNumber);
        const viewport = pdfPage.getViewport({ scale: 1 });
        const canvas = await window.renderPage(pdf, pageNumber, 0.25);
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let nonWhite = 0;
        for (let p = 0; p < pixels.length; p += 4) {
          if (!(pixels[p] > 250 && pixels[p + 1] > 250 && pixels[p + 2] > 250)) nonWhite++;
        }
        pages.push({ width: viewport.width, height: viewport.height, nonWhite });
        canvas.width = 0;
        canvas.height = 0;
      }
    } finally {
      await pdf.destroy();
    }
    return {
      inputPages: slides.length,
      pdfPages: pages.length,
      pdfMs,
      pdfSize: blob.size,
      slideRatio: slides[0] ? slides[0].w / slides[0].h : 0,
      pageRatios: pages.map(pageInfo => pageInfo.width / pageInfo.height),
      nonWhite: pages.map(pageInfo => pageInfo.nonWhite),
    };
  }, b64);
  results.push({ file: filePath, ...result });
}

await browser.close();
const allOk = results.every(result => result.inputPages > 0
  && result.pdfPages === result.inputPages
  && result.pdfSize > 0
  && result.nonWhite.every(value => value > 50)
  && result.pageRatios.every(ratio => Math.abs(ratio - result.slideRatio) < 0.01))
  && pageErrors.length === 0 && externalRequests.length === 0;

console.log(JSON.stringify({ results, pageErrors, externalRequests }, null, 2));
console.log(allOk ? 'PPT final artifact stress test passed' : 'PPT final artifact stress test failed');
process.exit(allOk ? 0 : 1);
