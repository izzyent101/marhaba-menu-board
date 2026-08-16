const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('menuBoard', {
  isDesktop: true,
  platform: process.platform,
  /**
   * Copies a chosen video into the app's own data folder and returns a URL the
   * board can keep using after a restart (blob: URLs die when the app closes).
   */
  saveVideo: (name, buffer) => ipcRenderer.invoke('video:save', { name, buffer }),
  clearVideo: () => ipcRenderer.invoke('video:clear'),

  // window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  quitApp: () => ipcRenderer.invoke('window:quit'),

  // over-the-air updates
  getUpdateState: () => ipcRenderer.invoke('update:state'),
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  applyUpdate: () => ipcRenderer.invoke('update:apply'),
  onUpdateState: (callback) => {
    const handler = (_e, state) => callback(state);
    ipcRenderer.on('update:state', handler);
    return () => ipcRenderer.removeListener('update:state', handler);
  }
});
