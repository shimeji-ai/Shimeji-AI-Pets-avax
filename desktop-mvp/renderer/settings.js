const enabledToggle = document.getElementById('enabled-toggle');
const behaviorSelect = document.getElementById('behavior-select');
const characterSelect = document.getElementById('character-select');
const sizeSelect = document.getElementById('size-select');
const statsEl = document.getElementById('popup-stats');
const openRouterKey = document.getElementById('openrouter-key');
const openRouterModel = document.getElementById('openrouter-model');
const openRouterPrompt = document.getElementById('openrouter-test-prompt');
const openRouterTestBtn = document.getElementById('openrouter-test-btn');
const openRouterStatus = document.getElementById('openrouter-status');
const openRouterResponse = document.getElementById('openrouter-response');

let currentConfig = {
  enabled: true,
  character: 'shimeji',
  size: 'medium',
  behavior: 'wander',
  openrouterApiKey: '',
  openrouterModel: 'google/gemini-2.0-flash-001'
};

function updateStats() {
  const status = currentConfig.enabled ? 'Activo' : 'Apagado';
  const mode = currentConfig.behavior === 'follow' ? 'Seguimiento' : 'Vagar';
  statsEl.textContent = `${status} · ${mode} · ${currentConfig.size}`;
}

function applyConfig(next) {
  currentConfig = { ...currentConfig, ...next };
  enabledToggle.checked = !!currentConfig.enabled;
  behaviorSelect.value = currentConfig.behavior || 'wander';
  sizeSelect.value = currentConfig.size || 'medium';
  if (openRouterModel) {
    openRouterModel.value = currentConfig.openrouterModel || 'google/gemini-2.0-flash-001';
  }
  if (openRouterKey && currentConfig.openrouterApiKey) {
    openRouterKey.value = currentConfig.openrouterApiKey;
  }
  if (characterSelect.options.length) {
    characterSelect.value = currentConfig.character || characterSelect.options[0].value;
  }
  updateStats();
}

async function populateCharacters() {
  if (!window.shimejiApi) return;
  const list = await window.shimejiApi.listCharacters();
  characterSelect.innerHTML = '';
  list.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    characterSelect.appendChild(option);
  });
  if (!list.includes(currentConfig.character)) {
    currentConfig.character = list[0] || 'shimeji';
  }
  characterSelect.value = currentConfig.character;
}

function registerHandlers() {
  enabledToggle.addEventListener('change', () => {
    window.shimejiApi.updateConfig({ enabled: enabledToggle.checked });
  });

  behaviorSelect.addEventListener('change', () => {
    window.shimejiApi.updateConfig({ behavior: behaviorSelect.value });
  });

  characterSelect.addEventListener('change', () => {
    window.shimejiApi.updateConfig({ character: characterSelect.value });
  });

  sizeSelect.addEventListener('change', () => {
    window.shimejiApi.updateConfig({ size: sizeSelect.value });
  });

  openRouterKey.addEventListener('change', () => {
    window.shimejiApi.updateConfig({ openrouterApiKey: openRouterKey.value.trim() });
  });

  openRouterModel.addEventListener('change', () => {
    window.shimejiApi.updateConfig({ openrouterModel: openRouterModel.value });
  });

  openRouterTestBtn.addEventListener('click', async () => {
    if (!window.shimejiApi) return;
    openRouterStatus.textContent = 'Probando...';
    openRouterResponse.textContent = '';
    const result = await window.shimejiApi.testOpenRouter({
      prompt: openRouterPrompt.value || 'Decime hola en español.'
    });
    if (result.ok) {
      openRouterStatus.textContent = 'Conexion OK.';
      openRouterResponse.textContent = result.content;
    } else {
      openRouterStatus.textContent = 'Error de conexion.';
      openRouterResponse.textContent = result.error || 'Error desconocido.';
    }
  });
}

async function init() {
  if (!window.shimejiApi) return;
  const cfg = await window.shimejiApi.getConfig();
  applyConfig(cfg);
  await populateCharacters();
  registerHandlers();
  window.shimejiApi.onConfigUpdated((next) => {
    applyConfig(next);
  });
}

init();
