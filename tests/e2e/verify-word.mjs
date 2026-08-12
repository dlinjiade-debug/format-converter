import { chromium } from 'playwright';

const url = 'file://D:/format-converter/index.html';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', error => errors.push(`PAGEERROR: ${error.message}`));

await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.ensureDocx === 'function', { timeout: 15000 });

const docxBase64 = await page.evaluate(async () => {
  await window.ensureDocx();
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun, PageBreak } = window.docx;
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 50;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fda4af';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(18, 12, 44, 26);
  const imageBinary = atob(canvas.toDataURL('image/png').split(',')[1]);
  const imageBytes = new Uint8Array(imageBinary.length);
  for (let i = 0; i < imageBinary.length; i++) imageBytes[i] = imageBinary.charCodeAt(i);
  const rows = [
    ['字段', '值'],
    ['表格行 1', '中文内容'],
    ['表格行 2', 'editable table'],
  ].map(cells => new TableRow({ children: cells.map(text => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text })] })] })) }));
  const children = [
    new Paragraph({ text: 'Word export regression' }),
    new Paragraph({ children: [new TextRun({ text: '图片、表格和分页应该保留。' })] }),
    new Paragraph({ children: [new ImageRun({ data: imageBytes, transformation: { width: 160, height: 100 }, type: 'png' })] }),
    new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ text: '第二页内容' }),
    new Paragraph({ children: [new TextRun({ text: '第二页不应为空白，也不应与第一页重叠。' })] }),
  ];
  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
});

const result = await page.evaluate(async base64 => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const input = new File([bytes], 'word-regression.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const blob = await window.word2pdf(input);
  const pdf = await window.openPdf(blob);
  const pages = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const canvas = await window.renderPage(pdf, i, 0.75);
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let nonWhite = 0;
      for (let p = 0; p < data.length; p += 4) {
        if (!(data[p] > 250 && data[p + 1] > 250 && data[p + 2] > 250)) nonWhite++;
      }
      pages.push(nonWhite);
    }
  } finally {
    await pdf.destroy();
  }
  return { size: blob.size, pageCount: pages.length, nonWhite: pages };
}, docxBase64);

await browser.close();
console.log(JSON.stringify({ result, errors }, null, 2));
const ok = result.size > 0 && result.pageCount >= 2 && result.nonWhite.every(value => value > 50) && errors.length === 0;
if (!ok) process.exit(1);
