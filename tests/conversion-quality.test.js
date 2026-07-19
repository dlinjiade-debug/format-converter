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
assert.match(html, /pdfModeLayout/, 'layout-first PDF mode should exist');
assert.match(html, /pdf2docxLayout/, 'layout-first PDF to Word renderer should exist');
assert.match(html, /pdf2htmlLayout/, 'layout-first PDF to HTML renderer should exist');
assert.match(html, /docHtmlToPdf/, 'shared document-to-PDF renderer should exist');
assert.match(html, /DOC_EXPORT_CSS/, 'shared export CSS should exist');

console.log('conversion quality checks passed');
