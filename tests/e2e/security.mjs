import { launchBrowser, repoFileUrl } from './helpers.mjs';

const browser = await launchBrowser();
const page = await browser.newPage();
const pageErrors = [];
const externalRequests = [];

page.on('pageerror', error => pageErrors.push(error.message));
page.on('request', request => {
  if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
});
await page.route(/^https?:/i, route => route.abort());
await page.goto(repoFileUrl('index.html'), { waitUntil: 'load' });

const result = await page.evaluate(async () => {
  window.__htmlProbe = 0;
  window.__nameProbe = 0;
  const maliciousHtml = [
    '<p>safe probe</p>',
    '<img src="x-invalid" onerror="window.__htmlProbe += 1">',
    '<img src="https://example.invalid/private-probe.png">',
    '<a href="javascript:window.__htmlProbe += 10">unsafe link</a>',
    '<iframe srcdoc="<script>parent.__htmlProbe += 100<\\/script>"></iframe>',
  ].join('');

  const pdf = await window.docHtmlToPdf(maliciousHtml, 'security-probe.html');
  await new Promise(resolve => setTimeout(resolve, 50));

  let cleaned = '';
  if (typeof window.sanitizeDocumentHtml === 'function') {
    await window.ensure('DOMPurify');
    cleaned = window.sanitizeDocumentHtml(maliciousHtml);
  }

  const created = [];
  const revoked = [];
  const originalCreate = URL.createObjectURL.bind(URL);
  const originalRevoke = URL.revokeObjectURL.bind(URL);
  const originalClick = HTMLAnchorElement.prototype.click;
  URL.createObjectURL = value => {
    const url = originalCreate(value);
    created.push(url);
    return url;
  };
  URL.revokeObjectURL = url => {
    revoked.push(url);
    return originalRevoke(url);
  };
  HTMLAnchorElement.prototype.click = () => {};

  const container = document.createElement('div');
  document.body.appendChild(container);
  const unsafeName = '\"><img src=x-invalid onerror="window.__nameProbe += 1">.txt';
  let loadImgWorked = false;
  try {
    window.show(new Blob(['first']), unsafeName, container, ['<img src=x onerror=alert(1)>']);
    window.show(new Blob(['second']), 'second.txt', container, []);
    if (typeof window.releaseResultUrl === 'function') window.releaseResultUrl(container);
    const image = await window.loadImg(new Blob([
      '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>',
    ], { type: 'image/svg+xml' }));
    loadImgWorked = image.naturalWidth === 2;
    await new Promise(resolve => setTimeout(resolve, 50));
  } finally {
    HTMLAnchorElement.prototype.click = originalClick;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    container.remove();
  }

  return {
    pdfSize: pdf.size,
    htmlProbe: window.__htmlProbe,
    nameProbe: window.__nameProbe,
    cleaned,
    uiCreatedImages: container.querySelectorAll('img').length,
    createdCount: created.length,
    revokedCount: revoked.length,
    everyObjectUrlRevoked: created.every(url => revoked.includes(url)),
    loadImgWorked,
  };
});

await browser.close();
console.log(JSON.stringify({ result, externalRequests, pageErrors }, null, 2));

const cleanMarkup = result.cleaned
  && !/onerror|javascript:|<iframe|https:\/\//i.test(result.cleaned);
const ok = result.pdfSize > 0
  && result.htmlProbe === 0
  && result.nameProbe === 0
  && result.uiCreatedImages === 0
  && cleanMarkup
  && externalRequests.length === 0
  && result.createdCount >= 3
  && result.everyObjectUrlRevoked
  && result.loadImgWorked
  && pageErrors.length === 0;

if (!ok) process.exit(1);
