const enabledToggle = document.getElementById('enabled-toggle');
const behaviorSelect = document.getElementById('behavior-select');
const characterSelect = document.getElementById('character-select');
const sizeSelect = document.getElementById('size-select');
const statsEl = document.getElementById('popup-stats');

let currentConfig = {
  enabled: true,
  character: 'shimeji',
  size: 'medium',
  behavior: 'wander'
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
