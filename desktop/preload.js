const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shimejiApi', {
  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (payload) => ipcRenderer.send('update-config', payload),
  onConfigUpdated: (handler) => ipcRenderer.on('config-updated', (_, data) => handler(data)),

  // Characters
  getCharactersDir: () => ipcRenderer.invoke('get-characters-dir'),
  listCharacters: () => ipcRenderer.invoke('list-characters'),

  // AI
  getPersonalities: () => ipcRenderer.invoke('get-personalities'),

  // Conversation history
  getConversation: (shimejiId) => ipcRenderer.invoke('get-conversation', shimejiId),
  saveConversation: (shimejiId, messages) => ipcRenderer.send('save-conversation', shimejiId, messages),
  clearConversation: (shimejiId) => ipcRenderer.send('clear-conversation', shimejiId),

  // AI streaming
  aiChatStream: (params) => ipcRenderer.invoke('ai-chat-stream', params),
  onAiStreamDelta: (handler) => ipcRenderer.on('ai-stream-delta', (_, data) => handler(data)),

  // Testing
  testOpenRouter: (payload) => ipcRenderer.invoke('test-openrouter', payload),
  testOllama: (payload) => ipcRenderer.invoke('test-ollama', payload),
  testOpenClaw: (payload) => ipcRenderer.invoke('test-openclaw', payload),
  listOllamaModels: (payload) => ipcRenderer.invoke('list-ollama-models', payload),

  // Settings
  openSettings: () => ipcRenderer.send('open-settings'),

  // Mouse events control for click-through overlay
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore)
});
