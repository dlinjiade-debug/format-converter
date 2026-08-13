import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchBrowser, repoFileUrl, repoPath } from './helpers.mjs';

const pptxPath = resolve(process.argv[2] || repoPath('tests', 'fixtures', 'stress-text-25-16x9.pptx'));
const expectedPages = Number(process.argv[3] || 0);
const b64 = readFileSync(pptxPath).toString('base64');

const browser = await launchBrowser();
const page = await browser.newPage();
const errors = [];
const externalRequests = [];
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', error => errors.push(`PAGEERROR: ${error.message}`));
page.on('request', request => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });

await page.goto(repoFileUrl('index.html'), { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.ensure === 'function', { timeout: 15000 });

const info = await page.evaluate(async base64 => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const file = new File([bytes], 'sample.pptx', {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });

  await window.ensure('JSZip');
  await window.ensure('jspdf');
  const slides = await window.pptParse(file);
  const slideOrder = slides.map(slide => {
    const text = slide.shapes.map(shape => shape.text || '').join(' ');
    const match = text.match(/StressTest Line\s+(\d+)/);
    return match ? Number(match[1]) : null;
  });
  const blob = await window.ppt2pdf(file);
  const pdf = await window.openPdf(blob);
  const pages = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const pdfPage = await pdf.getPage(pageNumber);
      const viewport = pdfPage.getViewport({ scale: 1 });
      const canvas = await window.renderPage(pdf, pageNumber, 0.35);
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

  const totalShapes = slides.reduce((sum, slide) => sum + slide.shapes.length, 0);
  const shapesWithImg = slides.reduce((sum, slide) => sum + slide.shapes.filter(shape => shape.img && (shape.img.byteLength ?? shape.img.size) > 0).length, 0);
  const shapesWithText = slides.reduce((sum, slide) => sum + slide.shapes.filter(shape => shape.text).length, 0);
  return {
    slideCount: slides.length,
    totalShapes,
    shapesWithImg,
    shapesWithText,
    slideRatio: slides[0] ? slides[0].w / slides[0].h : 0,
    pdfSize: blob.size,
    pdfPageCount: pages.length,
    pages,
    slideOrder,
  };
}, b64);

await browser.close();

const pageRatios = info.pages.map(pageInfo => pageInfo.width / pageInfo.height);
const nonWhiteOk = info.pages.length > 0 && info.pages.every(pageInfo => pageInfo.nonWhite > 50);
const ratioOk = info.slideRatio > 0 && pageRatios.length > 0
  && pageRatios.every(ratio => Math.abs(ratio - info.slideRatio) < 0.01);
const orderValues = info.slideOrder.filter(Number.isFinite);
const orderOk = orderValues.length === 0
  || (orderValues.length === info.slideCount && orderValues.every((value, index) => value === index + 1));
const pageCountOk = !expectedPages || (info.slideCount === expectedPages && info.pdfPageCount === expectedPages);
const hasRenderableContent = info.shapesWithImg > 0 || info.shapesWithText > 0;
const ok = pageCountOk && hasRenderableContent && info.pdfSize > 0 && nonWhiteOk && ratioOk && orderOk
  && externalRequests.length === 0 && errors.length === 0;

console.log(JSON.stringify({ file: pptxPath, info, pageRatios, externalRequests, errors }, null, 2));
console.log(ok ? 'PPT final PDF verification passed' : 'PPT final PDF verification failed');
process.exit(ok ? 0 : 1);
