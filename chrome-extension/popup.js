document.addEventListener("DOMContentLoaded", () => {
  const sizeButtons = document.querySelectorAll(".size-btn");
  const pageToggle = document.getElementById("page-toggle");
  const pageToggleRow = document.getElementById("page-toggle-row");
  const enableAllBtn = document.getElementById("enable-all-btn");
  const disableAllBtn = document.getElementById("disable-all-btn");
  const globalStatus = document.getElementById("global-status");
  let currentPageKey = null;

  // Update size selection UI
  function updateSizeSelectionUI(selectedSize) {
    sizeButtons.forEach((button) => {
      if (button.dataset.size === selectedSize) {
        button.classList.add("selected");
      } else {
        button.classList.remove("selected");
      }
    });
  }

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

  // Initial load from storage
  chrome.storage.sync.get(["size"], (data) => {
    updateSizeSelectionUI(data.size || "medium");
  });

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
      if (changes.size) {
        updateSizeSelectionUI(changes.size.newValue);
      }
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

  // Size buttons
  sizeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const size = button.dataset.size;
      chrome.storage.sync.set({ size }, () => {
        updateSizeSelectionUI(size);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "updateSize", size });
          }
        });
      });
    });
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
  const aiPersonalitySelect = document.getElementById("ai-personality");
  const aiProviderSelect = document.getElementById("ai-provider");
  const aiModelSelect = document.getElementById("ai-model");
  const aiApiKeyInput = document.getElementById("ai-api-key");
  const toggleKeyBtn = document.getElementById("toggle-key-visibility");
  const proactiveToggle = document.getElementById("proactive-toggle");
  const modeButtons = document.querySelectorAll(".mode-card");
  const standardFields = document.getElementById("standard-fields");
  const agentFields = document.getElementById("agent-fields");
  const openclawGatewayUrlInput = document.getElementById("openclaw-gateway-url");
  const onboardingNote = document.getElementById("ai-onboarding");

  // Chat mode toggle
  function setChatModeUI(mode) {
    modeButtons.forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.mode === mode);
    });
    standardFields.style.display = mode === "standard" ? "" : "none";
    agentFields.style.display = mode === "agent" ? "" : "none";
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      chrome.storage.local.set({ chatMode: mode });
      setChatModeUI(mode);
    });
  });

  // OpenClaw gateway URL - save on blur or Enter
  function saveGatewayUrl() {
    chrome.storage.local.set({ openclawGatewayUrl: openclawGatewayUrlInput.value.trim() });
  }
  openclawGatewayUrlInput.addEventListener("blur", saveGatewayUrl);
  openclawGatewayUrlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      saveGatewayUrl();
      openclawGatewayUrlInput.blur();
    }
  });

  const MODEL_OPTIONS = {
    openrouter: [
      { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
      { value: "moonshotai/kimi-k2.5", label: "Kimi K2.5" },
      { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
      { value: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
      { value: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek Chat v3" },
      { value: "mistralai/mistral-large-2411", label: "Mistral Large" },
    ],
    openai: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4.1", label: "GPT-4.1" },
      { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { value: "o3-mini", label: "o3 Mini" },
    ],
  };

  function isSpanishLocale() {
    const locale = (navigator.language || "").toLowerCase();
    return locale.startsWith("es");
  }

  function updateOnboardingNote(hasApiKey) {
    if (!onboardingNote) return;

    if (!hasApiKey) {
      onboardingNote.textContent = isSpanishLocale()
        ? "Shimeji quiere estar vivo. Para eso necesita tu API key. Recomendado: OpenRouter (tiene version gratuita). OpenAI como segunda opcion."
        : "Shimeji wants to be alive. It needs your API key. Recommended: OpenRouter (has a free tier). OpenAI as a second option.";
      return;
    }

    onboardingNote.textContent = isSpanishLocale()
      ? "Con la API key lista, tus personalidades quieren estar vivas y hacer cosas online y onchain. Configura tu OpenClaw y activa \"AI Agent\" en este popup."
      : "With your API key set, your personalities want to be alive and do things online and onchain. Configure your OpenClaw and enable \"AI Agent\" in this popup.";
  }

  function populateModelDropdown(provider, selectedModel) {
    aiModelSelect.innerHTML = "";
    const models = MODEL_OPTIONS[provider] || [];
    models.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.value;
      opt.textContent = m.label;
      aiModelSelect.appendChild(opt);
    });
    // Set selected model if it exists in the list, otherwise default to first
    if (selectedModel && models.some((m) => m.value === selectedModel)) {
      aiModelSelect.value = selectedModel;
    } else if (models.length > 0) {
      aiModelSelect.value = models[0].value;
      chrome.storage.local.set({ aiModel: models[0].value });
    }
  }

  // Load AI settings from storage
  chrome.storage.local.get(
    ["aiPersonality", "aiProvider", "aiModel", "aiApiKey", "proactiveMessages", "chatMode", "openclawGatewayUrl"],
    (data) => {
      // Set chat mode
      const chatMode = data.chatMode || "standard";
      setChatModeUI(chatMode);

      aiPersonalitySelect.value = data.aiPersonality || "cryptid";

      const provider = data.aiProvider || "openrouter";
      aiProviderSelect.value = provider;
      populateModelDropdown(provider, data.aiModel);

      if (data.aiApiKey) {
        aiApiKeyInput.value = data.aiApiKey;
      }
      updateOnboardingNote(!!data.aiApiKey);

      if (data.openclawGatewayUrl) {
        openclawGatewayUrlInput.value = data.openclawGatewayUrl;
      }

      if (proactiveToggle) {
        proactiveToggle.checked = !!data.proactiveMessages;
      }
    }
  );

  // Personality change
  aiPersonalitySelect.addEventListener("change", () => {
    chrome.storage.local.set({ aiPersonality: aiPersonalitySelect.value });
  });

  // Provider change
  aiProviderSelect.addEventListener("change", () => {
    const provider = aiProviderSelect.value;
    chrome.storage.local.set({ aiProvider: provider });
    populateModelDropdown(provider, null);
  });

  // Model change
  aiModelSelect.addEventListener("change", () => {
    chrome.storage.local.set({ aiModel: aiModelSelect.value });
  });

  // API key - save on blur or Enter
  function saveApiKey() {
    const apiKey = aiApiKeyInput.value.trim();
    chrome.storage.local.set({ aiApiKey: apiKey });
    updateOnboardingNote(!!apiKey);
  }
  aiApiKeyInput.addEventListener("blur", saveApiKey);
  aiApiKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      saveApiKey();
      aiApiKeyInput.blur();
    }
  });

  // Show/hide API key
  toggleKeyBtn.addEventListener("click", () => {
    if (aiApiKeyInput.type === "password") {
      aiApiKeyInput.type = "text";
      toggleKeyBtn.textContent = "Hide";
    } else {
      aiApiKeyInput.type = "password";
      toggleKeyBtn.textContent = "Show";
    }
  });

  // Proactive messages toggle
  if (proactiveToggle) {
    proactiveToggle.addEventListener("change", () => {
      const enabled = proactiveToggle.checked;
      chrome.runtime.sendMessage({
        type: "setProactiveMessages",
        enabled: enabled,
      });
    });
  }
});
