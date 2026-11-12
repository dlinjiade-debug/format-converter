'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createSettingsStore } = require('./settings-store.cjs');
const { createAssetServer } = require('./asset-server.cjs');
const { isAllowedRequest, installIpcHandlers } = require('./security.cjs');

async function startDesktop(electron, environment = process.env) {
  const { app, BrowserWindow, session, ipcMain, dialog } = electron;
  if (environment.FORMAT_CONVERTER_TEST_DATA) {
    const directory = environment.FORMAT_CONVERTER_TEST_DATA;
    if (!path.isAbsolute(directory)) throw new Error('FORMAT_CONVERTER_TEST_DATA must be absolute.');
    // This must precede the first await so Electron cannot initialize its session in the default profile.
    fs.mkdirSync(directory, { recursive: true });
    app.setPath('userData', directory);
  }
  app.enableSandbox();
  await app.whenReady();

  // __dirname remains inside app.asar when packaged; Electron's fs reads the archive directly.
  const assets = await createAssetServer({ root: path.join(__dirname, '..') });
  const { origin } = assets;
  let window;
  let disposeIpc = () => {};
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    disposeIpc();
    await assets.close();
  };

  try {
    const store = await createSettingsStore({
      userDataPath: app.getPath('userData'),
      chooseDirectory: async (kind, previous) => {
        const labels = { input: '选择输入目录', output: '选择输出目录', reference: '选择参考目录' };
        const result = await dialog.showOpenDialog(window, {
          title: labels[kind], defaultPath: previous || undefined,
          properties: ['openDirectory', 'createDirectory', 'dontAddToRecent'],
        });
        return result.canceled ? null : result.filePaths[0];
      },
      chooseSavePath: async name => {
        const result = await dialog.showSaveDialog(window, {
          title: '保存转换结果', defaultPath: name,
          properties: ['createDirectory', 'showOverwriteConfirmation', 'dontAddToRecent'],
        });
        return result.canceled ? null : result.filePath;
      },
    });

    const privateSession = session.fromPartition(`format-converter-${randomUUID()}`, { cache: false });
    await privateSession.setProxy({ mode: 'direct' });
    privateSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
      callback({ cancel: !isAllowedRequest(details.url, origin) });
    });
    privateSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    privateSession.setPermissionCheckHandler(() => false);
    privateSession.setDevicePermissionHandler(() => false);
    // All desktop writes must go through the validated bridge, never Chromium's download path.
    privateSession.on('will-download', event => event.preventDefault());

    const hidden = environment.FORMAT_CONVERTER_TEST_HIDDEN === '1';
    window = new BrowserWindow({
      width: 1280, height: 900, minWidth: 800, minHeight: 600,
      title: '格式转换器', backgroundColor: '#06060b', show: false, autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'), session: privateSession,
        contextIsolation: true, nodeIntegration: false, sandbox: true,
        nodeIntegrationInWorker: false, nodeIntegrationInSubFrames: false,
        webSecurity: true, allowRunningInsecureContent: false, webviewTag: false,
        navigateOnDragDrop: false,
      },
    });
    window.removeMenu();
    window.once('ready-to-show', () => { if (!hidden && !window.isDestroyed()) window.show(); });

    const isDocument = value => {
      if (!isAllowedRequest(value, origin)) return false;
      const url = new URL(value);
      return url.protocol === 'http:' && (url.pathname === '/' || url.pathname === '/index.html');
    };
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-attach-webview', event => event.preventDefault());
    window.webContents.on('will-navigate', (event, url) => {
      if (!isDocument(event.url || url)) event.preventDefault();
    });
    window.webContents.on('will-frame-navigate', details => {
      const allowed = details.isMainFrame ? isDocument(details.url) :
        details.url === 'about:blank' || isAllowedRequest(details.url, origin);
      if (!allowed) details.preventDefault();
    });
    window.webContents.on('will-redirect', (event, url) => {
      if (!isDocument(event.url || url)) event.preventDefault();
    });
    disposeIpc = installIpcHandlers({ ipcMain, getWindow: () => window, origin, store });
    app.on('window-all-closed', () => app.quit());
    app.once('will-quit', () => { void close().catch(error => console.error('Desktop shutdown failed:', error)); });
    await window.loadURL(`${origin}/`);
    return { window, origin, close };
  } catch (error) {
    await close();
    if (window && !window.isDestroyed()) window.destroy();
    throw error;
  }
}

// Electron's default-app bootstrap can keep require.main on its own loader.
// Node unit-test imports must remain side-effect free.
if (require.main === module || process.versions?.electron) {
  const electron = require('electron');
  startDesktop(electron).catch(error => {
    console.error('Desktop startup failed:', error);
    // Hidden verification must never open an error dialog.
    if (process.env.FORMAT_CONVERTER_TEST_HIDDEN !== '1') {
      electron.dialog.showErrorBox('无法启动格式转换器', '无法打开本地应用或目录设置，请检查安装及文件权限。');
    }
    electron.app.exit(1);
  });
}

module.exports = { startDesktop };
