document.addEventListener("DOMContentLoaded", () => {
  const allSitesToggle = document.getElementById("all-sites-toggle");
  const allSitesToggleRow = document.getElementById("all-sites-toggle-row");
  const pageToggle = document.getElementById("page-toggle");
  const pageToggleRow = document.getElementById("page-toggle-row");
  const globalStatus = document.getElementById("global-status");
  let currentOrigin = null;
  let currentTabId = null;
  const REQUIRED_ORIGINS = new Set([
    "https://shimeji.dev",
    "https://www.shimeji.dev",
    "https://openrouter.ai",
    "http://127.0.0.1",
    "http://localhost",
    "ws://127.0.0.1",
    "ws://localhost"
  ]);

  function setStatus(text, isWarning) {
    if (!globalStatus) return;
    globalStatus.textContent = text || "";
    globalStatus.classList.toggle("warning", !!isWarning);
  }

  function updateToggleVisual(row, toggle) {
    if (!row || !toggle) return;
    row.classList.toggle("active", !!toggle.checked);
  }

  function applyVisibilityVisuals() {
    updateToggleVisual(allSitesToggleRow, allSitesToggle);
    updateToggleVisual(pageToggleRow, pageToggle);
  }

  const STORAGE_KEYS = {
    disabledAll: "disabledAll",
    disabledPages: "disabledPages"
  };

  function storageLocalGet(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => resolve(result || {}));
    });
  }

  function storageSessionSet(obj) {
    return new Promise((resolve) => {
      chrome.storage.session.set(obj, () => resolve(true));
    });
  }

  function storageSessionRemove(keys) {
    return new Promise((resolve) => {
      chrome.storage.session.remove(keys, () => resolve(true));
    });
  }

  function storageSyncGet(keys) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, (result) => resolve(result));
    });
  }

  function storageSyncSet(obj) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(obj, () => resolve());
    });
  }

  async function addDisabledPage(origin) {
    const normalized = normalizeOriginFromUrl(origin);
    if (!normalized) return;
    const data = await storageSyncGet([STORAGE_KEYS.disabledPages]);
    const list = Array.isArray(data.disabledPages) ? data.disabledPages : [];
    if (!list.includes(normalized)) {
      list.push(normalized);
      await storageSyncSet({ [STORAGE_KEYS.disabledPages]: list });
    }
  }

  async function removeDisabledPage(origin) {
    const normalized = normalizeOriginFromUrl(origin);
    if (!normalized) return;
    const data = await storageSyncGet([STORAGE_KEYS.disabledPages]);
    const list = Array.isArray(data.disabledPages) ? data.disabledPages : [];
    const next = list.filter((item) => item !== normalized);
    if (next.length !== list.length) {
      await storageSyncSet({ [STORAGE_KEYS.disabledPages]: next });
    }
  }

  async function setDisabledAll(value) {
    await storageSyncSet({ [STORAGE_KEYS.disabledAll]: !!value });
  }

  function setStatusMessage(en, es, isWarning) {
    setStatus(t(en, es), isWarning);
  }

  function setControlsEnabled(enabled) {
    if (allSitesToggle) allSitesToggle.disabled = !enabled;
    if (allSitesToggleRow) allSitesToggleRow.classList.toggle("disabled", !enabled);
    if (pageToggle) pageToggle.disabled = !enabled;
    if (pageToggleRow) pageToggleRow.classList.toggle("disabled", !enabled);
  }

  function setPageControlEnabled(enabled) {
    if (pageToggle) pageToggle.disabled = !enabled;
    if (pageToggleRow) pageToggleRow.classList.toggle("disabled", !enabled);
  }

  function setAllSitesControlEnabled(enabled) {
    if (allSitesToggle) allSitesToggle.disabled = !enabled;
    if (allSitesToggleRow) allSitesToggleRow.classList.toggle("disabled", !enabled);
  }

  function normalizeOriginFromUrl(url) {
    try {
      const u = new URL(url);
      return u.origin;
    } catch {
      return null;
    }
  }

  function sendBg(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (resp) => resolve(resp));
    });
  }

  function isRequiredOrigin(origin) {
    if (!origin) return false;
    const normalized = origin.replace(/\/$/, "");
    return REQUIRED_ORIGINS.has(normalized);
  }

  function originToMatchPattern(origin) {
    const o = (origin || "").replace(/\/$/, "");
    return `${o}/*`;
  }

  function allSitesOrigins() {
    return ["http://*/*", "https://*/*"];
  }

  function permissionsContainsAllSites() {
    return new Promise((resolve) => {
      chrome.permissions.contains({ origins: allSitesOrigins() }, (ok) => resolve(!!ok));
    });
  }

  function permissionsRequestAllSites() {
    return new Promise((resolve) => {
      chrome.permissions.request({ origins: allSitesOrigins() }, (ok) => resolve(!!ok));
    });
  }

  function permissionsRemoveAllSites() {
    return new Promise((resolve) => {
      chrome.permissions.remove({ origins: allSitesOrigins() }, (ok) => resolve(!!ok));
    });
  }

  function permissionsContainsOrigin(origin) {
    return new Promise((resolve) => {
      chrome.permissions.contains({ origins: [originToMatchPattern(origin)] }, (ok) => resolve(!!ok));
    });
  }

  function permissionsRequestOrigin(origin) {
    return new Promise((resolve) => {
      chrome.permissions.request({ origins: [originToMatchPattern(origin)] }, (ok) => resolve(!!ok));
    });
  }

  function permissionsRemoveOrigin(origin) {
    if (isRequiredOrigin(origin)) return Promise.resolve(false);
    return new Promise((resolve) => {
      chrome.permissions.remove({ origins: [originToMatchPattern(origin)] }, (ok) => resolve(!!ok));
    });
  }

  function injectIntoTab(tabId) {
    return new Promise((resolve) => {
      try {
        chrome.scripting.insertCSS({ target: { tabId }, files: ["style.css"] }, () => {
          const cssErr = chrome.runtime.lastError;
          chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }, () => {
            const jsErr = chrome.runtime.lastError;
            if (cssErr || jsErr) return resolve(false);
            resolve(true);
          });
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function isInjectableUrl(url) {
    return typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
  }

  async function getAllSitesModeState() {
    const permGranted = await permissionsContainsAllSites();
    const localData = await storageLocalGet(["allSitesEnabled"]);
    const registered = !!localData.allSitesEnabled;
    return {
      permGranted,
      registered,
      active: permGranted && registered
    };
  }

  async function shutdownAllTabs() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        (tabs || []).forEach((tab) => {
          if (!tab?.id) return;
          chrome.tabs.sendMessage(tab.id, { action: "shutdownShimejis" }).catch(() => {});
        });
        resolve(true);
      });
    });
  }

  async function injectIntoAllEligibleTabs() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, async (tabs) => {
        const list = Array.isArray(tabs) ? tabs : [];
        // Best-effort, sequential to avoid spiking the scripting API.
        for (const tab of list) {
          if (!tab?.id) continue;
          if (!isInjectableUrl(tab.url)) continue;
          try {
            // eslint-disable-next-line no-await-in-loop
            await injectIntoTab(tab.id);
          } catch {}
        }
        resolve(true);
      });
    });
  }

  async function setAllSitesEnabled(nextEnabled) {
    setControlsEnabled(false);
    setStatusMessage(
      nextEnabled ? "Enabling on all sites..." : "Disabling on all sites...",
      nextEnabled ? "Activando en todos los sitios..." : "Desactivando en todos los sitios...",
      false
    );

    if (nextEnabled) {
      const alreadyGranted = await permissionsContainsAllSites();
      if (!alreadyGranted) {
        // If the popup closes during the permission prompt, background.js will finish the enable flow.
        await storageSessionSet({
          pendingEnableAllSites: {
            tabId: currentTabId,
            createdAt: Date.now()
          }
        });
      }
      const granted = alreadyGranted ? true : await permissionsRequestAllSites();
      if (!granted) {
        await storageSessionRemove(["pendingEnableAllSites"]);
        if (allSitesToggle) allSitesToggle.checked = false;
        applyVisibilityVisuals();
        await refreshSiteStatus();
        setStatusMessage("Permission not granted for all sites.", "Permiso denegado para todos los sitios.", true);
        return;
      }

      const reg = await sendBg({ type: "registerAllSites" });
      if (reg?.error) {
        await refreshSiteStatus();
        setStatus(reg.error, true);
        return;
      }

      // Enabling "all sites" should immediately bring shimejis to life on open tabs.
      await storageSyncSet({ [STORAGE_KEYS.disabledPages]: [] });
      await setDisabledAll(false);
      if (currentTabId) {
        try {
          await injectIntoTab(currentTabId);
        } catch {}
      }
      await injectIntoAllEligibleTabs();
      if (allSitesToggle) allSitesToggle.checked = true;
      applyVisibilityVisuals();
      await refreshSiteStatus();
      setStatusMessage("Enabled on all sites.", "Habilitado en todos los sitios.", false);
      return;
    }

    // Disable immediately everywhere (even before unregistering permissions/scripts).
    await shutdownAllTabs();

    const unreg = await sendBg({ type: "unregisterAllSites" });
    if (unreg?.error) {
      await refreshSiteStatus();
      setStatus(unreg.error, true);
      return;
    }

    await permissionsRemoveAllSites();

    await setDisabledAll(true);
    await storageSyncSet({ [STORAGE_KEYS.disabledPages]: [] });
    if (allSitesToggle) allSitesToggle.checked = false;
    await refreshSiteStatus();
  }

  function queryActiveTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve((tabs && tabs[0]) ? tabs[0] : null);
      });
    });
  }

  async function refreshSiteStatus() {
    setStatus("");
    currentOrigin = null;
    currentTabId = null;

    // All-sites mode should be usable even if the active tab is not a website.
    setAllSitesControlEnabled(false);
    setPageControlEnabled(false);

    const syncData = await storageSyncGet([STORAGE_KEYS.disabledAll, STORAGE_KEYS.disabledPages]);
    const disabledAll = !!syncData[STORAGE_KEYS.disabledAll];
    const allSitesState = await getAllSitesModeState();
    if (allSitesToggle) allSitesToggle.checked = allSitesState.active && !disabledAll;
    applyVisibilityVisuals();

    const tab = await queryActiveTab();
    const tabUrl = tab?.url || "";
    currentTabId = typeof tab?.id === "number" ? tab.id : null;
    currentOrigin = normalizeOriginFromUrl(tabUrl);

    if (!currentTabId || !currentOrigin || !(currentOrigin.startsWith("http://") || currentOrigin.startsWith("https://"))) {
      setAllSitesControlEnabled(true);
      setPageControlEnabled(false);
      if (pageToggle) pageToggle.checked = false;
      applyVisibilityVisuals();
      setStatusMessage("Open a website tab to enable Shimeji on that site.", "Abrí una pestaña web para habilitar al Shimeji.", true);
      return;
    }

    const disabledPages = Array.isArray(syncData[STORAGE_KEYS.disabledPages])
      ? syncData[STORAGE_KEYS.disabledPages].map((value) => (typeof value === "string" ? value.replace(/\/$/, "") : "")).filter(Boolean)
      : [];
    const originDisabled = disabledAll || disabledPages.includes(currentOrigin);

    let hasOriginPermission = false;
    try {
      hasOriginPermission = await permissionsContainsOrigin(currentOrigin);
    } catch {
      hasOriginPermission = false;
    }

    const pageHasPermission = allSitesState.active || hasOriginPermission;
    const pageEnabled = !originDisabled && pageHasPermission;

    // "Enabled on all sites" represents our global mode (registered + permission + not globally disabled).
    if (allSitesToggle) allSitesToggle.checked = allSitesState.active && !disabledAll;
    if (pageToggle) pageToggle.checked = pageEnabled;

    setAllSitesControlEnabled(true);
    setPageControlEnabled(true);
    applyVisibilityVisuals();

    if (disabledAll) {
      setStatusMessage("Disabled across every site.", "Deshabilitado en todos los sitios.", false);
      return;
    }

    if (originDisabled) {
      setStatusMessage("Disabled on this site.", "Deshabilitado en esta página.", false);
      return;
    }

    if (allSitesState.active && !disabledAll) {
      setStatusMessage("Enabled on all sites.", "Habilitado en todos los sitios.", false);
      return;
    }

    if (!hasOriginPermission) {
      setStatusMessage("Not enabled on this site. Toggle to enable.", "No está habilitado en esta página. Activá el interruptor.", false);
      return;
    }

    setStatus("");
  }

  async function setSiteEnabled(nextEnabled, originOverride) {
    if (!currentOrigin || !currentTabId) return;
    setControlsEnabled(false);
    setStatusMessage(
      nextEnabled ? "Enabling site..." : "Disabling site...",
      nextEnabled ? "Habilitando sitio..." : "Deshabilitando sitio...",
      false
    );

    if (nextEnabled) {
      const targetOrigin = originOverride || currentOrigin;
      const allSitesState = await getAllSitesModeState();
      if (!allSitesState.active) {
        const alreadyHasOriginPerm = isRequiredOrigin(targetOrigin)
          ? true
          : (allSitesState.permGranted ? true : await permissionsContainsOrigin(targetOrigin).catch(() => false));
        if (!alreadyHasOriginPerm && !isRequiredOrigin(targetOrigin)) {
          // If the popup closes during the permission prompt, background.js will finish the enable flow.
          await storageSessionSet({
            pendingEnableSite: {
              origin: targetOrigin,
              tabId: currentTabId,
              createdAt: Date.now()
            }
          });
        }
        const granted = alreadyHasOriginPerm
          ? true
          : (isRequiredOrigin(targetOrigin) ? true : await permissionsRequestOrigin(targetOrigin));
        if (!granted) {
          await storageSessionRemove(["pendingEnableSite"]);
          if (pageToggle) pageToggle.checked = false;
          setControlsEnabled(true);
          setStatusMessage("Permission not granted for this site.", "Permiso denegado para este sitio.", true);
          return;
        }

        await storageSessionRemove(["pendingEnableSite"]);
        const reg = await sendBg({ type: "registerSite", origin: targetOrigin });
        if (reg?.error) {
          setControlsEnabled(true);
          setStatus(reg.error, true);
          return;
        }
      }

      await removeDisabledPage(targetOrigin);
      await setDisabledAll(false);
      await injectIntoTab(currentTabId);
      if (pageToggle) pageToggle.checked = true;
      applyVisibilityVisuals();
      setControlsEnabled(true);
      setStatus("", false);
      return;
    }

    const allSitesState = await getAllSitesModeState();

    // Disable: remove from this tab immediately.
    try {
      chrome.tabs.sendMessage(currentTabId, { action: "shutdownShimejis" }).catch(() => {});
    } catch {}

    if (!allSitesState.active) {
      const unreg = await sendBg({ type: "unregisterSite", origin: currentOrigin });
      if (unreg?.error) {
        setControlsEnabled(true);
          setStatus(unreg.error, true);
        return;
      }

      await permissionsRemoveOrigin(currentOrigin);
    }
    await addDisabledPage(currentOrigin);

    if (pageToggle) pageToggle.checked = false;
    applyVisibilityVisuals();
    setControlsEnabled(true);
    setStatusMessage("Disabled on this site.", "Deshabilitado en esta página.", false);
  }

  if (pageToggle) {
    pageToggle.addEventListener("change", () => {
      setSiteEnabled(!!pageToggle.checked);
    });
  }

  if (allSitesToggle) {
    allSitesToggle.addEventListener("change", () => {
      setAllSitesEnabled(!!allSitesToggle.checked);
    });
  }

  refreshSiteStatus();

  // --- AI Chat Settings ---
  // --- Shimeji Configurator ---
  const MAX_SHIMEJIS = 5;
const shimejiListEl = document.getElementById("shimeji-list");
const shimejiEmptyEl = document.getElementById("shimeji-empty");
const onboardingBanner = document.getElementById("onboarding-banner");
const onboardingTitle = document.getElementById("onboarding-title");
const onboardingBody = document.getElementById("onboarding-body");
const onboardingCta = document.getElementById("onboarding-cta");
const onboardingHint = document.getElementById("onboarding-hint");
const onboardingClose = document.getElementById("onboarding-close");
  const addShimejiBtn = document.getElementById("add-shimeji-btn");
  const shimejiSelectorEl = document.getElementById("shimeji-selector");
  const shimejiSectionTitle = document.getElementById("shimeji-section-title");
  const shimejiLimitHint = document.getElementById("shimeji-limit-hint");
  const popupSubtitle = document.getElementById("popup-subtitle");
  const popupStats = document.getElementById("popup-stats");
const popupThemeLabel = document.getElementById("popup-theme-label");
const popupThemeSelect = document.getElementById("popup-theme-select");
const popupLanguageSelect = document.getElementById("popup-language-select");
const securityTitle = document.getElementById("security-title");
const masterkeyToggle = document.getElementById("masterkey-toggle");
const masterkeyLabel = document.getElementById("masterkey-label");
const masterkeyInput = document.getElementById("masterkey-input");
const masterkeyConfirm = document.getElementById("masterkey-confirm");
const masterkeyActionBtn = document.getElementById("masterkey-action-btn");
const masterkeySaveBtn = document.getElementById("masterkey-save-btn");
const masterkeyChangeBtn = document.getElementById("masterkey-change-btn");
const masterkeyStatus = document.getElementById("masterkey-status");
const shimejiLockHint = document.getElementById("shimeji-lock-hint");
const securityHint = document.getElementById("security-hint");
const autolockToggle = document.getElementById("autolock-toggle");
const autolockMinutesInput = document.getElementById("autolock-minutes");
const autolockLabel = document.getElementById("autolock-label");
const autolockMinutesLabel = document.getElementById("autolock-minutes-label");
const autolockRow = document.getElementById("autolock-row");
const autolockMinutesRow = document.getElementById("autolock-minutes-row");
const masterkeyConfirmRow = document.getElementById("masterkey-confirm-row");
const masterkeyActionsRow = document.getElementById("masterkey-actions-row");
const securityLockBanner = document.getElementById("security-lock-banner");
const securityLockTitle = document.getElementById("security-lock-title");
const securityLockText = document.getElementById("security-lock-text");
const linkFeedback = document.getElementById("link-feedback");
const linkPrivacy = document.getElementById("link-privacy");
const labelEnabledPage = document.getElementById("label-enabled-page");
const labelEnabledAllSites = document.getElementById("label-enabled-all-sites");
const presenceTitle = document.getElementById("presence-title");

  const MODEL_OPTIONS = [
    { value: "random", labelEn: "Random", labelEs: "Aleatorio" },
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
    { value: "kitten", labelEn: "Kitten", labelEs: "Gatito" },
    { value: "ghost", labelEn: "Ghost", labelEs: "Fantasma" },
    { value: "blob", labelEn: "Blob", labelEs: "Blob" },
    { value: "lobster", labelEn: "Lobster", labelEs: "Langosta" },
    { value: "mushroom", labelEn: "Mushroom", labelEs: "Hongo" },
    { value: "penguin", labelEn: "Penguin", labelEs: "Pingüino" },
  ];

  const PERSONALITY_OPTIONS = [
    { value: "cryptid", labelEn: "Cryptid", labelEs: "Críptico" },
    { value: "cozy", labelEn: "Cozy", labelEs: "Acogedor" },
    { value: "chaotic", labelEn: "Chaotic", labelEs: "Caótico" },
    { value: "philosopher", labelEn: "Philosopher", labelEs: "Filósofo" },
    { value: "hype", labelEn: "Hype Beast", labelEs: "Entusiasta" },
    { value: "noir", labelEn: "Noir", labelEs: "Noir" },
  ];
  const EGG_PERSONALITY = {
    value: "hatchling",
    labelEn: "Hatchling",
    labelEs: "Pollito"
  };
  const VOICE_PROFILE_POOL = ["warm", "bright", "deep", "calm", "energetic"];
  function pickRandomVoiceProfile() {
    return VOICE_PROFILE_POOL[Math.floor(Math.random() * VOICE_PROFILE_POOL.length)];
  }

let shimejis = [];
let selectedShimejiId = null;
let nftCharacterIds = new Set();
let nftCharacters = [];
let lastOpenrouterApiKeyEnc = null;
let lastOpenrouterApiKeyPlain = "";
let lastStandardProvider = "openrouter";
let lastOpenrouterModel = "random";
let previewIntervals = [];

const BUILTIN_NFT_CHARACTERS = [
  { id: "egg", name: "Egg" }
];

const PREVIEW_FRAMES = [
  "stand-neutral.png",
  "walk-step-left.png",
  "stand-neutral.png",
  "walk-step-right.png"
];

function isEggCharacter(character) {
  return String(character || "").toLowerCase() === "egg";
}

function getPersonalityOptionsForCharacter(character) {
  const options = [...PERSONALITY_OPTIONS];
  if (isEggCharacter(character)) {
    options.push(EGG_PERSONALITY);
  }
  return options;
}

function getPreviewSizePx(sizeKey) {
  if (sizeKey === "small") return 48;
  if (sizeKey === "big") return 86;
  return 68;
}

function buildShimejiPreview(shimeji) {
  const wrapper = document.createElement("div");
  wrapper.className = "shimeji-preview";

  const sprite = document.createElement("div");
  sprite.className = "shimeji-preview-sprite";
  const sizePx = getPreviewSizePx(shimeji.size);
  sprite.style.width = `${sizePx}px`;
  sprite.style.height = `${sizePx}px`;

  const character = shimeji.character || "shimeji";
  const base = chrome.runtime.getURL(`characters/${character}/`);
  let frameIndex = 0;
  wrapper.appendChild(sprite);

  const frameUrls = PREVIEW_FRAMES.map((frame) => `${base}${frame}`);
  let loadedCount = 0;
  let loadingTimer = null;
  const loader = document.createElement("div");
  loader.className = "shimeji-preview-loader";

  const showLoading = () => {
    if (!wrapper.isConnected) return;
    wrapper.classList.add("loading");
    if (!loader.isConnected) wrapper.appendChild(loader);
  };

  loadingTimer = setTimeout(showLoading, 120);

  const finishLoading = () => {
    if (!wrapper.isConnected) return;
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
    wrapper.classList.remove("loading");
    if (loader.isConnected) loader.remove();
    sprite.style.backgroundImage = `url('${frameUrls[frameIndex]}')`;
    const interval = setInterval(() => {
      if (!wrapper.isConnected) {
        clearInterval(interval);
        return;
      }
      frameIndex = (frameIndex + 1) % frameUrls.length;
      sprite.style.backgroundImage = `url('${frameUrls[frameIndex]}')`;
    }, 220);
    previewIntervals.push(interval);
  };

  frameUrls.forEach((url) => {
    const img = new Image();
    img.onload = img.onerror = () => {
      loadedCount += 1;
      if (loadedCount === frameUrls.length) finishLoading();
    };
    img.src = url;
  });

  return wrapper;
}

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

  let uiLanguage = null;

  function detectBrowserLanguage() {
    const languages = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
    const hasSpanish = languages.some((lang) => (lang || '').toLowerCase().startsWith('es'));
    return hasSpanish ? 'es' : 'en';
  }

  function isSpanishLocale() {
    if (uiLanguage === 'es') return true;
    if (uiLanguage === 'en') return false;
    return detectBrowserLanguage() === 'es';
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

  function populateLanguageSelect(value) {
    if (!popupLanguageSelect) return;
    const options = [
      { value: "en", labelEn: "English", labelEs: "Inglés" },
      { value: "es", labelEn: "Spanish", labelEs: "Español" }
    ];
    popupLanguageSelect.innerHTML = "";
    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = isSpanishLocale() ? opt.labelEs : opt.labelEn;
      if (opt.value === value) option.selected = true;
      popupLanguageSelect.appendChild(option);
    });
  }

  function initPopupThemeAndLanguage() {
    chrome.storage.local.get(["popupTheme", "shimejiLanguage"], (data) => {
      const theme = data.popupTheme || "random";
      uiLanguage = data.shimejiLanguage || detectBrowserLanguage();
      chrome.storage.local.set({ shimejiLanguage: uiLanguage });
      populatePopupThemeSelect(theme);
      populateLanguageSelect(uiLanguage);
      applyTheme(theme === "random" ? getRandomTheme() : theme);
      setPopupLabels();
      loadShimejis();
      renderNftSection();
    });
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
  let isChangingMasterKey = false;
  let isEnablingMasterKey = false;

  function updateMasterKeyStatus() {
    if (!masterkeyStatus) return;
    if (!masterKeyEnabled) {
      masterkeyStatus.textContent = t('Password protection disabled', 'Protección con contraseña desactivada');
      return;
    }
    masterkeyStatus.textContent = masterKeyUnlocked
      ? t('Configuration unlocked for this session', 'Configuración desbloqueada en esta sesión')
      : t('Configuration locked', 'Configuración bloqueada');
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
    if (masterkeyToggle) masterkeyToggle.checked = masterKeyEnabled || isEnablingMasterKey;
    if (masterkeyInput) masterkeyInput.disabled = false;
    if (masterkeyActionBtn) {
      masterkeyActionBtn.disabled = !masterKeyEnabled;
      masterkeyActionBtn.textContent = masterKeyUnlocked
        ? t("Lock now", "Bloquear ahora")
        : t("Unlock", "Desbloquear");
    }
    if (masterkeySaveBtn) masterkeySaveBtn.disabled = false;
    if (masterkeyChangeBtn) masterkeyChangeBtn.disabled = !masterKeyEnabled || !masterKeyUnlocked;
    if (autolockToggle) autolockToggle.checked = masterKeyAutoLockEnabled;
    if (autolockMinutesInput) autolockMinutesInput.value = String(masterKeyAutoLockMinutes);
    updateAutolockLabel();
    updateMasterKeyStatus();
    const configLocked = masterKeyEnabled && !masterKeyUnlocked;
    document.body.classList.toggle("config-locked", configLocked);
    if (securityLockBanner) securityLockBanner.style.display = configLocked ? "" : "none";
    if (autolockRow) autolockRow.style.display = masterKeyEnabled ? "" : "none";
    if (autolockMinutesRow) autolockMinutesRow.style.display = masterKeyEnabled ? "" : "none";
    if (masterkeyConfirmRow) masterkeyConfirmRow.style.display = (!masterKeyEnabled || isChangingMasterKey || isEnablingMasterKey) ? "" : "none";
    if (masterkeyActionsRow) masterkeyActionsRow.style.display = (masterKeyEnabled && masterKeyUnlocked) ? "" : "none";
    if (masterkeyActionBtn) masterkeyActionBtn.style.display = masterKeyEnabled ? "" : "none";
    if (shimejiLockHint) {
      shimejiLockHint.textContent = t(
        "Unlock to edit shimeji configuration.",
        "Desbloquea para editar la configuración de shimejis."
      );
    }
  }

  async function enableMasterKeyWithValue(value) {
    if (!value) {
      setMasterKeyStatusMessage(t('Enter a password to enable protection', 'Ingresa una contraseña para habilitar'));
      masterKeyEnabled = false;
      applyMasterKeyUiState();
      return false;
    }
    masterKeyEnabled = true;
    isEnablingMasterKey = false;
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
    return true;
  }

  async function changeMasterKeyWithValue(value) {
    if (!value) {
      setMasterKeyStatusMessage(t('Enter a password to update', 'Ingresa una contraseña para actualizar'));
      return false;
    }
    masterKeyEnabled = true;
    masterKeyUnlocked = true;
    isEnablingMasterKey = false;
    setSessionMasterKey(value);
    const enc = await encryptSecret(value, 'seed', null);
    masterKeySalt = enc.salt;
    chrome.storage.local.set({ masterKeyEnabled: true, masterKeySalt });
    await saveShimejis();
    loadShimejis();
    isChangingMasterKey = false;
    applyMasterKeyUiState();
    setMasterKeyStatusMessage(t('Password updated', 'Contraseña actualizada'));
    return true;
  }

  async function tryUnlockMasterKey(value) {
    if (!value) {
      setMasterKeyStatusMessage(t('Enter your password to unlock', 'Ingresa tu contraseña para desbloquear'));
      return false;
    }
    // If we have encrypted data, verify the key by attempting a decrypt.
    const testPayload = shimejis.find((s) => s.openrouterApiKeyEnc || s.openclawGatewayTokenEnc);
    if (testPayload) {
      const payload = testPayload.openrouterApiKeyEnc || testPayload.openclawGatewayTokenEnc;
      try {
        await decryptSecret(value, payload);
      } catch {
        setMasterKeyStatusMessage(t('Incorrect password', 'Contraseña incorrecta'));
        return false;
      }
    }
    masterKeyUnlocked = true;
    setSessionMasterKey(value);
    applyMasterKeyUiState();
    scheduleAutoLock();
    await loadShimejis();
    return true;
  }

  async function maybePromptMasterKey() {
    if (!masterKeyEnabled || masterKeyUnlocked) return;
    setMasterKeyStatusMessage(t(
      "Configuration locked. Enter your password to unlock.",
      "Configuración bloqueada. Ingresa tu contraseña para desbloquear."
    ));
  }

  function setPopupLabels() {
    if (shimejiSectionTitle) shimejiSectionTitle.textContent = t("Shimejis", "Shimejis");
    if (shimejiLimitHint) shimejiLimitHint.textContent = t("Up to 5 shimejis on screen", "Hasta 5 shimejis en pantalla");
    if (addShimejiBtn) addShimejiBtn.textContent = "+";
    if (linkFeedback) linkFeedback.textContent = t("Feedback", "Feedback");
    if (linkPrivacy) linkPrivacy.textContent = t("Privacy", "Privacidad");
    if (labelEnabledPage) labelEnabledPage.textContent = t("Enabled on this site", "Habilitado en este sitio");
    if (labelEnabledAllSites) labelEnabledAllSites.textContent = t("Enabled on all sites", "Habilitado en todos los sitios");
    if (presenceTitle) presenceTitle.textContent = t("Visibility", "Visibilidad");
    if (popupSubtitle) popupSubtitle.textContent = t("Your AI mascot orchestrator", "Tu orquestador de mascotas AI");
if (popupThemeLabel) popupThemeLabel.textContent = t("Popup Theme", "Tema del popup");
if (securityTitle) securityTitle.textContent = t("Security", "Seguridad");
if (masterkeyLabel) masterkeyLabel.textContent = t("Protect shimeji settings with password", "Proteger configuración con contraseña");
if (masterkeyInput) masterkeyInput.placeholder = t("Password", "Contraseña");
if (masterkeyConfirm) masterkeyConfirm.placeholder = t("Confirm password", "Confirmar contraseña");
if (masterkeyActionBtn) masterkeyActionBtn.textContent = t("Unlock", "Desbloquear");
if (masterkeySaveBtn) masterkeySaveBtn.textContent = t("Save", "Guardar");
if (masterkeyChangeBtn) masterkeyChangeBtn.textContent = t("Change password", "Cambiar contraseña");
if (securityLockTitle) securityLockTitle.textContent = t("Configuration locked", "Configuración bloqueada");
if (securityLockText) securityLockText.textContent = t(
  "Enter your password in Security to unlock.",
  "Ingresa tu contraseña en Seguridad para desbloquear."
);
if (autolockLabel) autolockLabel.textContent = t("Auto-lock", "Auto-bloqueo");
if (shimejiEmptyEl) shimejiEmptyEl.textContent = t(
  "No shimejis active. Press the + button to add one.",
  "No hay shimejis activos. Apretá el botón + para agregar uno."
);
if (securityHint) securityHint.textContent = t(
  "Use a password to lock configuration changes. You'll be asked once per browser session.",
  "Usa una contraseña para bloquear cambios. Se pedirá una vez por sesión del navegador."
);
    showOnboardingBanner();
  }

  const SIZE_OPTIONS_KEYS = ["small", "medium", "big"];
  const THEME_COLOR_POOL = [
    "#2a1f4e", "#1e3a5f", "#4a2040", "#0f4c3a", "#5c2d0e",
    "#3b1260", "#0e3d6b", "#6b1d3a", "#2e4a12", "#4c1a6b"
  ];
  const CHAT_THEME_PRESETS = [
    {
      id: "pastel",
      labelEn: "Pastel",
      labelEs: "Pastel",
      theme: "#3b1a77",
      bg: "#f0e8ff",
      bubble: "glass"
    },
    {
      id: "pink",
      labelEn: "Pink",
      labelEs: "Rosa",
      theme: "#7a124b",
      bg: "#ffd2ea",
      bubble: "glass"
    },
    {
      id: "kawaii",
      labelEn: "Kawaii",
      labelEs: "Kawaii",
      theme: "#5b1456",
      bg: "#ffd8f0",
      bubble: "glass"
    },
    {
      id: "mint",
      labelEn: "Mint",
      labelEs: "Menta",
      theme: "#0f5f54",
      bg: "#c7fff0",
      bubble: "glass"
    },
    {
      id: "ocean",
      labelEn: "Ocean",
      labelEs: "Océano",
      theme: "#103a7a",
      bg: "#cfe6ff",
      bubble: "glass"
    },
    {
      id: "neural",
      labelEn: "Neural",
      labelEs: "Neural",
      theme: "#86f0ff",
      bg: "#0b0d1f",
      bubble: "dark"
    },
    {
      id: "cyberpunk",
      labelEn: "Cyberpunk",
      labelEs: "Cyberpunk",
      theme: "#19d3ff",
      bg: "#0a0830",
      bubble: "dark"
    },
    {
      id: "noir-rose",
      labelEn: "Noir Rose",
      labelEs: "Noir Rosa",
      theme: "#ff5fbf",
      bg: "#0b0717",
      bubble: "dark"
    },
    {
      id: "midnight",
      labelEn: "Midnight",
      labelEs: "Medianoche",
      theme: "#7aa7ff",
      bg: "#0b1220",
      bubble: "dark"
    },
    {
      id: "ember",
      labelEn: "Ember",
      labelEs: "Brasas",
      theme: "#ff8b3d",
      bg: "#1a0c08",
      bubble: "dark"
    }
  ];
  const CHAT_THEMES = CHAT_THEME_PRESETS;
  const OPENCLAW_AGENT_NAME_MAX = 32;

  function defaultOpenClawAgentName(indexOrId) {
    if (typeof indexOrId === "number") {
      return `chrome-shimeji-${indexOrId + 1}`;
    }
    const idMatch = String(indexOrId || "").match(/(\d+)/);
    const suffix = idMatch ? idMatch[1] : "1";
    return `chrome-shimeji-${suffix}`;
  }

  function normalizeOpenClawAgentName(rawValue, fallback) {
    const fallbackName = (fallback || "chrome-shimeji-1").slice(0, OPENCLAW_AGENT_NAME_MAX);
    const normalized = String(rawValue || "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .replace(/-+/g, "-")
      .replace(/_+/g, "_")
      .replace(/^[-_]+|[-_]+$/g, "")
      .slice(0, OPENCLAW_AGENT_NAME_MAX);
    return normalized || fallbackName;
  }

  function getDefaultShimeji(index) {
    const randomChar = CHARACTER_OPTIONS[Math.floor(Math.random() * CHARACTER_OPTIONS.length)].value;
    const randomPersonality = PERSONALITY_OPTIONS[Math.floor(Math.random() * PERSONALITY_OPTIONS.length)].value;
    const enabledModels = MODEL_OPTIONS.filter((opt) => !opt.disabled && opt.value !== "random");
    const randomModel = (enabledModels[Math.floor(Math.random() * enabledModels.length)] || MODEL_OPTIONS[1]).value;
    const randomVoiceProfile = pickRandomVoiceProfile();
    const randomSize = SIZE_OPTIONS_KEYS[Math.floor(Math.random() * SIZE_OPTIONS_KEYS.length)];
    const randomThemeColor = THEME_COLOR_POOL[Math.floor(Math.random() * THEME_COLOR_POOL.length)];
    const preset = CHAT_THEMES[Math.floor(Math.random() * CHAT_THEMES.length)];
    return {
      id: `shimeji-${index + 1}`,
      character: randomChar,
      size: randomSize,
      characterSource: "free",
      mode: "standard",
      standardProvider: "openrouter",
      openrouterApiKey: "",
      openrouterModel: "random",
      openrouterModelResolved: randomModel,
      ollamaUrl: "http://127.0.0.1:11434",
      ollamaModel: "gemma3:1b",
      openclawGatewayUrl: "ws://127.0.0.1:18789",
      openclawGatewayToken: "",
      openclawAgentName: defaultOpenClawAgentName(index),
      personality: randomPersonality,
      enabled: true,
      soundEnabled: true,
      soundVolume: 0.7,
      chatThemeColor: preset?.theme || randomThemeColor,
      chatBgColor: preset?.bg || "#ffffff",
      chatFontSize: "medium",
      chatWidth: "medium",
      chatBubbleStyle: preset?.bubble || "glass",
      chatThemePreset: "random",
      ttsEnabled: false,
      ttsVoiceProfile: randomVoiceProfile,
      ttsVoiceId: "",
      openMicEnabled: false,
      relayEnabled: false,
      animationQuality: "full"
    };
  }

  function normalizeMode(modeValue) {
    if (modeValue === "disabled") return "off";
    if (modeValue === "off") return "off";
    if (modeValue === "agent") return "agent";
    if (modeValue === "decorative") return "off";
    return "standard";
  }

  function migrateLegacy(data) {
    let migrated = false;
    const enabledModels = MODEL_OPTIONS.filter((opt) => !opt.disabled && opt.value !== "random");
    const pickRandomModel = () => (enabledModels[Math.floor(Math.random() * enabledModels.length)] || MODEL_OPTIONS[1]).value;

    if (Array.isArray(data.shimejis) && data.shimejis.length > 0) {
      const list = data.shimejis.map((shimeji, index) => {
        const needsRandom = !shimeji.openrouterModel || shimeji.openrouterModel === "google/gemini-2.0-flash-001";
        if (needsRandom) migrated = true;
        const fallbackAgentName = defaultOpenClawAgentName(shimeji.id || index);
        return {
          ...shimeji,
          mode: normalizeMode(shimeji.mode),
          soundEnabled: shimeji.soundEnabled !== false,
          soundVolume: typeof shimeji.soundVolume === "number" ? shimeji.soundVolume : 0.7,
          standardProvider: shimeji.standardProvider || "openrouter",
          openrouterModel: needsRandom ? "random" : shimeji.openrouterModel,
          openrouterModelResolved: shimeji.openrouterModelResolved
            || (shimeji.openrouterModel && shimeji.openrouterModel !== "random"
              ? shimeji.openrouterModel
              : pickRandomModel()),
          ollamaUrl: shimeji.ollamaUrl || "http://127.0.0.1:11434",
          ollamaModel: shimeji.ollamaModel || "gemma3:1b",
          openclawGatewayUrl: shimeji.openclawGatewayUrl || "ws://127.0.0.1:18789",
          openclawGatewayToken: shimeji.openclawGatewayToken || "",
          openclawAgentName: normalizeOpenClawAgentName(shimeji.openclawAgentName, fallbackAgentName),
          personality: shimeji.personality || "cryptid",
          ttsEnabled: shimeji.ttsEnabled === true,
          ttsVoiceProfile: shimeji.ttsVoiceProfile || pickRandomVoiceProfile(),
          ttsVoiceId: shimeji.ttsVoiceId || "",
          openMicEnabled: !!shimeji.openMicEnabled,
          relayEnabled: !!shimeji.relayEnabled,
          animationQuality: shimeji.animationQuality || "full",
          characterSource: shimeji.characterSource || "free"
        };
      });
      return { list, migrated };
    }

    if (!data.aiModel || data.aiModel === "google/gemini-2.0-flash-001") {
      migrated = true;
    }
    const fallbackRandom = pickRandomModel();
    return {
      migrated,
      list: [{
        id: "shimeji-1",
        character: "shimeji",
        size: "medium",
        characterSource: "free",
        mode: normalizeMode(data.chatMode),
        standardProvider: "openrouter",
        openrouterApiKey: data.aiApiKey || "",
        openrouterModel: "random",
        openrouterModelResolved: fallbackRandom,
        ollamaUrl: "http://127.0.0.1:11434",
        ollamaModel: "gemma3:1b",
        openclawGatewayUrl: data.openclawGatewayUrl || "ws://127.0.0.1:18789",
        openclawGatewayToken: data.openclawGatewayToken || "",
        openclawAgentName: defaultOpenClawAgentName(0),
        personality: data.aiPersonality || "cryptid",
        enabled: true,
        soundEnabled: true,
        soundVolume: 0.7,
        ttsEnabled: false,
        ttsVoiceProfile: pickRandomVoiceProfile(),
        ttsVoiceId: "",
        openMicEnabled: false,
        relayEnabled: false,
        animationQuality: "full",
        characterSource: "free"
      }]
    };
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
      'lastOpenrouterApiKeyEnc',
      'lastStandardProvider',
      'lastOpenrouterModel',
      'masterKeyEnabled',
      'masterKeySalt',
      'masterKeyAutoLockEnabled',
      'masterKeyAutoLockMinutes',
      'ttsEnabledMigrationDone',
      'noShimejis'
    ], async (data) => {
      masterKeyEnabled = !!data.masterKeyEnabled;
      masterKeySalt = data.masterKeySalt || null;
      masterKeyAutoLockEnabled = data.masterKeyAutoLockEnabled !== false;
      masterKeyAutoLockMinutes = typeof data.masterKeyAutoLockMinutes === "number" ? data.masterKeyAutoLockMinutes : 30;
      const sessionKey = await getSessionMasterKey();
      masterKeyUnlocked = !!sessionKey;
      applyMasterKeyUiState();

      lastOpenrouterApiKeyEnc = data.lastOpenrouterApiKeyEnc || null;
      lastStandardProvider = data.lastStandardProvider || "openrouter";
      lastOpenrouterModel = data.lastOpenrouterModel || "random";

      const migration = migrateLegacy(data);
      shimejis = ensureShimejiIds(migration.list);
      if (!!data.noShimejis) {
        shimejis = [];
      } else if (!Array.isArray(shimejis) || shimejis.length === 0) {
        shimejis = [getDefaultShimeji(0)];
      }
      if (!data.ttsEnabledMigrationDone) {
        shimejis = shimejis.map((s) => ({ ...s, ttsEnabled: s.ttsEnabled === true }));
      }
      let modelReRolled = false;
      if (lastOpenrouterModel && lastOpenrouterModel !== "random") {
        const enabledModels = MODEL_OPTIONS.filter((opt) => !opt.disabled && opt.value !== "random");
        const pickRandomModel = (exclude) => {
          if (!enabledModels.length) return MODEL_OPTIONS[1].value;
          if (enabledModels.length === 1) return enabledModels[0].value;
          let pick = enabledModels[Math.floor(Math.random() * enabledModels.length)].value;
          let guard = 0;
          while (pick === exclude && guard < 5) {
            pick = enabledModels[Math.floor(Math.random() * enabledModels.length)].value;
            guard += 1;
          }
          return pick;
        };
        shimejis = shimejis.map((s) => {
          if (s.openrouterModel === "random" && s.openrouterModelResolved === lastOpenrouterModel) {
            modelReRolled = true;
            return { ...s, openrouterModelResolved: pickRandomModel(lastOpenrouterModel) };
          }
          return s;
        });
      }
      if ((migration.migrated || modelReRolled) && shimejis.length > 0) {
        saveShimejis();
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
        if (lastOpenrouterApiKeyEnc) {
          try {
            lastOpenrouterApiKeyPlain = await decryptSecret(sessionKey, lastOpenrouterApiKeyEnc);
          } catch {}
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
        if (lastOpenrouterApiKeyEnc) {
          try {
            lastOpenrouterApiKeyPlain = await decryptWithDeviceKey(lastOpenrouterApiKeyEnc);
          } catch {}
        }
      }

      chrome.storage.local.set({ shimejis, ttsEnabledMigrationDone: true });
      renderShimejis();
      if (needsEncrypt) saveShimejis();
      maybePromptMasterKey();
    });
  }

  async function notifyRefresh() {
    try {
      chrome.runtime.sendMessage({ type: "refreshShimejis" });
    } catch {}
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs?.[0]?.id;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { action: "refreshShimejis" }).catch(() => {});
      });
    } catch {}
  }

  function setLocalAndRefresh(payload) {
    return new Promise((resolve) => {
      chrome.storage.local.set(payload, () => {
        notifyRefresh();
        resolve();
      });
    });
  }

  function getStoredShimejis() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["shimejis"], (data) => {
        resolve(Array.isArray(data.shimejis) ? data.shimejis : []);
      });
    });
  }

  async function saveShimejis() {
    const noShimejis = shimejis.length === 0;
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
      await setLocalAndRefresh({ shimejis: out, masterKeyEnabled: true, masterKeySalt, noShimejis });
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
    await setLocalAndRefresh({ shimejis: out, masterKeyEnabled: false, masterKeySalt: null, noShimejis });
    shimejis = shimejis.map((s, idx) => ({
      ...s,
      openrouterApiKeyEnc: out[idx]?.openrouterApiKeyEnc || s.openrouterApiKeyEnc,
      openclawGatewayTokenEnc: out[idx]?.openclawGatewayTokenEnc || s.openclawGatewayTokenEnc
    }));
  }

  function renderShimejis() {
    if (!shimejiListEl) return;
    previewIntervals.forEach((id) => clearInterval(id));
    previewIntervals = [];
    shimejiListEl.innerHTML = "";

    if (!selectedShimejiId || !shimejis.find((s) => s.id === selectedShimejiId)) {
      selectedShimejiId = shimejis[0]?.id || null;
    }
    if (shimejiEmptyEl) {
      if (shimejis.length === 0) {
        shimejiEmptyEl.style.display = "";
        shimejiEmptyEl.textContent = t(
          "No shimejis active. Press the + button to add one.",
          "No hay shimejis activos. Apretá el botón + para agregar uno."
        );
      } else {
        shimejiEmptyEl.style.display = "none";
      }
    }

    let countStandard = 0;
    let countAgent = 0;
    let countOff = 0;

    shimejis.forEach((shimeji, index) => {
      const isEnabled = shimeji.enabled !== false;
      const mode = isEnabled ? normalizeMode(shimeji.mode) : "off";
      if (mode === "standard") countStandard += 1;
      if (mode === "agent") countAgent += 1;
      if (mode === "off") countOff += 1;

      const card = document.createElement("div");
      card.className = "shimeji-card";
      card.dataset.shimejiId = shimeji.id;
      card.dataset.mode = mode;
      card.dataset.enabled = shimeji.enabled !== false ? "on" : "off";
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
      titleWrap.appendChild(title);
      titleWrap.appendChild(idText);
      metaWrap.appendChild(titleWrap);
      const headerActions = document.createElement("div");
      headerActions.className = "shimeji-card-actions";
      const activeToggle = document.createElement("label");
      activeToggle.className = "toggle-row mini-toggle header-active-toggle";
      activeToggle.title = shimeji.enabled !== false
        ? t("Active", "Activo")
        : t("Off", "Apagado");
      const activeInput = document.createElement("input");
      activeInput.type = "checkbox";
      activeInput.className = "toggle-checkbox";
      activeInput.dataset.field = "enabled";
      activeInput.checked = shimeji.enabled !== false;
      const activeSlider = document.createElement("span");
      activeSlider.className = "toggle-slider";
      activeToggle.appendChild(activeInput);
      activeToggle.appendChild(activeSlider);
      const removeBtn = document.createElement("button");
      removeBtn.className = "control-btn remove-btn";
      removeBtn.textContent = "❌";
      removeBtn.dataset.action = "remove";
      headerActions.appendChild(activeToggle);
      headerActions.appendChild(removeBtn);
      header.appendChild(metaWrap);
      header.appendChild(headerActions);

      const preview = buildShimejiPreview(shimeji);

      const grid = document.createElement("div");
      grid.className = "shimeji-grid";

      grid.appendChild(renderCharacterField(shimeji));
      if (nftCharacterIds.has(shimeji.character)) {
        grid.appendChild(renderSelectField("animationQuality", t("Animation", "Animación"), [
          { value: "simple", labelEn: "Simple (MVP)", labelEs: "Simple (MVP)" },
          { value: "full", labelEn: "Complete", labelEs: "Completa" }
        ], shimeji.animationQuality || "full"));
      }
      const personalityOptions = getPersonalityOptionsForCharacter(shimeji.character);
      grid.appendChild(renderSelectField("personality", t("Personality", "Personalidad"), personalityOptions, shimeji.personality));
      grid.appendChild(renderToggleField("soundEnabled", t("Notifications", "Notificaciones"), shimeji.soundEnabled !== false));
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
      grid.appendChild(renderSelectField("size", t("Size", "Tamaño"), [
        { value: "small", labelEn: "Small", labelEs: "Pequeño" },
        { value: "medium", labelEn: "Medium", labelEs: "Mediano" },
        { value: "big", labelEn: "Large", labelEs: "Grande" },
      ], shimeji.size));
      const aiBrainField = renderSelectField("mode", t("AI Brain", "Cerebro AI"), [
        { value: "standard", labelEn: "Standard (API key only)", labelEs: "Standard (solo API key)" },
        { value: "agent", labelEn: "AI Agent", labelEs: "AI Agent" },
        { value: "off", labelEn: "Off", labelEs: "Apagado" },
      ], mode);
      aiBrainField.classList.add("full-width", "ai-core-field");
      const aiCorePanel = document.createElement("div");
      aiCorePanel.className = "ai-core-panel";
      aiCorePanel.appendChild(aiBrainField);

      const standardBlock = document.createElement("div");
      standardBlock.className = "shimeji-mode-row";
      standardBlock.dataset.mode = "standard";
      standardBlock.appendChild(renderSelectField("standardProvider", t("Provider", "Proveedor"), [
        { value: "openrouter", labelEn: "OpenRouter", labelEs: "OpenRouter" },
        { value: "ollama", labelEn: "Ollama", labelEs: "Ollama" }
      ], shimeji.standardProvider || "openrouter", "ai-core-field"));
      const providerHint = document.createElement("div");
      providerHint.className = "helper-text";
      providerHint.textContent = t(
        "Your messages are sent to the selected provider.",
        "Tus mensajes se envían al proveedor seleccionado."
      );
      standardBlock.appendChild(providerHint);
      const openrouterInput = renderInputField(
        "openrouterApiKey",
        t("OpenRouter API Key (optional)", "API Key OpenRouter (opcional)"),
        shimeji.openrouterApiKey,
        "password",
        t("Paste your API key", "Pega tu API key"),
        "provider-openrouter ai-core-field"
      );
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
      standardBlock.appendChild(renderSelectField(
        "openrouterModel",
        t("Model", "Modelo"),
        MODEL_OPTIONS,
        shimeji.openrouterModel,
        "provider-openrouter ai-core-field"
      ));
      const ollamaBlock = document.createElement("div");
      ollamaBlock.className = "shimeji-mode-row";
      ollamaBlock.dataset.provider = "ollama";
      ollamaBlock.appendChild(renderInputField("ollamaUrl", t("Ollama URL", "Ollama URL"), shimeji.ollamaUrl || "http://127.0.0.1:11434", "text", "http://127.0.0.1:11434", "ai-core-field"));
      const ollamaModelField = renderInputField(
        "ollamaModel",
        t("Ollama Model", "Modelo Ollama"),
        shimeji.ollamaModel || "gemma3:1b",
        "text",
        "gemma3:1b",
        "ai-core-field"
      );
      const ollamaInput = ollamaModelField.querySelector('input[data-field="ollamaModel"]');
      if (ollamaInput) {
        ollamaInput.placeholder = t("Type a model or pick one below", "Escribe un modelo o elige uno abajo");
      }
      ollamaBlock.appendChild(ollamaModelField);

      const ollamaDetectedField = document.createElement("div");
      ollamaDetectedField.className = "ai-field ai-core-field";
      const ollamaDetectedLabel = document.createElement("label");
      ollamaDetectedLabel.className = "ai-label";
      ollamaDetectedLabel.textContent = t("Detected models", "Modelos detectados");
      const ollamaDetectedRow = document.createElement("div");
      ollamaDetectedRow.className = "ollama-model-row";
      const ollamaSelect = document.createElement("select");
      ollamaSelect.className = "ai-select";
      ollamaSelect.dataset.field = "ollamaModelSelect";
      ollamaSelect.dataset.shimejiId = shimeji.id;
      ollamaSelect.id = `select-ollamaModel-${shimeji.id}`;
      ollamaSelect.innerHTML = `<option value="custom">${t("Custom model", "Modelo personalizado")}</option>`;
      const ollamaRefreshBtn = document.createElement("button");
      ollamaRefreshBtn.type = "button";
      ollamaRefreshBtn.className = "control-btn mini-btn";
      ollamaRefreshBtn.dataset.action = "refresh-ollama-models";
      ollamaRefreshBtn.textContent = t("Refresh", "Actualizar");
      ollamaDetectedRow.appendChild(ollamaSelect);
      ollamaDetectedRow.appendChild(ollamaRefreshBtn);
      ollamaDetectedField.appendChild(ollamaDetectedLabel);
      ollamaDetectedField.appendChild(ollamaDetectedRow);
      ollamaBlock.appendChild(ollamaDetectedField);

      const ollamaHint = document.createElement("div");
      ollamaHint.className = "helper-text";
      ollamaHint.dataset.role = "ollama-status";
      ollamaHint.textContent = t(
        "Fetch your local Ollama model list, or keep using a custom model name.",
        "Carga la lista local de modelos de Ollama, o usa un nombre personalizado."
      );
      ollamaBlock.appendChild(ollamaHint);
      standardBlock.appendChild(ollamaBlock);
      setTimeout(() => { refreshOllamaModels(shimeji.id, false); }, 0);

      const agentBlock = document.createElement("div");
      agentBlock.className = "shimeji-mode-row";
      agentBlock.dataset.mode = "agent";
      agentBlock.appendChild(renderInputField("openclawGatewayUrl", t("Gateway URL", "Gateway URL"), shimeji.openclawGatewayUrl, "text", "ws://127.0.0.1:18789", "ai-core-field"));
      agentBlock.appendChild(
        renderInputField(
          "openclawAgentName",
          t("Agent Name", "Nombre del agente"),
          shimeji.openclawAgentName || defaultOpenClawAgentName(index),
          "text",
          defaultOpenClawAgentName(index),
          "ai-core-field"
        )
      );
      const openclawHint = document.createElement("div");
      openclawHint.className = "helper-text";
      openclawHint.textContent = t(
        "OpenClaw needs a WebSocket URL + gateway token. To get the token run: openclaw config get gateway.auth.token",
        "OpenClaw necesita un WebSocket + token del gateway. Para obtener el token ejecuta: openclaw config get gateway.auth.token"
      );
      agentBlock.appendChild(openclawHint);
      const openclawNameHint = document.createElement("div");
      openclawNameHint.className = "helper-text";
      openclawNameHint.textContent = t(
        "Agent name rules: letters, numbers, '-' and '_' only (max 32).",
        "Reglas del nombre: solo letras, números, '-' y '_' (máx 32)."
      );
      agentBlock.appendChild(openclawNameHint);
      const openclawTokenInput = renderInputField(
        "openclawGatewayToken",
        t("Gateway Auth Token", "Token de auth del gateway"),
        shimeji.openclawGatewayToken,
        "password",
        t("Enter gateway auth token", "Ingresá el token de auth del gateway"),
        "ai-core-field"
      );
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
      aiCorePanel.appendChild(standardBlock);
      aiCorePanel.appendChild(agentBlock);

      // Chat Style collapsible section
      const chatStyleBlock = document.createElement("div");
      chatStyleBlock.className = "shimeji-chat-style-section";
      chatStyleBlock.style.display = mode === "off" ? "none" : "";

      const chatStyleHeader = document.createElement("div");
      chatStyleHeader.className = "chat-style-toggle";
      chatStyleHeader.textContent = t("Chat Style", "Estilo de Chat");
      chatStyleHeader.addEventListener("click", () => {
        chatStyleHeader.classList.toggle("open");
        chatStyleGrid.classList.toggle("open");
      });

      const chatStyleGrid = document.createElement("div");
      chatStyleGrid.className = "shimeji-grid chat-style-grid";

      const chatThemeOptions = [
        { value: "custom", labelEn: "Custom", labelEs: "Personalizado" },
        { value: "random", labelEn: "Random", labelEs: "Aleatorio" },
        ...CHAT_THEME_PRESETS.map((preset) => ({
          value: preset.id,
          labelEn: preset.labelEn,
          labelEs: preset.labelEs
        }))
      ];
      const chatThemeSelect = renderSelectField(
        "chatThemePreset",
        t("Chat Theme", "Tema de chat"),
        chatThemeOptions,
        getChatThemePresetId(shimeji)
      );
      chatStyleGrid.appendChild(chatThemeSelect);

      const themeRow = document.createElement("div");
      themeRow.className = "popup-theme-presets";
      const themeButtons = new Map();
      function createThemeChip(id, label, colors) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "popup-theme-circle";
        btn.dataset.themeId = id;
        btn.title = label;
        btn.setAttribute("aria-label", label);
        const outer = document.createElement("span");
        outer.className = "popup-theme-circle-outer";
        const inner = document.createElement("span");
        inner.className = "popup-theme-circle-inner";
        if (colors && colors.bg && colors.theme) {
          outer.style.background = colors.bg;
          inner.style.background = colors.theme;
        } else {
          outer.classList.add("custom");
          inner.classList.add("custom");
        }
        if (id === "custom") {
          inner.textContent = "🎨";
          inner.classList.add("emoji");
        }
        if (id === "random") {
          inner.textContent = "🎲";
          inner.classList.add("emoji");
        }
        outer.appendChild(inner);
        btn.appendChild(outer);
        themeButtons.set(id, btn);
        themeRow.appendChild(btn);
        return btn;
      }

      createThemeChip("custom", t("🎨 Custom", "🎨 Personalizado"));
      createThemeChip("random", t("🎲 Random", "🎲 Aleatorio"), { theme: "#111827", bg: "#f8fafc" });
      CHAT_THEME_PRESETS.forEach((preset) => {
        createThemeChip(
          preset.id,
          t(preset.labelEn, preset.labelEs),
          { theme: preset.theme, bg: preset.bg }
        );
      });

      themeRow.addEventListener("click", (e) => {
        const btn = e.target.closest(".popup-theme-circle");
        if (!btn) return;
        const presetId = btn.dataset.themeId || "custom";
        const select = chatThemeSelect.querySelector('select[data-field="chatThemePreset"]');
        if (select) {
          select.value = presetId;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        themeButtons.forEach((b, key) => b.classList.toggle("active", key === presetId));
      });

      const initialPreset = getChatThemePresetId(shimeji);
      themeButtons.forEach((b, key) => b.classList.toggle("active", key === initialPreset));
      chatStyleGrid.appendChild(themeRow);

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

      chatStyleBlock.appendChild(chatStyleHeader);
      chatStyleBlock.appendChild(chatStyleGrid);

      card.appendChild(header);
      card.appendChild(preview);
      card.appendChild(grid);
      card.appendChild(aiCorePanel);
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
    if (labelText) {
      const label = document.createElement("label");
      label.className = "ai-label";
      label.textContent = labelText;
      wrapper.appendChild(label);
    }
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
    if (field === "openrouterModel" && (!value || value === "")) {
      select.value = "random";
    } else {
      select.value = value;
    }
    wrapper.appendChild(select);
    return wrapper;
  }

  function getChatThemePresetId(shimeji) {
    if (shimeji.chatThemePreset === "random") return "random";
    if (shimeji.chatThemePreset === "custom") return "custom";
    const theme = (shimeji.chatThemeColor || "").toLowerCase();
    const bg = (shimeji.chatBgColor || "").toLowerCase();
    const bubble = shimeji.chatBubbleStyle || "glass";
    const match = CHAT_THEME_PRESETS.find((preset) =>
      preset.theme.toLowerCase() === theme
      && preset.bg.toLowerCase() === bg
      && preset.bubble === bubble
    );
    return match ? match.id : "custom";
  }

  function renderCharacterField(shimeji) {
    const wrapper = document.createElement("div");
    wrapper.className = "ai-field character-field full-width";

    const label = document.createElement("label");
    label.className = "ai-label";
    label.textContent = t("Character", "Personaje");

    const toggleRow = document.createElement("div");
    toggleRow.className = "character-source-toggle";

    const isNft = nftCharacterIds.has(shimeji.character);
    const source = shimeji.characterSource || (isNft ? "nft" : "free");

    const freeBtn = document.createElement("button");
    freeBtn.type = "button";
    freeBtn.className = "character-source-btn";
    freeBtn.dataset.action = "character-source";
    freeBtn.dataset.source = "free";
    freeBtn.textContent = t("Free", "Free");
    if (source === "free") freeBtn.classList.add("active");

    const nftBtn = document.createElement("button");
    nftBtn.type = "button";
    nftBtn.className = "character-source-btn";
    nftBtn.dataset.action = "character-source";
    nftBtn.dataset.source = "nft";
    nftBtn.textContent = t("NFT", "NFT");
    if (source === "nft") nftBtn.classList.add("active");

    toggleRow.appendChild(freeBtn);
    toggleRow.appendChild(nftBtn);

    const freeSelect = renderSelectField("character", "", CHARACTER_OPTIONS, source === "free" && !isNft ? shimeji.character : CHARACTER_OPTIONS[0]?.value);
    const freeSelectEl = freeSelect.querySelector("select");
    if (freeSelectEl) freeSelectEl.dataset.source = "free";
    freeSelect.classList.add("character-select");
    if (source === "nft") freeSelect.classList.add("hidden");

    const nftOptions = nftCharacters.map((nft) => {
      const id = nft?.id || "";
      const isBuiltinEgg = String(id).toLowerCase() === "egg";
      return {
        value: nft.id,
        labelEn: isBuiltinEgg ? "Egg" : (nft.name || nft.id || "NFT"),
        labelEs: isBuiltinEgg ? "Huevo" : (nft.name || nft.id || "NFT")
      };
    });
    if (nftOptions.length === 0) {
      nftOptions.push({ value: "", labelEn: t("No NFT characters", "Sin personajes NFT"), labelEs: t("No NFT characters", "Sin personajes NFT"), disabled: true });
    }
    const nftSelect = renderSelectField("character", "", nftOptions, source === "nft" && isNft ? shimeji.character : nftOptions[0]?.value || "");
    const nftSelectEl = nftSelect.querySelector("select");
    if (nftSelectEl) nftSelectEl.dataset.source = "nft";
    nftSelect.classList.add("character-select");
    if (source !== "nft") nftSelect.classList.add("hidden");

    const toggleRowWrap = document.createElement("div");
    toggleRowWrap.className = "character-toggle-row";
    toggleRowWrap.appendChild(toggleRow);
    const ctaInline = document.createElement("a");
    ctaInline.href = "https://www.shimeji.dev/auction";
    ctaInline.target = "_blank";
    ctaInline.rel = "noopener noreferrer";
    ctaInline.className = "shimeji-nft-cta inline";
    ctaInline.textContent = t("Get a Shimeji NFT", "Conseguí un Shimeji NFT");
    toggleRowWrap.appendChild(ctaInline);

    wrapper.appendChild(label);
    wrapper.appendChild(toggleRow);
    wrapper.appendChild(freeSelect);
    wrapper.appendChild(nftSelect);
    wrapper.appendChild(ctaInline);

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
    if (chatStyleBlock) chatStyleBlock.style.display = mode === "off" ? "none" : "";
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
    } else if (field === "character") {
      target.character = value;
      target.characterSource = nftCharacterIds.has(value) ? "nft" : "free";
      if (isEggCharacter(value)) {
        target.personality = EGG_PERSONALITY.value;
      } else if (target.personality === EGG_PERSONALITY.value) {
        target.personality = PERSONALITY_OPTIONS[0]?.value || "cryptid";
      }
    } else if (field === "openrouterModel") {
      target.openrouterModel = value;
      if (value === "random") {
        target.openrouterModelResolved = "";
      } else {
        target.openrouterModelResolved = value;
      }
    } else if (field === "ttsVoiceProfile") {
      target.ttsVoiceProfile = value;
      target.ttsVoiceId = "";
    } else if (field === "ttsEnabled") {
      target.ttsEnabled = value;
      if (value && !target.ttsVoiceProfile) {
        target.ttsVoiceProfile = pickRandomVoiceProfile();
      }
    } else if (field === "openclawAgentName") {
      target.openclawAgentName = normalizeOpenClawAgentName(value, defaultOpenClawAgentName(target.id));
    } else {
      target[field] = value;
    }
  saveShimejis();
}

// Polyfill for AbortSignal.timeout if not available
if (!AbortSignal.timeout) {
  AbortSignal.timeout = (ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

function setOllamaHelper(card, message, isError) {
  const helperText = card?.querySelector('[data-role="ollama-status"]');
  if (!helperText) return;
  helperText.textContent = message || "";
  helperText.style.color = isError ? "rgba(248, 113, 113, 0.95)" : "rgba(200, 210, 235, 0.75)";
}

function normalizeOllamaUrl(url) {
  const fallback = "http://127.0.0.1:11434";
  const raw = (url || fallback).trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname) return fallback;
    return `http://${parsed.host}`;
  } catch {
    return fallback;
  }
}

function setOllamaSelectOptions(select, modelNames, currentModel) {
  if (!select) return;
  select.innerHTML = "";
  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = t("Custom model", "Modelo personalizado");
  select.appendChild(customOption);

  modelNames.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  if (currentModel && modelNames.includes(currentModel)) {
    select.value = currentModel;
  } else {
    select.value = "custom";
  }
}

// Refresh Ollama models from server and update dropdown
async function refreshOllamaModels(shimejiId, showFeedback = true) {
  const shimeji = shimejis.find((s) => s.id === shimejiId);
  if (!shimeji) return;

  const select = document.getElementById(`select-ollamaModel-${shimejiId}`);
  const card = document.querySelector(`[data-shimeji-id="${shimejiId}"]`);
  const customInput = card?.querySelector('input[data-field="ollamaModel"]');
  const refreshBtn = card?.querySelector('button[data-action="refresh-ollama-models"]');
  if (!select || !customInput || !card) return;

  const currentModel = (shimeji.ollamaModel || "").trim() || "gemma3:1b";
  const normalizedUrl = normalizeOllamaUrl(shimeji.ollamaUrl || "http://127.0.0.1:11434");

  if (refreshBtn) refreshBtn.disabled = true;
  select.disabled = true;
  customInput.disabled = true;
  select.innerHTML = `<option value="">${t("Loading models...", "Cargando modelos...")}</option>`;
  if (showFeedback) {
    setOllamaHelper(card, t("Checking Ollama server...", "Verificando servidor Ollama..."), false);
  }

  try {
    const response = await fetch(`${normalizedUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    const payload = await response.json();
    const modelNames = Array.isArray(payload?.models)
      ? payload.models.map((model) => model?.name).filter(Boolean)
      : [];

    setOllamaSelectOptions(select, modelNames, currentModel);
    if (select.value !== "custom") {
      customInput.value = select.value;
      updateShimeji(shimejiId, "ollamaModel", select.value);
    }

    if (showFeedback) {
      if (modelNames.length > 0) {
        setOllamaHelper(
          card,
          t(`Found ${modelNames.length} local models.`, `Se encontraron ${modelNames.length} modelos locales.`),
          false
        );
      } else {
        setOllamaHelper(
          card,
          t("Connected, but no local models were found.", "Conectado, pero no se encontraron modelos locales."),
          false
        );
      }
    }
  } catch (error) {
    console.error("Failed to fetch Ollama models:", error);
    setOllamaSelectOptions(select, [], currentModel);
    if (showFeedback) {
      setOllamaHelper(
        card,
        t(
          `Could not connect to Ollama at ${normalizedUrl}. Keep using a custom model name or verify the URL.`,
          `No se pudo conectar a Ollama en ${normalizedUrl}. Usa un modelo personalizado o verifica la URL.`
        ),
        true
      );
    }
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
    select.disabled = false;
    customInput.disabled = false;
  }
}

const onboardingActive = new URLSearchParams(window.location.search || "").get("onboarding") === "1";

  function showOnboardingBanner() {
    if (!onboardingBanner || !onboardingActive) return;
    onboardingBanner.classList.add("show");
    if (onboardingTitle) onboardingTitle.textContent = t("Welcome to Shimeji AI Pets", "Bienvenido a Shimeji AI Pets");
    if (onboardingBody) {
      onboardingBody.innerHTML = isSpanishLocale()
        ? "Configura el <strong>Cerebro AI</strong> del primer shimeji: Proveedor, API key y Modelo."
        : "Configure the first shimeji <strong>AI Brain</strong>: Provider, API key, and Model.";
    }
    if (onboardingCta) onboardingCta.textContent = t("Configure AI Brain", "Configurar Cerebro AI");
    if (onboardingHint) onboardingHint.textContent = t(
      "You can add more later with the + button.",
      "Luego podés agregar más con el botón +."
    );
  }

  function attachOnboardingHandlers() {
    if (!onboardingActive) return;
    if (onboardingClose) {
      onboardingClose.addEventListener("click", () => {
        onboardingBanner?.classList.remove("show");
      });
    }
    if (onboardingCta) {
      onboardingCta.addEventListener("click", () => {
        const firstCard = shimejiListEl?.querySelector(".shimeji-card");
        if (!firstCard) return;
        firstCard.scrollIntoView({ behavior: "smooth", block: "start" });
        const aiCore = firstCard.querySelector(".ai-core-panel");
        if (aiCore) {
          aiCore.classList.add("ai-core-pulse");
          setTimeout(() => aiCore.classList.remove("ai-core-pulse"), 1400);
        }
      });
    }
  }

  if (addShimejiBtn) {
    addShimejiBtn.addEventListener("click", async () => {
      if (shimejis.length === 0) {
        chrome.storage.local.set({ noShimejis: false });
      }
      if (shimejis.length >= MAX_SHIMEJIS) return;
      const newShimeji = getDefaultShimeji(shimejis.length);
      // Copy API key and provider settings from an existing shimeji
      const donor = shimejis.find((s) => (s.openrouterApiKey || "").trim());
      if (donor) {
        newShimeji.openrouterApiKey = donor.openrouterApiKey;
        newShimeji.standardProvider = donor.standardProvider || "openrouter";
        if (donor.openrouterApiKeyEnc) newShimeji.openrouterApiKeyEnc = donor.openrouterApiKeyEnc;
      } else if (lastOpenrouterApiKeyEnc) {
        newShimeji.standardProvider = lastStandardProvider || "openrouter";
        newShimeji.openrouterApiKeyEnc = lastOpenrouterApiKeyEnc;
        if (lastOpenrouterApiKeyPlain) {
          newShimeji.openrouterApiKey = lastOpenrouterApiKeyPlain;
        } else if (masterKeyEnabled && masterKeyUnlocked) {
          try {
            const sessionKey = await getSessionMasterKey();
            if (sessionKey) {
              newShimeji.openrouterApiKey = await decryptSecret(sessionKey, lastOpenrouterApiKeyEnc);
            }
          } catch {}
        } else if (!masterKeyEnabled) {
          try {
            newShimeji.openrouterApiKey = await decryptWithDeviceKey(lastOpenrouterApiKeyEnc);
          } catch {}
        }
      }
      // Always default to random selection for new shimejis
      newShimeji.openrouterModel = "random";
      const enabledModels = MODEL_OPTIONS.filter((opt) => !opt.disabled && opt.value !== "random");
      newShimeji.openrouterModelResolved = (enabledModels[Math.floor(Math.random() * enabledModels.length)] || MODEL_OPTIONS[1]).value;
      shimejis.push(newShimeji);
      shimejis = ensureShimejiIds(shimejis);
      selectedShimejiId = shimejis[shimejis.length - 1]?.id || null;
      await saveShimejis();
      renderShimejis();
    });
  }

  if (shimejiListEl) {
    shimejiListEl.addEventListener("click", async (e) => {
      const action = e.target?.dataset?.action;
      const card = e.target.closest(".shimeji-card");
      if (!card) return;
      const id = card.dataset.shimejiId;
      if (action === "remove") {
        if (shimejis.length === 1) {
          const last = shimejis[0];
          const provider = last.standardProvider || "openrouter";
          const model = last.openrouterModel || MODEL_OPTIONS[0].value;
          let keyEnc = last.openrouterApiKeyEnc || null;
          if (!keyEnc && last.openrouterApiKey) {
            try {
              const sessionKey = await getSessionMasterKey();
              if (masterKeyEnabled && sessionKey) {
                const enc = await encryptSecret(sessionKey, last.openrouterApiKey, masterKeySalt);
                masterKeySalt = enc.salt;
                keyEnc = { data: enc.data, iv: enc.iv, salt: enc.salt };
              } else {
                keyEnc = await encryptWithDeviceKey(last.openrouterApiKey);
              }
            } catch {}
          }
          if (keyEnc) {
            lastOpenrouterApiKeyEnc = keyEnc;
          }
          if (last.openrouterApiKey) {
            lastOpenrouterApiKeyPlain = last.openrouterApiKey;
          }
          lastStandardProvider = provider;
          lastOpenrouterModel = model;
          chrome.storage.local.set({
            lastOpenrouterApiKeyEnc: keyEnc || null,
            lastStandardProvider: provider,
            lastOpenrouterModel: model,
            masterKeySalt
          });
          shimejis = [];
          selectedShimejiId = null;
          chrome.storage.local.set({ noShimejis: true });
          saveShimejis();
          renderShimejis();
          return;
        }
        const removeIndex = shimejis.findIndex((s) => s.id === id);
        shimejis = shimejis.filter((s) => s.id !== id);
        if (selectedShimejiId === id) {
          const next = shimejis[removeIndex] || shimejis[removeIndex - 1] || shimejis[0];
          selectedShimejiId = next ? next.id : null;
        }
        saveShimejis();
        renderShimejis();
      } else if (action === "character-source") {
        const source = e.target?.dataset?.source;
        const shimeji = shimejis.find((s) => s.id === id);
        if (!shimeji) return;
        if (source === "free") {
          updateShimeji(id, "characterSource", "free");
          const nextFree = CHARACTER_OPTIONS[0]?.value;
          if (nextFree) updateShimeji(id, "character", nextFree);
        } else if (source === "nft") {
          updateShimeji(id, "characterSource", "nft");
          const nextNft = nftCharacters[0]?.id;
          if (nextNft) updateShimeji(id, "character", nextNft);
        }
        renderShimejis();
      } else if (action === "refresh-ollama-models") {
        refreshOllamaModels(id, true);
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
      if (field === "chatThemePreset") {
        const presetId = e.target.value;
        if (presetId === "custom") {
          updateShimeji(id, "chatThemePreset", "custom");
          return;
        }
        if (presetId === "random") {
          const preset = CHAT_THEME_PRESETS[Math.floor(Math.random() * CHAT_THEME_PRESETS.length)];
          if (!preset) return;
          updateShimeji(id, "chatThemePreset", "random");
          updateShimeji(id, "chatThemeColor", preset.theme);
          updateShimeji(id, "chatBgColor", preset.bg);
          updateShimeji(id, "chatBubbleStyle", preset.bubble);
          const themeInput = card.querySelector('input[data-field="chatThemeColor"]');
          const bgInput = card.querySelector('input[data-field="chatBgColor"]');
          if (themeInput) themeInput.value = preset.theme;
          if (bgInput) bgInput.value = preset.bg;
          return;
        }
        const preset = CHAT_THEME_PRESETS.find((item) => item.id === presetId);
        if (!preset) return;
        updateShimeji(id, "chatThemePreset", presetId);
        updateShimeji(id, "chatThemeColor", preset.theme);
        updateShimeji(id, "chatBgColor", preset.bg);
        updateShimeji(id, "chatBubbleStyle", preset.bubble);
        const themeInput = card.querySelector('input[data-field="chatThemeColor"]');
        const bgInput = card.querySelector('input[data-field="chatBgColor"]');
        if (themeInput) themeInput.value = preset.theme;
        if (bgInput) bgInput.value = preset.bg;
        return;
      }
      if (field === "ollamaModelSelect") {
        const nextModel = e.target.value || "custom";
        const modelInput = card.querySelector('input[data-field="ollamaModel"]');
        if (nextModel === "custom") {
          if (modelInput) modelInput.focus();
        } else {
          if (modelInput) modelInput.value = nextModel;
          updateShimeji(id, "ollamaModel", nextModel);
        }
        return;
      }
      if (e.target.type === "checkbox") {
        updateShimeji(id, field, e.target.checked);
        if (field === "enabled") {
          card.dataset.enabled = e.target.checked ? "on" : "off";
        }
        const label = e.target.closest(".toggle-row")?.querySelector(".toggle-label");
        if (label) label.textContent = e.target.checked ? t("On", "Activo") : t("Off", "Apagado");
      } else {
        if (field === "openclawAgentName") {
          const normalized = normalizeOpenClawAgentName(e.target.value, defaultOpenClawAgentName(id));
          e.target.value = normalized;
          updateShimeji(id, field, normalized);
        } else {
          updateShimeji(id, field, e.target.value);
        }
      }
      if (field === "mode") {
        toggleModeBlocks(card, e.target.value);
        // Re-apply provider visibility when switching to standard mode
        if (e.target.value === "standard") {
          const providerSelect = card.querySelector('[data-field="standardProvider"]');
          if (providerSelect) toggleProviderBlocks(card, providerSelect.value);
        }
      }
      if (field === "character") {
        renderShimejis();
      }
      if (field === "standardProvider") {
        toggleProviderBlocks(card, e.target.value);
        if (e.target.value === "ollama") {
          refreshOllamaModels(id, false);
        }
      }
      if (field === "chatThemeColor" || field === "chatBgColor") {
        const presetSelect = card.querySelector('select[data-field="chatThemePreset"]');
        if (presetSelect) presetSelect.value = "custom";
        updateShimeji(id, "chatThemePreset", "custom");
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
        if (field === "openclawAgentName") {
          const normalized = normalizeOpenClawAgentName(e.target.value, defaultOpenClawAgentName(id));
          e.target.value = normalized;
          updateShimeji(id, field, normalized);
        } else {
          updateShimeji(id, field, e.target.value);
        }
        if (field === "ollamaModel") {
          const select = card.querySelector('select[data-field="ollamaModelSelect"]');
          if (select && select.value !== "custom" && select.value !== e.target.value) {
            select.value = "custom";
          }
        }
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

  attachOnboardingHandlers();

  if (masterkeyToggle) {
    masterkeyToggle.addEventListener('change', async () => {
      if (!masterkeyToggle.checked) {
        const sessionKey = await getSessionMasterKey();
        if (!sessionKey) {
          masterkeyToggle.checked = true;
          setMasterKeyStatusMessage(t('Unlock to disable protection', 'Desbloquea para desactivar la protección'));
          return;
        }
        masterKeyEnabled = false;
        masterKeyUnlocked = false;
        isChangingMasterKey = false;
        isEnablingMasterKey = false;
        isChangingMasterKey = false;
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
      if (!masterKeyEnabled) {
        isEnablingMasterKey = true;
        applyMasterKeyUiState();
        setMasterKeyStatusMessage(t('Set a password and press Save', 'Define una contraseña y presiona Guardar'));
        return;
      }
      applyMasterKeyUiState();
    });
  }

  if (masterkeyActionBtn) {
    masterkeyActionBtn.addEventListener('click', async () => {
      if (!masterKeyEnabled) {
        setMasterKeyStatusMessage(t('Enable protection first', 'Activa la protección primero'));
        return;
      }
      if (masterKeyUnlocked) {
        clearSessionMasterKey();
        masterKeyUnlocked = false;
        isChangingMasterKey = false;
        if (masterKeyAutoLockTimer) {
          clearTimeout(masterKeyAutoLockTimer);
          masterKeyAutoLockTimer = null;
        }
        applyMasterKeyUiState();
        renderShimejis();
        return;
      }
      const value = (masterkeyInput?.value || '').trim();
      if (!value) {
        setMasterKeyStatusMessage(t('Enter your password to unlock', 'Ingresa tu contraseña para desbloquear'));
        return;
      }
      await tryUnlockMasterKey(value);
    });
  }

  if (masterkeySaveBtn) {
    masterkeySaveBtn.addEventListener('click', async () => {
      const value = (masterkeyInput?.value || '').trim();
      const confirmValue = (masterkeyConfirm?.value || '').trim();
      if (!value) {
        setMasterKeyStatusMessage(t('Enter a password to save', 'Ingresa una contraseña para guardar'));
        return;
      }
      if (value !== confirmValue) {
        setMasterKeyStatusMessage(t('Passwords do not match', 'Las contraseñas no coinciden'));
        return;
      }
      if (!masterKeyEnabled) {
        masterkeyToggle.checked = true;
        isEnablingMasterKey = true;
        await enableMasterKeyWithValue(value);
        return;
      }
      if (masterKeyUnlocked && isChangingMasterKey) {
        await changeMasterKeyWithValue(value);
      }
    });
  }

  if (masterkeyChangeBtn) {
    masterkeyChangeBtn.addEventListener('click', () => {
      if (!masterKeyEnabled || !masterKeyUnlocked) {
        setMasterKeyStatusMessage(t('Unlock to change password', 'Desbloquea para cambiar la contraseña'));
        return;
      }
      isChangingMasterKey = true;
      if (masterkeyInput) masterkeyInput.value = "";
      if (masterkeyConfirm) masterkeyConfirm.value = "";
      setMasterKeyStatusMessage(t('Enter a new password and press Save', 'Ingresa una nueva contraseña y presiona Guardar'));
      applyMasterKeyUiState();
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

  const nftSectionTitle = document.getElementById("nft-section-title");
  const nftHint = document.getElementById("nft-hint");
  const nftListEl = document.getElementById("nft-list");
  const linkNftCollection = document.getElementById("link-nft-collection");

  function renderNftSection() {
    if (nftSectionTitle) nftSectionTitle.textContent = t("NFT Shimejis", "Shimejis NFT");
    if (linkNftCollection) linkNftCollection.textContent = t("Manage Collection", "Gestionar Colección");
    if (!nftListEl) return;

    chrome.storage.sync.get(['nftCharacters'], (data) => {
      const nfts = data.nftCharacters || [];
      const synced = Array.isArray(nfts) ? nfts : [];
      const mergedMap = new Map();
      BUILTIN_NFT_CHARACTERS.forEach((item) => {
        if (item?.id) mergedMap.set(item.id, item);
      });
      synced.forEach((item) => {
        if (item?.id) mergedMap.set(item.id, item);
      });
      nftCharacters = Array.from(mergedMap.values());
      nftCharacterIds = new Set(nftCharacters.map((nft) => nft.id).filter(Boolean));
      nftListEl.innerHTML = "";

      if (nftCharacters.length === 0) {
        if (nftHint) nftHint.textContent = "";
        const empty = document.createElement("div");
        empty.className = "nft-empty-state";
        empty.textContent = t(
          "No NFT characters yet. Visit the collection page to connect your wallet.",
          "Aún no hay personajes NFT. Visita la página de colección para conectar tu wallet."
        );
        nftListEl.appendChild(empty);
        renderShimejis();
        return;
      }

      if (nftHint) nftHint.textContent = t(
        `${nftCharacters.length} NFT character${nftCharacters.length === 1 ? '' : 's'}`,
        `${nftCharacters.length} personaje${nftCharacters.length === 1 ? '' : 's'} NFT`
      );

      nftCharacters.forEach((nft) => {
        const card = document.createElement("div");
        card.className = "nft-card";
        const preview = document.createElement("div");
        preview.className = "nft-card-preview";
        const nftId = nft?.id || "";
        const isBuiltinEgg = String(nftId).toLowerCase() === "egg";
        if (isBuiltinEgg) {
          card.classList.add("nft-card-egg");
          const img = document.createElement("img");
          img.className = "nft-card-preview-img";
          img.alt = "";
          img.src = chrome.runtime.getURL("characters/egg/stand-neutral.png");
          preview.appendChild(img);
        } else {
          preview.textContent = (nft.name || "?")[0].toUpperCase();
        }
        const name = document.createElement("div");
        name.className = "nft-card-name";
        name.textContent = nft.name || t("Unknown", "Desconocido");
        const id = document.createElement("div");
        id.className = "nft-card-id";
        id.textContent = nft.id || "";
        card.appendChild(preview);
        if (!isBuiltinEgg) {
          card.appendChild(name);
          card.appendChild(id);
        }
        nftListEl.appendChild(card);
      });
      renderShimejis();
    });
  }

  initPopupThemeAndLanguage();

  if (popupThemeSelect) {
    popupThemeSelect.addEventListener("change", () => {
      const value = popupThemeSelect.value || "random";
      chrome.storage.local.set({ popupTheme: value });
      applyTheme(value === "random" ? getRandomTheme() : value);
    });
  }

  if (popupLanguageSelect) {
    popupLanguageSelect.addEventListener("change", () => {
      const value = popupLanguageSelect.value || "en";
      uiLanguage = value;
      chrome.storage.local.set({ shimejiLanguage: value });
      populatePopupThemeSelect(popupThemeSelect?.value || "random");
      populateLanguageSelect(value);
      setPopupLabels();
      renderNftSection();
      renderShimejis();
    });
  }

});
