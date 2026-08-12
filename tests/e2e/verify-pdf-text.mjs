import { chromium } from 'playwright';

const url = 'file://D:/format-converter/index.html';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', error => errors.push(`PAGEERROR: ${error.message}`));

await page.goto(url, { waitUntil: 'load' });
await page.evaluate(async () => { await window.ensure('jspdf'); await window.ensure('JSZip'); });

const pdfBase64 = await page.evaluate(() => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Two column and table regression', 60, 48);
  for (let i = 0; i < 4; i++) {
    const y = 90 + i * 22;
    doc.text(`Left column row ${i + 1}`, 60, y);
    doc.text(`Right column row ${i + 1}`, 330, y + 10);
  }
  for (let i = 0; i < 4; i++) {
    const y = 220 + i * 22;
    doc.text(`Table A${i + 1}`, 60, y);
    doc.text(`Table B${i + 1}`, 300, y);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 36;
  canvas.getContext('2d').fillStyle = '#93c5fd';
  canvas.getContext('2d').fillRect(0, 0, 48, 36);
  doc.addImage(canvas.toDataURL('image/png'), 'PNG', 60, 330, 96, 72);
  doc.addPage('a4', 'portrait');
  doc.text('Second page content is preserved', 60, 60);
  doc.text('Chinese content: 数学 选择题', 60, 90);
  const bytes = new Uint8Array(doc.output('arraybuffer'));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
});

const result = await page.evaluate(async base64 => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const input = new File([bytes], 'text-layout.pdf', { type: 'application/pdf' });
  const pages = await window.pdfPages(input);
  const blob = await window.pdf2docx(input);
  const zip = await window.JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('word/document.xml').async('string');
  return {
    pageCount: pages.length,
    hasText: pages.map(page => page.hasText),
    columns: pages.map(page => page.columns.length),
    imageCounts: pages.map(page => page.imageCount),
    text: pages.map(page => page.text),
    tables: (xml.match(/<w:tbl\b/g) || []).length,
    drawings: (xml.match(/<w:drawing\b/g) || []).length,
    warnings: window.lastConversionWarnings || [],
  };
}, pdfBase64);

await browser.close();
console.log(JSON.stringify({ result, errors }, null, 2));
const combined = result.text.join('\n');
const ok = result.pageCount === 2
  && result.hasText.every(Boolean)
  && result.columns[0] >= 2
  && /Left column row 1/.test(combined)
  && /Right column row 1/.test(combined)
  && /Second page content/.test(combined)
  && result.tables >= 1
  && result.drawings >= 1
  && result.warnings.length === 0
  && errors.length === 0;
if (!ok) process.exit(1);
