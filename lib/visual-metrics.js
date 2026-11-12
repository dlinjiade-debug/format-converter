/* No DOM dependencies: require(...).compareRGBA or window.VisualMetrics.compareRGBA.
 * Pixels are alpha-composited onto white. Foreground is any RGB channel < 245.
 * SSIM: mean of per-channel, population-statistic SSIM in non-overlapping 8x8
 * tiles containing foreground in EITHER image (C1=(.01*255)^2, C2=(.03*255)^2).
 * Empty white tiles do not dilute missing-object penalties. Range [-1, 1].
 * foregroundIoU: exact non-white mask intersection/union; empty union => 1.
 * mae: full-frame RGB mean absolute error / 255, range [0, 1].
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.VisualMetrics = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function validate(pixels, length, label) {
    const tag = Object.prototype.toString.call(pixels);
    if (!pixels || (!Array.isArray(pixels) && tag !== '[object Uint8Array]' && tag !== '[object Uint8ClampedArray]')) {
      throw new TypeError(label + ' must be an RGBA byte buffer');
    }
    if (pixels.length !== length) throw new RangeError(label + ' RGBA length must equal width * height * 4');
    if (Array.isArray(pixels)) {
      for (let i = 0; i < pixels.length; i++) {
        if (!Number.isInteger(pixels[i]) || pixels[i] < 0 || pixels[i] > 255) {
          throw new TypeError(label + ' RGBA samples must be bytes');
        }
      }
    }
  }

  function compareRGBA(actual, reference, width, height) {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 ||
        !Number.isSafeInteger(width * height * 4)) throw new RangeError('Image dimensions must be positive safe integers');
    validate(actual, width * height * 4, 'actual');
    validate(reference, width * height * 4, 'reference');
    let intersection = 0, union = 0, absoluteError = 0, ssimSum = 0, activeTiles = 0;
    const c1 = 6.5025, c2 = 58.5225;
    for (let top = 0; top < height; top += 8) {
      for (let left = 0; left < width; left += 8) {
        const sumA = [0, 0, 0], sumB = [0, 0, 0];
        const squareA = [0, 0, 0], squareB = [0, 0, 0], product = [0, 0, 0];
        let count = 0, active = false;
        for (let y = top; y < Math.min(top + 8, height); y++) {
          for (let x = left; x < Math.min(left + 8, width); x++) {
            const offset = (y * width + x) * 4;
            const alphaA = actual[offset + 3] / 255, alphaB = reference[offset + 3] / 255;
            let foregroundA = false, foregroundB = false;
            for (let channel = 0; channel < 3; channel++) {
              const a = 255 + (actual[offset + channel] - 255) * alphaA;
              const b = 255 + (reference[offset + channel] - 255) * alphaB;
              if (a < 245) foregroundA = true;
              if (b < 245) foregroundB = true;
              sumA[channel] += a; sumB[channel] += b;
              squareA[channel] += a * a; squareB[channel] += b * b; product[channel] += a * b;
              absoluteError += Math.abs(a - b);
            }
            if (foregroundA && foregroundB) intersection++;
            if (foregroundA || foregroundB) { union++; active = true; }
            count++;
          }
        }
        if (!active) continue;
        for (let channel = 0; channel < 3; channel++) {
          const a = sumA[channel] / count, b = sumB[channel] / count;
          const varianceA = Math.max(0, squareA[channel] / count - a * a);
          const varianceB = Math.max(0, squareB[channel] / count - b * b);
          const covariance = product[channel] / count - a * b;
          ssimSum += ((2 * a * b + c1) * (2 * covariance + c2)) /
            ((a * a + b * b + c1) * (varianceA + varianceB + c2));
        }
        activeTiles++;
      }
    }
    return {
      ssim: activeTiles ? Math.max(-1, Math.min(1, ssimSum / (activeTiles * 3))) : 1,
      foregroundIoU: union ? intersection / union : 1,
      mae: absoluteError / (width * height * 3 * 255),
    };
  }

  return { compareRGBA };
}));
