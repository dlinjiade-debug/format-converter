'use strict';

const fs = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { types } = require('node:util');

const KINDS = new Set(['input', 'output', 'reference']);
const MAX_BYTES = 512 * 1024 * 1024;
const SETTINGS_FILE = 'desktop-settings.json';

function validateName(name) {
  if (typeof name !== 'string' || !name || name.length > 240 || Buffer.byteLength(name) > 240 ||
      name === '.' || name === '..' || /[<>:"/\\|?*\x00-\x1f\x7f]/u.test(name) || /[.\s]$/u.test(name) ||
      /^(?:con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(name)) {
    throw new Error('Invalid filename; provide a plain filename, not a path.');
  }
  return name;
}

function validateAbsolutePath(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || /\x00/u.test(value) ||
      value.split(/[\\/]/u).some(part => part === '.' || part === '..')) {
    throw new Error('An absolute path without dot segments is required.');
  }
  return path.resolve(value);
}

function samePath(a, b) {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function sameIdentity(a, b) {
  return a.dev === b.dev && a.ino === b.ino;
}

function sameFile(a, b) {
  return sameIdentity(a, b) && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
}

// Check every ancestor too: checking only the leaf misses Windows junction escapes.
async function checkDirectory(value, expected) {
  const directory = validateAbsolutePath(value);
  const root = path.parse(directory).root;
  let current = root;
  let stat = await fs.lstat(current, { bigint: true });
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Unsafe directory.');
  for (const part of path.relative(root, directory).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    stat = await fs.lstat(current, { bigint: true });
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Symlinks and junctions are not allowed.');
  }
  if (!samePath(await fs.realpath(directory), directory) || (expected && !sameIdentity(stat, expected))) {
    throw new Error('Directory changed; select it again using the native dialog.');
  }
  return stat;
}

async function checkFile(filePath, expected) {
  const stat = await fs.lstat(filePath, { bigint: true });
  if (!stat.isFile() || stat.isSymbolicLink() || !samePath(await fs.realpath(filePath), filePath) ||
      (expected && !sameFile(stat, expected))) {
    throw new Error('File changed or is not a regular file; list the directory again.');
  }
  return stat;
}

function validateResult(result) {
  if (!result || typeof result !== 'object' || Object.keys(result).sort().join(',') !== 'bytes,name') {
    throw new Error('Expected { name, bytes: Uint8Array }.');
  }
  validateName(result.name);
  if (!types.isUint8Array(result.bytes) || types.isSharedArrayBuffer(result.bytes.buffer) || result.bytes.byteLength > MAX_BYTES) {
    throw new Error('Result bytes must be a Uint8Array of at most 512 MiB.');
  }
  return { name: result.name, bytes: new Uint8Array(result.bytes) };
}

async function createSettingsStore({ userDataPath, chooseDirectory, chooseSavePath }) {
  const dataDirectory = validateAbsolutePath(userDataPath);
  await fs.mkdir(dataDirectory, { recursive: true });
  const dataIdentity = await checkDirectory(dataDirectory);
  const settingsFile = path.join(dataDirectory, SETTINGS_FILE);
  let paths = { input: '', output: '', reference: '' };
  const directories = new Map();
  const tokens = new Map();
  let tail = Promise.resolve();

  // Serialization also prevents an in-flight listing from reissuing tokens after a directory change.
  const run = operation => {
    const result = tail.then(operation);
    tail = result.catch(() => {});
    return result;
  };
  const snapshot = () => ({ paths: { ...paths } });
  const checkKind = (kind, readable = false) => {
    if (!KINDS.has(kind) || (readable && kind === 'output')) throw new Error('Invalid directory kind.');
  };

  try {
    await checkFile(settingsFile);
    const saved = JSON.parse(await fs.readFile(settingsFile, 'utf8'));
    if (saved.version !== 1 || !saved.paths || Object.keys(paths).some(k => typeof saved.paths[k] !== 'string')) {
      throw new Error('Invalid desktop settings.');
    }
    for (const kind of KINDS) {
      if (!saved.paths[kind]) continue;
      paths[kind] = validateAbsolutePath(saved.paths[kind]);
      try { directories.set(kind, await checkDirectory(paths[kind])); }
      catch { /* Keep the displayed preference, but require reauthorization before accessing it. */ }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  async function persist(nextPaths) {
    await checkDirectory(dataDirectory, dataIdentity);
    try { await checkFile(settingsFile); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const temporary = path.join(dataDirectory, `.settings-${randomBytes(16).toString('hex')}.tmp`);
    const handle = await fs.open(temporary, 'wx', 0o600);
    try {
      await handle.writeFile(`${JSON.stringify({ version: 1, paths: nextPaths }, null, 2)}\n`, 'utf8');
      await handle.sync();
      await handle.close();
      await checkDirectory(dataDirectory, dataIdentity);
      await fs.rename(temporary, settingsFile);
    } finally {
      await handle.close().catch(() => {});
      await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
  }

  async function authorizedDirectory(kind) {
    const identity = directories.get(kind);
    if (!paths[kind] || !identity) throw new Error('Select this directory again using the native dialog.');
    await checkDirectory(paths[kind], identity);
    return { directory: paths[kind], identity };
  }

  async function writeExclusive(directory, directoryIdentity, name, bytes, suffixes) {
    const extension = path.extname(name);
    const base = name.slice(0, name.length - extension.length);
    for (let attempt = 0; attempt < 10000; attempt += 1) {
      const candidate = attempt ? `${base} (${attempt})${extension}` : name;
      validateName(candidate);
      await checkDirectory(directory, directoryIdentity);
      const destination = path.join(directory, candidate);
      let handle;
      try { handle = await fs.open(destination, 'wx', 0o600); }
      catch (error) {
        if (error.code === 'EEXIST' && suffixes) continue;
        if (error.code === 'EEXIST') throw new Error('Destination already exists. Choose a new filename; no file was overwritten.');
        throw error;
      }
      let created;
      try {
        created = await handle.stat({ bigint: true });
        if (!created.isFile()) throw new Error('Destination must be a regular file.');
        await checkDirectory(directory, directoryIdentity);
        await handle.writeFile(bytes);
        await handle.sync();
        await checkDirectory(directory, directoryIdentity);
        const final = await fs.lstat(destination, { bigint: true });
        if (final.isSymbolicLink() || !sameIdentity(created, final)) throw new Error('Destination changed during save.');
        return { path: destination };
      } catch (error) {
        await handle.close();
        const current = await fs.lstat(destination, { bigint: true }).catch(() => null);
        if (created && current && sameIdentity(created, current) && !current.isSymbolicLink()) await fs.unlink(destination);
        throw error;
      } finally {
        await handle.close().catch(() => {});
      }
    }
    throw new Error('Too many filename collisions. Choose another filename.');
  }

  return Object.freeze({
    getSettings: () => run(async () => snapshot()),

    chooseDirectory: kind => run(async () => {
      checkKind(kind);
      const selection = await chooseDirectory(kind, paths[kind]);
      if (selection === null || selection === undefined) return snapshot();
      const directory = validateAbsolutePath(selection);
      const identity = await checkDirectory(directory);
      const changed = !samePath(paths[kind], directory) || !directories.has(kind) || !sameIdentity(directories.get(kind), identity);
      const next = { ...paths, [kind]: directory };
      await persist(next);
      paths = next;
      directories.set(kind, identity);
      if (changed) tokens.clear();
      return snapshot();
    }),

    listFiles: kind => run(async () => {
      checkKind(kind, true);
      if (!paths[kind]) return [];
      const { directory, identity } = await authorizedDirectory(kind);
      // Re-listing revokes the old generation for this kind and bounds the token map.
      for (const [id, record] of tokens) if (record.kind === kind) tokens.delete(id);
      const listed = [];
      const pending = [];
      for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        if (!entry.isFile() || entry.isSymbolicLink()) continue;
        try {
          validateName(entry.name);
          const filePath = path.join(directory, entry.name);
          const stat = await checkFile(filePath);
          if (stat.size > BigInt(Number.MAX_SAFE_INTEGER)) continue;
          const id = randomBytes(24).toString('hex');
          pending.push([id, { kind, directory, directoryIdentity: identity, filePath, name: entry.name, stat }]);
          listed.push({ id, name: entry.name, size: Number(stat.size) });
        } catch {
          // Unreadable, disappearing, or unsafe entries do not grant a capability.
        }
      }
      await checkDirectory(directory, identity);
      for (const [id, record] of pending) tokens.set(id, record);
      return listed.sort((a, b) => a.name.localeCompare(b.name));
    }),

    readFile: id => run(async () => {
      const record = typeof id === 'string' && tokens.get(id);
      if (!record) throw new Error('Unknown or stale file ID. List the directory again.');
      const { directory, directoryIdentity, filePath, stat } = record;
      await checkDirectory(directory, directoryIdentity);
      await checkFile(filePath, stat);
      if (stat.size > BigInt(MAX_BYTES)) throw new Error('Files larger than 512 MiB cannot be read through the desktop bridge.');
      const handle = await fs.open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      try {
        const opened = await handle.stat({ bigint: true });
        if (!opened.isFile() || !sameFile(opened, stat)) throw new Error('File changed. List the directory again.');
        await checkDirectory(directory, directoryIdentity);
        await checkFile(filePath, stat);
        const bytes = await handle.readFile();
        if (!sameFile(await handle.stat({ bigint: true }), stat)) throw new Error('File changed while reading.');
        await checkDirectory(directory, directoryIdentity);
        await checkFile(filePath, stat);
        return { name: record.name, bytes: new Uint8Array(bytes) };
      } finally { await handle.close(); }
    }),

    saveResult: result => run(async () => {
      const { name, bytes } = validateResult(result);
      if (paths.output) {
        const { directory, identity } = await authorizedDirectory('output');
        return writeExclusive(directory, identity, name, bytes, true);
      }
      const selection = await chooseSavePath(name);
      if (selection === null || selection === undefined) return { path: '', cancelled: true };
      const destination = validateAbsolutePath(selection);
      const filename = validateName(path.basename(destination));
      const directory = path.dirname(destination);
      return writeExclusive(directory, await checkDirectory(directory), filename, bytes, false);
    }),
  });
}

module.exports = { createSettingsStore };
