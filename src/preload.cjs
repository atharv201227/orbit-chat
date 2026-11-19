const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ollama', {
  status: () => ipcRenderer.invoke('ollama:status'),
  models: () => ipcRenderer.invoke('ollama:models'),
  chat: (payload) => ipcRenderer.invoke('ollama:chat', payload),
  start: () => ipcRenderer.invoke('ollama:start'),
  openDownload: () => ipcRenderer.invoke('ollama:open-download'),
  install: () => ipcRenderer.invoke('ollama:install'),
});
