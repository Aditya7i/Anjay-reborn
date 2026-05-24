const { contextBridge, ipcRenderer } = require('electron');

// Expose secure, custom desktop APIs to the front-end window
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getVersions: () => ({
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  }),
  // Additional APIs can be added here
});
