const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

function scripts() {
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const code = m[1].trim();
    if (code) out.push(code);
  }
  return out;
}

for (const [idx, code] of scripts().entries()) {
  new vm.Script(code, { filename: `inline-script-${idx + 1}.js` });
}

assert.match(html, /id="pdfMode"/, 'PDF conversion mode selector should exist');
assert.match(html, /pdfModeText/, 'text-first PDF mode should exist');
assert.match(html, /pdfModeHybrid/, 'hybrid PDF mode should exist');
assert.match(html, /pdfModeLayout/, 'layout-first PDF mode should exist');
assert.match(html, /pdf2docxLayout/, 'layout-first PDF to Word renderer should exist');
assert.match(html, /pdf2htmlLayout/, 'layout-first PDF to HTML renderer should exist');
assert.match(html, /docHtmlToPdf/, 'shared document-to-PDF renderer should exist');
assert.match(html, /DOC_EXPORT_CSS/, 'shared export CSS should exist');

// Large office files must be processed incrementally instead of through one
// unbounded canvas/DOM tree.
assert.match(html, /async function htmlToPdfPages/, 'document PDF export should be paginated');
assert.match(html, /waitForImages/, 'document export should wait for embedded images');
assert.match(html, /yieldToBrowser/, 'large conversions should yield between pages');
assert.match(html, /jsPDF:\{unit:'px',format:\[EXPORT_PAGE\.width,EXPORT_PAGE\.height\]/, 'each document chunk should map to exactly one PDF page');

// PPTX picture shapes are stored as p:pic, not p:sp. They need a structured
// slide parser and a numeric slide order so image-heavy decks survive export.
assert.match(html, /pptParseSlide/, 'PPT slides should be parsed one at a time');
assert.match(html, /pptImagePath/, 'PPT relationship paths should be resolved');
assert.match(html, /p:pic|pic/, 'PPT picture shapes should be handled');
assert.match(html, /ppt2docx/, 'PPT to Word visual export should exist');
assert.match(html, /sort\(\(a,b\)=>a\.number-b\.number\)/, 'PPT slides should sort numerically');
assert.match(html, /aiden0z-pptx-renderer\.browser\.es\.js/, 'PPT should ship a pinned high-fidelity renderer');
assert.match(html, /pptOpenHighFidelity/, 'PPT conversion should prefer the high-fidelity renderer');
assert.match(html, /pptRenderHighSlide/, 'high-fidelity PPT slides should be rasterized before PDF export');
assert.match(html, /html2canvas/, 'high-fidelity PPT DOM should be captured as a bitmap');

// High-fidelity OOXML rendering should cover Word as well as PowerPoint and
// enforce the same archive/image budgets used by mature browser viewers.
assert.match(html, /ooxml\/docx\.mjs/, 'Word should ship a high-fidelity OOXML renderer');
assert.match(html, /ooxml\/pptx\.mjs/, 'PPT should expose the OOXML renderer fallback');
assert.match(html, /ensureOoxmlRenderer/, 'OOXML renderers should load lazily');
assert.match(html, /OOXML_RESOURCE_LIMITS/, 'OOXML archive resource limits should be explicit');
assert.match(html, /word2pdfHighFidelity/, 'Word to PDF should have a layout-preserving path');

// Large jobs need a bounded sequential queue rather than retaining every
// converted Blob and canvas at once.
assert.match(html, /conversionQueue/, 'conversions should be serialized through a queue');
assert.match(html, /MAX_BATCH_FILES/, 'batch conversion should have a file-count guard');
assert.match(html, /conversionWarnings/, 'format-loss warnings should be surfaced');

// PDF pages containing raster/vector artwork must not silently become text-only.
assert.match(html, /paintImageXObject|pdfPageVisualInfo/, 'PDF visual content should be detected');
assert.match(html, /hasVisual:hasImages\|\|hasGraphics/, 'PDF vector artwork should trigger visual preservation');
assert.doesNotMatch(html, /if\(total>80\)throw/, 'PDF conversion should not hard-fail at 80 pages');

console.log('conversion quality checks passed');
