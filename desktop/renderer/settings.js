const MAX_SHIMEJIS = 5;

const CHARACTER_OPTIONS = [
  { id: 'shimeji', labelEn: 'Shimeji', labelEs: 'Shimeji' },
  { id: 'bunny', labelEn: 'Bunny', labelEs: 'Conejo' },
  { id: 'kitten', labelEn: 'Kitten', labelEs: 'Gatito' },
  { id: 'ghost', labelEn: 'Ghost', labelEs: 'Fantasma' },
  { id: 'blob', labelEn: 'Blob', labelEs: 'Blob' },
  { id: 'lobster', labelEn: 'Lobster', labelEs: 'Langosta' },
  { id: 'mushroom', labelEn: 'Mushroom', labelEs: 'Hongo' },
  { id: 'penguin', labelEn: 'Penguin', labelEs: 'Pingüino' }
];

const BUILTIN_NFT_CHARACTERS = [
  { id: 'egg', name: 'Egg' }
];

const PERSONALITY_OPTIONS = [
  { value: 'random', labelEn: 'Random', labelEs: 'Aleatoria' },
  { value: 'cryptid', labelEn: 'Cryptid', labelEs: 'Críptico' },
  { value: 'cozy', labelEn: 'Cozy', labelEs: 'Acogedor' },
  { value: 'chaotic', labelEn: 'Chaotic', labelEs: 'Caótico' },
  { value: 'philosopher', labelEn: 'Philosopher', labelEs: 'Filósofo' },
  { value: 'hype', labelEn: 'Hype Beast', labelEs: 'Entusiasta' },
  { value: 'noir', labelEn: 'Noir', labelEs: 'Noir' },
  { value: 'egg', labelEn: 'Egg', labelEs: 'Huevo' }
];

const CHAT_THEME_PRESETS = [
  { id: 'pastel', labelEn: 'Pastel', labelEs: 'Pastel', theme: '#3b1a77', bg: '#f0e8ff', bubble: 'glass' },
  { id: 'pink', labelEn: 'Pink', labelEs: 'Rosa', theme: '#7a124b', bg: '#ffd2ea', bubble: 'glass' },
  { id: 'kawaii', labelEn: 'Kawaii', labelEs: 'Kawaii', theme: '#5b1456', bg: '#ffd8f0', bubble: 'glass' },
  { id: 'mint', labelEn: 'Mint', labelEs: 'Menta', theme: '#0f5f54', bg: '#c7fff0', bubble: 'glass' },
  { id: 'ocean', labelEn: 'Ocean', labelEs: 'Océano', theme: '#103a7a', bg: '#cfe6ff', bubble: 'glass' },
  { id: 'neural', labelEn: 'Neural', labelEs: 'Neural', theme: '#86f0ff', bg: '#0b0d1f', bubble: 'dark' },
  { id: 'cyberpunk', labelEn: 'Cyberpunk', labelEs: 'Cyberpunk', theme: '#19d3ff', bg: '#0a0830', bubble: 'dark' },
  { id: 'noir-rose', labelEn: 'Noir Rose', labelEs: 'Noir Rosa', theme: '#ff5fbf', bg: '#0b0717', bubble: 'dark' },
  { id: 'midnight', labelEn: 'Midnight', labelEs: 'Medianoche', theme: '#7aa7ff', bg: '#0b1220', bubble: 'dark' },
  { id: 'ember', labelEn: 'Ember', labelEs: 'Brasas', theme: '#ff8b3d', bg: '#1a0c08', bubble: 'dark' }
];

const CHAT_THEME_OPTIONS = CHAT_THEME_PRESETS.map((preset) => ({
  value: preset.id,
  labelEn: preset.labelEn,
  labelEs: preset.labelEs
}));

const SIZE_OPTIONS = [
  { value: 'small', labelEn: 'Small', labelEs: 'Pequeño' },
  { value: 'medium', labelEn: 'Medium', labelEs: 'Mediano' },
  { value: 'big', labelEn: 'Large', labelEs: 'Grande' }
];

const TTS_VOICE_OPTIONS = [
  { value: 'random', labelEn: 'Random', labelEs: 'Aleatoria' },
  { value: 'warm', labelEn: 'Warm', labelEs: 'Cálida' },
  { value: 'bright', labelEn: 'Bright', labelEs: 'Brillante' },
  { value: 'deep', labelEn: 'Deep', labelEs: 'Grave' },
  { value: 'calm', labelEn: 'Calm', labelEs: 'Suave' },
  { value: 'energetic', labelEn: 'Energetic', labelEs: 'Enérgica' }
];

const CHAT_BUBBLE_STYLES = [
  { value: 'glass', labelEn: 'Glass', labelEs: 'Cristal' },
  { value: 'solid', labelEn: 'Solid', labelEs: 'Sólido' },
  { value: 'dark', labelEn: 'Dark', labelEs: 'Oscuro' }
];

const POPUP_THEME_OPTIONS = [
  { value: 'random', labelEn: 'Random', labelEs: 'Aleatorio' },
  { value: 'neural', labelEn: 'Neural', labelEs: 'Neural' },
  { value: 'pink', labelEn: 'Pink', labelEs: 'Rosa' },
  { value: 'kawaii', labelEn: 'Kawaii', labelEs: 'Kawaii' }
];

const LANGUAGE_OPTIONS = [
  { value: 'en', labelEn: 'English', labelEs: 'Inglés' },
  { value: 'es', labelEn: 'Spanish', labelEs: 'Español' }
];

const PROVIDER_HELP_LINKS = {
  openrouter: {
    href: 'https://openrouter.ai/settings/keys',
    labelEn: 'Get OpenRouter keys',
    labelEs: 'Conseguir keys de OpenRouter'
  },
  ollama: {
    href: 'https://ollama.com',
    labelEn: 'Download Ollama',
    labelEs: 'Descargar Ollama'
  },
  openclaw: {
    href: 'https://github.com/openclaw/openclaw',
    labelEn: 'Setup OpenClaw',
    labelEs: 'Configurar OpenClaw'
  }
};

let shimejis = [];
let selectedShimejiIndex = 0;
let currentConfig = {};
let uiLanguage = null;
let resolvedPopupTheme = 'neural';
let nftCharacters = [...BUILTIN_NFT_CHARACTERS];
let nftCharacterIds = new Set(BUILTIN_NFT_CHARACTERS.map((item) => item.id).filter(Boolean));

const enabledToggle = document.getElementById('all-sites-toggle');
const enabledToggleRow = document.getElementById('all-sites-toggle-row');
const shimejiSelector = document.getElementById('shimeji-selector');
const shimejiList = document.getElementById('shimeji-list');
const shimejiEmpty = document.getElementById('shimeji-empty');
const addShimejiBtn = document.getElementById('add-shimeji-btn');
const statsEl = document.getElementById('popup-stats');

const aiModeSelect = document.getElementById('ai-mode-select');
const openRouterConfig = document.getElementById('openrouter-config');
const ollamaConfig = document.getElementById('ollama-config');
const openclawConfig = document.getElementById('openclaw-config');
const testConfig = document.getElementById('test-config');

const openRouterKey = document.getElementById('openrouter-key');
const openRouterModel = document.getElementById('openrouter-model');
const ollamaUrl = document.getElementById('ollama-url');
const ollamaModel = document.getElementById('ollama-model');
const openclawUrl = document.getElementById('openclaw-url');
const openclawToken = document.getElementById('openclaw-token');
const aiTestPrompt = document.getElementById('ai-test-prompt');
const aiTestBtn = document.getElementById('ai-test-btn');
const aiTestStatus = document.getElementById('ai-test-status');
const globalShimejiToggle = document.getElementById('global-shimeji-toggle');
const popupThemeSelect = document.getElementById('popup-theme-select');
const popupLanguageSelect = document.getElementById('popup-language-select');
const startOnStartupToggle = document.getElementById('start-on-startup-toggle');
const startMinimizedToggle = document.getElementById('start-minimized-toggle');
const createShortcutBtn = document.getElementById('create-shortcut-btn');
const createShortcutStatus = document.getElementById('create-shortcut-status');

function detectBrowserLanguage() {
  const languages = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];
  const hasSpanish = languages.some((lang) => (lang || '').toLowerCase().startsWith('es'));
  return hasSpanish ? 'es' : 'en';
}

function getUiLanguage() {
  if (uiLanguage === 'es' || uiLanguage === 'en') return uiLanguage;
  const fromConfig = currentConfig.shimejiLanguage;
  if (fromConfig === 'es' || fromConfig === 'en') return fromConfig;
  return detectBrowserLanguage();
}

function isSpanishLocale() {
  return getUiLanguage() === 'es';
}

function t(en, es) {
  return isSpanishLocale() ? es : en;
}

function appendProviderHelpLink(container, providerId) {
  const linkConfig = PROVIDER_HELP_LINKS[providerId];
  if (!linkConfig) return;

  const hint = document.createElement('div');
  hint.className = 'helper-text full-width';

  const anchor = document.createElement('a');
  anchor.href = linkConfig.href;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.textContent = isSpanishLocale() ? linkConfig.labelEs : linkConfig.labelEn;

  hint.appendChild(anchor);
  container.appendChild(hint);
}

function refreshNftCharacterCatalog(rawNfts) {
  const mergedMap = new Map();
  BUILTIN_NFT_CHARACTERS.forEach((item) => {
    if (item?.id) mergedMap.set(item.id, item);
  });
  const synced = Array.isArray(rawNfts) ? rawNfts : [];
  synced.forEach((item) => {
    if (item?.id) mergedMap.set(item.id, item);
  });
  nftCharacters = Array.from(mergedMap.values());
  nftCharacterIds = new Set(nftCharacters.map((item) => item.id).filter(Boolean));
}

function isNftCharacterId(value) {
  return nftCharacterIds.has(String(value || ''));
}

const IS_WINDOWS_PLATFORM = /win/i.test(`${navigator.platform || navigator.userAgent || ''}`);
const IS_MAC_PLATFORM = /mac/i.test(`${navigator.platform || navigator.userAgent || ''}`);
const DEFAULT_TERMINAL_PROFILE = IS_WINDOWS_PLATFORM ? 'Ubuntu' : '';
const TERMINAL_MODE_LABEL_EN = IS_WINDOWS_PLATFORM ? 'WSL Terminal' : (IS_MAC_PLATFORM ? 'Mac Terminal' : 'Terminal');
const TERMINAL_MODE_LABEL_ES = IS_WINDOWS_PLATFORM ? 'Terminal WSL' : (IS_MAC_PLATFORM ? 'Terminal Mac' : 'Terminal');
const TERMINAL_PROFILE_LABEL_EN = IS_WINDOWS_PLATFORM ? 'WSL Distro' : 'Shell';
const TERMINAL_PROFILE_LABEL_ES = IS_WINDOWS_PLATFORM ? 'Distro WSL' : 'Shell';
const TERMINAL_PROFILE_PLACEHOLDER = IS_WINDOWS_PLATFORM ? 'Ubuntu' : (IS_MAC_PLATFORM ? '/bin/zsh' : '/bin/bash');
const TERMINAL_HINT_EN = IS_WINDOWS_PLATFORM
  ? 'Chat messages are executed as shell commands in a persistent WSL session.'
  : 'Chat messages are executed as shell commands in a persistent local terminal session.';
const TERMINAL_HINT_ES = IS_WINDOWS_PLATFORM
  ? 'Los mensajes del chat se ejecutan como comandos de shell en una sesión WSL persistente.'
  : 'Los mensajes del chat se ejecutan como comandos de shell en una sesión local persistente.';

function normalizeTerminalProfile(rawValue) {
  const normalized = `${rawValue || ''}`.trim();
  if (IS_WINDOWS_PLATFORM) return normalized || DEFAULT_TERMINAL_PROFILE;
  if (!normalized) return '';
  if (/^ubuntu$/i.test(normalized) || /^wsl$/i.test(normalized)) return '';
  return normalized;
}

function getRandomTheme() {
  const themes = ['neural', 'pink', 'kawaii'];
  return themes[Math.floor(Math.random() * themes.length)];
}

function applyTheme(theme, forceRandomize = false) {
  const requested = String(theme || 'random');
  if (requested === 'random') {
    const canReuse = resolvedPopupTheme && resolvedPopupTheme !== 'random';
    resolvedPopupTheme = (!forceRandomize && canReuse) ? resolvedPopupTheme : getRandomTheme();
  } else {
    resolvedPopupTheme = requested;
  }
  document.body.dataset.theme = resolvedPopupTheme;
}

function populatePopupThemeSelect(value) {
  if (!popupThemeSelect) return;
  const selected = POPUP_THEME_OPTIONS.some((opt) => opt.value === value) ? value : 'random';
  popupThemeSelect.innerHTML = '';
  POPUP_THEME_OPTIONS.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = t(opt.labelEn, opt.labelEs);
    if (opt.value === selected) option.selected = true;
    popupThemeSelect.appendChild(option);
  });
}

function populateLanguageSelect(value) {
  if (!popupLanguageSelect) return;
  const selected = value === 'es' || value === 'en' ? value : detectBrowserLanguage();
  popupLanguageSelect.innerHTML = '';
  LANGUAGE_OPTIONS.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = t(opt.labelEn, opt.labelEs);
    if (opt.value === selected) option.selected = true;
    popupLanguageSelect.appendChild(option);
  });
}

function setPopupLabels() {
  const byId = (id) => document.getElementById(id);
  const setText = (id, text) => {
    const el = byId(id);
    if (el) el.textContent = text;
  };

  setText('popup-subtitle', t('Your AI mascot orchestrator', 'Tu orquestador de mascotas AI'));
  setText('shortcuts-title', t('Shortcuts', 'Atajos'));
  setText('shortcuts-hint', t('Click a shimeji to open chat. Drag to reposition with gravity. Double-click to jump.', 'Haz clic en un shimeji para abrir chat. Arrástralo para moverlo con gravedad. Doble clic para saltar.'));
  setText('global-shimeji-label', t('Show all shimejis', 'Mostrar todos los shimejis'));
  setText('global-shimeji-hint', t('Toggle to show or hide all shimejis on screen', 'Activa o desactiva para mostrar u ocultar todos los shimejis en pantalla'));
  setText('presence-title', t('Visibility', 'Visibilidad'));
  setText('label-enabled-all-sites', t('Enabled on desktop', 'Habilitado en escritorio'));
  setText('label-enabled-page', t('Enable on this app', 'Habilitar en esta app'));
  setText('startup-label', t('Start Shimeji on system login', 'Iniciar Shimeji al iniciar el sistema'));
  setText('startup-hint', t('Launch the desktop app automatically when you sign into Windows, macOS, or Linux.', 'Inicia la app automáticamente cuando ingresas a Windows, macOS o Linux.'));
  setText('shimeji-section-title', t('Shimejis', 'Shimejis'));
  setText('shimeji-limit-hint', t('Up to 5 shimejis on screen', 'Hasta 5 shimejis en pantalla'));
  setText('nft-section-title', t('NFT Shimejis', 'Shimejis NFT'));
  setText('nft-hint', t('NFT collection syncing is coming soon on desktop.', 'La sincronización de colección NFT llegará pronto en desktop.'));
  setText('link-nft-collection', t('Manage Collection', 'Gestionar colección'));
  setText('security-title', t('Security', 'Seguridad'));
  setText('security-hint', t('Desktop security controls are coming soon.', 'Los controles de seguridad para desktop llegarán pronto.'));
  setText('masterkey-label', t('Protect keys with master key', 'Proteger claves con llave maestra'));
  setText('autolock-label', t('Auto-lock', 'Auto-bloqueo'));
  setText('popup-theme-label', t('Popup Theme', 'Tema del popup'));
  setText('popup-theme-note', t('Applies instantly to desktop settings.', 'Se aplica al instante en la configuración de desktop.'));
  setText('popup-language-label', t('Language', 'Idioma'));
  setText('popup-language-note', t('Changes labels in settings and chat UI.', 'Cambia etiquetas en configuración y en la UI del chat.'));
  setText('link-feedback', t('Feedback', 'Feedback'));
  setText('link-privacy', t('Privacy', 'Privacidad'));

  if (addShimejiBtn) addShimejiBtn.setAttribute('aria-label', t('Add shimeji', 'Agregar shimeji'));
}

async function openExternalUrlWithBrowserChoice(url, context = 'external-link') {
  const safeUrl = String(url || '').trim();
  if (!safeUrl) return;

  if (window.shimejiApi?.openUrlWithBrowserChoice) {
    try {
      await window.shimejiApi.openUrlWithBrowserChoice({
        url: safeUrl,
        locale: getUiLanguage(),
        context
      });
      return;
    } catch {}
  }

  window.open(safeUrl, '_blank', 'noopener,noreferrer');
}

// Store API config in memory for restoration when adding new shimejis
let globalApiConfig = {
  openrouterApiKey: '',
  openrouterModel: 'random',
  ollamaUrl: 'http://127.0.0.1:11434',
  ollamaModel: 'gemma3:1b',
  openclawUrl: 'ws://127.0.0.1:18789',
  openclawToken: '',
  openclawGatewayUrl: 'ws://127.0.0.1:18789',
  openclawGatewayToken: '',
  openclawAgentName: 'desktop-shimeji-1',
  terminalDistro: DEFAULT_TERMINAL_PROFILE,
  terminalCwd: '',
  terminalNotifyOnFinish: true
};

const DEFAULT_OLLAMA_MODEL = 'gemma3:1b';
const OPENCLAW_AGENT_NAME_MAX = 32;
const ollamaModelCatalog = new Map(); // shimejiId -> string[]
const ollamaModelStatus = new Map(); // shimejiId -> status text
const ollamaModelLoading = new Set(); // shimejiId currently refreshing

function defaultOpenClawAgentName(indexOrId) {
  if (typeof indexOrId === 'number') {
    return `desktop-shimeji-${indexOrId + 1}`;
  }
  const match = String(indexOrId || '').match(/(\d+)/);
  const suffix = match ? match[1] : '1';
  return `desktop-shimeji-${suffix}`;
}

function normalizeOpenClawAgentName(rawValue, fallback) {
  const fallbackName = String(fallback || 'desktop-shimeji-1').slice(0, OPENCLAW_AGENT_NAME_MAX);
  const normalized = String(rawValue || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, OPENCLAW_AGENT_NAME_MAX);
  return normalized || fallbackName;
}

function normalizeMode(value) {
  if (value === 'off' || value === 'disabled' || value === 'decorative') return 'off';
  if (value === 'agent' || value === 'openclaw') return 'agent';
  if (value === 'terminal' || value === 'wsl' || value === 'shell') return 'terminal';
  return 'standard';
}

function normalizeShimejiIds(list) {
  if (!Array.isArray(list)) return [];
  return list.map((shimeji, index) => {
    const presetId = inferThemePreset(shimeji || {});
    const preset = CHAT_THEME_PRESETS.find((theme) => theme.id === presetId) || CHAT_THEME_PRESETS[0];
    const chatThemeColor = shimeji?.chatThemeColor || preset.theme;
    const chatBgColor = shimeji?.chatBgColor || preset.bg;
    const chatBubbleStyle = shimeji?.chatBubbleStyle || preset.bubble || 'glass';
    const id = `shimeji-${index + 1}`;
    const character = shimeji?.character || CHARACTER_OPTIONS[0]?.id || 'shimeji';
    const inferredSource = isNftCharacterId(character) ? 'nft' : 'free';
    const characterSource = shimeji?.characterSource === 'nft' || shimeji?.characterSource === 'free'
      ? shimeji.characterSource
      : inferredSource;
    return {
      ...shimeji,
      id,
      character,
      characterSource,
      mode: normalizeMode(shimeji?.mode),
      standardProvider: shimeji?.standardProvider || 'openrouter',
      chatTheme: shimeji?.chatTheme || preset.id,
      chatThemePreset: shimeji?.chatThemePreset || presetId || 'custom',
      chatThemeColor,
      chatBgColor,
      chatBubbleStyle,
      chatFontSize: shimeji?.chatFontSize || 'medium',
      chatWidth: shimeji?.chatWidth || 'medium',
      chatWidthPx: typeof shimeji?.chatWidthPx === 'number' ? shimeji.chatWidthPx : null,
      chatHeightPx: typeof shimeji?.chatHeightPx === 'number' ? shimeji.chatHeightPx : 340,
      soundEnabled: shimeji?.soundEnabled !== false,
      soundVolume: typeof shimeji?.soundVolume === 'number' ? shimeji.soundVolume : 0.7,
      ttsEnabled: shimeji?.ttsEnabled === true,
      ttsVoiceProfile: shimeji?.ttsVoiceProfile || pickRandomVoiceProfile(),
      ttsVoiceId: shimeji?.ttsVoiceId || '',
      openMicEnabled: shimeji?.openMicEnabled === true,
      sttProvider: shimeji?.sttProvider || 'groq',
      sttApiKey: shimeji?.sttApiKey || '',
      relayEnabled: shimeji?.relayEnabled === true,
      terminalDistro: normalizeTerminalProfile(shimeji?.terminalDistro),
      terminalCwd: `${shimeji?.terminalCwd || ''}`.trim(),
      terminalNotifyOnFinish: shimeji?.terminalNotifyOnFinish !== false,
      openclawAgentName: normalizeOpenClawAgentName(
        shimeji?.openclawAgentName,
        defaultOpenClawAgentName(index)
      )
    };
  });
}

function pickRandomVoiceProfile() {
  const pool = TTS_VOICE_OPTIONS.filter((option) => option.value !== 'random');
  const selected = pool[Math.floor(Math.random() * pool.length)];
  return selected?.value || 'random';
}

function inferThemePreset(shimeji) {
  if (shimeji.chatThemePreset === 'random') return 'random';
  if (shimeji.chatThemePreset === 'custom') return 'custom';
  const themeColor = String(shimeji.chatThemeColor || '').toLowerCase();
  const bgColor = String(shimeji.chatBgColor || '').toLowerCase();
  const bubbleStyle = String(shimeji.chatBubbleStyle || 'glass').toLowerCase();
  const match = CHAT_THEME_PRESETS.find((preset) => (
    preset.theme.toLowerCase() === themeColor
    && preset.bg.toLowerCase() === bgColor
    && preset.bubble.toLowerCase() === bubbleStyle
  ));
  return match?.id || shimeji.chatTheme || 'custom';
}

function updateStats() {
  const status = currentConfig.enabled ? t('Active', 'Activo') : t('Inactive', 'Inactivo');
  const count = shimejis.length;
  const ai = currentConfig.aiMode === 'off'
    ? t('No AI', 'Sin AI')
    : (currentConfig.aiMode || 'standard');
  statsEl.textContent = `${status} · ${count} shimeji${count !== 1 ? 's' : ''} · ${ai}`;
}

function updateAIModeVisibility() {
  const mode = aiModeSelect?.value || 'off';
  if (openRouterConfig) openRouterConfig.style.display = mode === 'openrouter' ? 'block' : 'none';
  if (ollamaConfig) ollamaConfig.style.display = mode === 'ollama' ? 'block' : 'none';
  if (openclawConfig) openclawConfig.style.display = mode === 'openclaw' ? 'block' : 'none';
  if (testConfig) testConfig.style.display = mode !== 'off' ? 'block' : 'none';
}

function saveShimejis() {
  shimejis = normalizeShimejiIds(shimejis);

  // Save API config from first shimeji if available
  if (shimejis.length > 0) {
    const first = shimejis[0];
    globalApiConfig = {
      openrouterApiKey: first.openrouterApiKey || '',
      openrouterModel: first.openrouterModel || 'random',
      ollamaUrl: first.ollamaUrl || 'http://127.0.0.1:11434',
      ollamaModel: first.ollamaModel || 'gemma3:1b',
      openclawUrl: first.openclawUrl || 'ws://127.0.0.1:18789',
      openclawToken: first.openclawToken || '',
      openclawGatewayUrl: first.openclawGatewayUrl || 'ws://127.0.0.1:18789',
      openclawGatewayToken: first.openclawGatewayToken || '',
      openclawAgentName: normalizeOpenClawAgentName(first.openclawAgentName, defaultOpenClawAgentName(first.id || 0)),
      terminalDistro: normalizeTerminalProfile(first.terminalDistro),
      terminalCwd: `${first.terminalCwd || ''}`.trim(),
      terminalNotifyOnFinish: first.terminalNotifyOnFinish !== false
    };
  }
  
  const config = {
    shimejiCount: shimejis.length,
    shimejis: shimejis
  };
  if (window.shimejiApi) {
    window.shimejiApi.updateConfig(config);
  }
}

function selectShimeji(index) {
  selectedShimejiIndex = index;
  renderShimejiSelector();
  renderShimejiCards();
}

function addShimeji() {
  if (shimejis.length >= MAX_SHIMEJIS) return;

  const newIndex = shimejis.length;
  const firstShimeji = shimejis[0];
  
  // Use existing shimeji config or fall back to globalApiConfig
  const configSource = firstShimeji || globalApiConfig;
  
  const newShimeji = {
    id: `shimeji-${newIndex + 1}`,
    character: CHARACTER_OPTIONS[newIndex % CHARACTER_OPTIONS.length].id,
    characterSource: 'free',
    size: 'medium',
    personality: 'random',
    chatTheme: configSource?.chatTheme || 'pastel',
    chatThemePreset: configSource?.chatThemePreset || configSource?.chatTheme || 'pastel',
    chatThemeColor: configSource?.chatThemeColor || '#3b1a77',
    chatBgColor: configSource?.chatBgColor || '#f0e8ff',
    chatBubbleStyle: configSource?.chatBubbleStyle || 'glass',
    chatFontSize: configSource?.chatFontSize || 'medium',
    chatWidth: configSource?.chatWidth || 'medium',
    chatWidthPx: typeof configSource?.chatWidthPx === 'number' ? configSource.chatWidthPx : null,
    chatHeightPx: typeof configSource?.chatHeightPx === 'number' ? configSource.chatHeightPx : 340,
    soundEnabled: configSource?.soundEnabled !== false,
    soundVolume: typeof configSource?.soundVolume === 'number' ? configSource.soundVolume : 0.7,
    ttsEnabled: configSource?.ttsEnabled === true,
    ttsVoiceProfile: configSource?.ttsVoiceProfile || pickRandomVoiceProfile(),
    ttsVoiceId: configSource?.ttsVoiceId || '',
    openMicEnabled: configSource?.openMicEnabled === true,
    sttProvider: configSource?.sttProvider || 'groq',
    sttApiKey: configSource?.sttApiKey || '',
    relayEnabled: configSource?.relayEnabled === true,
    enabled: true,
    // Copy AI config from shimeji-1 or use stored global config
    mode: normalizeMode(configSource?.mode),
    standardProvider: configSource?.standardProvider || 'openrouter',
    openrouterApiKey: configSource?.openrouterApiKey || globalApiConfig.openrouterApiKey,
    openrouterModel: configSource?.openrouterModel || globalApiConfig.openrouterModel,
    ollamaUrl: configSource?.ollamaUrl || globalApiConfig.ollamaUrl,
    ollamaModel: configSource?.ollamaModel || globalApiConfig.ollamaModel,
    openclawUrl: configSource?.openclawUrl || globalApiConfig.openclawUrl,
    openclawToken: configSource?.openclawToken || globalApiConfig.openclawToken,
    openclawGatewayUrl: configSource?.openclawGatewayUrl || globalApiConfig.openclawGatewayUrl,
    openclawGatewayToken: configSource?.openclawGatewayToken || globalApiConfig.openclawGatewayToken,
    openclawAgentName: normalizeOpenClawAgentName(
      configSource?.openclawAgentName || globalApiConfig.openclawAgentName,
      defaultOpenClawAgentName(newIndex)
    ),
    terminalDistro: normalizeTerminalProfile(configSource?.terminalDistro || globalApiConfig.terminalDistro),
    terminalCwd: `${configSource?.terminalCwd || globalApiConfig.terminalCwd || ''}`.trim(),
    terminalNotifyOnFinish: configSource?.terminalNotifyOnFinish !== false
  };

  shimejis.push(newShimeji);
  selectShimeji(newIndex);
  saveShimejis();
}

function removeShimeji(index) {
  // Allow removing all shimejis, but keep API config in memory

  shimejis.splice(index, 1);
  shimejis = normalizeShimejiIds(shimejis);
  if (selectedShimejiIndex >= shimejis.length) {
    selectedShimejiIndex = shimejis.length - 1;
  }
  selectShimeji(selectedShimejiIndex);
  saveShimejis();
}

function updateShimejiConfig(index, updates) {
  if (shimejis[index]) {
    shimejis[index] = { ...shimejis[index], ...updates };
    saveShimejis();
    renderShimejiCards();
  }
}

function renderShimejiSelector() {
  shimejiSelector.innerHTML = '';
  shimejis.forEach((shimeji, index) => {
    const btn = document.createElement('button');
    btn.className = `shimeji-selector-btn${index === selectedShimejiIndex ? ' active' : ''}`;
    btn.textContent = index + 1;
    btn.addEventListener('click', () => selectShimeji(index));
    shimejiSelector.appendChild(btn);
  });

  if (addShimejiBtn) addShimejiBtn.disabled = shimejis.length >= MAX_SHIMEJIS;
}

function renderSelectField(field, labelText, options, value, { disabled = false, className = '' } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `ai-field${className ? ` ${className}` : ''}${disabled ? ' is-disabled' : ''}`;
  if (labelText) {
    const label = document.createElement('label');
    label.className = 'ai-label';
    label.textContent = labelText;
    wrapper.appendChild(label);
  }
  const select = document.createElement('select');
  select.className = 'ai-select';
  select.dataset.field = field;
  select.disabled = disabled;
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = isSpanishLocale()
      ? (opt.labelEs || opt.labelEn || opt.label || opt.value)
      : (opt.labelEn || opt.labelEs || opt.label || opt.value);
    if (opt.disabled) option.disabled = true;
    select.appendChild(option);
  });
  select.value = value ?? (options[0]?.value || '');
  wrapper.appendChild(select);
  return wrapper;
}

function renderCharacterField(shimeji) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ai-field character-field full-width';

  const label = document.createElement('label');
  label.className = 'ai-label';
  label.textContent = t('Character', 'Personaje');

  const toggleRow = document.createElement('div');
  toggleRow.className = 'character-source-toggle';

  const isNft = isNftCharacterId(shimeji.character);
  const source = shimeji.characterSource || (isNft ? 'nft' : 'free');

  const freeBtn = document.createElement('button');
  freeBtn.type = 'button';
  freeBtn.className = 'character-source-btn';
  freeBtn.dataset.action = 'character-source';
  freeBtn.dataset.source = 'free';
  freeBtn.textContent = t('Free', 'Free');
  if (source === 'free') freeBtn.classList.add('active');

  const nftBtn = document.createElement('button');
  nftBtn.type = 'button';
  nftBtn.className = 'character-source-btn';
  nftBtn.dataset.action = 'character-source';
  nftBtn.dataset.source = 'nft';
  nftBtn.textContent = t('NFT', 'NFT');
  if (source === 'nft') nftBtn.classList.add('active');

  toggleRow.appendChild(freeBtn);
  toggleRow.appendChild(nftBtn);

  const freeOptions = CHARACTER_OPTIONS.map((opt) => ({
    value: opt.id,
    labelEn: opt.labelEn,
    labelEs: opt.labelEs
  }));
  const freeFallback = freeOptions[0]?.value || 'shimeji';
  const freeSelect = renderSelectField(
    'character',
    '',
    freeOptions,
    source === 'free' && !isNft ? shimeji.character : freeFallback
  );
  const freeSelectEl = freeSelect.querySelector('select');
  if (freeSelectEl) freeSelectEl.dataset.source = 'free';
  freeSelect.classList.add('character-select');
  if (source === 'nft') freeSelect.classList.add('hidden');

  const nftOptions = nftCharacters
    .filter((nft) => nft?.id)
    .map((nft) => {
      const isBuiltinEgg = String(nft.id || '').toLowerCase() === 'egg';
      const label = isBuiltinEgg
        ? t('Egg', 'Huevo')
        : (nft.name || nft.id || 'NFT');
      return {
        value: nft.id,
        labelEn: label,
        labelEs: label
      };
    });
  if (nftOptions.length === 0) {
    nftOptions.push({
      value: '',
      labelEn: t('No NFT characters', 'Sin personajes NFT'),
      labelEs: t('No NFT characters', 'Sin personajes NFT'),
      disabled: true
    });
  }
  const nftSelect = renderSelectField(
    'character',
    '',
    nftOptions,
    source === 'nft' && isNft ? shimeji.character : (nftOptions[0]?.value || '')
  );
  const nftSelectEl = nftSelect.querySelector('select');
  if (nftSelectEl) nftSelectEl.dataset.source = 'nft';
  nftSelect.classList.add('character-select');
  if (source !== 'nft') nftSelect.classList.add('hidden');

  const ctaInline = document.createElement('a');
  ctaInline.href = 'https://www.shimeji.dev/auction';
  ctaInline.target = '_blank';
  ctaInline.rel = 'noopener noreferrer';
  ctaInline.className = 'shimeji-nft-cta inline';
  ctaInline.textContent = t('Get a Shimeji NFT', 'Conseguí un Shimeji NFT');

  wrapper.appendChild(label);
  wrapper.appendChild(toggleRow);
  wrapper.appendChild(freeSelect);
  wrapper.appendChild(nftSelect);
  wrapper.appendChild(ctaInline);
  return wrapper;
}

function renderToggleField(field, labelText, value, { disabled = false, className = '' } = {}) {
  const wrapper = document.createElement('label');
  wrapper.className = `toggle-row${className ? ` ${className}` : ''}${disabled ? ' is-disabled' : ''}`;
  const label = document.createElement('span');
  label.className = 'toggle-label';
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'toggle-checkbox';
  input.dataset.field = field;
  input.checked = !!value;
  input.disabled = disabled;
  const slider = document.createElement('span');
  slider.className = 'toggle-slider';
  wrapper.appendChild(label);
  wrapper.appendChild(input);
  wrapper.appendChild(slider);
  return wrapper;
}

function renderRangeField(field, labelText, value, { disabled = false, className = '' } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `ai-field${className ? ` ${className}` : ''}${disabled ? ' is-disabled' : ''}`;
  const label = document.createElement('label');
  label.className = 'ai-label';
  label.textContent = labelText;
  const row = document.createElement('div');
  row.className = 'range-row';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '1';
  input.step = '0.05';
  input.value = value ?? 0.7;
  input.dataset.field = field;
  input.className = 'ai-range';
  input.disabled = disabled;
  row.appendChild(input);
  wrapper.appendChild(label);
  wrapper.appendChild(row);
  return wrapper;
}

function renderInputField(field, labelText, value, type, placeholder, { disabled = false, className = '' } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `ai-field${className ? ` ${className}` : ''}${disabled ? ' is-disabled' : ''}`;
  const label = document.createElement('label');
  label.className = 'ai-label';
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = type;
  input.className = 'ai-input';
  input.value = value || '';
  input.placeholder = placeholder || '';
  input.dataset.field = field;
  input.disabled = disabled;
  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
}

function setOllamaSelectOptions(selectEl, modelNames, currentModel) {
  if (!selectEl) return;
  selectEl.innerHTML = '';

  const customOption = document.createElement('option');
  customOption.value = 'custom';
  customOption.textContent = t('Custom model', 'Modelo personalizado');
  selectEl.appendChild(customOption);

  modelNames.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    selectEl.appendChild(option);
  });

  const selected = (currentModel || '').trim();
  selectEl.value = selected && modelNames.includes(selected) ? selected : 'custom';
}

function getOllamaStatus(shimejiId) {
  return ollamaModelStatus.get(shimejiId) || t('Refresh to fetch local Ollama models.', 'Pulsa actualizar para cargar modelos locales de Ollama.');
}

async function refreshOllamaModelsForShimeji(index) {
  const shimeji = shimejis[index];
  if (!shimeji || !window.shimejiApi?.listOllamaModels) return;

  const shimejiId = shimeji.id;
  ollamaModelLoading.add(shimejiId);
  ollamaModelStatus.set(shimejiId, t('Loading models...', 'Cargando modelos...'));
  renderShimejiCards();

  try {
    const result = await window.shimejiApi.listOllamaModels({
      shimejiId,
      ollamaUrl: shimeji.ollamaUrl || 'http://127.0.0.1:11434'
    });

    if (result?.ok) {
      const names = Array.isArray(result.models) ? result.models : [];
      ollamaModelCatalog.set(shimejiId, names);
      ollamaModelStatus.set(
        shimejiId,
        names.length > 0
          ? t(`Found ${names.length} local model${names.length > 1 ? 's' : ''}.`, `Se encontraron ${names.length} modelos locales.`)
          : t('Connected, but no models were found.', 'Conectado, pero no se encontraron modelos.')
      );
    } else {
      ollamaModelCatalog.set(shimejiId, []);
      const error = String(result?.error || '');
      const url = result?.url || shimeji.ollamaUrl || 'http://127.0.0.1:11434';
      if (error.startsWith('OLLAMA_HTTP_ONLY:')) {
        ollamaModelStatus.set(shimejiId, t('Invalid Ollama URL protocol. Use HTTP, for example: http://127.0.0.1:11434', 'Protocolo de URL de Ollama inválido. Usa HTTP, por ejemplo: http://127.0.0.1:11434'));
      } else if (error.startsWith('OLLAMA_FORBIDDEN:')) {
        ollamaModelStatus.set(shimejiId, t(`Ollama rejected this request (403) at ${url}.`, `Ollama rechazó esta solicitud (403) en ${url}.`));
      } else if (error.startsWith('OLLAMA_HTTP_')) {
        ollamaModelStatus.set(shimejiId, t(`Ollama returned an HTTP error at ${url}.`, `Ollama devolvió un error HTTP en ${url}.`));
      } else {
        ollamaModelStatus.set(shimejiId, t(`Could not reach Ollama at ${url}.`, `No se pudo conectar a Ollama en ${url}.`));
      }
    }
  } catch {
    ollamaModelCatalog.set(shimejiId, []);
    ollamaModelStatus.set(shimejiId, t('Could not fetch Ollama models.', 'No se pudieron obtener los modelos de Ollama.'));
  } finally {
    ollamaModelLoading.delete(shimejiId);
    renderShimejiCards();
  }
}

function renderShimejiCards() {
  refreshNftCharacterCatalog(currentConfig?.nftCharacters);
  shimejiList.innerHTML = '';
  if (shimejiEmpty) {
    shimejiEmpty.style.display = shimejis.length === 0 ? 'block' : 'none';
    if (shimejis.length === 0) {
      shimejiEmpty.textContent = t(
        'No shimejis active. Press the + button to add one.',
        'No hay shimejis activos. Pulsa el botón + para agregar uno.'
      );
    }
  }

  shimejis.forEach((shimeji, index) => {
    const card = document.createElement('div');
    card.className = `shimeji-card${index !== selectedShimejiIndex ? ' hidden' : ''}`;
    card.dataset.index = String(index);

    const header = document.createElement('div');
    header.className = 'shimeji-card-header';
    const titleWrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'shimeji-card-title';
    title.textContent = `Shimeji ${index + 1}`;
    const idText = document.createElement('div');
    idText.className = 'shimeji-card-id';
    idText.textContent = shimeji.id;
    titleWrap.appendChild(title);
    titleWrap.appendChild(idText);

    const headerActions = document.createElement('div');
    headerActions.className = 'shimeji-card-actions';
    const activeToggle = renderToggleField('enabled', '', shimeji.enabled !== false, { className: 'mini-toggle header-active-toggle' });
    const removeBtn = document.createElement('button');
    removeBtn.className = 'control-btn remove-btn';
    removeBtn.textContent = '❌';
    removeBtn.dataset.action = 'remove';
    removeBtn.disabled = shimejis.length <= 1;
    headerActions.appendChild(activeToggle);
    headerActions.appendChild(removeBtn);

    header.appendChild(titleWrap);
    header.appendChild(headerActions);

    const preview = document.createElement('div');
    preview.className = 'shimeji-preview';
    const previewSprite = document.createElement('div');
    previewSprite.className = 'shimeji-preview-sprite';
    previewSprite.style.width = '56px';
    previewSprite.style.height = '56px';
    previewSprite.style.backgroundImage = `url(characters/${shimeji.character || 'shimeji'}/stand-neutral.png)`;
    preview.appendChild(previewSprite);

    const grid = document.createElement('div');
    grid.className = 'shimeji-grid';

    grid.appendChild(renderCharacterField(shimeji));
    grid.appendChild(renderSelectField('personality', t('Personality', 'Personalidad'), PERSONALITY_OPTIONS, shimeji.personality || 'cryptid'));
    grid.appendChild(renderSelectField('size', t('Size', 'Tamaño'), SIZE_OPTIONS, shimeji.size || 'medium'));
    grid.appendChild(renderToggleField('soundEnabled', t('Notifications', 'Notificaciones'), shimeji.soundEnabled !== false));
    grid.appendChild(renderRangeField('soundVolume', t('Volume', 'Volumen'), shimeji.soundVolume ?? 0.7));
    grid.appendChild(renderToggleField('ttsEnabled', t('Read Aloud', 'Leer en voz alta'), !!shimeji.ttsEnabled));
    grid.appendChild(renderSelectField('ttsVoiceProfile', t('Voice', 'Voz'), TTS_VOICE_OPTIONS, shimeji.ttsVoiceProfile || 'random'));
    grid.appendChild(renderToggleField('openMicEnabled', t('Open Mic', 'Micrófono abierto'), !!shimeji.openMicEnabled));

    const sttProvider = shimeji.sttProvider || 'groq';
    grid.appendChild(renderSelectField('sttProvider', t('Voice Input (STT)', 'Entrada de voz (STT)'), [
      { value: 'groq', labelEn: 'Groq (free tier)', labelEs: 'Groq (gratis)' },
      { value: 'openai', labelEn: 'OpenAI', labelEs: 'OpenAI' }
    ], sttProvider));
    grid.appendChild(renderInputField('sttApiKey', t('STT API Key', 'API Key STT'), shimeji.sttApiKey || '', 'password', t('Paste your API key', 'Pega tu API key')));
    const sttHint = document.createElement('div');
    sttHint.className = 'helper-text full-width';
    sttHint.innerHTML = sttProvider === 'openai'
      ? t('Get a key at <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a>', 'Obtén una key en <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a>')
      : t('Get a free key at <a href="https://console.groq.com/keys" target="_blank">console.groq.com</a>', 'Obtén una key gratis en <a href="https://console.groq.com/keys" target="_blank">console.groq.com</a>');
    grid.appendChild(sttHint);

    grid.appendChild(renderToggleField('relayEnabled', t('Talk to other shimejis', 'Hablar con otros shimejis'), !!shimeji.relayEnabled, { className: 'full-width' }));

    const mode = normalizeMode(shimeji.mode);
    const provider = shimeji.standardProvider || 'openrouter';

    const aiBrain = renderSelectField('mode', t('AI Brain', 'Cerebro AI'), [
      { value: 'standard', labelEn: 'Standard (API key only)', labelEs: 'Standard (solo API key)' },
      { value: 'agent', labelEn: 'AI Agent', labelEs: 'AI Agent' },
      { value: 'terminal', labelEn: TERMINAL_MODE_LABEL_EN, labelEs: TERMINAL_MODE_LABEL_ES },
      { value: 'off', labelEn: 'Off', labelEs: 'Apagado' }
    ], mode, { className: 'full-width ai-core-field' });

    const aiCorePanel = document.createElement('div');
    aiCorePanel.className = 'ai-core-panel';
    aiCorePanel.appendChild(aiBrain);

    if (mode === 'standard') {
      aiCorePanel.appendChild(renderSelectField('standardProvider', t('Provider', 'Proveedor'), [
        { value: 'openrouter', labelEn: 'OpenRouter', labelEs: 'OpenRouter' },
        { value: 'ollama', labelEn: 'Ollama', labelEs: 'Ollama' }
      ], provider, { className: 'ai-core-field' }));

      if (provider === 'openrouter') {
        aiCorePanel.appendChild(renderInputField('openrouterApiKey', 'API Key', shimeji.openrouterApiKey, 'password', t('Paste your OpenRouter API key', 'Pega tu API key de OpenRouter'), { className: 'ai-core-field' }));
        aiCorePanel.appendChild(renderSelectField('openrouterModel', t('Model', 'Modelo'), [
          { value: 'random', labelEn: 'Random', labelEs: 'Aleatorio' },
          { value: 'google/gemini-2.0-flash-001', labelEn: 'Gemini 2.0 Flash', labelEs: 'Gemini 2.0 Flash' },
          { value: 'anthropic/claude-sonnet-4', labelEn: 'Claude Sonnet 4', labelEs: 'Claude Sonnet 4' },
          { value: 'meta-llama/llama-4-maverick', labelEn: 'Llama 4 Maverick', labelEs: 'Llama 4 Maverick' }
        ], shimeji.openrouterModel || 'random', { className: 'ai-core-field' }));
      } else if (provider === 'ollama') {
        aiCorePanel.appendChild(renderInputField('ollamaUrl', 'Ollama URL', shimeji.ollamaUrl || 'http://127.0.0.1:11434', 'text', 'http://127.0.0.1:11434', { className: 'ai-core-field' }));
        aiCorePanel.appendChild(renderInputField('ollamaModel', t('Model', 'Modelo'), shimeji.ollamaModel || DEFAULT_OLLAMA_MODEL, 'text', DEFAULT_OLLAMA_MODEL, { className: 'ai-core-field' }));

        const detectedField = document.createElement('div');
        detectedField.className = 'ai-field ai-core-field';

        const detectedLabel = document.createElement('label');
        detectedLabel.className = 'ai-label';
        detectedLabel.textContent = t('Detected models', 'Modelos detectados');

        const detectedRow = document.createElement('div');
        detectedRow.className = 'ollama-model-row';

        const select = document.createElement('select');
        select.className = 'ai-select';
        select.dataset.field = 'ollamaModelSelect';
        select.dataset.shimejiId = shimeji.id;
        select.id = `select-ollamaModel-${shimeji.id}`;
        const modelNames = ollamaModelCatalog.get(shimeji.id) || [];
        setOllamaSelectOptions(select, modelNames, shimeji.ollamaModel || DEFAULT_OLLAMA_MODEL);
        if (ollamaModelLoading.has(shimeji.id)) {
          select.disabled = true;
        }

        const refreshBtn = document.createElement('button');
        refreshBtn.type = 'button';
        refreshBtn.className = 'control-btn mini-btn';
        refreshBtn.dataset.action = 'refresh-ollama-models';
        refreshBtn.dataset.shimejiId = shimeji.id;
        refreshBtn.textContent = ollamaModelLoading.has(shimeji.id) ? t('Loading...', 'Cargando...') : t('Refresh', 'Actualizar');
        refreshBtn.disabled = ollamaModelLoading.has(shimeji.id);

        detectedRow.appendChild(select);
        detectedRow.appendChild(refreshBtn);
        detectedField.appendChild(detectedLabel);
        detectedField.appendChild(detectedRow);

        const hint = document.createElement('div');
        hint.className = 'helper-text';
        hint.textContent = getOllamaStatus(shimeji.id);
        detectedField.appendChild(hint);

        aiCorePanel.appendChild(detectedField);
      }
      appendProviderHelpLink(aiCorePanel, provider);
    } else if (mode === 'agent') {
      aiCorePanel.appendChild(renderInputField('openclawGatewayUrl', t('Gateway URL', 'URL del Gateway'), shimeji.openclawGatewayUrl || 'ws://127.0.0.1:18789', 'text', 'ws://127.0.0.1:18789', { className: 'ai-core-field' }));
      aiCorePanel.appendChild(
        renderInputField(
          'openclawAgentName',
          t('Agent Name', 'Nombre del agente'),
          shimeji.openclawAgentName || defaultOpenClawAgentName(index),
          'text',
          defaultOpenClawAgentName(index),
          { className: 'ai-core-field' }
        )
      );
      aiCorePanel.appendChild(renderInputField('openclawGatewayToken', t('Gateway Auth Token', 'Token de Auth del Gateway'), shimeji.openclawGatewayToken, 'password', t('Enter gateway auth token', 'Ingresa el token de auth del gateway'), { className: 'ai-core-field' }));
      const openclawTokenHint = document.createElement('div');
      openclawTokenHint.className = 'helper-text';
      openclawTokenHint.textContent = t(
        'To get the token run: openclaw config get gateway.auth.token',
        'Para obtener el token ejecuta: openclaw config get gateway.auth.token'
      );
      aiCorePanel.appendChild(openclawTokenHint);
      const openclawNameHint = document.createElement('div');
      openclawNameHint.className = 'helper-text';
      openclawNameHint.textContent = t(
        "Agent name rules: letters, numbers, '-' and '_' only (max 32).",
        "Reglas del nombre del agente: solo letras, números, '-' y '_' (máx 32)."
      );
      aiCorePanel.appendChild(openclawNameHint);
      appendProviderHelpLink(aiCorePanel, 'openclaw');
    } else if (mode === 'terminal') {
      aiCorePanel.appendChild(
        renderInputField(
          'terminalDistro',
          t(TERMINAL_PROFILE_LABEL_EN, TERMINAL_PROFILE_LABEL_ES),
          normalizeTerminalProfile(shimeji.terminalDistro),
          'text',
          TERMINAL_PROFILE_PLACEHOLDER,
          { className: 'ai-core-field' }
        )
      );
      aiCorePanel.appendChild(
        renderInputField(
          'terminalCwd',
          t('Working directory', 'Directorio de trabajo'),
          shimeji.terminalCwd || '',
          'text',
          '/home/username',
          { className: 'ai-core-field' }
        )
      );
      aiCorePanel.appendChild(
        renderToggleField(
          'terminalNotifyOnFinish',
          t('Notify when task finishes', 'Notificar al terminar tarea'),
          shimeji.terminalNotifyOnFinish !== false,
          { className: 'full-width ai-core-field' }
        )
      );
      const terminalHint = document.createElement('div');
      terminalHint.className = 'helper-text';
      terminalHint.textContent = t(
        TERMINAL_HINT_EN,
        TERMINAL_HINT_ES
      );
      aiCorePanel.appendChild(terminalHint);
    }
    // mode === 'off' shows nothing extra

    const chatStyleBlock = document.createElement('div');
    chatStyleBlock.className = 'shimeji-chat-style-section';

    const chatStyleHeader = document.createElement('div');
    chatStyleHeader.className = 'chat-style-toggle open';
    chatStyleHeader.textContent = t('Chat Style', 'Estilo de chat');

    const chatStyleGrid = document.createElement('div');
    chatStyleGrid.className = 'chat-style-grid open';

    chatStyleGrid.appendChild(renderSelectField('chatThemePreset', t('Chat Theme', 'Tema de chat'), [
      { value: 'custom', labelEn: 'Custom', labelEs: 'Personalizado' },
      { value: 'random', labelEn: 'Random', labelEs: 'Aleatorio' },
      ...CHAT_THEME_OPTIONS
    ], inferThemePreset(shimeji)));
    chatStyleGrid.appendChild(renderInputField('chatThemeColor', t('Theme Color', 'Color del tema'), shimeji.chatThemeColor || '#3b1a77', 'color', '#3b1a77'));
    chatStyleGrid.appendChild(renderInputField('chatBgColor', t('Background', 'Fondo'), shimeji.chatBgColor || '#f0e8ff', 'color', '#f0e8ff'));
    chatStyleGrid.appendChild(renderSelectField('chatBubbleStyle', t('Bubble Style', 'Estilo de burbuja'), CHAT_BUBBLE_STYLES, shimeji.chatBubbleStyle || 'glass'));
    chatStyleGrid.appendChild(renderSelectField('chatFontSize', t('Font Size', 'Tamaño de texto'), [
      { value: 'small', labelEn: 'Small', labelEs: 'Pequeño' },
      { value: 'medium', labelEn: 'Medium', labelEs: 'Mediano' },
      { value: 'large', labelEn: 'Large', labelEs: 'Grande' }
    ], shimeji.chatFontSize || 'medium'));
    chatStyleGrid.appendChild(renderSelectField('chatWidth', t('Chat Width', 'Ancho del chat'), [
      { value: 'small', labelEn: 'Narrow', labelEs: 'Angosto' },
      { value: 'medium', labelEn: 'Medium', labelEs: 'Mediano' },
      { value: 'large', labelEn: 'Wide', labelEs: 'Ancho' }
    ], shimeji.chatWidth || 'medium'));

    chatStyleBlock.appendChild(chatStyleHeader);
    chatStyleBlock.appendChild(chatStyleGrid);

    card.appendChild(header);
    card.appendChild(preview);
    card.appendChild(grid);
    card.appendChild(aiCorePanel);
    card.appendChild(chatStyleBlock);
    shimejiList.appendChild(card);
  });
}

function applyConfig(next) {
  const previousLanguage = getUiLanguage();
  const previousPopupTheme = currentConfig.popupTheme || 'random';
  currentConfig = { ...currentConfig, ...next };
  refreshNftCharacterCatalog(currentConfig?.nftCharacters);
  if (next.shimejiLanguage !== undefined) {
    uiLanguage = next.shimejiLanguage === 'es' ? 'es' : (next.shimejiLanguage === 'en' ? 'en' : detectBrowserLanguage());
  } else if (!uiLanguage) {
    uiLanguage = currentConfig.shimejiLanguage === 'es' || currentConfig.shimejiLanguage === 'en'
      ? currentConfig.shimejiLanguage
      : detectBrowserLanguage();
  }
  const languageChanged = previousLanguage !== getUiLanguage();

  const popupTheme = currentConfig.popupTheme || 'random';
  const popupThemeChanged = popupTheme !== previousPopupTheme;
  applyTheme(popupTheme, popupThemeChanged);
  populatePopupThemeSelect(popupTheme);
  populateLanguageSelect(getUiLanguage());
  setPopupLabels();

  if (next.enabled !== undefined && enabledToggle) {
    enabledToggle.checked = !!next.enabled;
    enabledToggleRow?.classList.toggle('active', !!next.enabled);
  }

  if (next.shimejis) {
    shimejis = normalizeShimejiIds(next.shimejis);
    if (selectedShimejiIndex >= shimejis.length) {
      selectedShimejiIndex = Math.max(0, shimejis.length - 1);
    }
    renderShimejiSelector();
    renderShimejiCards();
  }

  if (next.shimejiCount !== undefined && !next.shimejis) {
    while (shimejis.length < next.shimejiCount) addShimeji();
    while (shimejis.length > next.shimejiCount) removeShimeji(shimejis.length - 1);
  }

  if (next.aiMode !== undefined && aiModeSelect) {
    aiModeSelect.value = next.aiMode;
  }

  if (next.openrouterApiKey !== undefined && openRouterKey) {
    openRouterKey.value = next.openrouterApiKey || '';
  }

  if (next.openrouterModel !== undefined && openRouterModel) {
    openRouterModel.value = next.openrouterModel || 'google/gemini-2.0-flash-001';
  }

  if (next.ollamaUrl !== undefined && ollamaUrl) {
    ollamaUrl.value = next.ollamaUrl || 'http://127.0.0.1:11434';
  }

  if (next.ollamaModel !== undefined && ollamaModel) {
    ollamaModel.value = next.ollamaModel || 'gemma3:1b';
  }

  if (next.openclawUrl !== undefined && openclawUrl) {
    openclawUrl.value = next.openclawUrl || 'ws://127.0.0.1:18789';
  }

  if (next.openclawToken !== undefined && openclawToken) {
    openclawToken.value = next.openclawToken || '';
  }

  if (next.showShimejis !== undefined && globalShimejiToggle) {
    globalShimejiToggle.checked = !!next.showShimejis;
  }

  if (next.startAtLogin !== undefined && startOnStartupToggle) {
    startOnStartupToggle.checked = !!next.startAtLogin;
  }

  if (next.startMinimized !== undefined && startMinimizedToggle) {
    startMinimizedToggle.checked = !!next.startMinimized;
  }

  if (languageChanged && !next.shimejis) {
    renderShimejiSelector();
    renderShimejiCards();
  }

  updateStats();
  updateAIModeVisibility();
}

function registerHandlers() {
  if (enabledToggle) {
    enabledToggle.addEventListener('change', () => {
      const enabled = enabledToggle.checked;
      enabledToggleRow?.classList.toggle('active', enabled);
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ enabled });
      }
      updateStats();
    });
  }

  // Global shimeji visibility toggle
  if (globalShimejiToggle) {
    globalShimejiToggle.addEventListener('change', () => {
      const showShimejis = globalShimejiToggle.checked;
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ showShimejis });
      }
      // Update visibility of all shimejis
      shimejis.forEach(s => {
        s.enabled = showShimejis;
      });
    });
  }

  if (startOnStartupToggle) {
    startOnStartupToggle.addEventListener('change', () => {
      const startAtLogin = startOnStartupToggle.checked;
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ startAtLogin });
      }
    });
  }

  if (startMinimizedToggle) {
    startMinimizedToggle.addEventListener('change', () => {
      const startMinimized = startMinimizedToggle.checked;
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ startMinimized });
      }
    });
  }

  // Show "Create Desktop Shortcut" button only on Windows
  if (createShortcutBtn && navigator.platform && navigator.platform.startsWith('Win')) {
    createShortcutBtn.style.display = '';
    createShortcutBtn.addEventListener('click', async () => {
      createShortcutBtn.disabled = true;
      createShortcutBtn.textContent = 'Creating...';
      if (createShortcutStatus) {
        createShortcutStatus.style.display = 'none';
      }
      try {
        const result = await window.shimejiApi.createDesktopShortcut();
        if (result?.ok) {
          createShortcutBtn.textContent = 'Create Desktop Shortcut';
          createShortcutBtn.disabled = false;
          if (createShortcutStatus) {
            createShortcutStatus.textContent = 'Shortcut created on your desktop!';
            createShortcutStatus.style.display = '';
          }
        } else {
          createShortcutBtn.textContent = 'Create Desktop Shortcut';
          createShortcutBtn.disabled = false;
          if (createShortcutStatus) {
            createShortcutStatus.textContent = result?.error || 'Failed to create shortcut';
            createShortcutStatus.style.display = '';
          }
        }
      } catch (err) {
        createShortcutBtn.textContent = 'Create Desktop Shortcut';
        createShortcutBtn.disabled = false;
        if (createShortcutStatus) {
          createShortcutStatus.textContent = 'Failed to create shortcut';
          createShortcutStatus.style.display = '';
        }
      }
    });
  }

  if (popupThemeSelect) {
    popupThemeSelect.addEventListener('change', () => {
      const value = popupThemeSelect.value || 'random';
      currentConfig.popupTheme = value;
      applyTheme(value, true);
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ popupTheme: value });
      }
    });
  }

  if (popupLanguageSelect) {
    popupLanguageSelect.addEventListener('change', () => {
      const value = popupLanguageSelect.value === 'es' ? 'es' : 'en';
      uiLanguage = value;
      currentConfig.shimejiLanguage = value;
      populatePopupThemeSelect(currentConfig.popupTheme || 'random');
      populateLanguageSelect(value);
      setPopupLabels();
      renderShimejiSelector();
      renderShimejiCards();
      updateStats();
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ shimejiLanguage: value });
      }
    });
  }

  if (addShimejiBtn) addShimejiBtn.addEventListener('click', addShimeji);

  if (shimejiList) {
    shimejiList.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const nftCtaLink = target.closest('a.shimeji-nft-cta');
      if (nftCtaLink) {
        event.preventDefault();
        event.stopPropagation();
        await openExternalUrlWithBrowserChoice(nftCtaLink.href, 'nft-auction');
        return;
      }

      const sourceBtn = target.closest('[data-action="character-source"]');
      if (sourceBtn) {
        const card = sourceBtn.closest('.shimeji-card');
        if (!card) return;
        const index = Number(card.dataset.index);
        if (Number.isNaN(index)) return;
        const source = sourceBtn.dataset.source;
        if (source === 'free') {
          const nextFree = CHARACTER_OPTIONS[0]?.id || 'shimeji';
          updateShimejiConfig(index, { characterSource: 'free', character: nextFree });
        } else if (source === 'nft') {
          const patch = { characterSource: 'nft' };
          const nextNft = nftCharacters[0]?.id;
          if (nextNft) patch.character = nextNft;
          updateShimejiConfig(index, patch);
        }
        return;
      }

      const refreshBtn = target.closest('[data-action="refresh-ollama-models"]');
      if (refreshBtn) {
        const card = refreshBtn.closest('.shimeji-card');
        if (!card) return;
        const index = Number(card.dataset.index);
        if (!Number.isNaN(index)) {
          refreshOllamaModelsForShimeji(index);
        }
        return;
      }

      const removeBtn = target.closest('[data-action="remove"]');
      if (removeBtn) {
        const card = removeBtn.closest('.shimeji-card');
        if (!card) return;
        const index = Number(card.dataset.index);
        if (!Number.isNaN(index)) removeShimeji(index);
      }
    });

    shimejiList.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target || target.disabled) return;
      const field = target.dataset.field;
      if (!field) return;
      const card = target.closest('.shimeji-card');
      if (!card) return;
      const index = Number(card.dataset.index);
      if (Number.isNaN(index)) return;

      if (field === 'ollamaModelSelect') {
        const selected = target.value;
        if (selected && selected !== 'custom') {
          updateShimejiConfig(index, { ollamaModel: selected });
        } else {
          const input = card.querySelector('input[data-field="ollamaModel"]');
          if (input) input.focus();
        }
        return;
      }

      let value;
      if (target.type === 'checkbox') {
        value = target.checked;
      } else if (target.type === 'range') {
        value = parseFloat(target.value);
      } else {
        value = target.value;
      }

      if (field === 'openclawAgentName') {
        value = normalizeOpenClawAgentName(value, defaultOpenClawAgentName(index));
        target.value = value;
      }
      if (field === 'terminalDistro') {
        value = normalizeTerminalProfile(value);
        target.value = value;
      }
      if (field === 'terminalCwd') {
        value = `${value || ''}`.trim();
        target.value = value;
      }

      if (field === 'chatThemePreset') {
        if (value === 'custom') {
          updateShimejiConfig(index, { chatThemePreset: 'custom' });
        } else if (value === 'random') {
          const preset = CHAT_THEME_PRESETS[Math.floor(Math.random() * CHAT_THEME_PRESETS.length)];
          updateShimejiConfig(index, {
            chatThemePreset: 'random',
            chatTheme: preset.id,
            chatThemeColor: preset.theme,
            chatBgColor: preset.bg,
            chatBubbleStyle: preset.bubble
          });
        } else {
          const preset = CHAT_THEME_PRESETS.find((item) => item.id === value);
          if (preset) {
            updateShimejiConfig(index, {
              chatThemePreset: preset.id,
              chatTheme: preset.id,
              chatThemeColor: preset.theme,
              chatBgColor: preset.bg,
              chatBubbleStyle: preset.bubble
            });
          }
        }
        return;
      }

      const patch = { [field]: value };
      if (field === 'character') {
        const source = target.dataset.source;
        patch.characterSource = source === 'nft' || isNftCharacterId(value) ? 'nft' : 'free';
      }
      if (field === 'chatThemeColor' || field === 'chatBgColor' || field === 'chatBubbleStyle') {
        patch.chatThemePreset = 'custom';
      }
      if (field === 'chatWidth') {
        patch.chatWidthPx = null;
      }
      if (field === 'ttsVoiceProfile') {
        patch.ttsVoiceId = '';
      }
      if (field === 'ttsEnabled' && value === true && !shimejis[index]?.ttsVoiceProfile) {
        patch.ttsVoiceProfile = pickRandomVoiceProfile();
      }

      updateShimejiConfig(index, patch);

      if (field === 'ollamaUrl') {
        const shimeji = shimejis[index];
        if (shimeji?.id) {
          ollamaModelCatalog.delete(shimeji.id);
          ollamaModelStatus.set(shimeji.id, t('Refresh to fetch local Ollama models.', 'Pulsa actualizar para cargar modelos locales de Ollama.'));
        }
      }
    });
  }

  if (aiModeSelect) {
    aiModeSelect.addEventListener('change', () => {
      const mode = aiModeSelect.value;
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ aiMode: mode });
      }
      updateAIModeVisibility();
      updateStats();
    });
  }

  if (openRouterKey) {
    openRouterKey.addEventListener('change', () => {
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ openrouterApiKey: openRouterKey.value.trim() });
      }
    });
  }

  if (openRouterModel) {
    openRouterModel.addEventListener('change', () => {
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ openrouterModel: openRouterModel.value });
      }
    });
  }

  if (ollamaUrl) {
    ollamaUrl.addEventListener('change', () => {
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ ollamaUrl: ollamaUrl.value.trim() });
      }
    });
  }

  if (ollamaModel) {
    ollamaModel.addEventListener('change', () => {
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ ollamaModel: ollamaModel.value.trim() });
      }
    });
  }

  if (openclawUrl) {
    openclawUrl.addEventListener('change', () => {
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ openclawUrl: openclawUrl.value.trim() });
      }
    });
  }

  if (openclawToken) {
    openclawToken.addEventListener('change', () => {
      if (window.shimejiApi) {
        window.shimejiApi.updateConfig({ openclawToken: openclawToken.value.trim() });
      }
    });
  }

  if (aiTestBtn) {
    aiTestBtn.addEventListener('click', async () => {
      if (!window.shimejiApi) return;
      const mode = aiModeSelect?.value || 'openrouter';
      aiTestStatus.textContent = t('Testing...', 'Probando...');
      let result;
      if (mode === 'openrouter') {
        result = await window.shimejiApi.testOpenRouter({ prompt: aiTestPrompt.value || 'Say hello' });
      } else if (mode === 'ollama') {
        result = await window.shimejiApi.testOllama({ prompt: aiTestPrompt.value || 'Say hello' });
      } else if (mode === 'openclaw') {
        result = await window.shimejiApi.testOpenClaw({ prompt: aiTestPrompt.value || 'Say hello' });
      }
      if (result?.ok) {
        aiTestStatus.textContent = t('Connection OK.', 'Conexión OK.');
      } else {
        aiTestStatus.textContent = `${t('Error', 'Error')}: ${result?.error || t('Unknown', 'Desconocido')}`;
      }
    });
  }
}

async function init() {
  if (window.shimejiApi) {
    const cfg = await window.shimejiApi.getConfig();
    applyConfig(cfg);
    
    // Initialize globalApiConfig from loaded shimejis
    if (shimejis.length > 0) {
      const first = shimejis[0];
      globalApiConfig = {
        openrouterApiKey: first.openrouterApiKey || '',
        openrouterModel: first.openrouterModel || 'random',
        ollamaUrl: first.ollamaUrl || 'http://127.0.0.1:11434',
        ollamaModel: first.ollamaModel || 'gemma3:1b',
        openclawUrl: first.openclawUrl || 'ws://127.0.0.1:18789',
        openclawToken: first.openclawToken || '',
        openclawGatewayUrl: first.openclawGatewayUrl || 'ws://127.0.0.1:18789',
        openclawGatewayToken: first.openclawGatewayToken || '',
        openclawAgentName: normalizeOpenClawAgentName(first.openclawAgentName, defaultOpenClawAgentName(first.id || 0)),
        terminalDistro: normalizeTerminalProfile(first.terminalDistro),
        terminalCwd: `${first.terminalCwd || ''}`.trim(),
        terminalNotifyOnFinish: first.terminalNotifyOnFinish !== false
      };
    }
  } else {
    currentConfig = {
      ...currentConfig,
      enabled: true,
      aiMode: 'standard',
      popupTheme: 'random',
      shimejiLanguage: detectBrowserLanguage()
    };
    shimejis = [{
      id: 'shimeji-1',
      character: 'shimeji',
      characterSource: 'free',
      size: 'medium',
      personality: 'random',
      chatTheme: 'pastel',
      chatThemePreset: 'pastel',
      chatThemeColor: '#3b1a77',
      chatBgColor: '#f0e8ff',
      chatBubbleStyle: 'glass',
      chatFontSize: 'medium',
      chatWidth: 'medium',
      chatWidthPx: null,
      chatHeightPx: 340,
      soundEnabled: true,
      soundVolume: 0.7,
      ttsEnabled: false,
      ttsVoiceProfile: pickRandomVoiceProfile(),
      ttsVoiceId: '',
      openMicEnabled: false,
      sttProvider: 'groq',
      sttApiKey: '',
      relayEnabled: false,
      enabled: true,
      mode: 'standard',
      standardProvider: 'openrouter',
      openrouterApiKey: '',
      openrouterModel: 'random',
      ollamaUrl: 'http://127.0.0.1:11434',
      ollamaModel: 'gemma3:1b',
      openclawUrl: 'ws://127.0.0.1:18789',
      openclawToken: '',
      openclawGatewayUrl: 'ws://127.0.0.1:18789',
      openclawGatewayToken: '',
      openclawAgentName: defaultOpenClawAgentName(0),
      terminalDistro: DEFAULT_TERMINAL_PROFILE,
      terminalCwd: '',
      terminalNotifyOnFinish: true
    }];
    renderShimejiSelector();
    renderShimejiCards();
  }

  if (!uiLanguage) {
    uiLanguage = currentConfig.shimejiLanguage === 'es' || currentConfig.shimejiLanguage === 'en'
      ? currentConfig.shimejiLanguage
      : detectBrowserLanguage();
  }
  applyTheme(currentConfig.popupTheme || 'random', true);
  populatePopupThemeSelect(currentConfig.popupTheme || 'random');
  populateLanguageSelect(getUiLanguage());
  setPopupLabels();

  registerHandlers();

  if (window.shimejiApi) {
    window.shimejiApi.onConfigUpdated((next) => {
      applyConfig(next);
    });
  }

  updateStats();
  updateAIModeVisibility();
}

init();
