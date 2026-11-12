'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const TYPES = Object.freeze({
  '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.wasm': 'application/wasm', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
});

const CSP = [
  "default-src 'self' blob: data:",
  // The shared converter has inline scripts/styles and vendored libraries using eval/WASM.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'", "connect-src 'self' blob: data:",
  "worker-src 'self' blob:", "img-src 'self' blob: data:", "font-src 'self' blob: data:",
  "media-src 'self' blob: data:", "frame-src 'self' blob: data:",
  "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
].join('; ');

function samePath(a, b) {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

async function createAssetServer({ root }) {
  const appRoot = path.resolve(root);
  const canonicalRoot = await fs.realpath(appRoot);
  // Electron synthesizes a different inode on every lstat of an ASAR entry.
  // Check the physical archive instead; ordinary unpacked assets keep inode checks.
  // Even lstat(app.asar) is a synthetic directory in Electron's patched fs.
  // original-fs is used for this one trusted archive's metadata, never to serve files.
  const archiveFs = /\.asar$/i.test(appRoot) && process.versions.electron ? require('original-fs').promises : fs;
  const rootStat = await archiveFs.lstat(appRoot);
  const archiveStat = /\.asar$/i.test(appRoot) && rootStat.isFile() ? rootStat : null;
  const assets = new Map();

  async function add(filePath, url, type) {
    const stat = await fs.lstat(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) return;
    const expected = path.join(canonicalRoot, path.relative(appRoot, filePath));
    if (!samePath(await fs.realpath(filePath), expected)) return;
    assets.set(url, { filePath, canonical: expected, type, stat });
  }

  await add(path.join(appRoot, 'index.html'), '/index.html', 'text/html; charset=utf-8');
  if (!assets.has('/index.html')) throw new Error('The app index.html must be a regular local asset.');

  async function scan(directory, prefix) {
    const stat = await fs.lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) return;
    const expected = path.join(canonicalRoot, path.relative(appRoot, directory));
    if (!samePath(await fs.realpath(directory), expected)) return;
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (!entry.name || /[\\%\x00-\x1f]/u.test(entry.name) || entry.isSymbolicLink()) continue;
      const filePath = path.join(directory, entry.name);
      const url = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await scan(filePath, url);
      else if (entry.isFile() && TYPES[path.extname(entry.name).toLowerCase()]) {
        await add(filePath, url, TYPES[path.extname(entry.name).toLowerCase()]);
      }
    }
  }
  try { await scan(path.join(appRoot, 'lib'), '/lib'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }

  let origin;
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    const reject = status => { res.statusCode = status; res.end(); };
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      req.resume();
      return reject(405);
    }
    if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin) ||
        req.headers['sec-fetch-site'] === 'cross-site') return reject(403);
    try {
      // Validate the raw target before URL normalization can erase dot-segment traversal.
      const raw = req.url.split('?')[0];
      if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('#')) return reject(400);
      const decoded = decodeURIComponent(raw);
      if (/[\\%\x00-\x1f]/u.test(decoded) || decoded.split('/').some(p => p === '.' || p === '..')) return reject(400);
      const asset = assets.get(decoded === '/' ? '/index.html' : decoded);
      if (!asset) return reject(404);
      const stat = await fs.lstat(asset.filePath);
      const archive = archiveStat ? await archiveFs.lstat(appRoot) : null;
      const changed = archive ? archive.ino !== archiveStat.ino || archive.dev !== archiveStat.dev || archive.size !== archiveStat.size || archive.mtimeMs !== archiveStat.mtimeMs || stat.size !== asset.stat.size : stat.ino !== asset.stat.ino || stat.dev !== asset.stat.dev;
      if (stat.isSymbolicLink() || !stat.isFile() || !samePath(await fs.realpath(asset.filePath), asset.canonical) ||
          changed) return reject(404);
      // Electron's patched fs supports these virtual paths inside app.asar; no disk extraction route.
      const bytes = await fs.readFile(asset.filePath);
      if (res.destroyed) return;
      res.setHeader('Content-Type', asset.type);
      res.setHeader('Content-Length', bytes.length);
      res.statusCode = 200;
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch { if (!res.destroyed) reject(404); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 64;
  server.on('upgrade', (_req, socket) => socket.destroy());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  return {
    origin, server,
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}

module.exports = { createAssetServer };
