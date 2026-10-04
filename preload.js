const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: (options) => ipcRenderer.invoke('dialog:select-file', options),
  selectOutputFile: (options) => ipcRenderer.invoke('dialog:select-output', options),
  probeFile: (filePath) => ipcRenderer.invoke('media:probe', filePath),
  startExport: (config) => ipcRenderer.invoke('export:start', config),
  cancelExport: () => ipcRenderer.invoke('export:cancel'),
  showInFolder: (filePath) => ipcRenderer.invoke('system:show-in-folder', filePath),
  openPath: (filePath) => ipcRenderer.invoke('system:open-path', filePath),
  onExportProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('export:progress', handler);
    return () => ipcRenderer.removeListener('export:progress', handler);
  }
});
