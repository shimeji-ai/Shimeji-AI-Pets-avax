const MAX_SHIMEJIS = 5;

const CHARACTER_OPTIONS = [
  { id: 'shimeji', label: 'Shimeji' },
  { id: 'bunny', label: 'Bunny' },
  { id: 'kitten', label: 'Kitten' },
  { id: 'egg', label: 'Egg' },
  { id: 'ghost', label: 'Ghost' },
  { id: 'blob', label: 'Blob' },
  { id: 'lobster', label: 'Lobster' }
];

const PERSONALITY_OPTIONS = [
  { value: 'random', label: 'Random' },
  { value: 'cryptid', label: 'Cryptid' },
  { value: 'cozy', label: 'Cozy' },
  { value: 'chaotic', label: 'Chaotic' },
  { value: 'philosopher', label: 'Philosopher' },
  { value: 'hype', label: 'Hype Beast' },
  { value: 'noir', label: 'Noir' },
  { value: 'egg', label: 'Egg' }
];

const CHAT_THEME_OPTIONS = [
  { value: 'pastel', label: 'Pastel' },
  { value: 'pink', label: 'Pink' },
  { value: 'kawaii', label: 'Kawaii' },
  { value: 'mint', label: 'Mint' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'neural', label: 'Neural' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
  { value: 'noir-rose', label: 'Noir Rose' },
  { value: 'midnight', label: 'Midnight' },
  { value: 'ember', label: 'Ember' }
];

const SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'big', label: 'Large' }
];

const TTS_VOICE_OPTIONS = [
  { value: 'random', label: 'Random' },
  { value: 'warm', label: 'Warm' },
  { value: 'bright', label: 'Bright' },
  { value: 'deep', label: 'Deep' },
  { value: 'calm', label: 'Calm' },
  { value: 'energetic', label: 'Energetic' }
];

let shimejis = [];
let selectedShimejiIndex = 0;
let currentConfig = {};

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

// Store API config in memory for restoration when adding new shimejis
let globalApiConfig = {
  openrouterApiKey: '',
  openrouterModel: 'random',
  ollamaUrl: 'http://127.0.0.1:11434',
  ollamaModel: 'gemma3:1b',
  openclawUrl: 'ws://127.0.0.1:18789',
  openclawToken: '',
  openclawGatewayUrl: 'ws://127.0.0.1:18789',
  openclawGatewayToken: ''
};

const DEFAULT_OLLAMA_MODEL = 'gemma3:1b';
const ollamaModelCatalog = new Map(); // shimejiId -> string[]
const ollamaModelStatus = new Map(); // shimejiId -> status text
const ollamaModelLoading = new Set(); // shimejiId currently refreshing

function updateStats() {
  const status = currentConfig.enabled ? 'Active' : 'Inactive';
  const count = shimejis.length;
  const ai = currentConfig.aiMode === 'off' ? 'No AI' : currentConfig.aiMode || 'standard';
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
      openclawGatewayToken: first.openclawGatewayToken || ''
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
    size: 'medium',
    personality: 'random',
    chatTheme: 'pastel',
    enabled: true,
    // Copy AI config from shimeji-1 or use stored global config
    mode: configSource?.mode || 'standard',
    standardProvider: configSource?.standardProvider || 'openrouter',
    openrouterApiKey: configSource?.openrouterApiKey || globalApiConfig.openrouterApiKey,
    openrouterModel: configSource?.openrouterModel || globalApiConfig.openrouterModel,
    ollamaUrl: configSource?.ollamaUrl || globalApiConfig.ollamaUrl,
    ollamaModel: configSource?.ollamaModel || globalApiConfig.ollamaModel,
    openclawUrl: configSource?.openclawUrl || globalApiConfig.openclawUrl,
    openclawToken: configSource?.openclawToken || globalApiConfig.openclawToken,
    openclawGatewayUrl: configSource?.openclawGatewayUrl || globalApiConfig.openclawGatewayUrl,
    openclawGatewayToken: configSource?.openclawGatewayToken || globalApiConfig.openclawGatewayToken
  };

  shimejis.push(newShimeji);
  selectShimeji(newIndex);
  saveShimejis();
}

function removeShimeji(index) {
  // Allow removing all shimejis, but keep API config in memory

  shimejis.splice(index, 1);
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
  const label = document.createElement('label');
  label.className = 'ai-label';
  label.textContent = labelText;
  const select = document.createElement('select');
  select.className = 'ai-select';
  select.dataset.field = field;
  select.disabled = disabled;
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });
  select.value = value ?? (options[0]?.value || '');
  wrapper.appendChild(label);
  wrapper.appendChild(select);
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
  customOption.textContent = 'Custom model';
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
  return ollamaModelStatus.get(shimejiId) || 'Refresh to fetch local Ollama models.';
}

async function refreshOllamaModelsForShimeji(index) {
  const shimeji = shimejis[index];
  if (!shimeji || !window.shimejiApi?.listOllamaModels) return;

  const shimejiId = shimeji.id;
  ollamaModelLoading.add(shimejiId);
  ollamaModelStatus.set(shimejiId, 'Loading models...');
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
          ? `Found ${names.length} local model${names.length > 1 ? 's' : ''}.`
          : 'Connected, but no models were found.'
      );
    } else {
      ollamaModelCatalog.set(shimejiId, []);
      const error = String(result?.error || '');
      const url = result?.url || shimeji.ollamaUrl || 'http://127.0.0.1:11434';
      if (error.startsWith('OLLAMA_HTTP_ONLY:')) {
        ollamaModelStatus.set(shimejiId, `Invalid Ollama URL protocol. Use HTTP, for example: http://127.0.0.1:11434`);
      } else if (error.startsWith('OLLAMA_FORBIDDEN:')) {
        ollamaModelStatus.set(shimejiId, `Ollama rejected this request (403) at ${url}.`);
      } else if (error.startsWith('OLLAMA_HTTP_')) {
        ollamaModelStatus.set(shimejiId, `Ollama returned an HTTP error at ${url}.`);
      } else {
        ollamaModelStatus.set(shimejiId, `Could not reach Ollama at ${url}.`);
      }
    }
  } catch {
    ollamaModelCatalog.set(shimejiId, []);
    ollamaModelStatus.set(shimejiId, `Could not fetch Ollama models.`);
  } finally {
    ollamaModelLoading.delete(shimejiId);
    renderShimejiCards();
  }
}

function renderShimejiCards() {
  shimejiList.innerHTML = '';
  if (shimejiEmpty) {
    shimejiEmpty.style.display = shimejis.length === 0 ? 'block' : 'none';
    if (shimejis.length === 0) {
      shimejiEmpty.textContent = 'No shimejis active. Press the + button to add one.';
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

    grid.appendChild(renderSelectField('character', 'Character', CHARACTER_OPTIONS.map(opt => ({ value: opt.id, label: opt.label })), shimeji.character || 'shimeji'));
    grid.appendChild(renderSelectField('personality', 'Personality', PERSONALITY_OPTIONS, shimeji.personality || 'cryptid'));
    grid.appendChild(renderSelectField('size', 'Size', SIZE_OPTIONS, shimeji.size || 'medium'));
    grid.appendChild(renderToggleField('soundEnabled', 'Notifications', shimeji.soundEnabled !== false, { disabled: true }));
    grid.appendChild(renderRangeField('soundVolume', 'Volume', shimeji.soundVolume ?? 0.7, { disabled: true }));
    grid.appendChild(renderToggleField('ttsEnabled', 'Read Aloud', !!shimeji.ttsEnabled, { disabled: true }));
    grid.appendChild(renderSelectField('ttsVoiceProfile', 'Voice', TTS_VOICE_OPTIONS, shimeji.ttsVoiceProfile || 'random', { disabled: true }));
    grid.appendChild(renderToggleField('openMicEnabled', 'Open Mic', !!shimeji.openMicEnabled, { disabled: true }));
    grid.appendChild(renderToggleField('relayEnabled', 'Talk to other shimejis', !!shimeji.relayEnabled, { disabled: true, className: 'full-width' }));

    const mode = shimeji.mode || 'standard';
    const provider = shimeji.standardProvider || 'openrouter';

    const aiBrain = renderSelectField('mode', 'AI Brain', [
      { value: 'standard', label: 'Standard (API key only)' },
      { value: 'agent', label: 'AI Agent' },
      { value: 'off', label: 'Off' }
    ], mode, { className: 'full-width ai-core-field' });

    const aiCorePanel = document.createElement('div');
    aiCorePanel.className = 'ai-core-panel';
    aiCorePanel.appendChild(aiBrain);

    if (mode === 'standard') {
      aiCorePanel.appendChild(renderSelectField('standardProvider', 'Provider', [
        { value: 'openrouter', label: 'OpenRouter' },
        { value: 'ollama', label: 'Ollama' }
      ], provider, { className: 'ai-core-field' }));

      if (provider === 'openrouter') {
        aiCorePanel.appendChild(renderInputField('openrouterApiKey', 'API Key', shimeji.openrouterApiKey, 'password', 'Paste your OpenRouter API key', { className: 'ai-core-field' }));
        aiCorePanel.appendChild(renderSelectField('openrouterModel', 'Model', [
          { value: 'random', label: 'Random' },
          { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
          { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
          { value: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick' }
        ], shimeji.openrouterModel || 'random', { className: 'ai-core-field' }));
      } else if (provider === 'ollama') {
        aiCorePanel.appendChild(renderInputField('ollamaUrl', 'Ollama URL', shimeji.ollamaUrl || 'http://127.0.0.1:11434', 'text', 'http://127.0.0.1:11434', { className: 'ai-core-field' }));
        aiCorePanel.appendChild(renderInputField('ollamaModel', 'Model', shimeji.ollamaModel || DEFAULT_OLLAMA_MODEL, 'text', DEFAULT_OLLAMA_MODEL, { className: 'ai-core-field' }));

        const detectedField = document.createElement('div');
        detectedField.className = 'ai-field ai-core-field';

        const detectedLabel = document.createElement('label');
        detectedLabel.className = 'ai-label';
        detectedLabel.textContent = 'Detected models';

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
        refreshBtn.textContent = ollamaModelLoading.has(shimeji.id) ? 'Loading...' : 'Refresh';
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
    } else if (mode === 'agent') {
      aiCorePanel.appendChild(renderInputField('openclawGatewayUrl', 'Gateway URL', shimeji.openclawGatewayUrl || 'ws://127.0.0.1:18789', 'text', 'ws://127.0.0.1:18789', { className: 'ai-core-field' }));
      aiCorePanel.appendChild(renderInputField('openclawGatewayToken', 'Gateway Auth Token', shimeji.openclawGatewayToken, 'password', 'Enter gateway auth token', { className: 'ai-core-field' }));
    }
    // mode === 'off' shows nothing extra

    const chatStyleBlock = document.createElement('div');
    chatStyleBlock.className = 'shimeji-chat-style-section';

    const chatStyleHeader = document.createElement('div');
    chatStyleHeader.className = 'chat-style-toggle open';
    chatStyleHeader.textContent = 'Chat Style';

    const chatStyleGrid = document.createElement('div');
    chatStyleGrid.className = 'chat-style-grid open';

    chatStyleGrid.appendChild(renderSelectField('chatTheme', 'Chat Theme', CHAT_THEME_OPTIONS, shimeji.chatTheme || 'pastel'));
    chatStyleGrid.appendChild(renderInputField('chatThemeColor', 'Theme Color', shimeji.chatThemeColor || '#2a1f4e', 'text', '#2a1f4e', { disabled: true }));
    chatStyleGrid.appendChild(renderInputField('chatBgColor', 'Background', shimeji.chatBgColor || '#ffffff', 'text', '#ffffff', { disabled: true }));
    chatStyleGrid.appendChild(renderSelectField('chatFontSize', 'Font Size', [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' }
    ], shimeji.chatFontSize || 'medium', { disabled: true }));
    chatStyleGrid.appendChild(renderSelectField('chatWidth', 'Chat Width', [
      { value: 'small', label: 'Narrow' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Wide' }
    ], shimeji.chatWidth || 'medium', { disabled: true }));

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
  currentConfig = { ...currentConfig, ...next };

  if (next.enabled !== undefined && enabledToggle) {
    enabledToggle.checked = !!next.enabled;
    enabledToggleRow?.classList.toggle('active', !!next.enabled);
  }

  if (next.shimejis) {
    shimejis = next.shimejis;
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

  if (addShimejiBtn) addShimejiBtn.addEventListener('click', addShimeji);

  if (shimejiList) {
    shimejiList.addEventListener('click', (event) => {
      const target = event.target;
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

      updateShimejiConfig(index, { [field]: value });

      if (field === 'ollamaUrl') {
        const shimeji = shimejis[index];
        if (shimeji?.id) {
          ollamaModelCatalog.delete(shimeji.id);
          ollamaModelStatus.set(shimeji.id, 'Refresh to fetch local Ollama models.');
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
      aiTestStatus.textContent = 'Testing...';
      let result;
      if (mode === 'openrouter') {
        result = await window.shimejiApi.testOpenRouter({ prompt: aiTestPrompt.value || 'Say hello' });
      } else if (mode === 'ollama') {
        result = await window.shimejiApi.testOllama({ prompt: aiTestPrompt.value || 'Say hello' });
      } else if (mode === 'openclaw') {
        result = await window.shimejiApi.testOpenClaw({ prompt: aiTestPrompt.value || 'Say hello' });
      }
      if (result?.ok) {
        aiTestStatus.textContent = 'Connection OK.';
      } else {
        aiTestStatus.textContent = 'Error: ' + (result?.error || 'Unknown');
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
        openclawGatewayToken: first.openclawGatewayToken || ''
      };
    }
  } else {
    shimejis = [{
      id: 'shimeji-1',
      character: 'shimeji',
      size: 'medium',
      personality: 'random',
      chatTheme: 'pastel',
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
      openclawGatewayToken: ''
    }];
    renderShimejiSelector();
    renderShimejiCards();
  }

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
