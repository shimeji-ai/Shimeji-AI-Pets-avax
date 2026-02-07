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
  const shimejiSectionTitle = document.getElementById("shimeji-section-title");
  const shimejiLimitHint = document.getElementById("shimeji-limit-hint");
  const popupSubtitle = document.getElementById("popup-subtitle");
  const popupStats = document.getElementById("popup-stats");
  const wakeAllBtn = document.getElementById("wake-all-btn");
  const sleepAllBtn = document.getElementById("sleep-all-btn");
const basicModeBtn = document.getElementById("basic-mode-btn");
const advancedModeBtn = document.getElementById("advanced-mode-btn");
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
  const appearanceVisibilityTitle = document.getElementById("appearance-visibility-title");
  const labelEnabledPage = document.getElementById("label-enabled-page");
  const enableAllBtnLabel = document.getElementById("enable-all-btn");
  const disableAllBtnLabel = document.getElementById("disable-all-btn");

  const MODEL_OPTIONS = [
    { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
    { value: "moonshotai/kimi-k2.5", label: "Kimi K2.5" },
    { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
    { value: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
    { value: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek Chat v3" },
    { value: "mistralai/mistral-large-2411", label: "Mistral Large" },
  ];

  const CHARACTER_OPTIONS = [
    { value: "shimeji", labelEn: "Shimeji", labelEs: "Shimeji" },
    { value: "bunny", labelEn: "Bunny", labelEs: "Conejo" },
    { value: "kitten", labelEn: "Kitten", labelEs: "Gatito" },
    { value: "ghost", labelEn: "Ghost", labelEs: "Fantasma" },
    { value: "blob", labelEn: "Blob", labelEs: "Blob" },
  ];

  const PERSONALITY_OPTIONS = [
    { value: "cryptid", labelEn: "Cryptid", labelEs: "Críptido" },
    { value: "cozy", labelEn: "Cozy", labelEs: "Acogedor" },
    { value: "chaotic", labelEn: "Chaotic", labelEs: "Caótico" },
    { value: "philosopher", labelEn: "Philosopher", labelEs: "Filósofo" },
    { value: "hype", labelEn: "Hype Beast", labelEs: "Entusiasta" },
    { value: "noir", labelEn: "Noir", labelEs: "Noir" },
  ];

  let shimejis = [];

  function isSpanishLocale() {
    const locale = (navigator.language || '').toLowerCase();
    return locale.startsWith('es');
  }

  function t(en, es) {
    return isSpanishLocale() ? es : en;
  }

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
      ? t('Master key unlocked for this session', 'Clave maestra desbloqueada en esta sesion')
      : t('Master key locked', 'Clave maestra bloqueada');
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

  function setPopupLabels() {
    if (shimejiSectionTitle) shimejiSectionTitle.textContent = t("Shimejis", "Shimejis");
    if (shimejiLimitHint) shimejiLimitHint.textContent = t("Up to 5 shimejis on screen", "Hasta 5 shimejis en pantalla");
    if (addShimejiBtn) addShimejiBtn.textContent = t("Add", "Agregar");
    if (linkOpenPortals) linkOpenPortals.textContent = t("Open more portals", "Abrir mas portales");
    if (appearanceVisibilityTitle) appearanceVisibilityTitle.textContent = t("Visibility", "Visibilidad");
    if (labelEnabledPage) labelEnabledPage.textContent = t("Enabled on this page", "Activo en esta pagina");
    if (enableAllBtnLabel) enableAllBtnLabel.textContent = t("Enable All", "Activar todo");
    if (disableAllBtnLabel) disableAllBtnLabel.textContent = t("Disable All", "Desactivar todo");
    if (popupSubtitle) popupSubtitle.textContent = t("Your AI mascot orchestrator", "Tu orquestador de mascotas AI");
    if (wakeAllBtn) wakeAllBtn.textContent = t("Wake All", "Despertar todos");
    if (sleepAllBtn) sleepAllBtn.textContent = t("Sleep All", "Dormir todos");
if (basicModeBtn) basicModeBtn.textContent = t("Basic", "Basico");
if (advancedModeBtn) advancedModeBtn.textContent = t("Advanced", "Avanzado");
if (securityTitle) securityTitle.textContent = t("Security", "Seguridad");
if (masterkeyLabel) masterkeyLabel.textContent = t("Protect keys with master key", "Proteger claves con clave maestra");
if (masterkeyInput) masterkeyInput.placeholder = t("Master key", "Clave maestra");
if (masterkeyUnlockBtn) masterkeyUnlockBtn.textContent = t("Unlock", "Desbloquear");
if (masterkeyLockBtn) masterkeyLockBtn.textContent = t("Lock", "Bloquear");
if (autolockLabel) autolockLabel.textContent = t("Auto-lock", "Auto-bloqueo");
  }

  function getDefaultShimeji(index) {
    const randomChar = CHARACTER_OPTIONS[Math.floor(Math.random() * CHARACTER_OPTIONS.length)].value;
    return {
      id: `shimeji-${index + 1}`,
      character: randomChar,
      size: "medium",
      mode: "standard",
      standardProvider: "openrouter",
      openrouterApiKey: "",
      openrouterModel: MODEL_OPTIONS[0].value,
      ollamaUrl: "http://127.0.0.1:11434",
      ollamaModel: "llama3.1",
      openclawGatewayUrl: "ws://127.0.0.1:18789",
      openclawGatewayToken: "",
      personality: "cryptid",
      enabled: true,
      soundEnabled: true,
      soundVolume: 0.7,
      chatThemeColor: "#2a1f4e",
      chatBgColor: "#ffffff",
      chatFontSize: "medium",
      chatWidth: "medium",
      chatBubbleStyle: "glass",
      ttsEnabled: false
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
        ttsEnabled: shimeji.ttsEnabled || false
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
      ttsEnabled: false
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
      'masterKeyAutoLockMinutes'
    ], async (data) => {
      masterKeyEnabled = !!data.masterKeyEnabled;
      masterKeySalt = data.masterKeySalt || null;
      masterKeyAutoLockEnabled = data.masterKeyAutoLockEnabled !== false;
      masterKeyAutoLockMinutes = typeof data.masterKeyAutoLockMinutes === "number" ? data.masterKeyAutoLockMinutes : 30;
      const sessionKey = await getSessionMasterKey();
      masterKeyUnlocked = !!sessionKey;
      applyMasterKeyUiState();

      shimejis = migrateLegacy(data);
      if (!Array.isArray(shimejis) || shimejis.length === 0) {
        shimejis = [getDefaultShimeji(0)];
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
      }

      chrome.storage.local.set({ shimejis });
      renderShimejis();
    });
  }

  async function notifyRefresh() {
    try {
      chrome.runtime.sendMessage({ type: "refreshShimejis" });
    } catch {}
  }

  async function saveShimejis() {
    if (masterKeyEnabled) {
      const sessionKey = await getSessionMasterKey();
      if (!sessionKey) {
        const lockedCopy = shimejis.map((s) => ({
          ...s,
          openrouterApiKey: '',
          openclawGatewayToken: ''
        }));
        chrome.storage.local.set({ shimejis: lockedCopy, masterKeyEnabled: true, masterKeySalt }, notifyRefresh);
        shimejis = lockedCopy;
        return;
      }
      const out = [];
      for (const shimeji of shimejis) {
        const entry = { ...shimeji };
        if (entry.openrouterApiKey) {
          const enc = await encryptSecret(sessionKey, entry.openrouterApiKey, masterKeySalt);
          masterKeySalt = enc.salt;
          entry.openrouterApiKeyEnc = { data: enc.data, iv: enc.iv, salt: enc.salt };
          entry.openrouterApiKey = '';
        }
        if (entry.openclawGatewayToken) {
          const enc = await encryptSecret(sessionKey, entry.openclawGatewayToken, masterKeySalt);
          masterKeySalt = enc.salt;
          entry.openclawGatewayTokenEnc = { data: enc.data, iv: enc.iv, salt: enc.salt };
          entry.openclawGatewayToken = '';
        }
        out.push(entry);
      }
      chrome.storage.local.set({ shimejis: out, masterKeyEnabled: true, masterKeySalt }, notifyRefresh);
      shimejis = out;
      return;
    }
    // master key disabled, persist plaintext and clear encrypted fields
    const cleared = shimejis.map((s) => ({ ...s, openrouterApiKeyEnc: null, openclawGatewayTokenEnc: null }));
    chrome.storage.local.set({ shimejis: cleared, masterKeyEnabled: false, masterKeySalt: null }, notifyRefresh);
    shimejis = cleared;
  }

  function renderShimejis() {
    if (!shimejiListEl) return;
    shimejiListEl.innerHTML = "";

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
      grid.appendChild(renderSelectField("size", t("Size", "Tamano"), [
        { value: "small", labelEn: "Small", labelEs: "Pequeno" },
        { value: "medium", labelEn: "Medium", labelEs: "Mediano" },
        { value: "big", labelEn: "Large", labelEs: "Grande" },
      ], shimeji.size));
      grid.appendChild(renderSelectField("mode", t("Brain", "Cerebro"), [
        { value: "standard", labelEn: "Standard", labelEs: "Standard" },
        { value: "agent", labelEn: "AI Agent", labelEs: "AI Agent" },
        { value: "off", labelEn: "Off", labelEs: "Apagado" },
        { value: "decorative", labelEn: "Decorative", labelEs: "Decorativo" },
      ], mode));
      grid.appendChild(renderToggleField("enabled", t("Active", "Activo"), shimeji.enabled !== false));
      grid.appendChild(renderSelectField("personality", t("Personality", "Personalidad"), PERSONALITY_OPTIONS, shimeji.personality));
      grid.appendChild(renderToggleField("soundEnabled", t("Sound", "Sonido"), shimeji.soundEnabled !== false));
      grid.appendChild(renderRangeField("soundVolume", t("Volume", "Volumen"), shimeji.soundVolume ?? 0.7));
      grid.appendChild(renderToggleField("ttsEnabled", t("Read Aloud", "Leer en voz alta"), !!shimeji.ttsEnabled));

      const standardBlock = document.createElement("div");
      standardBlock.className = "shimeji-mode-row";
      standardBlock.dataset.mode = "standard";
      standardBlock.appendChild(renderSelectField("standardProvider", t("Provider", "Proveedor"), [
        { value: "openrouter", labelEn: "OpenRouter", labelEs: "OpenRouter" },
        { value: "ollama", labelEn: "Ollama", labelEs: "Ollama" }
      ], shimeji.standardProvider || "openrouter"));
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
      chatStyleBlock.classList.add("advanced-only");
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
      chatStyleGrid.appendChild(renderSelectField("chatFontSize", t("Font Size", "Tamano Texto"), [
        { value: "small", labelEn: "Small", labelEs: "Pequeno" },
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
        { value: "solid", labelEn: "Solid", labelEs: "Solido" },
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
    } else {
      target[field] = value;
    }
    saveShimejis();
  }

  if (addShimejiBtn) {
    addShimejiBtn.addEventListener("click", () => {
      if (shimejis.length >= MAX_SHIMEJIS) return;
      shimejis.push(getDefaultShimeji(shimejis.length));
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
        shimejis = shimejis.filter((s) => s.id !== id);
        if (shimejis.length === 0) {
          shimejis = [getDefaultShimeji(0)];
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
          updateMasterKeyStatus();
          return;
        }
        masterKeyEnabled = false;
        await saveShimejis();
        clearSessionMasterKey();
        masterKeyUnlocked = false;
        if (masterKeyAutoLockTimer) {
          clearTimeout(masterKeyAutoLockTimer);
          masterKeyAutoLockTimer = null;
        }
        applyMasterKeyUiState();
        renderShimejis();
        return;
      }
      masterKeyEnabled = true;
      applyMasterKeyUiState();
      chrome.storage.local.set({ masterKeyEnabled: true });
    });
  }

  if (masterkeyUnlockBtn) {
    masterkeyUnlockBtn.addEventListener('click', async () => {
      const value = masterkeyInput?.value || '';
      if (!value) return;
      masterKeyEnabled = true;
      setSessionMasterKey(value);
      masterKeyUnlocked = true;
      if (!masterKeySalt) {
        const enc = await encryptSecret(value, 'seed', null);
        masterKeySalt = enc.salt;
        chrome.storage.local.set({ masterKeySalt });
      }
      applyMasterKeyUiState();
      scheduleAutoLock();
      loadShimejis();
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

});
