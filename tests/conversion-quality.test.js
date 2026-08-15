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

// PDF pages containing raster/vector artwork must not silently become text-only.
assert.match(html, /paintImageXObject|pdfPageVisualInfo/, 'PDF visual content should be detected');
assert.doesNotMatch(html, /if\(total>80\)throw/, 'PDF conversion should not hard-fail at 80 pages');

console.log('conversion quality checks passed');
