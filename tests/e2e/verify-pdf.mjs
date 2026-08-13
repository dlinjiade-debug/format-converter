import { launchBrowser, repoFileUrl } from './helpers.mjs';

const browser = await launchBrowser();
const page = await browser.newPage();
const errors = [];
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', error => errors.push(`PAGEERROR: ${error.message}`));

await page.goto(repoFileUrl('index.html'), { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.ensure === 'function', { timeout: 15000 });
await page.evaluate(async () => {
  await window.ensure('JSZip');
  await window.ensure('jspdf');
});

const pdfBase64 = await page.evaluate(() => {
  const { jsPDF } = window.jspdf;
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 340;
  const ctx = canvas.getContext('2d');
  const colors = ['#dbeafe', '#dcfce7', '#fef3c7'];
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  for (let i = 0; i < colors.length; i++) {
    if (i) doc.addPage('a4', 'portrait');
    ctx.fillStyle = colors[i];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(24 + i * 12, 30 + i * 18, 120, 46);
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 595.28, 841.89);
  }
  const bytes = new Uint8Array(doc.output('arraybuffer'));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
});

const result = await page.evaluate(async base64 => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const input = new File([bytes], 'image-only.pdf', { type: 'application/pdf' });
  const blob = await window.pdf2docx(input);
  const zip = await window.JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('word/document.xml').async('string');
  return {
    size: blob.size,
    drawings: (xml.match(/<w:drawing\b/g) || []).length,
    pageBreaks: (xml.match(/<w:br\b[^>]*w:type="page"/g) || []).length,
    sections: (xml.match(/<w:sectPr\b/g) || []).length,
    pageSizes: (xml.match(/<w:pgSz\b/g) || []).length,
    warnings: window.lastConversionWarnings || [],
  };
}, pdfBase64);

await browser.close();

const ok = result.size > 0
  && result.drawings === 3
  && (result.pageBreaks >= 2 || result.sections >= 3)
  && result.pageSizes >= 1
  && result.warnings.some(warning => /图片型 PDF/.test(warning))
  && errors.length === 0;

console.log(JSON.stringify({ result, errors }, null, 2));
if (!ok) process.exit(1);
