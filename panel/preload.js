const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onLog: (callback) => ipcRenderer.on('log', (event, data) => callback(data)),
    onStatus: (callback) => ipcRenderer.on('status', (event, data) => callback(data)),
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config)
});
