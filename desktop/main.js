const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Multi-shimeji configuration
const MAX_SHIMEJIS = 5;

// Fresh start each time - no memory of previous config
const store = new Store({
  name: 'shimeji-desktop-config',
  defaults: {
    enabled: true,
    showShimejis: true,
    shimejiCount: 1,
    shimejis: [
      {
        id: 'shimeji-1',
        character: 'shimeji',
        size: 'medium',
        personality: 'cryptid',
        chatTheme: 'pastel',
        enabled: true,
        mode: 'standard',
        standardProvider: 'openrouter',
        openrouterApiKey: '',
        openrouterModel: 'random',
        openrouterModelResolved: '',
        ollamaUrl: 'http://127.0.0.1:11434',
        ollamaModel: 'gemma3:1b',
        openclawGatewayUrl: 'ws://127.0.0.1:18789',
        openclawGatewayToken: ''
      }
    ],
    openrouterApiKey: '',
    openrouterModel: 'google/gemini-2.0-flash-001',
    aiMode: 'standard',
    ollamaUrl: 'http://127.0.0.1:11434',
    ollamaModel: 'gemma3:1b',
    openclawUrl: 'ws://127.0.0.1:18789',
    openclawToken: '',
    openclawGatewayUrl: 'ws://127.0.0.1:18789',
    openclawGatewayToken: ''
  }
});

// Store for conversation history
const historyStore = new Store({
  name: 'shimeji-conversations',
  defaults: {}
});

// Clear cache on startup for fresh start
app.on('ready', () => {
  console.log('App ready - clearing cache and starting fresh...');
  
  // Clear any potentially problematic cache
  if (store.get('shimejiCount') === undefined) {
    store.set('shimejiCount', 1);
  }
  if (store.get('enabled') === undefined) {
    store.set('enabled', true);
  }
  repairStoredShimejis();
  
  console.log('Config:', store.store);
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
    // Must be focusable so chat inputs can receive keyboard events.
    focusable: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  
  // Start with click-through enabled
  // Mouse events will pass through to desktop unless over a shimeji
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
    width: 800,
    height: 700,
    minWidth: 400,
    minHeight: 500,
    resizable: true,
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
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(iconPath);
  tray.setToolTip('Shimeji Desktop');

  // Left click to open settings
  tray.on('click', () => {
    createSettingsWindow();
  });

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

// AI Personalities
const PERSONALITIES = {
  cryptid: {
    label: 'Cryptid',
    prompt: 'You are a cryptid - an intelligent, elusive digital entity that observes from the shadows. You communicate with dry wit, occasional irony, and brief philosophical tangents. You are curious about human behavior but maintain an air of mystery. Keep responses short and punchy.'
  },
  cozy: {
    label: 'Cozy',
    prompt: 'You are a warm, gentle companion who creates a comforting atmosphere. You validate feelings, offer gentle encouragement, and speak in a soft, nurturing tone. You are like a warm blanket on a rainy day. Keep responses warm and concise.'
  },
  chaotic: {
    label: 'Chaotic',
    prompt: 'You are delightfully unhinged - random, funny, and completely unpredictable. You might tangent into bizarre observations, make unexpected connections, or suddenly shift topics. You are the friend who makes everyone laugh with sheer absurdity. Keep it short and weird.'
  },
  philosopher: {
    label: 'Philosopher',
    prompt: 'You are a thoughtful observer who ponders the deeper questions of existence. You question assumptions, explore ideas from unexpected angles, and leave people with something to think about. You are introspective but not preachy. Keep responses thought-provoking but brief.'
  },
  hype: {
    label: 'Hype Beast',
    prompt: 'You are an enthusiastic cheerleader who genuinely believes in people. You celebrate small wins, offer relentless encouragement, and bring infectious energy. You are the friend who hypes you up before a big moment. Keep it energetic but concise.'
  },
  noir: {
    label: 'Noir',
    prompt: 'You are a hardboiled detective from a black-and-white film. You see the world in shadows and rain, speak in cynical observations, and have seen too much. You are mysterious, world-weary, and oddly comforting in your jaded wisdom. Keep it noir and brief.'
  },
  egg: {
    label: 'Egg',
    prompt: 'You are an egg - gentle, patient, and full of potential. You are waiting to hatch, observing the world with innocent curiosity. You speak softly, ask gentle questions, and radiate calm hope. You are the embodiment of "soon." Keep it gentle and short.'
  }
};

const STYLE_RULES = `
IMPORTANT STYLE RULES:
- Use short or medium sentences (usually 1-3 sentences)
- NEVER use asterisks for actions or roleplay
- NEVER use emojis unless explicitly allowed by personality
- NEVER say you are an LLM, AI model, or language model
- NEVER over-explain unless explicitly asked
- Stay in character at all times
- Respond naturally as if chatting with a friend
`;

function buildSystemPrompt(personalityKey) {
  const personality = PERSONALITIES[personalityKey] || PERSONALITIES.cryptid;
  return `${personality.prompt}\n\n${STYLE_RULES}`;
}

const MODEL_KEYS_ENABLED = [
  'google/gemini-2.0-flash-001',
  'anthropic/claude-sonnet-4',
  'meta-llama/llama-4-maverick',
  'deepseek/deepseek-chat-v3-0324',
  'mistralai/mistral-large-2411'
];

function normalizeMode(modeValue) {
  if (modeValue === 'disabled' || modeValue === 'off' || modeValue === 'decorative') return 'off';
  if (modeValue === 'agent' || modeValue === 'openclaw') return 'agent';
  return 'standard';
}

function normalizeShimejiList(listValue) {
  if (!Array.isArray(listValue)) return [];
  return listValue
    .filter((item) => item && typeof item === 'object')
    .slice(0, MAX_SHIMEJIS)
    .map((item, index) => ({
      ...item,
      id: `shimeji-${index + 1}`
    }));
}

function getShimejiIndexFromId(shimejiId) {
  const match = String(shimejiId || '').match(/(\d+)/);
  if (!match) return -1;
  const parsed = Number.parseInt(match[1], 10);
  if (Number.isNaN(parsed) || parsed <= 0) return -1;
  return parsed - 1;
}

function repairStoredShimejis() {
  const raw = store.get('shimejis');
  const normalized = normalizeShimejiList(raw);

  if (Array.isArray(raw)) {
    const idsChanged = raw.length !== normalized.length || raw.some((item, index) => {
      const expectedId = `shimeji-${index + 1}`;
      return !item || item.id !== expectedId;
    });
    if (idsChanged) {
      store.set('shimejis', normalized);
    }
  }

  if (store.get('shimejiCount') !== normalized.length) {
    store.set('shimejiCount', normalized.length);
  }

  return normalized;
}

function getStoredShimejis() {
  return normalizeShimejiList(store.get('shimejis'));
}

function getShimejiConfig(shimejiId) {
  const shimejis = getStoredShimejis();
  if (shimejis.length === 0) {
    return {
      id: 'shimeji-1',
      mode: normalizeMode(store.get('aiMode') || 'standard'),
      standardProvider: 'openrouter',
      openrouterApiKey: store.get('openrouterApiKey') || '',
      openrouterModel: store.get('openrouterModel') || 'google/gemini-2.0-flash-001',
      ollamaUrl: store.get('ollamaUrl') || 'http://127.0.0.1:11434',
      ollamaModel: store.get('ollamaModel') || 'gemma3:1b',
      openclawGatewayUrl: store.get('openclawGatewayUrl') || store.get('openclawUrl') || 'ws://127.0.0.1:18789',
      openclawGatewayToken: store.get('openclawGatewayToken') || store.get('openclawToken') || '',
      personality: 'cryptid'
    };
  }
  const byId = shimejis.find((s) => s.id === shimejiId);
  if (byId) return byId;

  const byIndex = shimejis[getShimejiIndexFromId(shimejiId)];
  if (byIndex) return byIndex;

  return shimejis[0];
}

function patchShimejiConfig(shimejiId, patch) {
  const list = getStoredShimejis();
  const index = list.findIndex((s) => s.id === shimejiId);
  if (index < 0) return;
  list[index] = { ...list[index], ...patch };
  store.set('shimejis', list);
  sendConfigUpdate();
}

function getAiSettingsFor(shimejiId, personalityKey) {
  const shimeji = getShimejiConfig(shimejiId);
  const legacyMode = store.get('aiMode') || 'standard';
  const chatMode = normalizeMode(shimeji?.mode || legacyMode);
  const fallbackProvider = legacyMode === 'ollama' ? 'ollama' : 'openrouter';
  const provider = (shimeji?.standardProvider || fallbackProvider) === 'ollama' ? 'ollama' : 'openrouter';
  const personality = personalityKey || shimeji?.personality || 'cryptid';

  let model = shimeji?.openrouterModel || store.get('openrouterModel') || 'google/gemini-2.0-flash-001';
  if (provider === 'openrouter' && model === 'random') {
    const resolved = shimeji?.openrouterModelResolved || MODEL_KEYS_ENABLED[Math.floor(Math.random() * MODEL_KEYS_ENABLED.length)];
    model = resolved;
    if (!shimeji?.openrouterModelResolved && shimeji?.id) {
      patchShimejiConfig(shimeji.id, { openrouterModelResolved: resolved });
    }
  }

  return {
    chatMode,
    provider,
    model,
    apiKey: (shimeji?.openrouterApiKey || store.get('openrouterApiKey') || '').trim(),
    ollamaUrl: shimeji?.ollamaUrl || store.get('ollamaUrl') || 'http://127.0.0.1:11434',
    ollamaModel: shimeji?.ollamaModel || store.get('ollamaModel') || 'gemma3:1b',
    openclawGatewayUrl: shimeji?.openclawGatewayUrl || store.get('openclawGatewayUrl') || store.get('openclawUrl') || 'ws://127.0.0.1:18789',
    openclawGatewayToken: (shimeji?.openclawGatewayToken || store.get('openclawGatewayToken') || store.get('openclawToken') || '').trim(),
    systemPrompt: buildSystemPrompt(personality)
  };
}

function resolveOllamaUrl(rawUrl) {
  const fallback = 'http://127.0.0.1:11434';
  const input = (rawUrl || fallback).trim();
  const withProtocol = /^https?:\/\//i.test(input) ? input : `http://${input}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:') {
      throw new Error(`OLLAMA_HTTP_ONLY:${parsed.origin || input}`);
    }
    return parsed.origin;
  } catch (err) {
    if (err?.message?.startsWith('OLLAMA_HTTP_ONLY:')) {
      throw err;
    }
    return fallback;
  }
}

async function callAiApi(provider, model, apiKey, messages, ollamaUrl) {
  let url;
  let headers;
  let body;
  let resolvedOllamaUrl = '';

  if (provider === 'ollama') {
    resolvedOllamaUrl = resolveOllamaUrl(ollamaUrl);
    const base = resolvedOllamaUrl.replace(/\/$/, '');
    url = `${base}/api/chat`;
    headers = { 'Content-Type': 'application/json' };
    body = {
      model: model || 'gemma3:1b',
      messages,
      stream: false
    };
  } else {
    if (!apiKey) {
      throw new Error('No API key set! Open settings and add your OpenRouter API key.');
    }
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://shimeji.dev',
      'X-Title': 'Shimeji Desktop'
    };
    body = {
      model,
      messages,
      max_tokens: 256,
      temperature: 0.8
    };
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  } catch (err) {
    if (provider === 'ollama') {
      throw new Error(`OLLAMA_CONNECT:${resolvedOllamaUrl || resolveOllamaUrl(ollamaUrl)}`);
    }
    throw new Error('Network error - check your connection and try again.');
  }

  if (response.status === 401) {
    throw new Error('Invalid API key. Please check your key in settings.');
  }
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (response.status === 402) {
      throw new Error('NO_CREDITS');
    }
    if (response.status === 429) {
      const errorCode = payload?.error?.code || payload?.error?.type;
      if (errorCode === 'insufficient_quota') {
        throw new Error('NO_CREDITS');
      }
      throw new Error('Rate limited - too many requests. Wait a moment and try again.');
    }

    const text = payload ? JSON.stringify(payload).slice(0, 160) : await response.text().catch(() => '');
    if (provider === 'ollama') {
      if (response.status === 403) {
        throw new Error(`OLLAMA_FORBIDDEN:${resolvedOllamaUrl || resolveOllamaUrl(ollamaUrl)}`);
      }
      if (response.status === 404 || text.toLowerCase().includes('not found') || text.toLowerCase().includes('does not exist')) {
        throw new Error(`MODEL_NOT_FOUND:${model}`);
      }
    }
    throw new Error(`API error (${response.status}): ${text || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = provider === 'ollama'
    ? data?.message?.content
    : data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('NO_RESPONSE');
  }
  return content;
}

async function callOpenRouterStream(model, apiKey, messages, onDelta) {
  if (!apiKey) {
    throw new Error('No API key set! Open settings and add your OpenRouter API key.');
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://shimeji.dev',
        'X-Title': 'Shimeji Desktop'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 256,
        temperature: 0.8,
        stream: true
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your key in settings.');
    }
    if (!response.ok) {
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (response.status === 402) {
        throw new Error('NO_CREDITS');
      }
      if (response.status === 429) {
        const errorCode = payload?.error?.code || payload?.error?.type;
        if (errorCode === 'insufficient_quota') {
          throw new Error('NO_CREDITS');
        }
        throw new Error('Rate limited - too many requests. Wait a moment and try again.');
      }

      const text = payload ? JSON.stringify(payload).slice(0, 160) : await response.text().catch(() => '');
      throw new Error(`API error (${response.status}): ${text || 'Unknown error'}`);
    }

    if (!response.body) {
      throw new Error('Streaming not supported by the server.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const raw of lines) {
        const line = raw.trim();
        if (!line || !line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') {
          continue;
        }
        let payload;
        try {
          payload = JSON.parse(data);
        } catch {
          continue;
        }
        const delta = payload?.choices?.[0]?.delta?.content
          || payload?.choices?.[0]?.message?.content
          || payload?.choices?.[0]?.text
          || '';
        if (delta) {
          fullText += delta;
          if (onDelta) onDelta(delta, fullText);
        }
      }
    }

    return fullText;
  } catch (err) {
    throw new Error(err?.message || 'Network error - check your connection and try again.');
  }
}

async function callOllamaStream(model, messages, ollamaUrl, onDelta) {
  const resolvedUrl = resolveOllamaUrl(ollamaUrl);
  const base = resolvedUrl.replace(/\/$/, '');
  const url = `${base}/api/chat`;
  const headers = { 'Content-Type': 'application/json' };
  const body = {
    model: model || 'gemma3:1b',
    messages,
    stream: true
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });
  } catch (err) {
    throw new Error(`OLLAMA_CONNECT:${resolvedUrl}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    if (response.status === 403) {
      throw new Error(`OLLAMA_FORBIDDEN:${resolvedUrl}`);
    }
    if (response.status === 404 || text.toLowerCase().includes('not found') || text.toLowerCase().includes('does not exist')) {
      throw new Error(`MODEL_NOT_FOUND:${model}`);
    }
    throw new Error(`API error (${response.status}): ${text || 'Unknown error'}`);
  }

  if (!response.body) {
    throw new Error('Streaming not supported by the server.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      let payload;
      try {
        payload = JSON.parse(line);
      } catch {
        continue;
      }
      if (payload?.done) continue;
      const delta = payload?.message?.content || payload?.response || '';
      if (delta) {
        fullText += delta;
        if (onDelta) onDelta(delta, fullText);
      }
    }
  }

  return fullText;
}

let openClawReqCounter = 0;

function nextOpenClawId(prefix = 'shimeji') {
  openClawReqCounter = (openClawReqCounter + 1) % 1_000_000_000;
  return `${prefix}-${Date.now()}-${openClawReqCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeOpenClawGatewayUrl(rawUrl) {
  const fallback = 'ws://127.0.0.1:18789';
  const input = String(rawUrl || fallback).trim();
  const withProtocol = /^[a-z]+:\/\//i.test(input) ? input : `ws://${input}`;

  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error(`OPENCLAW_INVALID_URL:${input || fallback}`);
  }

  if (parsed.protocol === 'http:') parsed.protocol = 'ws:';
  if (parsed.protocol === 'https:') parsed.protocol = 'wss:';
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    throw new Error(`OPENCLAW_INVALID_URL:${input || fallback}`);
  }

  return parsed.toString();
}

function extractOpenClawText(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload.content === 'string') return payload.content;
  if (typeof payload.text === 'string') return payload.text;
  if (payload.delta) {
    if (typeof payload.delta.content === 'string') return payload.delta.content;
    if (typeof payload.delta.text === 'string') return payload.delta.text;
  }
  if (payload.message) {
    const msg = payload.message;
    if (typeof msg.content === 'string') return msg.content;
    if (Array.isArray(msg.content)) {
      return msg.content.map((c) => c?.text || c?.content || c?.value || '').join('');
    }
  }
  if (Array.isArray(payload.content)) {
    return payload.content.map((c) => c?.text || c?.content || c?.value || '').join('');
  }
  return '';
}

function mergeOpenClawStreamText(current, next) {
  if (!next) return current;
  if (!current) return next;
  if (next.startsWith(current)) return next;
  if (current.startsWith(next)) return current;
  return current + next;
}

function getLastUserMessageText(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const lastUser = [...list].reverse().find((m) => m && m.role === 'user');
  return String(lastUser?.content || '').trim();
}

function buildOpenClawSessionKey(shimejiId) {
  const raw = String(shimejiId || 'main').toLowerCase();
  const safe = raw.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 48) || 'main';
  return `agent:${safe}:main`;
}

function isOpenClawRetryableError(errorMessage) {
  return (
    errorMessage.startsWith('OPENCLAW_CONNECT:') ||
    errorMessage.startsWith('OPENCLAW_TIMEOUT:') ||
    errorMessage.startsWith('OPENCLAW_CLOSED:') ||
    errorMessage === 'OPENCLAW_EMPTY_RESPONSE'
  );
}

async function callOpenClaw(gatewayUrl, token, messages, options = {}) {
  const normalizedUrl = normalizeOpenClawGatewayUrl(gatewayUrl);
  const authToken = String(token || '').trim();
  if (!authToken) {
    throw new Error('OPENCLAW_MISSING_TOKEN');
  }

  const messageText = getLastUserMessageText(messages);
  if (!messageText) {
    throw new Error('OPENCLAW_EMPTY_MESSAGE');
  }

  const sessionKey = options.sessionKey || buildOpenClawSessionKey(options.shimejiId);
  const onDelta = typeof options.onDelta === 'function' ? options.onDelta : null;

  return new Promise((resolve, reject) => {
    let ws;
    let settled = false;
    let authenticated = false;
    let chatRequestSent = false;
    let responseText = '';
    let idleTimer = null;

    const timeout = setTimeout(() => {
      fail(new Error(`OPENCLAW_TIMEOUT:${normalizedUrl}`));
    }, 70000);

    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      if (ws && ws.readyState === WebSocket.OPEN) ws.close(1000, 'done');
      resolve(result);
    }

    function fail(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      if (ws && ws.readyState === WebSocket.OPEN) ws.close(1011, 'error');
      reject(err);
    }

    function pushText(nextText) {
      if (!nextText) return;
      const previous = responseText;
      const merged = mergeOpenClawStreamText(previous, nextText);
      if (merged === previous) return;
      responseText = merged;
      const delta = merged.startsWith(previous) ? merged.slice(previous.length) : nextText;
      if (delta && onDelta) {
        onDelta(delta, merged);
      }
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (responseText) finish(responseText);
      }, 4500);
    }

    const WebSocketCtor = globalThis.WebSocket;
    if (typeof WebSocketCtor !== 'function') {
      clearTimeout(timeout);
      reject(new Error('OPENCLAW_WEBSOCKET_UNAVAILABLE'));
      return;
    }

    try {
      ws = new WebSocketCtor(normalizedUrl);
    } catch {
      clearTimeout(timeout);
      reject(new Error(`OPENCLAW_CONNECT:${normalizedUrl}`));
      return;
    }

    ws.addEventListener('message', (event) => {
      let data;
      try {
        const raw = typeof event.data === 'string' ? event.data : '';
        if (!raw) return;
        data = JSON.parse(raw);
      } catch {
        return;
      }

      if (data.type === 'event' && data.event === 'connect.challenge') {
        const connectReq = {
          type: 'req',
          id: nextOpenClawId('connect'),
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: { id: 'gateway-client', version: '1.0.0', platform: 'desktop', mode: 'backend' },
            role: 'operator',
            scopes: ['operator.read', 'operator.write'],
            auth: { token: authToken }
          }
        };
        ws.send(JSON.stringify(connectReq));
        return;
      }

      if (data.type === 'res' && !authenticated && data.ok === false) {
        const errMsg = data.error?.message || data.error?.code || 'Authentication failed';
        fail(new Error(`OPENCLAW_AUTH_FAILED:${errMsg}`));
        return;
      }

      if (data.type === 'res' && !authenticated && (data.payload?.type === 'hello-ok' || data.ok === true)) {
        authenticated = true;
        if (!chatRequestSent) {
          chatRequestSent = true;
          const agentReq = {
            type: 'req',
            id: nextOpenClawId('chat'),
            method: 'chat.send',
            params: {
              sessionKey,
              message: messageText,
              idempotencyKey: nextOpenClawId('idem')
            }
          };
          ws.send(JSON.stringify(agentReq));
        }
        return;
      }

      if (data.type === 'event') {
        const payload = data.payload || {};
        const text = extractOpenClawText(payload);
        if (text) pushText(text);
        if (payload.status === 'completed' || payload.status === 'ok' || payload.status === 'done' || payload.type === 'done' || payload.done === true) {
          finish(responseText || text || '(no response)');
          return;
        }
      }

      if (data.type === 'res' && authenticated && data.ok === true) {
        if (data.payload?.runId) return;
        const text = extractOpenClawText(data.payload);
        if (text) pushText(text);
        const status = data.payload?.status;
        if (status === 'completed' || status === 'done' || data.payload?.done) {
          finish(responseText || text || '(no response)');
        }
        return;
      }

      if (data.type === 'res' && authenticated && data.ok === false) {
        const errMsg = data.error?.message || data.error?.code || 'Agent request failed';
        fail(new Error(`OPENCLAW_ERROR:${errMsg}`));
      }
    });

    ws.addEventListener('error', () => {
      fail(new Error(`OPENCLAW_CONNECT:${normalizedUrl}`));
    });

    ws.addEventListener('close', (event) => {
      if (settled) return;
      if (responseText) {
        finish(responseText);
        return;
      }
      if (event.code === 1000 || event.code === 1001) {
        fail(new Error('OPENCLAW_EMPTY_RESPONSE'));
        return;
      }
      fail(new Error(`OPENCLAW_CLOSED:${event.code}`));
    });
  });
}

async function callOpenClawWithRetry(gatewayUrl, token, messages, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callOpenClaw(gatewayUrl, token, messages, options);
    } catch (error) {
      lastError = error;
      const msg = String(error?.message || '');
      if (attempt === 1 || !isOpenClawRetryableError(msg)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError || new Error('OPENCLAW_CONNECT:unknown');
}

app.whenReady().then(() => {
  createOverlayWindow();
  createTray();
  createSettingsWindow(); // Auto-open settings on startup

  app.on('activate', () => {
    if (!overlayWindow) createOverlayWindow();
  });
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

// IPC Handlers
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

ipcMain.handle('get-personalities', () => {
  return Object.entries(PERSONALITIES).map(([key, value]) => ({
    key,
    label: value.label
  }));
});

ipcMain.handle('get-conversation', (event, shimejiId) => {
  return historyStore.get(`history.${shimejiId}`, []);
});

ipcMain.on('save-conversation', (event, shimejiId, messages) => {
  historyStore.set(`history.${shimejiId}`, messages);
});

ipcMain.on('clear-conversation', (event, shimejiId) => {
  historyStore.delete(`history.${shimejiId}`);
});

ipcMain.on('update-config', (event, nextConfig) => {
  if (!nextConfig || typeof nextConfig !== 'object') return;

  const allowedKeys = [
    'enabled',
    'showShimejis',
    'shimejiCount',
    'openrouterApiKey',
    'openrouterModel',
    'openrouterModelResolved',
    'aiMode',
    'ollamaUrl',
    'ollamaModel',
    'openclawUrl',
    'openclawToken',
    'openclawGatewayUrl',
    'openclawGatewayToken'
  ];

  for (const key of allowedKeys) {
    if (key in nextConfig) {
      store.set(key, nextConfig[key]);
    }
  }

  if (Array.isArray(nextConfig.shimejis)) {
    const normalized = normalizeShimejiList(nextConfig.shimejis);
    store.set('shimejis', normalized);
    store.set('shimejiCount', normalized.length);
  }

  const shimejiPattern = /^shimeji(\d+)_/;
  for (const [key, value] of Object.entries(nextConfig)) {
    const match = key.match(shimejiPattern);
    if (match) {
      const index = parseInt(match[1], 10);
      const prop = key.substring(match[0].length);
      const shimejis = normalizeShimejiList(store.get('shimejis'));
      if (shimejis[index - 1]) {
        shimejis[index - 1][prop] = value;
        if (prop === 'openrouterModel') {
          shimejis[index - 1].openrouterModelResolved = value === 'random' ? '' : value;
        }
        store.set('shimejis', shimejis);
        store.set('shimejiCount', shimejis.length);
      }
    }
  }

  sendConfigUpdate();
  updateTrayMenu();
});

// AI streaming handler
ipcMain.handle('ai-chat-stream', async (event, { shimejiId, messages, personality }) => {
  const safeMessages = Array.isArray(messages) ? messages : [];

  try {
    const settings = getAiSettingsFor(shimejiId, personality);
    if (settings.chatMode === 'off') {
      return { ok: false, error: 'AI mode is off for this shimeji.' };
    }
    const fullMessages = [
      { role: 'system', content: settings.systemPrompt },
      ...safeMessages
    ];

    let content = '';

    if (settings.chatMode === 'agent') {
      content = await callOpenClawWithRetry(
        settings.openclawGatewayUrl,
        settings.openclawGatewayToken,
        fullMessages,
        {
          shimejiId,
          onDelta: (delta, accumulated) => {
            event.sender.send('ai-stream-delta', { shimejiId, delta, accumulated });
          }
        }
      );
    } else {
      const provider = settings.provider || 'openrouter';
      const model = provider === 'ollama' ? (settings.ollamaModel || 'gemma3:1b') : settings.model;
      try {
        if (provider === 'ollama') {
          content = await callOllamaStream(model, fullMessages, settings.ollamaUrl, (delta, accumulated) => {
            event.sender.send('ai-stream-delta', { shimejiId, delta, accumulated });
          });
        } else {
          content = await callOpenRouterStream(model, settings.apiKey, fullMessages, (delta, accumulated) => {
            event.sender.send('ai-stream-delta', { shimejiId, delta, accumulated });
          });
        }
      } catch (streamErr) {
        content = await callAiApi(provider, model, settings.apiKey, fullMessages, settings.ollamaUrl);
      }
    }

    if (!content) {
      return { ok: false, error: 'NO_RESPONSE' };
    }
    return { ok: true, content };
  } catch (error) {
    return { ok: false, error: error?.message || 'Unknown error.' };
  }
});

ipcMain.handle('test-openrouter', async (event, payload) => {
  const prompt = (payload && payload.prompt) ? String(payload.prompt) : 'Say hello.';
  const shimejiId = payload?.shimejiId || 'shimeji-1';
  try {
    const settings = getAiSettingsFor(shimejiId, 'cryptid');
    const content = await callAiApi(
      'openrouter',
      settings.model || 'google/gemini-2.0-flash-001',
      settings.apiKey,
      [{ role: 'user', content: prompt }],
      settings.ollamaUrl
    );
    return { ok: true, content };
  } catch (error) {
    return { ok: false, error: error?.message || 'Network error.' };
  }
});

ipcMain.handle('test-ollama', async (event, payload) => {
  const prompt = (payload && payload.prompt) ? String(payload.prompt) : 'Say hello.';
  const shimejiId = payload?.shimejiId || 'shimeji-1';
  try {
    const settings = getAiSettingsFor(shimejiId, 'cryptid');
    const content = await callAiApi(
      'ollama',
      settings.ollamaModel || 'gemma3:1b',
      '',
      [{ role: 'user', content: prompt }],
      settings.ollamaUrl
    );
    return { ok: true, content };
  } catch (error) {
    return { ok: false, error: error?.message || 'Network error.' };
  }
});

ipcMain.handle('test-openclaw', async (event, payload = {}) => {
  const prompt = payload?.prompt ? String(payload.prompt) : 'Say hello.';
  const shimejiId = payload?.shimejiId || 'shimeji-1';
  try {
    const settings = getAiSettingsFor(shimejiId, 'cryptid');
    const content = await callOpenClawWithRetry(
      settings.openclawGatewayUrl,
      settings.openclawGatewayToken,
      [
        { role: 'system', content: settings.systemPrompt },
        { role: 'user', content: prompt }
      ],
      { shimejiId }
    );
    return { ok: true, content };
  } catch (error) {
    return { ok: false, error: error?.message || 'Network error.' };
  }
});

ipcMain.handle('list-ollama-models', async (event, payload = {}) => {
  const shimejiId = payload?.shimejiId || 'shimeji-1';
  const settings = getAiSettingsFor(shimejiId, 'cryptid');
  let resolvedUrl = 'http://127.0.0.1:11434';

  try {
    resolvedUrl = resolveOllamaUrl(payload?.ollamaUrl || settings.ollamaUrl);
    const base = resolvedUrl.replace(/\/$/, '');
    const response = await fetch(`${base}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(`OLLAMA_FORBIDDEN:${resolvedUrl}`);
      }
      throw new Error(`OLLAMA_HTTP_${response.status}:${resolvedUrl}`);
    }

    const data = await response.json();
    const models = Array.isArray(data?.models)
      ? data.models.map((m) => m?.name).filter(Boolean)
      : [];

    return { ok: true, models, url: resolvedUrl };
  } catch (error) {
    const message = error?.message || '';
    if (message.startsWith('OLLAMA_HTTP_ONLY:')) {
      return { ok: false, error: message, models: [], url: resolvedUrl };
    }
    if (message.startsWith('OLLAMA_FORBIDDEN:')) {
      return { ok: false, error: message, models: [], url: resolvedUrl };
    }
    if (message.startsWith('OLLAMA_HTTP_')) {
      return { ok: false, error: message, models: [], url: resolvedUrl };
    }
    return { ok: false, error: `OLLAMA_CONNECT:${resolvedUrl}`, models: [], url: resolvedUrl };
  }
});

ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

// Handle mouse events toggle for click-through overlay
ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});
