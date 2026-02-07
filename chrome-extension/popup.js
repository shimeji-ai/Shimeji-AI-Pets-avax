document.addEventListener("DOMContentLoaded", () => {
  const pageToggle = document.getElementById("page-toggle");
  const pageToggleRow = document.getElementById("page-toggle-row");
  const enableAllBtn = document.getElementById("enable-all-btn");
  const disableAllBtn = document.getElementById("disable-all-btn");
  const globalStatus = document.getElementById("global-status");
  let currentPageKey = null;

  function normalizePageUrl(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      return parsed.toString();
    } catch (error) {
      return url;
    }
  }

  function updateVisibilityUI(disabledAll, disabledPages) {
    const pageDisabled = currentPageKey && disabledPages.includes(currentPageKey);

    // Update page toggle
    if (pageToggle) {
      // Checked means enabled (not in disabled list)
      pageToggle.checked = !pageDisabled;
      pageToggle.disabled = !!disabledAll || !currentPageKey;
    }

    // Update toggle row disabled state
    if (pageToggleRow) {
      pageToggleRow.classList.toggle("disabled", !!disabledAll || !currentPageKey);
    }

    // Update global buttons
    if (enableAllBtn) {
      enableAllBtn.classList.toggle("active", !disabledAll);
    }
    if (disableAllBtn) {
      disableAllBtn.classList.toggle("active", !!disabledAll);
    }

    // Update status message
    if (globalStatus) {
      if (disabledAll) {
        globalStatus.textContent = "Shimeji is disabled on all pages";
        globalStatus.classList.add("warning");
      } else if (pageDisabled) {
        globalStatus.textContent = "Disabled on this page (remembered)";
        globalStatus.classList.remove("warning");
      } else {
        globalStatus.textContent = "";
        globalStatus.classList.remove("warning");
      }
    }
  }

  function loadVisibilityState() {
    chrome.storage.sync.get(["disabledAll", "disabledPages"], (data) => {
      const disabledPages = Array.isArray(data.disabledPages) ? data.disabledPages : [];
      updateVisibilityUI(!!data.disabledAll, disabledPages);
    });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabUrl = tabs[0]?.url || "";
    if (tabUrl.startsWith("http")) {
      currentPageKey = normalizePageUrl(tabUrl);
    }
    loadVisibilityState();
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync") {
      if (changes.disabledAll || changes.disabledPages) {
        const disabledAll = changes.disabledAll ? changes.disabledAll.newValue : undefined;
        const disabledPages = changes.disabledPages ? changes.disabledPages.newValue : undefined;
        chrome.storage.sync.get(["disabledAll", "disabledPages"], (data) => {
          const resolvedDisabledAll = disabledAll !== undefined ? disabledAll : data.disabledAll;
          const resolvedDisabledPages = Array.isArray(disabledPages)
            ? disabledPages
            : Array.isArray(data.disabledPages)
              ? data.disabledPages
              : [];
          updateVisibilityUI(!!resolvedDisabledAll, resolvedDisabledPages);
        });
      }
    }
  });

  // Page toggle (checkbox)
  if (pageToggle) {
    pageToggle.addEventListener("change", () => {
      if (!currentPageKey) return;

      chrome.storage.sync.get(["disabledPages", "disabledAll"], (data) => {
        if (data.disabledAll) return; // Don't allow changes when globally disabled

        const disabledPages = Array.isArray(data.disabledPages) ? data.disabledPages : [];
        const pageIndex = disabledPages.indexOf(currentPageKey);

        if (pageToggle.checked) {
          // Enable on this page (remove from disabled list)
          if (pageIndex >= 0) {
            disabledPages.splice(pageIndex, 1);
          }
        } else {
          // Disable on this page (add to disabled list)
          if (pageIndex < 0) {
            disabledPages.push(currentPageKey);
          }
        }

        chrome.storage.sync.set({ disabledPages }, () => {
          updateVisibilityUI(!!data.disabledAll, disabledPages);
        });
      });
    });
  }

  // Enable All button
  if (enableAllBtn) {
    enableAllBtn.addEventListener("click", () => {
      chrome.storage.sync.get(["disabledPages"], (data) => {
        const disabledPages = Array.isArray(data.disabledPages) ? data.disabledPages : [];
        chrome.storage.sync.set({ disabledAll: false }, () => {
          updateVisibilityUI(false, disabledPages);
        });
      });
    });
  }

  // Disable All button
  if (disableAllBtn) {
    disableAllBtn.addEventListener("click", () => {
      chrome.storage.sync.get(["disabledPages"], (data) => {
        const disabledPages = Array.isArray(data.disabledPages) ? data.disabledPages : [];
        chrome.storage.sync.set({ disabledAll: true }, () => {
          updateVisibilityUI(true, disabledPages);
        });
      });
    });
  }

  // --- AI Chat Settings ---
  // --- Shimeji Configurator ---
  const MAX_SHIMEJIS = 5;
  const shimejiListEl = document.getElementById("shimeji-list");
  const addShimejiBtn = document.getElementById("add-shimeji-btn");
  const shimejiSelectorEl = document.getElementById("shimeji-selector");
  const shimejiSectionTitle = document.getElementById("shimeji-section-title");
  const shimejiLimitHint = document.getElementById("shimeji-limit-hint");
  const popupSubtitle = document.getElementById("popup-subtitle");
  const popupStats = document.getElementById("popup-stats");
  const wakeAllBtn = document.getElementById("wake-all-btn");
  const sleepAllBtn = document.getElementById("sleep-all-btn");
const basicModeBtn = document.getElementById("basic-mode-btn");
const advancedModeBtn = document.getElementById("advanced-mode-btn");
const popupThemeLabel = document.getElementById("popup-theme-label");
const popupThemeSelect = document.getElementById("popup-theme-select");
const securityTitle = document.getElementById("security-title");
const masterkeyToggle = document.getElementById("masterkey-toggle");
const masterkeyLabel = document.getElementById("masterkey-label");
const masterkeyInput = document.getElementById("masterkey-input");
const masterkeyUnlockBtn = document.getElementById("masterkey-unlock-btn");
const masterkeyLockBtn = document.getElementById("masterkey-lock-btn");
const masterkeyStatus = document.getElementById("masterkey-status");
const autolockToggle = document.getElementById("autolock-toggle");
const autolockMinutesInput = document.getElementById("autolock-minutes");
const autolockLabel = document.getElementById("autolock-label");
const autolockMinutesLabel = document.getElementById("autolock-minutes-label");
  const linkOpenPortals = document.getElementById("link-open-portals");
  const linkPrivacy = document.getElementById("link-privacy");
  const appearanceVisibilityTitle = document.getElementById("appearance-visibility-title");
  const labelEnabledPage = document.getElementById("label-enabled-page");
  const enableAllBtnLabel = document.getElementById("enable-all-btn");
  const disableAllBtnLabel = document.getElementById("disable-all-btn");

  const MODEL_OPTIONS = [
    { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
    { value: "moonshotai/kimi-k2.5", labelEn: "Kimi K2.5 (disabled)", labelEs: "Kimi K2.5 (deshabilitado)", disabled: true },
    { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
    { value: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
    { value: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek Chat v3" },
    { value: "mistralai/mistral-large-2411", label: "Mistral Large" },
  ];

  const CHARACTER_OPTIONS = [
    { value: "shimeji", labelEn: "Shimeji", labelEs: "Shimeji" },
    { value: "bunny", labelEn: "Bunny", labelEs: "Conejo" },
    { value: "bunny-hero", labelEn: "Hero Bunny", labelEs: "Conejo Hero" },
    { value: "kitten", labelEn: "Kitten", labelEs: "Gatito" },
    { value: "ghost", labelEn: "Ghost", labelEs: "Fantasma" },
    { value: "blob", labelEn: "Blob", labelEs: "Blob" },
    { value: "neon", labelEn: "Neon", labelEs: "Neón" },
    { value: "glitch", labelEn: "Glitch", labelEs: "Glitch" },
    { value: "panda", labelEn: "Panda", labelEs: "Panda" },
    { value: "star", labelEn: "Star", labelEs: "Estrella" },
  ];

  const PERSONALITY_OPTIONS = [
    { value: "cryptid", labelEn: "Cryptid", labelEs: "Críptico" },
    { value: "cozy", labelEn: "Cozy", labelEs: "Acogedor" },
    { value: "chaotic", labelEn: "Chaotic", labelEs: "Caótico" },
    { value: "philosopher", labelEn: "Philosopher", labelEs: "Filósofo" },
    { value: "hype", labelEn: "Hype Beast", labelEs: "Entusiasta" },
    { value: "noir", labelEn: "Noir", labelEs: "Noir" },
  ];
  const VOICE_PROFILE_POOL = ["warm", "bright", "deep", "calm", "energetic"];
  function pickRandomVoiceProfile() {
    return VOICE_PROFILE_POOL[Math.floor(Math.random() * VOICE_PROFILE_POOL.length)];
  }

  let shimejis = [];
  let selectedShimejiId = null;

  function ensureShimejiIds(list) {
    const used = new Set();
    return list.map((item, index) => {
      let id = item.id;
      if (!id || used.has(id)) {
        let base = `shimeji-${index + 1}`;
        id = base;
        let suffix = 1;
        while (used.has(id)) {
          id = `${base}-${suffix}`;
          suffix += 1;
        }
      }
      used.add(id);
      return { ...item, id };
    });
  }

  function isSpanishLocale() {
    const locale = (navigator.language || '').toLowerCase();
    return locale.startsWith('es');
  }

  function t(en, es) {
    return isSpanishLocale() ? es : en;
  }

  function applyTheme(theme) {
    document.body.dataset.theme = theme;
  }

  function getRandomTheme() {
    const themes = ["neural", "pink", "kawaii"];
    return themes[Math.floor(Math.random() * themes.length)];
  }

  function populatePopupThemeSelect(value) {
    if (!popupThemeSelect) return;
    const options = [
      { value: "random", labelEn: "Random", labelEs: "Aleatorio" },
      { value: "neural", labelEn: "Neural", labelEs: "Neural" },
      { value: "pink", labelEn: "Pink", labelEs: "Rosa" },
      { value: "kawaii", labelEn: "Kawaii", labelEs: "Kawaii" }
    ];
    popupThemeSelect.innerHTML = "";
    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = isSpanishLocale() ? opt.labelEs : opt.labelEn;
      if (opt.value === value) option.selected = true;
      popupThemeSelect.appendChild(option);
    });
  }

  function initPopupTheme() {
    chrome.storage.local.get(["popupTheme"], (data) => {
      const theme = data.popupTheme || "random";
      populatePopupThemeSelect(theme);
      applyTheme(theme === "random" ? getRandomTheme() : theme);
    });
  }

  initPopupTheme();

  async function deriveKeyFromMaster(masterKey, saltBase64) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(masterKey),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    const salt = saltBase64 ? Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    return { key, saltBase64: btoa(String.fromCharCode(...salt)) };
  }

  async function encryptSecret(masterKey, plaintext, saltBase64) {
    const { key, saltBase64: outSalt } = await deriveKeyFromMaster(masterKey, saltBase64);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return {
      data: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      iv: btoa(String.fromCharCode(...iv)),
      salt: outSalt
    };
  }

  async function decryptSecret(masterKey, payload) {
    if (!payload || !payload.data || !payload.iv || !payload.salt) return '';
    const { key } = await deriveKeyFromMaster(masterKey, payload.salt);
    const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
    const data = Uint8Array.from(atob(payload.data), c => c.charCodeAt(0));
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(plaintext);
  }

  async function getDeviceKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["deviceKey"], async (data) => {
        let rawKey;
        if (data.deviceKey) {
          rawKey = Uint8Array.from(atob(data.deviceKey), c => c.charCodeAt(0));
        } else {
          rawKey = crypto.getRandomValues(new Uint8Array(32));
          chrome.storage.local.set({ deviceKey: btoa(String.fromCharCode(...rawKey)) });
        }
        const key = await crypto.subtle.importKey(
          "raw",
          rawKey,
          { name: "AES-GCM" },
          false,
          ["encrypt", "decrypt"]
        );
        resolve(key);
      });
    });
  }

  async function encryptWithDeviceKey(plaintext) {
    const key = await getDeviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(plaintext)
    );
    return {
      data: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      iv: btoa(String.fromCharCode(...iv)),
      type: "device"
    };
  }

  async function decryptWithDeviceKey(payload) {
    if (!payload || !payload.data || !payload.iv) return "";
    const key = await getDeviceKey();
    const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
    const data = Uint8Array.from(atob(payload.data), c => c.charCodeAt(0));
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(plaintext);
  }

  async function getSessionMasterKey() {
    return new Promise((resolve) => {
      chrome.storage.session.get(['masterKey'], (data) => {
        resolve(data.masterKey || '');
      });
    });
  }

  function setSessionMasterKey(value) {
    chrome.storage.session.set({ masterKey: value });
  }

  function clearSessionMasterKey() {
    chrome.storage.session.remove(['masterKey']);
  }

  let masterKeyEnabled = false;
  let masterKeySalt = null;
  let masterKeyUnlocked = false;
  let masterKeyAutoLockEnabled = true;
  let masterKeyAutoLockMinutes = 30;
  let masterKeyAutoLockTimer = null;

  function updateMasterKeyStatus() {
    if (!masterkeyStatus) return;
    if (!masterKeyEnabled) {
      masterkeyStatus.textContent = t('Master key disabled', 'Clave maestra desactivada');
      return;
    }
    masterkeyStatus.textContent = masterKeyUnlocked
      ? t('Master key unlocked for this session', 'Clave maestra desbloqueada en esta sesión')
      : t('Master key locked', 'Clave maestra bloqueada');
  }

  function setMasterKeyStatusMessage(message) {
    if (!masterkeyStatus) return;
    masterkeyStatus.textContent = message;
  }

  function updateAutolockLabel() {
    if (!autolockMinutesLabel) return;
    autolockMinutesLabel.textContent = `${masterKeyAutoLockMinutes} min`;
  }

  function scheduleAutoLock() {
    if (masterKeyAutoLockTimer) {
      clearTimeout(masterKeyAutoLockTimer);
      masterKeyAutoLockTimer = null;
    }
    if (!masterKeyEnabled || !masterKeyUnlocked || !masterKeyAutoLockEnabled) return;
    masterKeyAutoLockTimer = setTimeout(() => {
      clearSessionMasterKey();
      masterKeyUnlocked = false;
      if (masterKeyAutoLockTimer) {
        clearTimeout(masterKeyAutoLockTimer);
        masterKeyAutoLockTimer = null;
      }
      applyMasterKeyUiState();
      renderShimejis();
    }, masterKeyAutoLockMinutes * 60 * 1000);
  }

  function applyMasterKeyUiState() {
    if (masterkeyToggle) masterkeyToggle.checked = masterKeyEnabled;
    if (masterkeyInput) masterkeyInput.disabled = !masterKeyEnabled;
    if (masterkeyUnlockBtn) masterkeyUnlockBtn.disabled = !masterKeyEnabled;
    if (masterkeyLockBtn) masterkeyLockBtn.disabled = !masterKeyEnabled;
    if (autolockToggle) autolockToggle.checked = masterKeyAutoLockEnabled;
    if (autolockMinutesInput) autolockMinutesInput.value = String(masterKeyAutoLockMinutes);
    updateAutolockLabel();
    updateMasterKeyStatus();
  }

  async function enableMasterKeyWithValue(value) {
    if (!value) {
      setMasterKeyStatusMessage(t('Enter a master key to enable', 'Ingresa una clave maestra para habilitar'));
      masterKeyEnabled = false;
      applyMasterKeyUiState();
      return;
    }
    masterKeyEnabled = true;
    masterKeyUnlocked = true;
    setSessionMasterKey(value);
    if (!masterKeySalt) {
      const enc = await encryptSecret(value, 'seed', null);
      masterKeySalt = enc.salt;
    }
    chrome.storage.local.set({ masterKeyEnabled: true, masterKeySalt });
    applyMasterKeyUiState();
    scheduleAutoLock();
    await saveShimejis();
    loadShimejis();
  }

  function setPopupLabels() {
    if (shimejiSectionTitle) shimejiSectionTitle.textContent = t("Shimejis", "Shimejis");
    if (shimejiLimitHint) shimejiLimitHint.textContent = t("Up to 5 shimejis on screen", "Hasta 5 shimejis en pantalla");
    if (addShimejiBtn) addShimejiBtn.textContent = "+";
    if (linkOpenPortals) linkOpenPortals.textContent = t("Open more portals", "Abrir más portales");
    if (linkPrivacy) linkPrivacy.textContent = t("Privacy", "Privacidad");
    if (appearanceVisibilityTitle) appearanceVisibilityTitle.textContent = t("Visibility", "Visibilidad");
    if (labelEnabledPage) labelEnabledPage.textContent = t("Enabled on this page", "Activo en esta página");
    if (enableAllBtnLabel) enableAllBtnLabel.textContent = t("Enable All", "Activar todo");
    if (disableAllBtnLabel) disableAllBtnLabel.textContent = t("Disable All", "Desactivar todo");
    if (popupSubtitle) popupSubtitle.textContent = t("Your AI mascot orchestrator", "Tu orquestador de mascotas AI");
    if (wakeAllBtn) wakeAllBtn.textContent = t("Wake All", "Despertar todos");
if (sleepAllBtn) sleepAllBtn.textContent = t("Sleep All", "Dormir todos");
if (basicModeBtn) basicModeBtn.textContent = t("Basic", "Básico");
if (advancedModeBtn) advancedModeBtn.textContent = t("Advanced", "Avanzado");
if (popupThemeLabel) popupThemeLabel.textContent = t("Popup Theme", "Tema del popup");
if (securityTitle) securityTitle.textContent = t("Security", "Seguridad");
if (masterkeyLabel) masterkeyLabel.textContent = t("Protect keys with master key", "Proteger claves con clave maestra");
if (masterkeyInput) masterkeyInput.placeholder = t("Master key", "Clave maestra");
if (masterkeyUnlockBtn) masterkeyUnlockBtn.textContent = t("Unlock", "Desbloquear");
if (masterkeyLockBtn) masterkeyLockBtn.textContent = t("Lock", "Bloquear");
if (autolockLabel) autolockLabel.textContent = t("Auto-lock", "Auto-bloqueo");
  }

  const SIZE_OPTIONS_KEYS = ["small", "medium", "big"];
  const THEME_COLOR_POOL = [
    "#2a1f4e", "#1e3a5f", "#4a2040", "#0f4c3a", "#5c2d0e",
    "#3b1260", "#0e3d6b", "#6b1d3a", "#2e4a12", "#4c1a6b"
  ];
  const CHAT_THEMES = [
    { id: "pastel", labelEn: "Pastel", labelEs: "Pastel", theme: "#7b5cff", bg: "#fff7fb", bubble: "glass" },
    { id: "kawaii", labelEn: "Kawaii", labelEs: "Kawaii", theme: "#ff6cab", bg: "#fff1f9", bubble: "glass" },
    { id: "cyberpunk", labelEn: "Cyberpunk", labelEs: "Cyberpunk", theme: "#19d3ff", bg: "#0d0b1f", bubble: "dark" }
  ];

  function getDefaultShimeji(index) {
    const randomChar = CHARACTER_OPTIONS[Math.floor(Math.random() * CHARACTER_OPTIONS.length)].value;
    const randomPersonality = PERSONALITY_OPTIONS[Math.floor(Math.random() * PERSONALITY_OPTIONS.length)].value;
    const enabledModels = MODEL_OPTIONS.filter((opt) => !opt.disabled);
    const randomModel = (enabledModels[Math.floor(Math.random() * enabledModels.length)] || MODEL_OPTIONS[0]).value;
    const randomVoiceProfile = pickRandomVoiceProfile();
    const randomSize = SIZE_OPTIONS_KEYS[Math.floor(Math.random() * SIZE_OPTIONS_KEYS.length)];
    const randomThemeColor = THEME_COLOR_POOL[Math.floor(Math.random() * THEME_COLOR_POOL.length)];
    const preset = CHAT_THEMES[Math.floor(Math.random() * CHAT_THEMES.length)];
    return {
      id: `shimeji-${index + 1}`,
      character: randomChar,
      size: randomSize,
      mode: "standard",
      standardProvider: "openrouter",
      openrouterApiKey: "",
      openrouterModel: randomModel,
      ollamaUrl: "http://127.0.0.1:11434",
      ollamaModel: "llama3.1",
      openclawGatewayUrl: "ws://127.0.0.1:18789",
      openclawGatewayToken: "",
      personality: randomPersonality,
      enabled: true,
      soundEnabled: true,
      soundVolume: 0.7,
      chatThemeColor: preset?.theme || randomThemeColor,
      chatBgColor: preset?.bg || "#ffffff",
      chatFontSize: "medium",
      chatWidth: "medium",
      chatBubbleStyle: preset?.bubble || "glass",
      ttsEnabled: true,
      ttsVoiceProfile: randomVoiceProfile,
      ttsVoiceId: "",
      openMicEnabled: false,
      relayEnabled: false
    };
  }

  function normalizeMode(modeValue) {
    if (modeValue === "disabled") return "off";
    if (modeValue === "off") return "off";
    if (modeValue === "agent") return "agent";
    if (modeValue === "decorative") return "decorative";
    return "standard";
  }

  function migrateLegacy(data) {
    if (Array.isArray(data.shimejis) && data.shimejis.length > 0) {
      return data.shimejis.map((shimeji) => ({
        ...shimeji,
        mode: normalizeMode(shimeji.mode),
        soundEnabled: shimeji.soundEnabled !== false,
        soundVolume: typeof shimeji.soundVolume === "number" ? shimeji.soundVolume : 0.7,
        standardProvider: shimeji.standardProvider || "openrouter",
        ollamaUrl: shimeji.ollamaUrl || "http://127.0.0.1:11434",
        ollamaModel: shimeji.ollamaModel || "llama3.1",
        openclawGatewayUrl: shimeji.openclawGatewayUrl || "ws://127.0.0.1:18789",
        openclawGatewayToken: shimeji.openclawGatewayToken || "",
        personality: shimeji.personality || "cryptid",
        ttsEnabled: shimeji.ttsEnabled !== false,
        ttsVoiceProfile: shimeji.ttsVoiceProfile || pickRandomVoiceProfile(),
        ttsVoiceId: shimeji.ttsVoiceId || "",
        openMicEnabled: !!shimeji.openMicEnabled,
        relayEnabled: !!shimeji.relayEnabled
      }));
    }

    return [{
      id: "shimeji-1",
      character: "shimeji",
      size: "medium",
      mode: normalizeMode(data.chatMode),
      standardProvider: "openrouter",
      openrouterApiKey: data.aiApiKey || "",
      openrouterModel: data.aiModel || MODEL_OPTIONS[0].value,
      ollamaUrl: "http://127.0.0.1:11434",
      ollamaModel: "llama3.1",
      openclawGatewayUrl: data.openclawGatewayUrl || "ws://127.0.0.1:18789",
      openclawGatewayToken: data.openclawGatewayToken || "",
      personality: data.aiPersonality || "cryptid",
      enabled: true,
      soundEnabled: true,
      soundVolume: 0.7,
      ttsEnabled: true,
      ttsVoiceProfile: pickRandomVoiceProfile(),
      ttsVoiceId: "",
      openMicEnabled: false,
      relayEnabled: false
    }];
  }

    function loadShimejis() {
    chrome.storage.local.get([
      'shimejis',
      'aiModel',
      'aiApiKey',
      'aiPersonality',
      'chatMode',
      'openclawGatewayUrl',
      'openclawGatewayToken',
      'masterKeyEnabled',
      'masterKeySalt',
      'masterKeyAutoLockEnabled',
      'masterKeyAutoLockMinutes',
      'ttsEnabledMigrationDone'
    ], async (data) => {
      masterKeyEnabled = !!data.masterKeyEnabled;
      masterKeySalt = data.masterKeySalt || null;
      masterKeyAutoLockEnabled = data.masterKeyAutoLockEnabled !== false;
      masterKeyAutoLockMinutes = typeof data.masterKeyAutoLockMinutes === "number" ? data.masterKeyAutoLockMinutes : 30;
      const sessionKey = await getSessionMasterKey();
      masterKeyUnlocked = !!sessionKey;
      applyMasterKeyUiState();

      shimejis = ensureShimejiIds(migrateLegacy(data));
      if (!Array.isArray(shimejis) || shimejis.length === 0) {
        shimejis = [getDefaultShimeji(0)];
      }
      if (!data.ttsEnabledMigrationDone) {
        shimejis = shimejis.map((s) => ({ ...s, ttsEnabled: true }));
      }
      if (shimejis.length > 0) {
        const hasAnyActive = shimejis.some((s) => {
          const mode = normalizeMode(s.mode);
          return mode === "standard" || mode === "agent";
        });
        if (!hasAnyActive) {
          shimejis[0].mode = "standard";
        }
      }

      let needsEncrypt = false;
      if (masterKeyEnabled && sessionKey) {
        for (const shimeji of shimejis) {
          if (shimeji.openrouterApiKeyEnc) {
            try {
              shimeji.openrouterApiKey = await decryptSecret(sessionKey, shimeji.openrouterApiKeyEnc);
            } catch {}
          }
          if (shimeji.openclawGatewayTokenEnc) {
            try {
              shimeji.openclawGatewayToken = await decryptSecret(sessionKey, shimeji.openclawGatewayTokenEnc);
            } catch {}
          }
        }
      } else if (!masterKeyEnabled) {
        for (const shimeji of shimejis) {
          if (!shimeji.openrouterApiKey && shimeji.openrouterApiKeyEnc) {
            try {
              shimeji.openrouterApiKey = await decryptWithDeviceKey(shimeji.openrouterApiKeyEnc);
            } catch {}
          }
          if (!shimeji.openclawGatewayToken && shimeji.openclawGatewayTokenEnc) {
            try {
              shimeji.openclawGatewayToken = await decryptWithDeviceKey(shimeji.openclawGatewayTokenEnc);
            } catch {}
          }
          if ((shimeji.openrouterApiKey && !shimeji.openrouterApiKeyEnc) ||
              (shimeji.openclawGatewayToken && !shimeji.openclawGatewayTokenEnc)) {
            needsEncrypt = true;
          }
        }
      }

      chrome.storage.local.set({ shimejis, ttsEnabledMigrationDone: true });
      renderShimejis();
      if (needsEncrypt) saveShimejis();
    });
  }

  async function notifyRefresh() {
    try {
      chrome.runtime.sendMessage({ type: "refreshShimejis" });
    } catch {}
  }

  function getStoredShimejis() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["shimejis"], (data) => {
        resolve(Array.isArray(data.shimejis) ? data.shimejis : []);
      });
    });
  }

  async function saveShimejis() {
    if (masterKeyEnabled) {
      const sessionKey = await getSessionMasterKey();
      if (!sessionKey) {
        // Don't overwrite stored encrypted keys when locked
        return;
      }
      const out = [];
      for (const shimeji of shimejis) {
        const entry = { ...shimeji };
        if (entry.openrouterApiKey) {
          const enc = await encryptSecret(sessionKey, entry.openrouterApiKey, masterKeySalt);
          masterKeySalt = enc.salt;
          entry.openrouterApiKeyEnc = { data: enc.data, iv: enc.iv, salt: enc.salt };
        }
        if (entry.openclawGatewayToken) {
          const enc = await encryptSecret(sessionKey, entry.openclawGatewayToken, masterKeySalt);
          masterKeySalt = enc.salt;
          entry.openclawGatewayTokenEnc = { data: enc.data, iv: enc.iv, salt: enc.salt };
        }
        // Keep plaintext in-memory while storing encrypted values only
        if (entry.openrouterApiKey) entry.openrouterApiKey = '';
        if (entry.openclawGatewayToken) entry.openclawGatewayToken = '';
        out.push(entry);
      }
      chrome.storage.local.set({ shimejis: out, masterKeyEnabled: true, masterKeySalt }, notifyRefresh);
      shimejis = shimejis.map((s, idx) => ({
        ...s,
        openrouterApiKeyEnc: out[idx]?.openrouterApiKeyEnc || s.openrouterApiKeyEnc,
        openclawGatewayTokenEnc: out[idx]?.openclawGatewayTokenEnc || s.openclawGatewayTokenEnc
      }));
      return;
    }
    // master key disabled, persist plaintext and clear encrypted fields
    const stored = await getStoredShimejis();
    const storedById = new Map(stored.map((s) => [s.id, s]));
    const out = [];
    for (const s of shimejis) {
      const prev = storedById.get(s.id) || {};
      const openrouterApiKey = s.openrouterApiKey || prev.openrouterApiKey || "";
      const openclawGatewayToken = s.openclawGatewayToken || prev.openclawGatewayToken || "";
      const entry = {
        ...s,
        openrouterApiKey: "",
        openclawGatewayToken: ""
      };
      if (openrouterApiKey) {
        entry.openrouterApiKeyEnc = await encryptWithDeviceKey(openrouterApiKey);
      } else {
        entry.openrouterApiKeyEnc = prev.openrouterApiKeyEnc || null;
      }
      if (openclawGatewayToken) {
        entry.openclawGatewayTokenEnc = await encryptWithDeviceKey(openclawGatewayToken);
      } else {
        entry.openclawGatewayTokenEnc = prev.openclawGatewayTokenEnc || null;
      }
      out.push(entry);
    }
    chrome.storage.local.set({ shimejis: out, masterKeyEnabled: false, masterKeySalt: null }, notifyRefresh);
    shimejis = shimejis.map((s, idx) => ({
      ...s,
      openrouterApiKeyEnc: out[idx]?.openrouterApiKeyEnc || s.openrouterApiKeyEnc,
      openclawGatewayTokenEnc: out[idx]?.openclawGatewayTokenEnc || s.openclawGatewayTokenEnc
    }));
  }

  function renderShimejis() {
    if (!shimejiListEl) return;
    shimejiListEl.innerHTML = "";

    if (!selectedShimejiId || !shimejis.find((s) => s.id === selectedShimejiId)) {
      selectedShimejiId = shimejis[0]?.id || null;
    }

    let countStandard = 0;
    let countAgent = 0;
    let countOff = 0;

    shimejis.forEach((shimeji, index) => {
      const mode = normalizeMode(shimeji.mode);
      if (mode === "standard") countStandard += 1;
      if (mode === "agent") countAgent += 1;
      if (mode === "off") countOff += 1;

      const card = document.createElement("div");
      card.className = "shimeji-card";
      card.dataset.shimejiId = shimeji.id;
      card.dataset.mode = mode;
      if (selectedShimejiId && shimeji.id !== selectedShimejiId) {
        card.classList.add("hidden");
      }

      const header = document.createElement("div");
      header.className = "shimeji-card-header";
      const titleWrap = document.createElement("div");
      const metaWrap = document.createElement("div");
      metaWrap.className = "shimeji-card-meta";
      const title = document.createElement("div");
      title.className = "shimeji-card-title";
      title.textContent = `${t("Shimeji", "Shimeji")} ${index + 1}`;
      const idText = document.createElement("div");
      idText.className = "shimeji-card-id";
      idText.textContent = shimeji.id;
      const status = document.createElement("div");
      status.className = `shimeji-status ${mode}`;
      status.textContent = mode === "agent"
        ? t("Agent", "Agente")
        : mode === "off"
          ? t("Off", "Apagado")
          : mode === "decorative"
            ? t("Decorative", "Decorativo")
            : t("Standard", "Standard");
      const lockedBadge = document.createElement("div");
      lockedBadge.className = "shimeji-status locked";
      lockedBadge.textContent = t("Locked", "Bloqueado");
      titleWrap.appendChild(title);
      titleWrap.appendChild(idText);
      metaWrap.appendChild(titleWrap);
      metaWrap.appendChild(status);
      if (masterKeyEnabled && !masterKeyUnlocked) {
        metaWrap.appendChild(lockedBadge);
      }
      const removeBtn = document.createElement("button");
      removeBtn.className = "control-btn remove-btn";
      removeBtn.textContent = t("Remove", "Quitar");
      removeBtn.dataset.action = "remove";
      header.appendChild(metaWrap);
      header.appendChild(removeBtn);

      const grid = document.createElement("div");
      grid.className = "shimeji-grid";

      grid.appendChild(renderSelectField("character", t("Character", "Personaje"), CHARACTER_OPTIONS, shimeji.character));
      grid.appendChild(renderSelectField("size", t("Size", "Tamaño"), [
        { value: "small", labelEn: "Small", labelEs: "Pequeño" },
        { value: "medium", labelEn: "Medium", labelEs: "Mediano" },
        { value: "big", labelEn: "Large", labelEs: "Grande" },
      ], shimeji.size));
      grid.appendChild(renderSelectField("mode", t("AI Brain", "Cerebro AI"), [
        { value: "standard", labelEn: "Standard (API key only)", labelEs: "Standard (solo API key)" },
        { value: "agent", labelEn: "AI Agent", labelEs: "AI Agent" },
        { value: "off", labelEn: "Off", labelEs: "Apagado" },
        { value: "decorative", labelEn: "Decorative", labelEs: "Decorativo" },
      ], mode));
      grid.appendChild(renderToggleField("enabled", t("Active", "Activo"), shimeji.enabled !== false));
      grid.appendChild(renderSelectField("personality", t("Personality", "Personalidad"), PERSONALITY_OPTIONS, shimeji.personality));
      grid.appendChild(renderToggleField("soundEnabled", t("Sound", "Sonido"), shimeji.soundEnabled !== false));
      grid.appendChild(renderRangeField("soundVolume", t("Volume", "Volumen"), shimeji.soundVolume ?? 0.7));
      grid.appendChild(renderToggleField("ttsEnabled", t("Read Aloud", "Leer en voz alta"), !!shimeji.ttsEnabled));
      grid.appendChild(renderSelectField("ttsVoiceProfile", t("Voice", "Voz"), [
        { value: "random", labelEn: "Random", labelEs: "Aleatoria" },
        { value: "warm", labelEn: "Warm", labelEs: "Cálida" },
        { value: "bright", labelEn: "Bright", labelEs: "Brillante" },
        { value: "deep", labelEn: "Deep", labelEs: "Grave" },
        { value: "calm", labelEn: "Calm", labelEs: "Suave" },
        { value: "energetic", labelEn: "Energetic", labelEs: "Enérgica" }
      ], shimeji.ttsVoiceProfile || "random"));
      grid.appendChild(renderToggleField("openMicEnabled", t("Open Mic", "Micrófono abierto"), !!shimeji.openMicEnabled));
      grid.appendChild(renderToggleField("relayEnabled", t("Talk to other shimejis", "Hablar con otros shimejis"), !!shimeji.relayEnabled));

      const standardBlock = document.createElement("div");
      standardBlock.className = "shimeji-mode-row";
      standardBlock.dataset.mode = "standard";
      standardBlock.appendChild(renderSelectField("standardProvider", t("Provider", "Proveedor"), [
        { value: "openrouter", labelEn: "OpenRouter", labelEs: "OpenRouter" },
        { value: "ollama", labelEn: "Ollama", labelEs: "Ollama" }
      ], shimeji.standardProvider || "openrouter"));
      const providerHint = document.createElement("div");
      providerHint.className = "helper-text";
      providerHint.textContent = t(
        "Your messages are sent to the selected provider.",
        "Tus mensajes se envían al proveedor seleccionado."
      );
      standardBlock.appendChild(providerHint);
      const openrouterInput = renderInputField("openrouterApiKey", t("OpenRouter API Key (optional)", "API Key OpenRouter (opcional)"), shimeji.openrouterApiKey, "password", t("Paste your API key", "Pega tu API key"), "provider-openrouter");
      if (masterKeyEnabled && !masterKeyUnlocked) {
        openrouterInput.classList.add("locked");
        const input = openrouterInput.querySelector("input");
        const toggle = openrouterInput.querySelector("button");
        if (input) {
          input.disabled = true;
          input.placeholder = t("Locked", "Bloqueado");
        }
        if (toggle) toggle.disabled = true;
      }
      standardBlock.appendChild(openrouterInput);
      standardBlock.appendChild(renderSelectField("openrouterModel", t("Model", "Modelo"), MODEL_OPTIONS, shimeji.openrouterModel, "provider-openrouter"));
      const ollamaBlock = document.createElement("div");
      ollamaBlock.className = "shimeji-mode-row";
      ollamaBlock.dataset.provider = "ollama";
      ollamaBlock.appendChild(renderInputField("ollamaUrl", t("Ollama URL", "Ollama URL"), shimeji.ollamaUrl || "http://127.0.0.1:11434", "text", "http://127.0.0.1:11434"));
      ollamaBlock.appendChild(renderInputField("ollamaModel", t("Ollama Model", "Modelo Ollama"), shimeji.ollamaModel || "llama3.1", "text", "llama3.1"));
      standardBlock.appendChild(ollamaBlock);

      const agentBlock = document.createElement("div");
      agentBlock.className = "shimeji-mode-row";
      agentBlock.dataset.mode = "agent";
      agentBlock.appendChild(renderInputField("openclawGatewayUrl", t("Gateway URL", "Gateway URL"), shimeji.openclawGatewayUrl, "text", "ws://127.0.0.1:18789"));
      const openclawHint = document.createElement("div");
      openclawHint.className = "helper-text";
      openclawHint.textContent = t("OpenClaw needs a WebSocket URL + gateway token.", "OpenClaw necesita un WebSocket + token del gateway.");
      agentBlock.appendChild(openclawHint);
      const openclawTokenInput = renderInputField("openclawGatewayToken", t("OpenClaw Token", "Token OpenClaw"), shimeji.openclawGatewayToken, "password", t("Enter gateway token", "Token del gateway"));
      if (masterKeyEnabled && !masterKeyUnlocked) {
        openclawTokenInput.classList.add("locked");
        const input = openclawTokenInput.querySelector("input");
        const toggle = openclawTokenInput.querySelector("button");
        if (input) {
          input.disabled = true;
          input.placeholder = t("Locked", "Bloqueado");
        }
        if (toggle) toggle.disabled = true;
      }
      agentBlock.appendChild(openclawTokenInput);

      // Chat Style collapsible section
      const chatStyleBlock = document.createElement("div");
      chatStyleBlock.className = "shimeji-chat-style-section";
      chatStyleBlock.style.display = (mode === "off" || mode === "decorative") ? "none" : "";

      const chatStyleHeader = document.createElement("div");
      chatStyleHeader.className = "chat-style-toggle";
      chatStyleHeader.textContent = t("Chat Style", "Estilo de Chat");
      chatStyleHeader.addEventListener("click", () => {
        chatStyleHeader.classList.toggle("open");
        chatStyleGrid.classList.toggle("open");
      });

      const chatStyleGrid = document.createElement("div");
      chatStyleGrid.className = "shimeji-grid chat-style-grid";

      chatStyleGrid.appendChild(renderColorField("chatThemeColor", t("Theme Color", "Color Tema"), shimeji.chatThemeColor || "#2a1f4e"));
      chatStyleGrid.appendChild(renderColorField("chatBgColor", t("Background", "Fondo"), shimeji.chatBgColor || "#ffffff"));
      chatStyleGrid.appendChild(renderSelectField("chatFontSize", t("Font Size", "Tamaño Texto"), [
        { value: "small", labelEn: "Small", labelEs: "Pequeño" },
        { value: "medium", labelEn: "Medium", labelEs: "Mediano" },
        { value: "large", labelEn: "Large", labelEs: "Grande" }
      ], shimeji.chatFontSize || "medium"));
      chatStyleGrid.appendChild(renderSelectField("chatWidth", t("Chat Width", "Ancho Chat"), [
        { value: "small", labelEn: "Narrow", labelEs: "Angosto" },
        { value: "medium", labelEn: "Medium", labelEs: "Mediano" },
        { value: "large", labelEn: "Wide", labelEs: "Ancho" }
      ], shimeji.chatWidth || "medium"));
      chatStyleGrid.appendChild(renderSelectField("chatBubbleStyle", t("Style", "Estilo"), [
        { value: "glass", labelEn: "Glass", labelEs: "Vidrio" },
        { value: "solid", labelEn: "Solid", labelEs: "Sólido" },
        { value: "dark", labelEn: "Dark", labelEs: "Oscuro" }
      ], shimeji.chatBubbleStyle || "glass"));

      chatStyleBlock.appendChild(chatStyleHeader);
      chatStyleBlock.appendChild(chatStyleGrid);

      card.appendChild(header);
      card.appendChild(grid);
      card.appendChild(standardBlock);
      card.appendChild(agentBlock);
      card.appendChild(chatStyleBlock);
      shimejiListEl.appendChild(card);

      toggleModeBlocks(card, mode);
      toggleProviderBlocks(card, shimeji.standardProvider || "openrouter");
    });

    if (shimejiSelectorEl) {
      shimejiSelectorEl.innerHTML = "";
      for (let i = 0; i < MAX_SHIMEJIS; i += 1) {
        const btn = document.createElement("button");
        btn.className = "shimeji-selector-btn";
        btn.type = "button";
        btn.textContent = `${i + 1}`;
        const shimeji = shimejis[i];
        if (!shimeji) {
          btn.disabled = true;
        } else {
          btn.dataset.shimejiId = shimeji.id;
          if (shimeji.id === selectedShimejiId) btn.classList.add("active");
        }
        shimejiSelectorEl.appendChild(btn);
      }
    }

    if (addShimejiBtn) {
      addShimejiBtn.disabled = shimejis.length >= MAX_SHIMEJIS;
    }

    if (popupStats) {
      const total = shimejis.length;
      const standardText = t("standard", "standard");
      const agentText = t("agent", "agente");
      const offText = t("off", "apagado");
      popupStats.textContent = `${total} total · ${countStandard} ${standardText} · ${countAgent} ${agentText} · ${countOff} ${offText}`;
    }
  }

  function renderSelectField(field, labelText, options, value, extraClass) {
    const wrapper = document.createElement("div");
    wrapper.className = "ai-field";
    if (extraClass) extraClass.split(" ").forEach((c) => c && wrapper.classList.add(c));
    const label = document.createElement("label");
    label.className = "ai-label";
    label.textContent = labelText;
    const select = document.createElement("select");
    select.className = "ai-select";
    select.dataset.field = field;
    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = isSpanishLocale() ? (opt.labelEs || opt.labelEn || opt.label) : (opt.labelEn || opt.labelEs || opt.label);
      if (opt.disabled) option.disabled = true;
      select.appendChild(option);
    });
    select.value = value;
    wrapper.appendChild(label);
    wrapper.appendChild(select);
    return wrapper;
  }

  function renderInputField(field, labelText, value, type, placeholder, extraClass) {
    const wrapper = document.createElement("div");
    wrapper.className = "ai-field";
    if (extraClass) extraClass.split(" ").forEach((c) => c && wrapper.classList.add(c));
    const label = document.createElement("label");
    label.className = "ai-label";
    label.textContent = labelText;
    const inputWrapper = document.createElement("div");
    inputWrapper.className = "api-key-wrapper";
    const input = document.createElement("input");
    input.type = type;
    input.className = "ai-input";
    input.value = value || "";
    input.placeholder = placeholder || "";
    input.dataset.field = field;
    if (type === "password") {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "key-toggle-btn";
      toggle.textContent = t("Show", "Mostrar");
      toggle.dataset.action = "toggle";
      inputWrapper.appendChild(input);
      inputWrapper.appendChild(toggle);
    } else {
      inputWrapper.appendChild(input);
    }
    wrapper.appendChild(label);
    wrapper.appendChild(inputWrapper);
    return wrapper;
  }

  function renderColorField(field, labelText, value, extraClass) {
    const wrapper = document.createElement("div");
    wrapper.className = "ai-field";
    if (extraClass) extraClass.split(" ").forEach((c) => c && wrapper.classList.add(c));
    const label = document.createElement("label");
    label.className = "ai-label";
    label.textContent = labelText;
    const input = document.createElement("input");
    input.type = "color";
    input.className = "ai-color-input";
    input.value = value || "#2a1f4e";
    input.dataset.field = field;
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return wrapper;
  }

  function renderToggleField(field, labelText, value, extraClass) {
    const wrapper = document.createElement("div");
    wrapper.className = "ai-field";
    if (extraClass) extraClass.split(" ").forEach((c) => c && wrapper.classList.add(c));
    const label = document.createElement("label");
    label.className = "ai-label";
    label.textContent = labelText;
    const row = document.createElement("label");
    row.className = "toggle-row mini-toggle";
    const span = document.createElement("span");
    span.className = "toggle-label";
    span.textContent = value ? t("On", "Activo") : t("Off", "Apagado");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "toggle-checkbox";
    input.dataset.field = field;
    input.checked = !!value;
    const slider = document.createElement("span");
    slider.className = "toggle-slider";
    row.appendChild(span);
    row.appendChild(input);
    row.appendChild(slider);
    wrapper.appendChild(label);
    wrapper.appendChild(row);
    return wrapper;
  }

  function renderRangeField(field, labelText, value, extraClass) {
    const wrapper = document.createElement("div");
    wrapper.className = "ai-field";
    if (extraClass) extraClass.split(" ").forEach((c) => c && wrapper.classList.add(c));
    const label = document.createElement("label");
    label.className = "ai-label";
    label.textContent = labelText;
    const row = document.createElement("div");
    row.className = "ai-range-row";
    const input = document.createElement("input");
    input.type = "range";
    input.className = "ai-range";
    input.min = "0";
    input.max = "100";
    input.step = "5";
    input.value = Math.round((value ?? 0.7) * 100);
    input.dataset.field = field;
    const pct = document.createElement("span");
    pct.className = "ai-range-pct";
    pct.textContent = `${input.value}%`;
    input.addEventListener("input", () => { pct.textContent = `${input.value}%`; });
    row.appendChild(input);
    row.appendChild(pct);
    wrapper.appendChild(label);
    wrapper.appendChild(row);
    return wrapper;
  }

  function toggleModeBlocks(card, mode) {
    const standardBlock = card.querySelector('[data-mode="standard"]');
    const agentBlock = card.querySelector('[data-mode="agent"]');
    const chatStyleBlock = card.querySelector(".shimeji-chat-style-section");
    if (standardBlock) standardBlock.style.display = mode === "standard" ? "" : "none";
    if (agentBlock) agentBlock.style.display = mode === "agent" ? "" : "none";
    if (chatStyleBlock) chatStyleBlock.style.display = (mode === "off" || mode === "decorative") ? "none" : "";
    if (card) card.dataset.mode = mode;
  }


  function toggleProviderBlocks(card, provider) {
    const ollamaBlocks = card.querySelectorAll('[data-provider="ollama"]');
    const openrouterBlocks = card.querySelectorAll('.provider-openrouter');
    ollamaBlocks.forEach((el) => {
      el.style.display = provider === "ollama" ? "" : "none";
    });
    openrouterBlocks.forEach((el) => {
      el.style.display = provider === "openrouter" ? "" : "none";
    });
  }

  function updateShimeji(id, field, value) {
    const target = shimejis.find((s) => s.id === id);
    if (!target) return;
    if (field === "mode") {
      target[field] = normalizeMode(value);
    } else if (field === "ttsVoiceProfile") {
      target.ttsVoiceProfile = value;
      target.ttsVoiceId = "";
    } else if (field === "ttsEnabled") {
      target.ttsEnabled = value;
      if (value && !target.ttsVoiceProfile) {
        target.ttsVoiceProfile = pickRandomVoiceProfile();
      }
    } else {
      target[field] = value;
    }
    saveShimejis();
  }

  if (addShimejiBtn) {
    addShimejiBtn.addEventListener("click", () => {
      if (shimejis.length >= MAX_SHIMEJIS) return;
      const newShimeji = getDefaultShimeji(shimejis.length);
      // Copy API key and provider settings from an existing shimeji
      const donor = shimejis.find((s) => (s.openrouterApiKey || "").trim());
      if (donor) {
        newShimeji.openrouterApiKey = donor.openrouterApiKey;
        newShimeji.standardProvider = donor.standardProvider || "openrouter";
        if (donor.openrouterApiKeyEnc) newShimeji.openrouterApiKeyEnc = donor.openrouterApiKeyEnc;
      }
      shimejis.push(newShimeji);
      shimejis = ensureShimejiIds(shimejis);
      selectedShimejiId = shimejis[shimejis.length - 1]?.id || null;
      saveShimejis();
      renderShimejis();
    });
  }

  if (shimejiListEl) {
    shimejiListEl.addEventListener("click", (e) => {
      const action = e.target?.dataset?.action;
      const card = e.target.closest(".shimeji-card");
      if (!card) return;
      const id = card.dataset.shimejiId;
      if (action === "remove") {
        const removeIndex = shimejis.findIndex((s) => s.id === id);
        shimejis = shimejis.filter((s) => s.id !== id);
        if (shimejis.length === 0) {
          shimejis = [getDefaultShimeji(0)];
        }
        if (selectedShimejiId === id) {
          const next = shimejis[removeIndex] || shimejis[removeIndex - 1] || shimejis[0];
          selectedShimejiId = next ? next.id : null;
        }
        saveShimejis();
        renderShimejis();
      } else if (action === "toggle") {
        const input = e.target.previousElementSibling;
        if (input && input.type === "password") {
          input.type = "text";
          e.target.textContent = t("Hide", "Ocultar");
        } else if (input) {
          input.type = "password";
          e.target.textContent = t("Show", "Mostrar");
        }
      }
    });

    shimejiListEl.addEventListener("change", (e) => {
      const card = e.target.closest(".shimeji-card");
      if (!card) return;
      const id = card.dataset.shimejiId;
      const field = e.target.dataset.field;
      if (!field) return;
      if (e.target.type === "checkbox") {
        updateShimeji(id, field, e.target.checked);
        const label = e.target.closest(".toggle-row")?.querySelector(".toggle-label");
        if (label) label.textContent = e.target.checked ? t("On", "Activo") : t("Off", "Apagado");
      } else {
        updateShimeji(id, field, e.target.value);
      }
      if (field === "mode") {
        toggleModeBlocks(card, e.target.value);
        // Re-apply provider visibility when switching to standard mode
        if (e.target.value === "standard") {
          const providerSelect = card.querySelector('[data-field="standardProvider"]');
          if (providerSelect) toggleProviderBlocks(card, providerSelect.value);
        }
      }
      if (field === "standardProvider") {
        toggleProviderBlocks(card, e.target.value);
      }
    });

    shimejiListEl.addEventListener("input", (e) => {
      const card = e.target.closest(".shimeji-card");
      if (!card) return;
      const id = card.dataset.shimejiId;
      const field = e.target.dataset.field;
      if (!field) return;
      if (field === "soundVolume") {
        const v = Number(e.target.value) / 100;
        updateShimeji(id, field, v);
      } else {
        updateShimeji(id, field, e.target.value);
      }
    });
  }

  if (shimejiSelectorEl) {
    shimejiSelectorEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".shimeji-selector-btn");
      if (!btn || btn.disabled) return;
      const id = btn.dataset.shimejiId;
      if (!id || id === selectedShimejiId) return;
      selectedShimejiId = id;
      renderShimejis();
    });
  }

  if (wakeAllBtn) {
    wakeAllBtn.addEventListener("click", () => {
      shimejis = shimejis.map((s) => ({ ...s, mode: "standard" }));
      saveShimejis();
      renderShimejis();
    });
  }

  if (sleepAllBtn) {
    sleepAllBtn.addEventListener("click", () => {
      shimejis = shimejis.map((s) => ({ ...s, mode: "off" }));
      saveShimejis();
      renderShimejis();
    });
  }

  if (masterkeyToggle) {
    masterkeyToggle.addEventListener('change', async () => {
      if (!masterkeyToggle.checked) {
        const sessionKey = await getSessionMasterKey();
        if (!sessionKey) {
          masterkeyToggle.checked = true;
          setMasterKeyStatusMessage(t('Unlock to disable master key', 'Desbloquea para desactivar la clave maestra'));
          return;
        }
        masterKeyEnabled = false;
        masterKeyUnlocked = false;
        await saveShimejis();
        clearSessionMasterKey();
        if (masterKeyAutoLockTimer) {
          clearTimeout(masterKeyAutoLockTimer);
          masterKeyAutoLockTimer = null;
        }
        applyMasterKeyUiState();
        renderShimejis();
        return;
      }
      const value = masterkeyInput?.value || '';
      await enableMasterKeyWithValue(value);
    });
  }

  if (masterkeyUnlockBtn) {
    masterkeyUnlockBtn.addEventListener('click', async () => {
      const value = masterkeyInput?.value || '';
      if (!value) return;
      await enableMasterKeyWithValue(value);
    });
  }

  if (masterkeyLockBtn) {
    masterkeyLockBtn.addEventListener('click', () => {
      clearSessionMasterKey();
      masterKeyUnlocked = false;
      if (masterKeyAutoLockTimer) {
        clearTimeout(masterKeyAutoLockTimer);
        masterKeyAutoLockTimer = null;
      }
      applyMasterKeyUiState();
      renderShimejis();
    });
  }

  if (autolockToggle) {
    autolockToggle.addEventListener('change', () => {
      masterKeyAutoLockEnabled = !!autolockToggle.checked;
      chrome.storage.local.set({ masterKeyAutoLockEnabled });
      scheduleAutoLock();
    });
  }

  if (autolockMinutesInput) {
    autolockMinutesInput.addEventListener('input', () => {
      masterKeyAutoLockMinutes = Number(autolockMinutesInput.value) || 30;
      chrome.storage.local.set({ masterKeyAutoLockMinutes });
      updateAutolockLabel();
      scheduleAutoLock();
    });
  }

  setPopupLabels();
  chrome.storage.local.get(["popupAdvancedMode"], (data) => {
    const advanced = !!data.popupAdvancedMode;
    document.body.classList.toggle("advanced", advanced);
    if (basicModeBtn) basicModeBtn.classList.toggle("active", !advanced);
    if (advancedModeBtn) advancedModeBtn.classList.toggle("active", advanced);
    loadShimejis();
  });

  if (basicModeBtn) {
    basicModeBtn.addEventListener("click", () => {
      document.body.classList.remove("advanced");
      basicModeBtn.classList.add("active");
      if (advancedModeBtn) advancedModeBtn.classList.remove("active");
      chrome.storage.local.set({ popupAdvancedMode: false });
    });
  }

  if (advancedModeBtn) {
    advancedModeBtn.addEventListener("click", () => {
      document.body.classList.add("advanced");
      advancedModeBtn.classList.add("active");
      if (basicModeBtn) basicModeBtn.classList.remove("active");
      chrome.storage.local.set({ popupAdvancedMode: true });
    });
  }

  if (popupThemeSelect) {
    popupThemeSelect.addEventListener("change", () => {
      const value = popupThemeSelect.value || "random";
      chrome.storage.local.set({ popupTheme: value });
      applyTheme(value === "random" ? getRandomTheme() : value);
    });
  }

});
