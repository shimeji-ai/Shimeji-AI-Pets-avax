const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shimejiApi', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (payload) => ipcRenderer.send('update-config', payload),
  onConfigUpdated: (handler) => ipcRenderer.on('config-updated', (_, data) => handler(data)),
  getCharactersDir: () => ipcRenderer.invoke('get-characters-dir'),
  listCharacters: () => ipcRenderer.invoke('list-characters'),
  testOpenRouter: (payload) => ipcRenderer.invoke('test-openrouter', payload),
  openSettings: () => ipcRenderer.send('open-settings')
});
