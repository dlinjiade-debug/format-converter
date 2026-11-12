'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { createSettingsStore } = require('../desktop/settings-store.cjs');
const { createAssetServer } = require('../desktop/asset-server.cjs');
const { isAllowedRequest, assertTrustedSender, installIpcHandlers } = require('../desktop/security.cjs');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'format-converter-desktop-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dirs = Object.fromEntries(['userData', 'input', 'output', 'reference', 'other'].map(k => [k, path.join(root, k)]));
  await Promise.all(Object.values(dirs).map(p => fs.mkdir(p)));
  let directory = null;
  let destination = null;
  const open = () => createSettingsStore({
    userDataPath: dirs.userData,
    chooseDirectory: async () => directory,
    chooseSavePath: async () => destination,
  });
  return { root, dirs, open, select: p => { directory = p; }, saveTo: p => { destination = p; } };
}

const payload = (name = 'report.txt') => ({ name, bytes: new Uint8Array([65, 0, 255]) });

test('directory settings persist atomically, return independent snapshots, and cancellation preserves them', async t => {
  const f = await fixture(t);
  const store = await f.open();
  assert.deepEqual(await store.getSettings(), { paths: { input: '', output: '', reference: '' } });
  for (const kind of ['input', 'output', 'reference']) {
    f.select(f.dirs[kind]);
    await store.chooseDirectory(kind);
  }
  const expected = { paths: { input: f.dirs.input, output: f.dirs.output, reference: f.dirs.reference } };
  const snapshot = await store.getSettings();
  snapshot.paths.input = 'not-authorized';
  f.select(null);
  assert.deepEqual(await store.chooseDirectory('input'), expected);
  assert.deepEqual(await (await f.open()).getSettings(), expected);
  assert.deepEqual(await fs.readdir(f.dirs.userData), ['desktop-settings.json']);
  const persisted = JSON.parse(await fs.readFile(path.join(f.dirs.userData, 'desktop-settings.json'), 'utf8'));
  assert.deepEqual(persisted, { version: 1, ...expected });
});

test('cancelling the initial directory or save dialog creates no settings or result file', async t => {
  const f = await fixture(t);
  const store = await f.open();
  assert.deepEqual(await store.chooseDirectory('output'), { paths: { input: '', output: '', reference: '' } });
  assert.deepEqual(await store.saveResult(payload()), { path: '', cancelled: true });
  assert.deepEqual(await fs.readdir(f.dirs.userData), []);
  assert.deepEqual(await fs.readdir(f.dirs.output), []);
});

test('invalid directory kinds, relative paths, dot segments, and ordinary files do not authorize access', async t => {
  const f = await fixture(t);
  const store = await f.open();
  for (const kind of ['__proto__', 'constructor', '../input', '', null, {}]) {
    await assert.rejects(store.chooseDirectory(kind));
    await assert.rejects(store.listFiles(kind));
  }
  await fs.writeFile(path.join(f.root, 'ordinary.txt'), 'no');
  for (const p of ['relative', path.join(f.root, 'ordinary.txt'), `${f.dirs.input}${path.sep}..${path.sep}other`]) {
    f.select(p);
    await assert.rejects(store.chooseDirectory('input'));
  }
  assert.equal((await store.getSettings()).paths.input, '');
  await assert.rejects(store.listFiles('output'));
});

test('corrupt settings fail closed and missing saved directories stay unauthorized until selected again', async t => {
  const f = await fixture(t);
  const settingsFile = path.join(f.dirs.userData, 'desktop-settings.json');
  await fs.writeFile(settingsFile, '{broken JSON');
  await assert.rejects(f.open());
  assert.equal(await fs.readFile(settingsFile, 'utf8'), '{broken JSON');
  await fs.writeFile(settingsFile, JSON.stringify({ version: 1, paths: { input: f.dirs.input, output: '', reference: '' } }));
  await fs.rename(f.dirs.input, path.join(f.root, 'away'));
  const store = await f.open();
  assert.equal((await store.getSettings()).paths.input, f.dirs.input);
  await assert.rejects(store.listFiles('input'));
  await fs.mkdir(f.dirs.input);
  await assert.rejects(store.listFiles('input'));
  f.select(f.dirs.input);
  await store.chooseDirectory('input');
  assert.deepEqual(await store.listFiles('input'), []);
});

test('a failed atomic settings replacement leaves previous authorization and file IDs intact', async t => {
  const f = await fixture(t);
  const store = await f.open();
  f.select(f.dirs.input);
  await store.chooseDirectory('input');
  await fs.writeFile(path.join(f.dirs.input, 'keep.txt'), 'keep');
  const [file] = await store.listFiles('input');
  const settingsFile = path.join(f.dirs.userData, 'desktop-settings.json');
  await fs.unlink(settingsFile);
  await fs.mkdir(settingsFile);
  f.select(f.dirs.other);
  await assert.rejects(store.chooseDirectory('input'));
  assert.equal((await store.getSettings()).paths.input, f.dirs.input);
  assert.equal((await store.readFile(file.id)).name, 'keep.txt');
  assert.deepEqual(await fs.readdir(f.dirs.userData), ['desktop-settings.json']);
});

test('only direct regular files are listed, with opaque IDs and Uint8Array reads', async t => {
  const f = await fixture(t);
  const store = await f.open();
  await fs.writeFile(path.join(f.dirs.input, 'sample.bin'), new Uint8Array([1, 0, 254]));
  await fs.mkdir(path.join(f.dirs.input, 'nested'));
  await fs.writeFile(path.join(f.dirs.input, 'nested', 'hidden.txt'), 'hidden');
  assert.deepEqual(await store.listFiles('input'), []);
  f.select(f.dirs.input);
  await store.chooseDirectory('input');
  const files = await store.listFiles('input');
  assert.equal(files.length, 1);
  assert.deepEqual(Object.keys(files[0]).sort(), ['id', 'name', 'size']);
  assert.equal(files[0].name, 'sample.bin');
  assert.equal(files[0].size, 3);
  assert.ok(!files[0].id.includes('sample') && !files[0].id.includes(f.root));
  const read = await store.readFile(files[0].id);
  assert.equal(read.name, 'sample.bin');
  assert.ok(read.bytes instanceof Uint8Array);
  assert.deepEqual([...read.bytes], [1, 0, 254]);
  f.select(null);
  await store.chooseDirectory('input');
  assert.equal((await store.readFile(files[0].id)).name, 'sample.bin');
});

test('unknown, path-shaped, cross-store, and directory-change-revoked IDs cannot read files', async t => {
  const f = await fixture(t);
  const store = await f.open();
  await fs.writeFile(path.join(f.dirs.input, 'in.txt'), 'input');
  await fs.writeFile(path.join(f.dirs.reference, 'ref.txt'), 'reference');
  f.select(f.dirs.input);
  await store.chooseDirectory('input');
  f.select(f.dirs.reference);
  await store.chooseDirectory('reference');
  const [input] = await store.listFiles('input');
  const [ref] = await store.listFiles('reference');
  assert.equal((await store.readFile(ref.id)).name, 'ref.txt');
  for (const id of ['unknown', '../in.txt', path.join(f.dirs.input, 'in.txt'), null, {}, '']) {
    await assert.rejects(store.readFile(id));
  }
  await assert.rejects((await f.open()).readFile(input.id));
  f.select(f.dirs.other);
  await store.chooseDirectory('input');
  await assert.rejects(store.readFile(input.id));
  await assert.rejects(store.readFile(ref.id));
});

test('changed or replaced listed files require a fresh listing', async t => {
  const f = await fixture(t);
  const store = await f.open();
  const filePath = path.join(f.dirs.input, 'mutable.txt');
  await fs.writeFile(filePath, 'before');
  f.select(f.dirs.input);
  await store.chooseDirectory('input');
  const [first] = await store.listFiles('input');
  await fs.writeFile(filePath, 'after-longer');
  await assert.rejects(store.readFile(first.id));
  const [second] = await store.listFiles('input');
  await fs.unlink(filePath);
  await fs.writeFile(filePath, 'replacement');
  await assert.rejects(store.readFile(second.id));
  const [third] = await store.listFiles('input');
  assert.equal(new TextDecoder().decode((await store.readFile(third.id)).bytes), 'replacement');
});

test('junctions/symlinks cannot authorize directories, escape listings, or replace chosen roots', async t => {
  const f = await fixture(t);
  const store = await f.open();
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  await fs.writeFile(path.join(f.dirs.other, 'secret.txt'), 'secret');
  const linkedRoot = path.join(f.root, 'linked-root');
  await fs.symlink(f.dirs.other, linkedRoot, linkType);
  f.select(linkedRoot);
  await assert.rejects(store.chooseDirectory('input'));
  f.select(path.join(linkedRoot, 'child'));
  await fs.mkdir(path.join(f.dirs.other, 'child'));
  await assert.rejects(store.chooseDirectory('output'));
  await fs.symlink(f.dirs.other, path.join(f.dirs.input, 'escape'), linkType);
  f.select(f.dirs.input);
  await store.chooseDirectory('input');
  assert.deepEqual(await store.listFiles('input'), []);
  await fs.rename(f.dirs.input, path.join(f.root, 'old-input'));
  await fs.symlink(f.dirs.other, f.dirs.input, linkType);
  await assert.rejects(store.listFiles('input'));
});

test('a file symlink is never listed or followed, including replacement after listing', async t => {
  const f = await fixture(t);
  const store = await f.open();
  const secret = path.join(f.dirs.other, 'secret.txt');
  await fs.writeFile(secret, 'secret');
  const link = path.join(f.dirs.input, 'link.txt');
  try { await fs.symlink(secret, link, 'file'); }
  catch (error) {
    if (error.code === 'EPERM') { t.skip('Windows file symlinks need Developer Mode/admin; junction escape test still runs'); return; }
    throw error;
  }
  f.select(f.dirs.input);
  await store.chooseDirectory('input');
  assert.deepEqual(await store.listFiles('input'), []);
  await fs.unlink(link);
  await fs.writeFile(link, 'safe');
  const [file] = await store.listFiles('input');
  await fs.unlink(link);
  await fs.symlink(secret, link, 'file');
  await assert.rejects(store.readFile(file.id));
});

test('save rejects traversal, Windows special names/ADS, control characters, and non-Uint8Array payloads', async t => {
  const f = await fixture(t);
  const store = await f.open();
  f.select(f.dirs.output);
  await store.chooseDirectory('output');
  const names = ['', '.', '..', '../escape.txt', '..\\escape.txt', '/abs', 'C:\\abs', 'a/b', 'a\\b',
    'file:stream', 'CON', 'con.txt', 'NUL.pdf', 'COM1.log', 'LPT9', 'CONOUT$', 'bad?.txt', 'bad\0.txt', 'bad\n.txt', 'trailing.', 'trailing ', 'x'.repeat(256)];
  for (const name of names) await assert.rejects(store.saveResult(payload(name)), `accepted unsafe name ${JSON.stringify(name)}`);
  for (const bytes of [null, [], [1, 2], 'abc', new ArrayBuffer(2), new Uint16Array([1]), { 0: 1, length: 1 }]) {
    await assert.rejects(store.saveResult({ name: 'safe.txt', bytes }));
  }
  for (const value of [null, {}, { ...payload(), path: f.dirs.other }]) await assert.rejects(store.saveResult(value));
  assert.deepEqual(await fs.readdir(f.dirs.output), []);
});

test('configured output uses exclusive creation and suffixes, preserving existing bytes under concurrent saves', async t => {
  const f = await fixture(t);
  const store = await f.open();
  f.select(f.dirs.output);
  await store.chooseDirectory('output');
  await fs.writeFile(path.join(f.dirs.output, 'report.txt'), 'original');
  const results = await Promise.all([store.saveResult(payload()), store.saveResult(payload())]);
  assert.deepEqual(results.map(r => path.basename(r.path)), ['report (1).txt', 'report (2).txt']);
  assert.equal(await fs.readFile(path.join(f.dirs.output, 'report.txt'), 'utf8'), 'original');
  for (const result of results) assert.deepEqual([...await fs.readFile(result.path)], [65, 0, 255]);
  const empty = await store.saveResult({ name: '空文件.bin', bytes: new Uint8Array() });
  assert.equal((await fs.stat(empty.path)).size, 0);
  const otherStore = await f.open();
  const independent = await Promise.all([store.saveResult(payload()), otherStore.saveResult(payload())]);
  assert.deepEqual(independent.map(r => path.basename(r.path)).sort(), ['report (3).txt', 'report (4).txt']);
});

test('save dialog authorizes just one safe destination and never overwrites even after confirmation', async t => {
  const f = await fixture(t);
  const store = await f.open();
  const destination = path.join(f.dirs.other, 'explicit.txt');
  f.saveTo(destination);
  assert.deepEqual(await store.saveResult(payload()), { path: destination });
  await assert.rejects(store.saveResult(payload()));
  assert.deepEqual([...await fs.readFile(destination)], [65, 0, 255]);
  assert.equal((await store.getSettings()).paths.output, '');
  f.saveTo(`${f.dirs.other}${path.sep}..${path.sep}output${path.sep}escape.txt`);
  await assert.rejects(store.saveResult(payload()));
  const link = path.join(f.root, 'save-junction');
  await fs.symlink(f.dirs.output, link, process.platform === 'win32' ? 'junction' : 'dir');
  f.saveTo(path.join(link, 'escape.txt'));
  await assert.rejects(store.saveResult(payload()));
  assert.deepEqual(await fs.readdir(f.dirs.output), []);
});

test('a configured output root replaced by a junction is rejected before writing', async t => {
  const f = await fixture(t);
  const store = await f.open();
  f.select(f.dirs.output);
  await store.chooseDirectory('output');
  await fs.rename(f.dirs.output, path.join(f.root, 'old-output'));
  await fs.symlink(f.dirs.other, f.dirs.output, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(store.saveResult(payload()));
  assert.deepEqual(await fs.readdir(f.dirs.other), []);
});

function request(origin, target, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = { ...options.headers };
    if (options.body !== undefined) headers['Content-Length'] = Buffer.byteLength(options.body);
    const req = http.request(`${origin}/`, { ...options, headers, path: target }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', error => reject(new Error(`HTTP fixture request failed: ${options.method || 'GET'} ${target}`, { cause: error })));
    req.end(options.body);
  });
}

async function assetFixture(t) {
  const f = await fixture(t);
  await fs.mkdir(path.join(f.root, 'lib', 'nested'), { recursive: true });
  await fs.writeFile(path.join(f.root, 'index.html'), '<!doctype html><h1>converter</h1>');
  await fs.writeFile(path.join(f.root, 'lib', 'nested', 'worker.js'), 'self.onmessage = () => {};');
  await fs.writeFile(path.join(f.root, 'lib', 'core.wasm'), new Uint8Array([0, 97, 115, 109]));
  await fs.writeFile(path.join(f.root, 'private.txt'), 'private');
  const server = await createAssetServer({ root: f.root });
  t.after(() => server.close());
  return { ...f, ...server };
}

test('asset server binds only ephemeral IPv4 loopback and serves GET/HEAD with WASM/isolation headers', async t => {
  const f = await assetFixture(t);
  assert.match(f.origin, /^http:\/\/127\.0\.0\.1:[1-9]\d*$/);
  assert.equal(f.server.address().address, '127.0.0.1');
  const index = await request(f.origin, '/');
  assert.equal(index.status, 200);
  assert.match(index.body.toString(), /converter/);
  assert.equal(index.headers['cross-origin-opener-policy'], 'same-origin');
  assert.equal(index.headers['cross-origin-embedder-policy'], 'require-corp');
  assert.equal(index.headers['x-content-type-options'], 'nosniff');
  assert.match(index.headers['content-security-policy'], /connect-src/);
  const head = await request(f.origin, '/index.html', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(Number(head.headers['content-length']), index.body.length);
  const js = await request(f.origin, '/lib/nested/worker.js?v=1');
  assert.equal(js.status, 200);
  assert.match(js.headers['content-type'], /javascript/);
  const wasm = await request(f.origin, '/lib/core.wasm');
  assert.equal(wasm.headers['content-type'], 'application/wasm');
  assert.deepEqual([...wasm.body], [0, 97, 115, 109]);
});

test('asset server denies uploads, arbitrary paths, encoded traversal, hostile Host/Origin, and directory indexes', async t => {
  const f = await assetFixture(t);
  for (const target of ['/private.txt', '/package.json', '/desktop/main.cjs', '/api/read?path=private.txt', '/lib/', '/lib/nested/',
    '/../private.txt', '/lib/../../private.txt', '/lib/%2e%2e/private.txt', '/lib/%252e%252e/private.txt',
    '/lib%5cnested%5cworker.js', '/lib/nested/worker.js%00', '//lib/nested/worker.js', '/%ZZ']) {
    assert.notEqual((await request(f.origin, target)).status, 200, target);
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']) {
    const response = await request(f.origin, '/', { method, body: 'not-an-upload' });
    assert.equal(response.status, 405);
    assert.equal(response.headers.allow, 'GET, HEAD');
  }
  assert.equal((await request(f.origin, '/', { headers: { Host: 'attacker.example' } })).status, 403);
  assert.equal((await request(f.origin, '/', { headers: { Origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await request(f.origin, '/', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
});

test('asset manifest excludes symlink/junction assets and detects post-start replacement', async t => {
  const f = await fixture(t);
  await fs.mkdir(path.join(f.root, 'lib'));
  await fs.writeFile(path.join(f.root, 'index.html'), 'index');
  await fs.writeFile(path.join(f.dirs.other, 'secret.js'), 'secret');
  await fs.writeFile(path.join(f.root, 'lib', 'same.js'), 'safe');
  await fs.writeFile(path.join(f.dirs.other, 'same.js'), 'secret');
  const target = path.join(f.root, 'lib', 'linked');
  await fs.symlink(f.dirs.other, target, process.platform === 'win32' ? 'junction' : 'dir');
  const service = await createAssetServer({ root: f.root });
  t.after(() => service.close());
  assert.equal((await request(service.origin, '/lib/linked/secret.js')).status, 404);
  await fs.rename(path.join(f.root, 'lib'), path.join(f.root, 'old-lib'));
  await fs.symlink(f.dirs.other, path.join(f.root, 'lib'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.notEqual((await request(service.origin, '/lib/same.js')).status, 200);
});

test('network policy permits only own exact HTTP origin plus blob/data, never remote/file/ws', () => {
  const origin = 'http://127.0.0.1:43210';
  for (const url of [`${origin}/`, `${origin}/lib/a.js`, `blob:${origin}/id`, 'data:text/plain,local']) {
    assert.equal(isAllowedRequest(url, origin), true, url);
  }
  for (const url of ['https://example.com/', 'http://localhost:43210/', 'http://127.0.0.1:43211/',
    'http://127.0.0.1:43210.evil.example/', 'file:///C:/secret', 'ws://127.0.0.1:43210/',
    'ftp://127.0.0.1:43210/', 'javascript:alert(1)', `http://user:pass@127.0.0.1:43210/`, 'invalid']) {
    assert.equal(isAllowedRequest(url, origin), false, url);
  }
});

function senderFixture() {
  const origin = 'http://127.0.0.1:43210';
  const mainFrame = { url: `${origin}/index.html`, parent: null };
  const webContents = { mainFrame, isDestroyed: () => false };
  const window = { webContents, isDestroyed: () => false };
  return { origin, window, event: { sender: webContents, senderFrame: mainFrame } };
}

test('IPC sender authorization requires this live window and its exact trusted main frame', () => {
  const f = senderFixture();
  assert.doesNotThrow(() => assertTrustedSender(f.event, f.window, f.origin));
  for (const event of [{ ...f.event, sender: {} }, { ...f.event, senderFrame: null },
    { ...f.event, senderFrame: { url: `${f.origin}/`, parent: f.event.senderFrame } }]) {
    assert.throws(() => assertTrustedSender(event, f.window, f.origin));
  }
  for (const url of ['https://evil.example/', 'file:///C:/index.html', 'http://127.0.0.1:1234/']) {
    f.event.senderFrame.url = url;
    assert.throws(() => assertTrustedSender(f.event, f.window, f.origin));
  }
  assert.throws(() => assertTrustedSender(f.event, null, f.origin));
  f.event.senderFrame.url = `${f.origin}/`;
  f.window.isDestroyed = () => true;
  assert.throws(() => assertTrustedSender(f.event, f.window, f.origin));
  f.window.isDestroyed = () => false;
  f.window.webContents.isDestroyed = () => true;
  assert.throws(() => assertTrustedSender(f.event, f.window, f.origin));
});

test('IPC dispatch rejects untrusted senders and unexpected arguments before any filesystem change', async t => {
  const f = await fixture(t);
  const store = await f.open();
  const trusted = senderFixture();
  const handlers = new Map();
  const ipcMain = { handle: (name, fn) => handlers.set(name, fn), removeHandler: name => handlers.delete(name) };
  const dispose = installIpcHandlers({ ipcMain, getWindow: () => trusted.window, origin: trusted.origin, store });
  assert.equal(handlers.size, 5);
  assert.deepEqual(await handlers.get('desktop:get-settings')(trusted.event), { paths: { input: '', output: '', reference: '' } });
  f.select(f.dirs.input);
  await assert.rejects(handlers.get('desktop:choose-directory')({ ...trusted.event, sender: {} }, 'input'));
  await assert.rejects(handlers.get('desktop:choose-directory')(trusted.event, 'input', f.dirs.other));
  await assert.rejects(handlers.get('desktop:get-settings')(trusted.event, 'extra'));
  assert.deepEqual(await fs.readdir(f.dirs.userData), []);
  dispose();
  assert.equal(handlers.size, 0);
});

test('preload exposes a frozen narrow API with typed byte results, never IPC or Node primitives', async () => {
  const source = await fs.readFile(path.join(__dirname, '..', 'desktop', 'preload.cjs'), 'utf8');
  let exposed;
  const calls = [];
  const context = vm.createContext({
    process: { isMainFrame: true },
    Uint8Array,
    require(name) {
      assert.equal(name, 'electron');
      return {
        contextBridge: { exposeInMainWorld: (key, value) => { assert.equal(key, 'desktopBridge'); exposed = value; } },
        ipcRenderer: { invoke: async (...args) => {
          calls.push(args);
          return args[0] === 'desktop:read-file' ? { name: 'a.bin', bytes: new Uint8Array([1, 2]) } : { paths: {} };
        } },
      };
    },
  });
  vm.runInContext(source, context);
  assert.equal(Object.isFrozen(exposed), true);
  assert.deepEqual(Object.keys(exposed).sort(), ['chooseDirectory', 'getSettings', 'listFiles', 'readFile', 'saveResult']);
  await exposed.getSettings();
  await exposed.chooseDirectory('input');
  await exposed.listFiles('reference');
  const result = await exposed.readFile('opaque-token');
  await exposed.saveResult(payload());
  assert.ok(result.bytes instanceof Uint8Array);
  assert.deepEqual(calls.map(c => c[0]), ['desktop:get-settings', 'desktop:choose-directory', 'desktop:list-files', 'desktop:read-file', 'desktop:save-result']);
  assert.deepEqual(calls[1], ['desktop:choose-directory', 'input']);
  assert.deepEqual(calls[3], ['desktop:read-file', 'opaque-token']);
  exposed = undefined;
  context.process.isMainFrame = false;
  vm.runInContext(`(() => { ${source}\n })()`, context);
  assert.equal(exposed, undefined);
});

test('main shell installs sandboxed hidden window, private loopback network policy and native-dialog-only IPC', async t => {
  const { startDesktop } = require('../desktop/main.cjs');
  const f = await fixture(t);
  const app = new EventEmitter();
  let userData = f.dirs.other;
  app.setPath = (kind, value) => { assert.equal(kind, 'userData'); userData = value; };
  app.getPath = kind => { assert.equal(kind, 'userData'); return userData; };
  app.enableSandbox = () => {};
  app.whenReady = async () => {};
  app.quit = () => {};
  const ipc = new Map();
  const nativeSession = new EventEmitter();
  let requestPolicy;
  nativeSession.webRequest = { onBeforeRequest: (_filter, callback) => { requestPolicy = callback; } };
  nativeSession.setProxy = async () => {};
  nativeSession.setPermissionRequestHandler = callback => { nativeSession.permissionRequest = callback; };
  nativeSession.setPermissionCheckHandler = callback => { nativeSession.permissionCheck = callback; };
  nativeSession.setDevicePermissionHandler = callback => { nativeSession.devicePermission = callback; };
  class FakeWindow extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.shown = false;
      this.webContents = new EventEmitter();
      this.webContents.isDestroyed = () => false;
      this.webContents.mainFrame = { url: '', parent: null };
      this.webContents.setWindowOpenHandler = callback => { this.openPolicy = callback; };
    }
    removeMenu() {}
    isDestroyed() { return false; }
    show() { this.shown = true; }
    async loadURL(url) { this.webContents.mainFrame.url = url; this.emit('ready-to-show'); }
  }
  const startup = startDesktop({
    app, BrowserWindow: FakeWindow,
    session: { fromPartition: name => { assert.ok(!name.startsWith('persist:')); return nativeSession; } },
    ipcMain: { handle: (name, fn) => ipc.set(name, fn), removeHandler: name => ipc.delete(name) },
    dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }), showSaveDialog: async () => ({ canceled: true }) },
  }, { FORMAT_CONVERTER_TEST_DATA: f.dirs.userData, FORMAT_CONVERTER_TEST_HIDDEN: '1' });
  t.after(async () => (await startup).close());
  // Electron can become ready on the next event-loop turn: the override must already be set.
  assert.equal(userData, f.dirs.userData);
  const runtime = await startup;
  const { window, origin } = runtime;
  assert.equal(window.options.show, false);
  assert.equal(window.shown, false);
  assert.equal(window.options.webPreferences.contextIsolation, true);
  assert.equal(window.options.webPreferences.nodeIntegration, false);
  assert.equal(window.options.webPreferences.sandbox, true);
  assert.equal(window.options.webPreferences.webSecurity, true);
  assert.equal(window.options.webPreferences.webviewTag, false);
  assert.equal(window.webContents.mainFrame.url, `${origin}/`);
  for (const [url, cancelled] of [[`${origin}/lib/core.wasm`, false], ['https://example.com/', true], ['file:///C:/secret', true]]) {
    let decision;
    requestPolicy({ url }, result => { decision = result.cancel; });
    assert.equal(decision, cancelled);
  }
  assert.deepEqual(window.openPolicy({ url: 'https://example.com/' }), { action: 'deny' });
  let denied = false;
  window.webContents.emit('will-frame-navigate', { url: 'https://example.com/', isMainFrame: true, preventDefault: () => { denied = true; } });
  assert.equal(denied, true);
  assert.equal(nativeSession.permissionCheck(), false);
  assert.equal(nativeSession.devicePermission(), false);
  const event = { sender: window.webContents, senderFrame: window.webContents.mainFrame };
  assert.deepEqual(await ipc.get('desktop:choose-directory')(event, 'input'), { paths: { input: '', output: '', reference: '' } });
  assert.deepEqual(await ipc.get('desktop:save-result')(event, payload()), { path: '', cancelled: true });
  assert.deepEqual(await fs.readdir(f.dirs.userData), []);
});
