const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const metricsPath = path.resolve(__dirname, '../lib/visual-metrics.js');
const compare = (...args) => require(metricsPath).compareRGBA(...args);

function frame(width = 640, height = 400) {
  return new Uint8ClampedArray(width * height * 4).fill(255);
}
function rectangle(pixels, width, x, y, w, h, color = [20, 180, 70, 255]) {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) pixels.set(color, (row * width + col) * 4);
  }
  return pixels;
}

test('identical non-white frames pass both default gates', () => {
  const pixels = rectangle(frame(), 640, 30, 20, 80, 60);
  assert.deepEqual(compare(pixels, pixels.slice(), 640, 400), { ssim: 1, foregroundIoU: 1, mae: 0 });
});

test('a missing small green rectangle fails despite an overwhelmingly white page', () => {
  const reference = rectangle(frame(), 640, 50, 50, 32, 24);
  const result = compare(frame(), reference, 640, 400);
  assert.equal(result.foregroundIoU, 0);
  assert.ok(result.ssim < .93);
  assert.ok(result.mae > 0);
});

test('displacing a shape fails, including when foreground pixel counts are unchanged', () => {
  const reference = rectangle(frame(), 640, 20, 20, 60, 40);
  const actual = rectangle(frame(), 640, 150, 120, 60, 40);
  const result = compare(actual, reference, 640, 400);
  assert.equal(result.foregroundIoU, 0);
  assert.ok(result.ssim < .93);
});

test('foreground IoU uses intersection over union, not total page area', () => {
  const reference = rectangle(frame(20, 10), 20, 0, 0, 10, 10);
  const actual = rectangle(frame(20, 10), 20, 5, 0, 10, 10);
  assert.ok(Math.abs(compare(actual, reference, 20, 10).foregroundIoU - 1 / 3) < 1e-12);
});

test('same shape with changed color is penalized by RGB SSIM and MAE', () => {
  const actual = rectangle(frame(), 640, 20, 20, 60, 40, [200, 20, 20, 255]);
  const reference = rectangle(frame(), 640, 20, 20, 60, 40);
  const result = compare(actual, reference, 640, 400);
  assert.equal(result.foregroundIoU, 1);
  assert.ok(result.ssim < .93);
  assert.ok(result.mae > 0 && result.mae <= 1);
});

test('all-white and fully transparent frames have a defined perfect comparison', () => {
  assert.deepEqual(compare(frame(7, 3), frame(7, 3), 7, 3), { ssim: 1, foregroundIoU: 1, mae: 0 });
  const transparent = new Uint8ClampedArray(7 * 3 * 4);
  assert.deepEqual(compare(transparent, frame(7, 3), 7, 3), { ssim: 1, foregroundIoU: 1, mae: 0 });
});

test('rejects invalid dimensions, mismatched RGBA lengths, and non-byte samples', () => {
  for (const [width, height] of [[0, 2], [-1, 2], [2.5, 2], [2, NaN], [Infinity, 2]]) {
    assert.throws(() => compare(frame(2, 2), frame(2, 2), width, height), /dimension|integer/i);
  }
  assert.throws(() => compare(frame(2, 2), frame(3, 2), 2, 2), /length|RGBA/i);
  assert.throws(() => compare(null, frame(2, 2), 2, 2), /RGBA|buffer/i);
  assert.throws(() => compare([NaN, 0, 0, 255], [0, 0, 0, 255], 1, 1), /byte|sample|RGBA/i);
});

test('UMD installs the same working API in a browser without CommonJS', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(metricsPath, 'utf8'), context);
  const result = context.VisualMetrics.compareRGBA(frame(1, 1), frame(1, 1), 1, 1);
  assert.equal(result.ssim, 1);
  assert.equal(result.foregroundIoU, 1);
  assert.equal(result.mae, 0);
});
