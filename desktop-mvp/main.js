const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store({
  name: 'shimeji-desktop-config',
  defaults: {
    enabled: true,
    character: 'shimeji',
    size: 'medium',
    behavior: 'wander',
    openrouterApiKey: '',
    openrouterModel: 'google/gemini-2.0-flash-001'
  }
});

let overlayWindow = null;
let settingsWindow = null;
let tray = null;

function getCharactersDir() {
  return path.join(__dirname, '..', 'chrome-extension', 'characters');
}

function createOverlayWindow() {
  const display = screen.getPrimaryDisplay();
  overlayWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 360,
    height: 640,
    resizable: false,
    title: 'Shimeji Desktop - Config',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'renderer', 'settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function sendConfigUpdate() {
  if (overlayWindow) {
    overlayWindow.webContents.send('config-updated', store.store);
  }
  if (settingsWindow) {
    settingsWindow.webContents.send('config-updated', store.store);
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'chrome-extension', 'icons', 'icon48.png');
  tray = new Tray(iconPath);
  tray.setToolTip('Shimeji Desktop MVP');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Settings', click: () => createSettingsWindow() },
    { label: store.get('enabled') ? 'Disable Shimeji' : 'Enable Shimeji', click: () => {
      store.set('enabled', !store.get('enabled'));
      sendConfigUpdate();
      updateTrayMenu();
    } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setContextMenu(contextMenu);
}

function updateTrayMenu() {
  if (!tray) return;
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Settings', click: () => createSettingsWindow() },
    { label: store.get('enabled') ? 'Disable Shimeji' : 'Enable Shimeji', click: () => {
      store.set('enabled', !store.get('enabled'));
      sendConfigUpdate();
      updateTrayMenu();
    } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createOverlayWindow();
  createTray();

  app.on('activate', () => {
    if (!overlayWindow) createOverlayWindow();
  });
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

ipcMain.handle('get-config', () => store.store);

ipcMain.handle('get-characters-dir', () => getCharactersDir());

ipcMain.handle('list-characters', () => {
  try {
    const dir = getCharactersDir();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (error) {
    return [];
  }
});

ipcMain.on('update-config', (event, nextConfig) => {
  if (!nextConfig || typeof nextConfig !== 'object') return;
  const allowed = ['enabled', 'character', 'size', 'behavior', 'openrouterApiKey', 'openrouterModel'];
  for (const key of allowed) {
    if (key in nextConfig) {
      store.set(key, nextConfig[key]);
    }
  }
  sendConfigUpdate();
  updateTrayMenu();
});

ipcMain.handle('test-openrouter', async (event, payload) => {
  const prompt = (payload && payload.prompt) ? String(payload.prompt) : 'Say hello in Spanish.';
  const apiKey = store.get('openrouterApiKey');
  const model = store.get('openrouterModel') || 'google/gemini-2.0-flash-001';

  if (!apiKey) {
    return { ok: false, error: 'API key missing.' };
  }

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://shimeji.dev',
        'X-Title': 'Shimeji Desktop MVP'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 128,
        temperature: 0.7
      })
    });

    if (resp.status === 401) {
      return { ok: false, error: 'Invalid API key.' };
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return { ok: false, error: `API error (${resp.status}) ${text.slice(0, 160)}` };
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || '';
    if (!content) {
      return { ok: false, error: 'No response content.' };
    }
    return { ok: true, content };
  } catch (error) {
    return { ok: false, error: error?.message || 'Network error.' };
  }
});

ipcMain.on('open-settings', () => {
  createSettingsWindow();
});
