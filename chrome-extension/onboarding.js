const MODEL_OPTIONS = [
  { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  { value: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
  { value: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek Chat v3" },
  { value: "mistralai/mistral-large-2411", label: "Mistral Large" }
];

const providerSelect = document.getElementById("provider-select");
const modeSelect = document.getElementById("mode-select");
const providerField = document.getElementById("provider-field");
const openrouterBlock = document.getElementById("openrouter-block");
const ollamaBlock = document.getElementById("ollama-block");
const agentBlock = document.getElementById("agent-block");
const openrouterKey = document.getElementById("openrouter-key");
const modelSelect = document.getElementById("model-select");
const ollamaUrl = document.getElementById("ollama-url");
const ollamaModel = document.getElementById("ollama-model");
const openclawUrl = document.getElementById("openclaw-url");
const openclawToken = document.getElementById("openclaw-token");
const saveBtn = document.getElementById("save-btn");
const skipBtn = document.getElementById("skip-btn");

const isSpanish = (navigator.language || "").toLowerCase().startsWith("es");

function t(en, es) {
  return isSpanish ? es : en;
}

function setLabels() {
  document.getElementById("onboarding-title").textContent = t(
    "Welcome! Let's bring your first shimeji to life.",
    "Bienvenido! Demos vida a tu primer shimeji."
  );
  document.getElementById("onboarding-subtitle").textContent = t(
    "Configure the AI Brain and start chatting in seconds.",
    "Configura el Cerebro AI y empieza a chatear en segundos."
  );
  document.getElementById("brain-title").textContent = t("AI Brain Setup", "Configura el Cerebro AI");
  document.getElementById("mode-label").textContent = t("AI Brain", "Cerebro AI");
  if (modeSelect) {
    modeSelect.options[0].textContent = t("Standard (API key only)", "Standard (solo API key)");
    modeSelect.options[1].textContent = t("AI Agent", "AI Agent");
    modeSelect.options[2].textContent = t("Off", "Apagado");
  }
  document.getElementById("provider-label").textContent = t("Provider", "Proveedor");
  document.getElementById("api-key-label").textContent = t("OpenRouter API Key", "API Key OpenRouter");
  openrouterKey.placeholder = t("Paste your API key", "Pega tu API key");
  document.getElementById("model-label").textContent = t("Model", "Modelo");
  document.getElementById("openrouter-hint").textContent = "";
  const openrouterLink = document.getElementById("openrouter-link");
  if (openrouterLink) {
    openrouterLink.textContent = t(
      "Get an OpenRouter API key (free trial)",
      "Conseguí tu API key de OpenRouter (free trial)"
    );
  }
  document.getElementById("ollama-url-label").textContent = t("Ollama URL", "Ollama URL");
  ollamaUrl.placeholder = "http://127.0.0.1:11434";
  document.getElementById("ollama-model-label").textContent = t("Ollama Model", "Modelo Ollama");
  ollamaModel.placeholder = "llama3.1";
  document.getElementById("ollama-hint").textContent = t(
    "Use a local Ollama server to keep everything on-device.",
    "Usa un servidor Ollama local para mantener todo en tu dispositivo."
  );
  document.getElementById("openclaw-url-label").textContent = t("Gateway URL", "Gateway URL");
  document.getElementById("openclaw-token-label").textContent = t("OpenClaw Token", "Token OpenClaw");
  openclawUrl.placeholder = "ws://127.0.0.1:18789";
  openclawToken.placeholder = t("Enter gateway token", "Token del gateway");
  document.getElementById("openclaw-hint").textContent = t(
    "OpenClaw needs a WebSocket URL + gateway token.",
    "OpenClaw necesita un WebSocket + token del gateway."
  );
  saveBtn.textContent = t("Save & Open Settings", "Guardar y abrir configuración");
  skipBtn.textContent = t("Skip for now", "Omitir por ahora");
  document.getElementById("add-more-hint").textContent = t(
    "You can add more shimejis later with the + button.",
    "Luego podés agregar más shimejis con el botón +."
  );
}

function populateModels() {
  modelSelect.innerHTML = "";
  MODEL_OPTIONS.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    modelSelect.appendChild(option);
  });
}

function toggleProvider() {
  const provider = providerSelect.value || "openrouter";
  openrouterBlock.classList.toggle("hidden", provider !== "openrouter");
  ollamaBlock.classList.toggle("hidden", provider !== "ollama");
}

function toggleMode() {
  const mode = modeSelect?.value || "standard";
  const isStandard = mode === "standard";
  const isAgent = mode === "agent";
  if (providerField) providerField.classList.toggle("hidden", !isStandard);
  if (agentBlock) agentBlock.classList.toggle("hidden", !isAgent);
  if (!isStandard) {
    openrouterBlock.classList.add("hidden");
    ollamaBlock.classList.add("hidden");
    return;
  }
  toggleProvider();
}

function getDefaultShimeji(index) {
  return {
    id: `shimeji-${index + 1}`,
    character: "shimeji",
    size: "medium",
    mode: "standard",
    standardProvider: "openrouter",
    openrouterApiKey: "",
    openrouterModel: "google/gemini-2.0-flash-001",
    ollamaUrl: "http://127.0.0.1:11434",
    ollamaModel: "llama3.1",
    openclawGatewayUrl: "ws://127.0.0.1:18789",
    openclawGatewayToken: "",
    personality: "cryptid",
    enabled: true,
    chatThemeColor: "#2a1f4e",
    chatBgColor: "#ffffff",
    chatFontSize: "medium",
    chatWidth: "medium",
    chatBubbleStyle: "glass",
    ttsEnabled: false,
    ttsWhenClosed: false,
    ttsVoiceProfile: "random",
    ttsVoiceId: "",
    openMicEnabled: false,
    relayEnabled: false,
    animationQuality: "full"
  };
}

function loadExistingConfig() {
  chrome.storage.local.get(["shimejis"], (data) => {
    const list = Array.isArray(data.shimejis) ? data.shimejis : [];
    const first = list[0];
    if (!first) return;
    if (first.mode && modeSelect) modeSelect.value = first.mode;
    if (first.standardProvider) providerSelect.value = first.standardProvider;
    if (first.openrouterApiKey) openrouterKey.value = first.openrouterApiKey;
    if (first.openrouterModel) modelSelect.value = first.openrouterModel;
    if (first.ollamaUrl) ollamaUrl.value = first.ollamaUrl;
    if (first.ollamaModel) ollamaModel.value = first.ollamaModel;
    if (first.openclawGatewayUrl) openclawUrl.value = first.openclawGatewayUrl;
    if (first.openclawGatewayToken) openclawToken.value = first.openclawGatewayToken;
    toggleMode();
  });
}

function saveConfig() {
  const provider = providerSelect.value || "openrouter";
  const mode = modeSelect?.value || "standard";
  chrome.storage.local.get(["shimejis", "noShimejis"], (data) => {
    let list = Array.isArray(data.shimejis) ? data.shimejis : [];
    if (list.length === 0) {
      list = [getDefaultShimeji(0)];
    }
    const first = list[0];
    first.mode = mode;
    first.standardProvider = provider;
    if (mode === "standard") {
      if (provider === "openrouter") {
        first.openrouterApiKey = openrouterKey.value || "";
        first.openrouterModel = modelSelect.value || "google/gemini-2.0-flash-001";
      } else {
        first.ollamaUrl = ollamaUrl.value || "http://127.0.0.1:11434";
        first.ollamaModel = ollamaModel.value || "llama3.1";
      }
    } else if (mode === "agent") {
      first.openclawGatewayUrl = openclawUrl.value || "ws://127.0.0.1:18789";
      first.openclawGatewayToken = openclawToken.value || "";
    }
    chrome.storage.local.set({ shimejis: list, noShimejis: false }, () => {
      window.location.href = chrome.runtime.getURL("onboarding-success.html");
    });
  });
}

function skipOnboarding() {
  window.location.href = chrome.runtime.getURL("onboarding-success.html");
}

setLabels();
populateModels();
toggleMode();
loadExistingConfig();

providerSelect.addEventListener("change", () => {
  toggleProvider();
  toggleMode();
});
if (modeSelect) modeSelect.addEventListener("change", toggleMode);
saveBtn.addEventListener("click", saveConfig);
skipBtn.addEventListener("click", skipOnboarding);
