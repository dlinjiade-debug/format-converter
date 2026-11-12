// Synthetic tooling checks only: these PDFs are NOT Office/WPS real-file evidence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { launchBrowser, repoFileUrl, repoPath } from '../e2e/helpers.mjs';
import { buildFixture } from '../e2e/fixture-factory.mjs';

const { jsPDF } = createRequire(import.meta.url)(repoPath('lib', 'jspdf.umd.min.js'));
async function pdfFile(dir, name, { width = 960, height = 540, pages = 1, shape = true, text = '', color = [20, 180, 70] } = {}) {
  const pdf = new jsPDF({ unit: 'pt', format: [width, height], orientation: width >= height ? 'landscape' : 'portrait' });
  for (let i = 0; i < pages; i++) {
    if (i) pdf.addPage([width, height], width >= height ? 'landscape' : 'portrait');
    if (shape) { pdf.setFillColor(...color); pdf.rect(50, 50, 90, 60, 'F'); }
    if (text) pdf.text(text, 20, 30);
  }
  const path = join(dir, name);
  await writeFile(path, Buffer.from(pdf.output('arraybuffer')));
  return path;
}

test('PDF.js comparison preserves geometry, detects missing foreground, and measures searchable text', async t => {
  const { comparePDFs } = await import('../../scripts/corpus.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'converter-corpus-pdf-'));
  const browser = await launchBrowser();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(repoFileUrl('index.html'));
  const referencePDF = await pdfFile(dir, 'reference.pdf', { text: 'Alpha Beta' });
  const actualPDF = await pdfFile(dir, 'actual.pdf', { text: 'Alpha Beta' });
  const compare = async (name, actual, reference = referencePDF, extra = {}) => {
    const outputDir = join(dir, name);
    await mkdir(outputDir);
    return comparePDFs(page, { actualPDF: actual, referencePDF: reference, outputDir, ...extra });
  };
  const identical = await compare('identical', actualPDF);
  assert.equal(identical.pass, true);
  assert.equal(identical.pages[0].metrics.ssim, 1);
  assert.equal(identical.pages[0].textCoverage.coverage, 1);
  assert.equal(identical.pages[0].actual.renderWidth, 640);
  assert.equal(identical.pages[0].actual.renderHeight, 360);
  assert.equal((await readFile(join(dir, 'identical', identical.pages[0].assets.actual))).subarray(1, 4).toString(), 'PNG');

  const blank = await pdfFile(dir, 'blank.pdf', { shape: false });
  const missing = await compare('missing', blank);
  assert.equal(missing.pass, false);
  assert.equal(missing.pages[0].metrics.foregroundIoU, 0);
  assert.equal(missing.pages[0].textCoverage.coverage, 0);
  assert.equal(missing.pages[0].pass, false);

  const relaxed = await compare('relaxed-gates', blank, referencePDF, { thresholds: { ssim: 0, iou: 0 } });
  assert.equal(relaxed.pass, true, 'text recall is diagnostic by default');
  const textGate = await compare('text-gate', blank, referencePDF, { thresholds: { ssim: 0, iou: 0, textCoverage: .5 } });
  assert.equal(textGate.pass, false);
  assert.ok(textGate.pages[0].failures.includes('text-coverage-below-threshold'));

  const square = await pdfFile(dir, 'square.pdf', { width: 540 });
  const distorted = await compare('aspect', square);
  assert.equal(distorted.pass, false);
  assert.ok(distorted.pages[0].failures.includes('aspect-ratio-mismatch'));
  assert.equal(distorted.pages[0].actual.renderHeight, 640);

  const bigger = await pdfFile(dir, 'bigger.pdf', { width: 1920, height: 1080 });
  const dimensions = await compare('dimensions', bigger);
  assert.ok(dimensions.pages[0].failures.includes('dimensions-mismatch'));

  const two = await pdfFile(dir, 'two.pdf', { pages: 2 });
  const counts = await compare('counts', two, referencePDF, { expectedPages: 3 });
  assert.equal(counts.pass, false);
  assert.equal(counts.pages.length, 2);
  assert.ok(counts.failures.includes('page-count-mismatch'));
  assert.ok(counts.failures.includes('expected-page-count-mismatch'));
  assert.ok(counts.pages[1].failures.includes('missing-reference-page'));

  const unsearchable = await compare('no-text', blank, blank);
  assert.equal(unsearchable.pages[0].textCoverage.coverage, null);
  assert.equal(unsearchable.pass, true);
  const corruption = join(dir, 'corrupt.pdf');
  await writeFile(corruption, 'not a PDF');
  const corrupt = await compare('corrupt', corruption);
  assert.equal(corrupt.pass, false);
  assert.equal(corrupt.errors[0].stage, 'pdf-parse');
  assert.equal(corrupt.errors[0].side, 'actual');

  // Inject a failure at the external canvas boundary, not into comparison logic.
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    window.restoreCorpusCanvas = () => { HTMLCanvasElement.prototype.getContext = original; };
    HTMLCanvasElement.prototype.getContext = function () { throw new Error('Synthetic canvas render failure'); };
  });
  try {
    const renderError = await compare('render-error', actualPDF);
    assert.equal(renderError.pass, false);
    assert.equal(renderError.pages[0].pass, false);
    assert.ok(renderError.errors.some(error => error.stage === 'render' && error.side === 'actual' && error.pageNumber === 1));
    assert.ok(!renderError.errors.some(error => error.stage === 'export'));
  } finally { await page.evaluate(() => { window.restoreCorpusCanvas(); delete window.restoreCorpusCanvas; }); }
});

test('runner exports synthetic PPTX/DOCX and retains independent-reference provenance and export exceptions', async () => {
  const { runCorpus, sha256File } = await import('../../scripts/corpus.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'converter-corpus-run-'));
  const source = join(dir, 'synthetic.pptx');
  await writeFile(source, await buildFixture({ kind: 'image' }));
  // Independently constructed solid-color page matches the synthetic image slide.
  const pdf = new jsPDF({ unit: 'pt', format: [960, 540], orientation: 'landscape' });
  pdf.setFillColor(230, 60, 90); pdf.rect(0, 0, 960, 540, 'F');
  const referencePDF = join(dir, 'synthetic-independent.pdf');
  await writeFile(referencePDF, Buffer.from(pdf.output('arraybuffer')));
  const invalidSource = join(dir, 'broken.docx');
  await writeFile(invalidSource, 'not a ZIP document');
  const browser = await launchBrowser();
  let wordBytes;
  try {
    const page = await browser.newPage();
    await page.goto(repoFileUrl('index.html'));
    wordBytes = await page.evaluate(async () => {
      await window.ensureDocx();
      const { Document, Paragraph, Packer } = window.docx;
      const blob = await Packer.toBlob(new Document({ sections: [{ properties: {
        page: { size: { width: 12240, height: 15840 } },
      }, children: [new Paragraph('')] }] }));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
  } finally { await browser.close(); }
  const wordSource = join(dir, 'synthetic-blank.docx');
  await writeFile(wordSource, Buffer.from(wordBytes));
  const wordReference = await pdfFile(dir, 'synthetic-blank-letter.pdf', { width: 612, height: 792, shape: false });
  const manifestPath = join(dir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ cases: [
    { id: 'synthetic-only', source, referencePDF, expectedPages: 1, provenance: { kind: 'synthetic-tooling-test', referenceApplication: 'jsPDF (not Office/WPS)' } },
    { id: 'broken-word', source: invalidSource, referencePDF },
    { id: 'synthetic-word-only', source: wordSource, referencePDF: wordReference, expectedPages: 1,
      provenance: { kind: 'synthetic-tooling-test', referenceApplication: 'jsPDF (not Office/WPS)' } },
  ] }));
  const { report, reportPath } = await runCorpus({ manifestPath, outputDir: join(dir, 'private-results') });
  assert.equal(report.pass, false);
  assert.equal(report.cases[0].pass, true);
  assert.equal(report.cases[0].source.sha256, await sha256File(source));
  assert.equal(report.cases[0].referencePDF.sha256, await sha256File(referencePDF));
  assert.equal(report.cases[0].provenance.kind, 'synthetic-tooling-test');
  assert.match(report.browser.version, /\d+\./);
  assert.match(report.converter.revision, /^[a-f0-9]{40}$/);
  assert.ok(report.cases[0].exportedPDF.path.endsWith('.pdf'));
  assert.equal(report.cases[1].errors[0].stage, 'export');
  assert.equal(report.cases[2].pass, true, JSON.stringify(report.cases[2]));
  assert.equal(report.cases[2].pageCount.actual, 1);
  assert.ok(report.cases[2].warnings.length > 0, 'Word export limitations are retained');
  assert.equal(JSON.parse(await readFile(reportPath, 'utf8')).summary.passed, 2);
});
