import assert from 'node:assert/strict';
import { launchBrowser, repoFileUrl } from './helpers.mjs';

// Each case inspects real output, rather than helper presence or a non-white page.
const browser = await launchBrowser({ args: ['--autoplay-policy=no-user-gesture-required'] });
let failures = 0;
try {
  const page = await browser.newPage();
  const external = [];
  page.on('request', r => { if (/^https?:/.test(r.url())) external.push(r.url()); });
  await page.goto(repoFileUrl('index.html'));
  const cases = {
    async imageFormats() {
      return page.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 17; c.height = 9;
        c.getContext('2d').fillStyle = '#e03570'; c.getContext('2d').fillRect(0, 0, 17, 9);
        const f = new File([await new Promise(r => c.toBlob(r))], 'source.png');
        const result = {};
        for (const format of ['bmp', 'ico']) {
          const blob = await img2img(f, format);
          const bytes = new Uint8Array(await blob.arrayBuffer());
          result[format] = { type: blob.type, header: Array.from(bytes.slice(0, 8)) };
        }
        return result;
      });
    },
    async audioFormat() {
      return page.evaluate(async () => {
        const ctx = new AudioContext();
        const audio = ctx.createBuffer(1, 4410, 44100);
        const samples = audio.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(i * 2 * Math.PI * 440 / 44100) * .2;
        const file = new File([audioBufToWav(audio)], 'tone.wav'); await ctx.close();
        const blob = await audConvert(file, 'mp3');
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const decoder = new AudioContext();
        const decoded = await decoder.decodeAudioData(bytes.slice().buffer); await decoder.close();
        return { type: blob.type, header: Array.from(bytes.slice(0, 4)), duration: decoded.duration };
      });
    },
    async pdfRegions() {
      return page.evaluate(async () => {
        await ensure('jspdf');
        const pdf = new jspdf.jsPDF({ unit: 'pt', format: 'a4' }); pdf.setFontSize(12);
        for (let i = 1; i <= 7; i++) { pdf.text('Left ' + i, 60, 60 + i * 24); pdf.text('Right ' + i, 330, 60 + i * 24); }
        const pages = await pdfPages(new File([pdf.output('blob')], 'columns.pdf'));
        try { return { count: pages[0].columns.length, text: pages[0].text }; }
        finally { await pages._doc.destroy(); }
      });
    },
    async repeatedHeaders() {
      return page.evaluate(async () => {
        await ensure('jspdf'); await ensure('JSZip');
        const pdf = new jspdf.jsPDF({ unit: 'pt', format: 'a4' }); pdf.setFontSize(12);
        for (let i = 1; i <= 3; i++) { if (i > 1) pdf.addPage(); pdf.text('Report ' + i, 60, 20); pdf.text('Report ' + i, 60, 200); pdf.text('Body content ' + i, 60, 250); }
        const { blob } = await pdf2docxResult(new File([pdf.output('blob')], 'headers.pdf'));
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        return zip.file('word/document.xml').async('string');
      });
    },
    async chineseText() {
      return page.evaluate(async () => {
        const blob = await txt2pdf(new File(['中文测试 ABC 123'], 'source.txt'));
        const pdf = await openPdf(blob);
        try {
          const canvas = await renderPage(pdf, 1, 1);
          const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
          let ink = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 180) ink++;
          const text = (await (await pdf.getPage(1)).getTextContent()).items.map(x => x.str).join('');
          canvas.width = canvas.height = 0;
          return { ink, text, warnings: window.lastConversionWarnings };
        } finally { await pdf.destroy(); }
      });
    },
  };
  const checks = {
    imageFormats(r) { assert.deepEqual(r.bmp.header.slice(0, 2), [66, 77]); assert.deepEqual(r.ico.header.slice(0, 4), [0, 0, 1, 0]); },
    audioFormat(r) { assert.equal(r.type, 'audio/mpeg'); assert.ok(r.header[0] === 255 || r.header.slice(0, 3).join() === '73,68,51', 'must contain MP3 frames/ID3, not WebM'); assert.ok(r.duration > .07); },
    pdfRegions(r) { assert.equal(r.count, 2); assert.ok(r.text.indexOf('Left 7') < r.text.indexOf('Right 1'), r.text); },
    repeatedHeaders(xml) { for (const n of [1, 2, 3]) assert.equal((xml.match(new RegExp('Report ' + n, 'g')) || []).length, 1, 'body label must survive, edge label must be removed'); },
    chineseText(r) { assert.ok(r.ink > 300); assert.ok(r.text.includes('中文测试') || r.warnings.some(x => /页面图|图片|字体/.test(x)), 'Chinese must be embedded or explicitly rendered with browser fonts'); },
  };
  for (const [name, run] of Object.entries(cases)) {
    try { checks[name](await run()); console.log('PASS', name); }
    catch (error) { failures++; console.error('FAIL', name, error.message); }
  }
  assert.deepEqual(external, [], 'offline conversions must not request external assets');
} finally { await browser.close(); }
if (failures) process.exitCode = 1;
