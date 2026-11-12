'use strict';

function isAllowedRequest(value, origin) {
  try {
    const url = new URL(value);
    if (url.protocol === 'blob:' || url.protocol === 'data:') return true;
    return url.protocol === 'http:' && url.origin === origin && !url.username && !url.password;
  } catch { return false; }
}

function assertTrustedSender(event, window, origin) {
  if (!window || window.isDestroyed() || window.webContents.isDestroyed() ||
      event.sender !== window.webContents || !event.senderFrame ||
      event.senderFrame !== window.webContents.mainFrame || event.senderFrame.parent !== null) {
    throw new Error('Untrusted IPC sender.');
  }
  const url = new URL(event.senderFrame.url);
  if (url.protocol !== 'http:' || url.origin !== origin || url.username || url.password) {
    throw new Error('Untrusted IPC origin.');
  }
}

function installIpcHandlers({ ipcMain, getWindow, origin, store }) {
  const routes = [
    ['desktop:get-settings', 'getSettings', 0],
    ['desktop:choose-directory', 'chooseDirectory', 1],
    ['desktop:list-files', 'listFiles', 1],
    ['desktop:read-file', 'readFile', 1],
    ['desktop:save-result', 'saveResult', 1],
  ];
  for (const [channel, method, count] of routes) {
    ipcMain.handle(channel, async (event, ...args) => {
      assertTrustedSender(event, getWindow(), origin);
      if (args.length !== count) throw new Error('Unexpected IPC arguments.');
      return store[method](...args);
    });
  }
  return () => { for (const [channel] of routes) ipcMain.removeHandler(channel); };
}

module.exports = { isAllowedRequest, assertTrustedSender, installIpcHandlers };
