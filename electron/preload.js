const { contextBridge, ipcRenderer } = require('electron');
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // IPC communication methods
  send: (channel, data) => {
    // Whitelist channels for security
    const validChannels = ['message-from-renderer', 'gemini-request'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  receive: (channel, func) => {
    const validChannels = [
      'message-from-main', 
      'gemini-response',
      'hotkey-generate',
      'hotkey-generate-funny', 
      'hotkey-new-image',
      'hotkey-screenshot-captured',
      'hotkey-screenshot-error',
      'open-settings-from-tray',
      'open-about-from-tray'
    ];
    if (validChannels.includes(channel)) {
      // Remove the event as the first parameter
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },

  // Configuration management
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // Custom prompts management
  getCustomPrompts: () => ipcRenderer.invoke('get-custom-prompts'),
  saveCustomPrompt: (prompt) => ipcRenderer.invoke('save-custom-prompt', prompt),
  deleteCustomPrompt: (promptId) => ipcRenderer.invoke('delete-custom-prompt', promptId),
  
  // API Key management
  getGeminiApiKey: () => ipcRenderer.invoke('get-gemini-api-key'),
  saveGeminiApiKey: (apiKey) => ipcRenderer.invoke('save-gemini-api-key', apiKey),
  
  // Message history management
  getMessageHistory: () => ipcRenderer.invoke('get-message-history'),
  saveMessageSet: (messageSet) => ipcRenderer.invoke('save-message-set', messageSet),
  deleteMessageSet: (setId) => ipcRenderer.invoke('delete-message-set', setId),
  exportMessages: (messageSet) => ipcRenderer.invoke('export-messages', messageSet),
  shareMessages: (messageSet, shareType) => ipcRenderer.invoke('share-messages', messageSet, shareType),
  backupMessageHistory: () => ipcRenderer.invoke('backup-message-history'),
  
  // Screenshot functionality
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  
  // Auto-paste to New World
  pasteToNewWorld: (message) => ipcRenderer.invoke('paste-to-new-world', message),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // App control
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // Test robotjs functionality
  testRobotjs: () => ipcRenderer.invoke('test-robotjs'),
  
  // Utility methods
  invoke: async (channel, data) => {
    const validChannels = ['get-app-version', 'gemini-chat'];
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, data);
    }
  },
  
  // System info
  platform: process.platform,
  versions: process.versions
});