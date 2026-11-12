import assert from 'node:assert/strict';
import { launchBrowser, repoFileUrl } from './helpers.mjs';

const browser = await launchBrowser();
const page = await browser.newPage();
await page.goto(repoFileUrl('index.html'), { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.ensure === 'function', { timeout: 15000 });

const result = await page.evaluate(() => {
  const element = document.createElement('div');
  element.textContent = '2019年5月17日';
  element.style.cssText = [
    'position:absolute',
    'left:0',
    'top:0',
    'width:320px',
    'height:80px',
    'font-size:32px',
    'background:linear-gradient(90deg,#ffd966,#9c0006)',
    'background-clip:text',
    '-webkit-background-clip:text',
    'color:transparent',
    '-webkit-text-fill-color:transparent',
  ].join(';');
  document.body.appendChild(element);
  window.pptPrepareForCapture(element);
  const style = getComputedStyle(element);
  return {
    color: style.color,
    backgroundImage: style.backgroundImage,
    backgroundClip: style.backgroundClip,
    webkitBackgroundClip: style.webkitBackgroundClip,
    webkitTextFillColor: style.webkitTextFillColor,
  };
});

await browser.close();
assert.notEqual(result.color, 'rgba(0, 0, 0, 0)');
assert.notEqual(result.webkitTextFillColor, 'transparent');
assert.equal(result.backgroundImage, 'none');
assert.notEqual(result.backgroundClip, 'text');
assert.notEqual(result.webkitBackgroundClip, 'text');
console.log(JSON.stringify(result, null, 2));
console.log('PPT capture text fallback verification passed');
