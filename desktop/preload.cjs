'use strict';

// Sandboxed preloads cannot require local modules. Keep this bridge self-contained.
const { contextBridge, ipcRenderer } = require('electron');

if (process.isMainFrame) {
  const bridge = Object.freeze({
    getSettings: () => ipcRenderer.invoke('desktop:get-settings'),
    chooseDirectory: kind => ipcRenderer.invoke('desktop:choose-directory', kind),
    listFiles: kind => ipcRenderer.invoke('desktop:list-files', kind),
    readFile: async id => {
      const result = await ipcRenderer.invoke('desktop:read-file', id);
      return { name: result.name, bytes: new Uint8Array(result.bytes) };
    },
    saveResult: result => ipcRenderer.invoke('desktop:save-result', result),
  });
  contextBridge.exposeInMainWorld('desktopBridge', bridge);
}
