#!/usr/bin/env node
// Independent-reference visual corpus runner. No Office automation or reference generation.
// node scripts/corpus.mjs --manifest <private.json> --output <directory-outside-repo>
// Manifest paths are absolute or relative to the manifest (never to process.cwd()).
import { createReadStream } from 'node:fs';
import { readFile, writeFile, stat, realpath, mkdir, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, relative, isAbsolute, join, extname, basename, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoPath, repoFileUrl } from '../tests/e2e/paths.mjs';

const DEFAULT_THRESHOLDS = Object.freeze({ ssim: .93, foregroundIoU: .8 });
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const errorInfo = (stage, error, extra = {}) => ({ stage, name: error.name || 'Error', message: error.message || String(error), ...extra });

function thresholds(value = {}, inherited = DEFAULT_THRESHOLDS) {
  if (!record(value)) throw new Error('Manifest thresholds must be an object');
  const normalized = { ...value };
  if ('iou' in normalized) {
    if ('foregroundIoU' in normalized && normalized.foregroundIoU !== normalized.iou) throw new Error('Conflicting IoU thresholds');
    normalized.foregroundIoU = normalized.iou;
    delete normalized.iou;
  }
  for (const [key, number] of Object.entries(normalized)) {
    if (!['ssim', 'foregroundIoU', 'textCoverage'].includes(key) || typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > 1) {
      throw new Error(`Invalid manifest threshold ${key}: expected a number in [0, 1]`);
    }
  }
  return { ...inherited, ...normalized };
}

function configuredPath(value, base, label) {
  if (typeof value !== 'string' || !value.trim() || /[<>]|(?:^|[\\/])(?:REPLACE[_ -]|YOUR[_ -]|path[\\/]to(?:[\\/]|$))/i.test(value)) {
    throw new Error(`Unconfigured manifest ${label}: select a real local path (not a template placeholder)`);
  }
  return resolve(base, value);
}

export async function loadManifest(manifestPath) {
  const path = resolve(manifestPath);
  let data;
  try { data = JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { throw new Error(`Cannot read JSON manifest ${path}: ${error.message}`); }
  if (!record(data)) throw new Error('Manifest must be a JSON object');
  if (data.template === true) throw new Error('Manifest is a TEMPLATE, not actual cases. Copy it outside the repository and configure private paths.');
  if (!Array.isArray(data.cases) || !data.cases.length) throw new Error('Manifest cases are empty or unconfigured; no real-file regressions were run');
  const globalThresholds = thresholds(data.thresholds);
  const targetWidth = data.targetWidth ?? 640;
  if (!Number.isInteger(targetWidth) || targetWidth < 64 || targetWidth > 2048) throw new Error('Manifest targetWidth must be an integer from 64 to 2048');
  const timeoutMs = data.timeoutMs ?? 180000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 900000) throw new Error('Manifest timeoutMs must be an integer from 1000 to 900000');
  const ids = new Set();
  const cases = data.cases.map((item, index) => {
    if (!record(item) || item.template === true) throw new Error(`Manifest case ${index + 1} is invalid or a template`);
    const id = item.id ?? `case-${index + 1}`;
    if (typeof id !== 'string' || !id.trim() || ids.has(id)) throw new Error(`Manifest case has an empty or duplicate id: ${id}`);
    ids.add(id);
    const source = configuredPath(item.source, dirname(path), `case ${id} source`);
    const referencePDF = configuredPath(item.referencePDF, dirname(path), `case ${id} referencePDF`);
    if (!['.pptx', '.docx'].includes(extname(source).toLowerCase())) throw new Error(`Manifest case ${id} source must be PPTX or DOCX`);
    if (extname(referencePDF).toLowerCase() !== '.pdf') throw new Error(`Manifest case ${id} referencePDF must be an independent PDF`);
    if (item.expectedPages !== undefined && (!Number.isInteger(item.expectedPages) || item.expectedPages <= 0)) throw new Error(`Manifest case ${id} expectedPages must be a positive integer`);
    return { id, source, referencePDF, expectedPages: item.expectedPages ?? null,
      provenance: item.provenance ?? null, thresholds: thresholds(item.thresholds, globalThresholds) };
  });
  return { path, cases, targetWidth, timeoutMs };
}

export async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

// Resolve existing ancestors too, so a junction/symlink cannot disguise repo output.
async function canonicalFuturePath(path) {
  try { return await realpath(path); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const parent = dirname(path);
    if (parent === path) throw error;
    return join(await canonicalFuturePath(parent), basename(path));
  }
}
async function externalPath(path) {
  const target = await canonicalFuturePath(resolve(path));
  const root = await realpath(repoPath());
  const delta = relative(root, target);
  if (!delta || (!isAbsolute(delta) && delta !== '..' && !delta.startsWith(`..${sep}`))) {
    throw new Error('Private corpus output must be in an external directory outside the repository');
  }
  return target;
}
export async function prepareOutput(outputDir) {
  const root = await externalPath(outputDir);
  await mkdir(root, { recursive: true });
  await externalPath(root);
  return mkdtemp(join(root, 'corpus-'));
}

async function fileProvenance(path) {
  const actualPath = await realpath(path);
  const metadata = await stat(actualPath);
  if (!metadata.isFile()) throw new Error(`Not a regular file: ${actualPath}`);
  return { path: actualPath, configuredPath: path, bytes: metadata.size,
    modifiedAt: metadata.mtime.toISOString(), sha256: await sha256File(actualPath) };
}
async function converterProvenance() {
  const result = { revision: null, worktreeDirty: null, indexHTMLSHA256: await sha256File(repoPath('index.html')),
    runnerSHA256: await sha256File(repoPath('scripts', 'corpus.mjs')), visualMetricsSHA256: await sha256File(repoPath('lib', 'visual-metrics.js')) };
  try {
    const git = args => execFileSync('git', ['--no-optional-locks', ...args], { cwd: repoPath(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    result.revision = git(['rev-parse', 'HEAD']);
    result.worktreeDirty = Boolean(git(['status', '--porcelain', '--untracked-files=normal']));
  } catch (error) { result.revisionError = error.message; }
  return result;
}

async function evaluate(page, fn, argument, timeoutMs) {
  let timer;
  try {
    return await Promise.race([page.evaluate(fn, argument), new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Browser operation timed out after ${timeoutMs} ms`));
        void page.close().catch(() => {});
      }, timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}

/** Compare two supplied PDFs using the bundled PDF.js, not a converter-derived oracle.
 * Output contains no extracted text, only normalized-character multiset recall.
 * Text coverage is diagnostic unless thresholds.textCoverage is explicitly set;
 * image-only exports therefore report 0 against searchable references, not N/A.
 * Physical page tolerance: 1 PDF point; aspect tolerance: 0.5% relative.
 * Tiny raster-rounding differences are white-padded, never stretched/cropped.
 */
export async function comparePDFs(page, { actualPDF, referencePDF, outputDir, expectedPages = null,
  thresholds: requestedThresholds, targetWidth = 640, timeoutMs = 180000 }) {
  const gates = thresholds(requestedThresholds);
  await externalPath(outputDir);
  await mkdir(outputDir, { recursive: true });
  await page.addScriptTag({ path: repoPath('lib', 'visual-metrics.js') });
  await page.evaluate(() => {
    for (const id of ['corpus-actual', 'corpus-reference']) {
      document.getElementById(id)?.remove();
      const input = document.createElement('input'); input.type = 'file'; input.id = id; input.hidden = true;
      document.body.appendChild(input);
    }
  });
  await page.locator('#corpus-actual').setInputFiles(actualPDF);
  await page.locator('#corpus-reference').setInputFiles(referencePDF);
  const result = { pass: false, thresholds: gates, targetWidth, expectedPages, pageCount: { actual: null, reference: null },
    failures: [], errors: [], pages: [] };
  try {
    const opened = await evaluate(page, async () => {
      const lib = await window.loadPdfJs();
      const docs = window.__corpusPDFs = {};
      const errors = [];
      for (const side of ['actual', 'reference']) {
        try {
          const file = document.getElementById(`corpus-${side}`).files[0];
          docs[side] = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
        } catch (error) { errors.push({ stage: 'pdf-parse', side, name: error.name, message: error.message }); }
      }
      return { pageCount: { actual: docs.actual?.numPages ?? null, reference: docs.reference?.numPages ?? null }, errors };
    }, undefined, timeoutMs);
    result.pageCount = opened.pageCount;
    result.errors.push(...opened.errors);
    if (opened.errors.length) { result.failures.push('pdf-parse-error'); return result; }
    if (opened.pageCount.actual !== opened.pageCount.reference) result.failures.push('page-count-mismatch');
    if (expectedPages !== null && (opened.pageCount.actual !== expectedPages || opened.pageCount.reference !== expectedPages)) result.failures.push('expected-page-count-mismatch');
    for (let pageNumber = 1; pageNumber <= Math.max(opened.pageCount.actual, opened.pageCount.reference); pageNumber++) {
      let rendered;
      try {
        rendered = await evaluate(page, async ({ pageNumber, targetWidth, gates }) => {
          const row = { pageNumber, pass: false, actual: null, reference: null, metrics: null, textCoverage: null, failures: [], errors: [], assets: {} };
          const canvases = {}, texts = {}, images = {};
          for (const side of ['actual', 'reference']) {
            const doc = window.__corpusPDFs[side];
            if (pageNumber > doc.numPages) { row.failures.push(`missing-${side}-page`); continue; }
            let pg;
            try {
              pg = await doc.getPage(pageNumber);
              const points = pg.getViewport({ scale: 1 });
              const viewport = pg.getViewport({ scale: targetWidth / points.width });
              const width = targetWidth, height = Math.ceil(viewport.height);
              row[side] = { width: points.width, height: points.height, rotation: pg.rotate, renderWidth: width, renderHeight: height };
              try { texts[side] = (await pg.getTextContent()).items.map(item => item.str || '').join(' '); }
              catch (error) { row.errors.push({ stage: 'text', side, pageNumber, name: error.name, message: error.message }); }
              if (!Number.isFinite(height) || height <= 0 || height > 8192 || width * height > 8e6) throw new Error('PDF page exceeds safe corpus raster dimensions');
              const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
              canvases[side] = canvas;
              const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, width, height);
              await pg.render({ canvasContext: context, viewport, background: '#fff' }).promise;
              images[side] = canvas.toDataURL('image/png');
            } catch (error) { row.errors.push({ stage: 'render', side, pageNumber, name: error.name, message: error.message }); }
            finally { pg?.cleanup(); }
          }
          try {
            if (texts.reference !== undefined) {
              const chars = text => Array.from(text.normalize('NFKC').replace(/\s/gu, ''));
              const ref = chars(texts.reference), act = chars(texts.actual || ''), available = new Map();
              for (const char of act) available.set(char, (available.get(char) || 0) + 1);
              let matched = 0;
              for (const char of ref) if (available.get(char) > 0) { matched++; available.set(char, available.get(char) - 1); }
              row.textCoverage = { method: 'NFKC-nonwhitespace-character-multiset-recall', searchable: ref.length > 0,
                referenceCharacters: ref.length, actualCharacters: act.length, matchedCharacters: matched,
                coverage: ref.length ? matched / ref.length : null };
              if (ref.length && gates.textCoverage !== undefined && row.textCoverage.coverage < gates.textCoverage) row.failures.push('text-coverage-below-threshold');
            }
            if (row.actual && row.reference) {
              const a = row.actual, r = row.reference;
              const aspectError = Math.abs((a.width / a.height) / (r.width / r.height) - 1);
              row.aspectRatioError = aspectError;
              if (aspectError > .005) row.failures.push('aspect-ratio-mismatch');
              if (Math.abs(a.width - r.width) > 1 || Math.abs(a.height - r.height) > 1) row.failures.push('dimensions-mismatch');
              if (aspectError <= .005 && images.actual && images.reference) {
                const height = Math.max(a.renderHeight, r.renderHeight);
                const pixels = side => {
                  const padded = document.createElement('canvas'); padded.width = targetWidth; padded.height = height;
                  try {
                    const ctx = padded.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, targetWidth, height);
                    ctx.drawImage(canvases[side], 0, 0);
                    return ctx.getImageData(0, 0, targetWidth, height).data;
                  } finally { padded.width = padded.height = 0; }
                };
                row.metrics = window.VisualMetrics.compareRGBA(pixels('actual'), pixels('reference'), targetWidth, height);
                if (row.metrics.ssim < gates.ssim) row.failures.push('ssim-below-threshold');
                if (row.metrics.foregroundIoU < gates.foregroundIoU) row.failures.push('foreground-iou-below-threshold');
              }
            }
            row.pass = row.failures.length === 0 && row.errors.length === 0;
            return { row, images };
          } finally { for (const canvas of Object.values(canvases)) canvas.width = canvas.height = 0; }
        }, { pageNumber, targetWidth, gates }, timeoutMs);
      } catch (error) {
        result.errors.push(errorInfo('render', error, { pageNumber }));
        result.pages.push({ pageNumber, pass: false, failures: ['page-comparison-exception'], errors: [errorInfo('render', error, { pageNumber })] });
        if (page.isClosed()) break;
        continue;
      }
      for (const [side, dataUrl] of Object.entries(rendered.images)) {
        const name = `page-${String(pageNumber).padStart(4, '0')}-${side}.png`;
        await writeFile(join(outputDir, name), Buffer.from(dataUrl.split(',')[1], 'base64'), { flag: 'wx' });
        rendered.row.assets[side] = name;
      }
      result.pages.push(rendered.row);
      result.errors.push(...rendered.row.errors);
    }
    result.pass = result.failures.length === 0 && result.errors.length === 0 && result.pages.length > 0 && result.pages.every(item => item.pass);
    return result;
  } catch (error) {
    result.errors.push(errorInfo('comparison', error));
    return result;
  } finally {
    if (!page.isClosed()) await page.evaluate(async () => {
      for (const pdf of Object.values(window.__corpusPDFs || {})) { try { await pdf.destroy(); } catch {} }
      delete window.__corpusPDFs;
      document.getElementById('corpus-actual')?.remove(); document.getElementById('corpus-reference')?.remove();
    }).catch(() => {});
  }
}

export async function runCorpus({ manifestPath, outputDir }) {
  const manifest = await loadManifest(manifestPath);
  const runDir = await prepareOutput(outputDir);
  const reportPath = join(runDir, 'report.json');
  const report = { schemaVersion: 1, startedAt: new Date().toISOString(), manifest: { path: manifest.path, sha256: await sha256File(manifest.path) },
    outputDirectory: runDir, referencePolicy: 'User-supplied independent PDFs; provenance is user-declared, not independently attested. No references are generated.',
    converter: await converterProvenance(), browser: { name: 'chromium', version: null },
    metrics: { ssim: 'RGB SSIM on foreground-containing 8x8 tiles; white-composited', foregroundIoU: 'Exact mask IoU; foreground = any composited RGB channel < 245',
      mae: 'Full-frame RGB absolute error / 255', dimensionTolerancePt: 1, relativeAspectTolerance: .005 },
    cases: [], pass: false, summary: { total: manifest.cases.length, passed: 0, failed: 0 } };
  let browser;
  const save = () => writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  try {
    for (const [index, item] of manifest.cases.entries()) {
      const caseDir = join(runDir, `case-${String(index + 1).padStart(4, '0')}`);
      await mkdir(caseDir);
      const result = { id: item.id, provenance: item.provenance, source: { path: item.source }, referencePDF: { path: item.referencePDF },
        expectedPages: item.expectedPages, thresholds: item.thresholds, exportedPDF: null, warnings: [], diagnostics: [],
        pass: false, failures: [], errors: [], pages: [], artifactDirectory: caseDir };
      report.cases.push(result);
      for (const field of ['source', 'referencePDF']) {
        try { result[field] = await fileProvenance(item[field]); }
        catch (error) { result.errors.push(errorInfo('input', error, { side: field })); }
      }
      if (result.errors.length) { await save(); continue; }
      let context, stage = 'browser';
      try {
        if (!browser) {
          const { launchBrowser } = await import('../tests/e2e/helpers.mjs');
          browser = await launchBrowser(); report.browser.version = browser.version();
        }
        context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: false });
        // Private inputs must not cause remote resource requests during corpus work.
        await context.route(/^https?:\/\//i, route => route.abort('blockedbyclient'));
        const page = await context.newPage();
        page.setDefaultTimeout(manifest.timeoutMs);
        page.on('console', message => { if (message.type() === 'error' && result.diagnostics.length < 200) result.diagnostics.push({ type: 'console-error', message: message.text() }); });
        page.on('pageerror', error => result.errors.push(errorInfo('browser', error)));
        await page.goto(repoFileUrl('index.html'), { waitUntil: 'load' });
        await page.waitForFunction(() => typeof window.ppt2pdfResult === 'function' && typeof window.word2pdfResult === 'function');
        stage = 'input';
        await page.locator('#fi').setInputFiles(result.source.path);
        stage = 'export';
        const conversion = await evaluate(page, async kind => {
          const file = document.querySelector('#fi').files[0];
          const converted = kind === '.pptx' ? await window.ppt2pdfResult(file) : await window.word2pdfResult(file, true);
          if (!converted?.blob || !converted.blob.size) throw new Error('Converter returned an empty or missing exported PDF');
          const bytes = new Uint8Array(await converted.blob.arrayBuffer());
          let binary = '';
          for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
          return { base64: btoa(binary), warnings: converted.warnings || [] };
        }, extname(item.source).toLowerCase(), manifest.timeoutMs);
        result.warnings = conversion.warnings;
        const exportedPath = join(caseDir, 'exported.pdf');
        await writeFile(exportedPath, Buffer.from(conversion.base64, 'base64'), { flag: 'wx' });
        result.exportedPDF = await fileProvenance(exportedPath);
        stage = 'comparison';
        const comparison = await comparePDFs(page, { actualPDF: exportedPath, referencePDF: result.referencePDF.path,
          outputDir: caseDir, expectedPages: item.expectedPages, thresholds: item.thresholds,
          targetWidth: manifest.targetWidth, timeoutMs: manifest.timeoutMs });
        const priorErrors = result.errors;
        Object.assign(result, comparison, { errors: [...priorErrors, ...comparison.errors] });
        result.pass = comparison.pass && result.errors.length === 0;
      } catch (error) { result.errors.push(errorInfo(stage, error)); result.pass = false; }
      finally {
        await context?.close();
        for (const field of ['source', 'referencePDF']) {
          try {
            const after = await sha256File(result[field].path);
            if (after !== result[field].sha256) { result.errors.push({ stage: 'input', side: field, message: 'Input changed during run', sha256After: after }); result.pass = false; }
          } catch (error) { result.errors.push(errorInfo('input', error, { side: field })); result.pass = false; }
        }
        await save();
      }
    }
  } finally {
    await browser?.close();
    report.finishedAt = new Date().toISOString();
    report.summary.passed = report.cases.filter(item => item.pass).length;
    report.summary.failed = report.summary.total - report.summary.passed;
    report.pass = report.cases.length === report.summary.total && report.summary.failed === 0;
    await save();
  }
  return { report, reportPath };
}

async function main(args) {
  const usage = 'Usage: node scripts/corpus.mjs --manifest <private.json> --output <external-directory>';
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) { console.log(usage); return; }
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (!['--manifest', '--output'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--') || parsed[key]) throw new Error(usage);
    parsed[key] = args[i + 1];
  }
  if (!parsed['--manifest'] || !parsed['--output']) throw new Error(usage);
  const { report, reportPath } = await runCorpus({ manifestPath: parsed['--manifest'], outputDir: parsed['--output'] });
  console.log(JSON.stringify({ pass: report.pass, ...report.summary, reportPath }, null, 2));
  process.exitCode = report.pass ? 0 : 1;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(error => { console.error(`Corpus: ${error.message}`); process.exitCode = 1; });
}
