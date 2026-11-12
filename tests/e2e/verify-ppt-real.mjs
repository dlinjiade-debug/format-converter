import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchBrowser, repoFileUrl } from './helpers.mjs';

const inputPath = resolve(process.argv[2]);
const expectedPages = Number(process.argv[3] || 0);
const outputPath = process.argv[4] ? resolve(process.argv[4]) : null;
if (!inputPath || !expectedPages) {
  throw new Error('Usage: node tests/e2e/verify-ppt-real.mjs <pptx> <expected-pages>');
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', error => errors.push(`PAGEERROR: ${error.message}`));

await page.goto(repoFileUrl('index.html'), { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.ensure === 'function', { timeout: 15000 });
await page.locator('#fi').setInputFiles(inputPath);

const result = await page.evaluate(async () => {
  const file = document.querySelector('#fi').files[0];
  const conversion = await window.ppt2pdfResult(file);
  const pdf = await window.openPdf(conversion.blob);
  const pages = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const canvas = await window.renderPage(pdf, pageNumber, 0.25);
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let nonWhite = 0;
      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (!(pixels[offset] > 250 && pixels[offset + 1] > 250 && pixels[offset + 2] > 250)) nonWhite++;
      }
      pages.push({ width: canvas.width, height: canvas.height, nonWhite });
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await pdf.destroy();
  }
  return {
    size: file.size,
    pdfSize: conversion.blob.size,
    pdfPages: pages.length,
    pages,
    warnings: conversion.warnings,
    pdfBase64: await (async () => {
      const bytes = new Uint8Array(await conversion.blob.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }
      return btoa(binary);
    })(),
  };
});

await browser.close();
if (outputPath) writeFileSync(outputPath, Buffer.from(result.pdfBase64, 'base64'));
delete result.pdfBase64;
const fallback = result.warnings.some(warning => /兼容解析器|无法处理该文件/.test(warning));
const ok = result.pdfPages === expectedPages
  && result.pdfSize > 100000
  && result.pages.every(item => item.nonWhite > 500)
  && !fallback
  && errors.length === 0;

console.log(JSON.stringify({ inputPath, result, errors }, null, 2));
console.log(ok ? 'PPT real-file verification passed' : 'PPT real-file verification failed');
process.exit(ok ? 0 : 1);
