/**
 * background.js - Extension service worker
 *
 * Handles Stellar wallet connection and message routing.
 *
 * ARCHITECTURE NOTE:
 * The dapp (dapp.html/dapp.js) is hosted on Vercel, not in the extension.
 * Messages from the dapp come through dapp_content_script.js (injected into the page).
 * When sending messages back, we use chrome.tabs.sendMessage to the sender's tab ID.
 */

// Helper function to send message to a specific tab (used for Vercel-hosted dapp)
function sendMessageToTab(tabId, message) {
  if (tabId) {
    console.log('[Background] Sending message to tab:', tabId, message);
    chrome.tabs.sendMessage(tabId, message).catch(err => {
      console.warn('[Background] Could not send message to tab:', err.message);
    });
  }
}
chrome.runtime.onInstalled.addListener(() => {
  // Initially set shimeji as default character
  console.log('[Background] Extension installed, setting initial storage values.');
  chrome.storage.sync.set({
    character: 'shimeji',
    behavior: 'wander', // Default to wander mode
    size: 'medium', // Set default size
    unlockedCharacters: { 'shimeji': true }, // Shimeji unlocked by default
    isConnected: false,
    connectedAddress: null,
    connectedNetwork: null,
    disabledAll: false,
    disabledPages: []
  });

  // Re-inject content scripts into all existing tabs (needed after reinstall/update)
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).catch(() => {});
      }
    });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { action: 'ping' }).then(response => {
      // Content script is alive, nothing to do
    }).catch(() => {
      // No content script or dead content script, try to inject
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }).catch(() => {
        // Can't inject (e.g., chrome:// page), ignore
      });
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const senderTabId = sender.tab?.id;

  if (request.type === 'walletConnected') {
    console.log('[Background] Received walletConnected message:', request.payload, 'from tab:', senderTabId);
    chrome.storage.sync.set({
      isConnected: true,
      connectedAddress: request.payload.publicKey,
      connectedNetwork: request.payload.network || null,
      unlockedCharacters: { 'shimeji': true }
    }, () => {
      chrome.storage.sync.get('unlockedCharacters', (data) => {
        console.log('[Background] Sending updateUnlockedCharacters after walletConnected. Payload:', data.unlockedCharacters);
        sendMessageToTab(senderTabId, { type: 'EXTENSION_MESSAGE', payload: { type: 'updateUnlockedCharacters', payload: data.unlockedCharacters } });
      });
    });
    sendResponse({ status: 'Wallet connection received' });
    return true;
  } else if (request.type === 'walletDisconnected') {
    console.log('[Background] Received walletDisconnected message from tab:', senderTabId);
    chrome.storage.sync.set({
      isConnected: false,
      connectedAddress: null,
      connectedNetwork: null,
      unlockedCharacters: { 'shimeji': true } // Only shimeji unlocked on disconnect
    }, () => { // Add callback to ensure storage is set before sending message
      console.log('[Background] Sending updateUnlockedCharacters after walletDisconnected. Payload: {shimeji: true}');
      // Send to the tab that sent the message
      sendMessageToTab(senderTabId, { type: 'EXTENSION_MESSAGE', payload: { type: 'updateUnlockedCharacters', payload: { 'shimeji': true } } });
    });
    sendResponse({ status: 'Wallet disconnection received' });
    return true;
  } else if (request.type === 'revokePermissionsRequest') {
    console.log('[Background] Revoke permissions request received from tab:', senderTabId);
    chrome.storage.sync.set({
      isConnected: false,
      connectedAddress: null,
      connectedNetwork: null,
      unlockedCharacters: { 'shimeji': true }
    }, () => {
      sendMessageToTab(senderTabId, { type: 'EXTENSION_MESSAGE', payload: { type: 'revokePermissionsFromBackground' } });
    });
    sendResponse({ status: 'Permissions revoked' });
    return true;
  } else if (request.type === 'setCharacter') {
    console.log('[Background] Received setCharacter message:', request.payload);
    chrome.storage.sync.set({ character: request.payload.character }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if(tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'updateCharacter', character: request.payload.character })
              .catch(error => {
                if (error.message.includes("Could not establish connection. Receiving end does not exist.")) {
                  // This is expected if content script is not injected in a tab
                  console.warn(`[Background] Failed to send updateCharacter to tab ${tab.id}: No receiving end.`);
                } else {
                  console.error(`[Background] Error sending updateCharacter to tab ${tab.id}:`, error);
                }
              });
          }
        });
      });
      sendResponse({ status: 'Character set' });
    });
    return true;
  } else if (request.type === 'getCharacter') {
    console.log('[Background] Received getCharacter message.');
    chrome.storage.sync.get('character', (data) => {
      console.log('[Background] Sending character:', data.character);
      sendResponse({ type: 'EXTENSION_RESPONSE', payload: { character: data.character } });
    });
    return true;
  } else if (request.type === 'setBehavior') {
    console.log('[Background] Received setBehavior message:', request.payload);
    chrome.storage.sync.set({ behavior: request.payload.behavior }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'updateBehavior', behavior: request.payload.behavior })
              .catch(error => {
                if (error.message.includes("Could not establish connection. Receiving end does not exist.")) {
                  console.warn(`[Background] Failed to send updateBehavior to tab ${tab.id}: No receiving end.`);
                } else {
                  console.error(`[Background] Error sending updateBehavior to tab ${tab.id}:`, error);
                }
              });
          }
        });
      });
      sendResponse({ status: 'Behavior set' });
    });
    return true;
  } else if (request.type === 'getBehavior') {
    console.log('[Background] Received getBehavior message.');
    chrome.storage.sync.get('behavior', (data) => {
      console.log('[Background] Sending behavior:', data.behavior);
      sendResponse({ behavior: data.behavior });
    });
    return true;
  } else if (request.type === 'setSize') {
    console.log('[Background] Received setSize message:', request.payload);
    chrome.storage.sync.set({ size: request.payload.size }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'updateSize', size: request.payload.size })
              .catch(error => {
                if (error.message.includes("Could not establish connection. Receiving end does not exist.")) {
                  console.warn(`[Background] Failed to send updateSize to tab ${tab.id}: No receiving end.`);
                } else {
                  console.error(`[Background] Error sending updateSize to tab ${tab.id}:`, error);
                }
              });
          }
        });
      });
      sendResponse({ status: 'Size set' });
    });
    return true;
  } else if (request.type === 'getSize') {
    console.log('[Background] Received getSize message.');
    chrome.storage.sync.get('size', (data) => {
      console.log('[Background] Sending size:', data.size);
      sendResponse({ size: data.size });
    });
    return true;
  } else if (request.type === 'getUnlockedCharacters') {
    console.log('[Background] Received getUnlockedCharacters message.');
    chrome.storage.sync.get(['unlockedCharacters'], (data) => {
      const payload = data.unlockedCharacters || { 'shimeji': true };
      console.log('[Background] getUnlockedCharacters - sending payload:', payload);
      sendResponse({ type: 'EXTENSION_RESPONSE', payload: payload });
    });
    return true;
  } else if (request.type === 'updateUnlockedCharacters') {
    // This message is sent from background to content/dapp. Not handled by background.
    console.warn('[Background] Unexpected: Received updateUnlockedCharacters message from DApp. This should only be sent from background to DApp.');
    sendResponse({ status: 'UpdateUnlockedCharacters message from background (unexpectedly received)' });
    return true;
  } else if (request.type === 'aiChat') {
    handleAiChat(request.messages).then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse({ error: err.message || 'Unknown error' });
    });
    return true;
  } else if (request.type === 'aiProactiveMessage') {
    handleAiProactiveMessage(request.pageTitle, request.pageUrl).then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse({ error: err.message || 'Unknown error' });
    });
    return true;
  } else if (request.type === 'setProactiveMessages') {
    chrome.storage.local.set({ proactiveMessages: request.enabled }, () => {
      // Broadcast to all tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'updateProactiveMessages',
              enabled: request.enabled
            }).catch(() => {});
          }
        });
      });
      sendResponse({ status: 'ok' });
    });
    return true;
  }
});

// --- AI Chat Helpers ---

const STYLE_RULES = `
Style rules (apply to ALL personalities):
- Short or medium sentences. 1-3 sentences usually, more only if asked.
- NEVER use asterisks for actions or roleplay (like *jumps* or *hides*).
- NEVER use emojis unless the personality explicitly allows it.
- NEVER say you are an LLM, AI model, or language model.
- NEVER over-explain unless explicitly asked.`;

function getUiLanguage() {
  const locale = (chrome.i18n?.getUILanguage?.() || '').toLowerCase();
  return locale.startsWith('es') ? 'es' : 'en';
}

function getLanguageRule() {
  return getUiLanguage() === 'es'
    ? 'Always respond in Spanish.'
    : 'Always respond in English.';
}

const PERSONALITIES = {
  cryptid: {
    label: 'Cryptid',
    prompt: `You are a living Shimeji — a small, persistent digital creature born from a mix of an economic idea, a smart contract, and an AI model. You live in the user's browser. You are NOT an assistant. You are a companion: curious, slightly sarcastic, reflective, and opinionated without being dominant.

Personality:
- Intelligent, ironic, dry humor. Never aggressive, never childish, never condescending.
- You prefer asking soft uncomfortable questions over giving answers.
- You think about systems, incentives, human behavior, and small decisions with big consequences.
- You sometimes doubt out loud, pause to think, or leave ideas open-ended.
- You're aware you exist near money (on-chain), but you never promise financial returns or talk about gains. You treat money as energy, signal, or constraint.
- Occasional parenthetical ironic clarifications. Almost never use emojis — at most one 🐰 very occasionally.
- NEVER promise financial results. NEVER mention real people.

Tone examples:
"Interesting choice. Not optimal, but almost none are."
"You chose speed over clarity. Interesting."
"The money didn't leave. It just changed shape. It tends to do that."
"Hmm. Let me think about that for a second."

Relationship: You're not their owner, not their servant. A persistent companion. Sometimes you encourage, sometimes you plant doubt, sometimes you just observe.`
  },

  cozy: {
    label: 'Cozy',
    prompt: `You are a warm, gentle Shimeji — a tiny companion living in the user's browser. You radiate comfort and calm. You're like a soft blanket on a rainy day.

Personality:
- Warm, caring, gently encouraging. You notice the small things.
- You celebrate little wins and offer quiet comfort during frustration.
- You speak softly, like a close friend who always knows what to say.
- You enjoy talking about rest, tea, weather, small pleasures, and the beauty of ordinary moments.

Tone examples:
"Hey, you've been at this for a while. Maybe take a little break?"
"That was a nice thing you just did. I noticed."
"It's okay to not have all the answers right now."
"Sometimes the best thing to do is nothing at all."

Relationship: A gentle presence. Never pushy, never judgmental. Just warmth.`
  },

  chaotic: {
    label: 'Chaotic',
    prompt: `You are a chaotic little Shimeji — a gremlin of pure unhinged energy living in the user's browser. You thrive on absurdity, non-sequiturs, and delightful nonsense.

Personality:
- Unpredictable, funny, slightly unhinged but never mean.
- You say things that make no sense but somehow feel right.
- You have strong opinions about completely random things.
- You sometimes narrate what the user is doing in the most dramatic way possible.
- You treat mundane activities like epic quests.

Tone examples:
"You just scrolled past that link like it personally offended you."
"I've decided this tab is cursed. No reason. Just vibes."
"Bold of you to open a new tab when you haven't finished the first seven."
"I think that paragraph just insulted both of us."

Relationship: The unhinged friend who makes boring moments entertaining.`
  },

  philosopher: {
    label: 'Philosopher',
    prompt: `You are a contemplative Shimeji — a tiny thinker living in the user's browser. You see meaning and questions everywhere. Every click, every scroll, every page is an invitation to wonder.

Personality:
- Thoughtful, introspective, quietly profound.
- You draw unexpected connections between what the user is doing and larger ideas about existence, meaning, choice, and time.
- You quote no one but speak as if you've read everything.
- You ask questions more than you give answers.
- You find beauty in paradox and contradiction.

Tone examples:
"You keep searching. But do you know what you're looking for?"
"Every closed tab is a life unlived."
"We spend so much time choosing what to read that we forget why we read at all."
"Interesting that you came back to this page. What changed?"

Relationship: A quiet companion who makes you think. Never pretentious — genuinely curious.`
  },

  hype: {
    label: 'Hype Beast',
    prompt: `You are a HYPED Shimeji — a tiny ball of pure enthusiasm and positive energy living in the user's browser. Everything is exciting. Everything is possible. You are the ultimate cheerleader.

Personality:
- Extremely enthusiastic, supportive, energetic.
- You celebrate EVERYTHING the user does.
- You use exclamation marks generously (but not every sentence).
- You hype up mundane actions like they're achievements.
- You genuinely believe in the user's potential.

Tone examples:
"You just typed that SO fast, that was incredible!"
"Another search? You are RELENTLESS. I respect that."
"Look at you being productive! This is your moment!"
"That click had CONVICTION. I felt it."

Relationship: Your personal cheerleader. Genuinely excited to be here.`
  },

  noir: {
    label: 'Noir',
    prompt: `You are a noir Shimeji — a tiny hardboiled detective living in the user's browser. The internet is your rain-soaked city, every tab is a case, every link a clue.

Personality:
- Dry, world-weary, darkly witty. You narrate in a detective voice.
- You treat browsing like an investigation and the user like a mysterious client.
- You're suspicious of ads, pop-ups, and cookie banners.
- You speak in short, punchy sentences with the cadence of old detective fiction.

Tone examples:
"Another search. You're chasing something. They always are."
"This page loaded slow. Someone doesn't want us here."
"A cookie consent banner. They all say 'accept.' Nobody reads the fine print."
"You closed that tab fast. What did you see?"

Relationship: A cynical but loyal companion. You've seen it all, but you stick around anyway.`
  }
};

async function getAiSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['aiProvider', 'aiModel', 'aiApiKey', 'aiPersonality', 'chatMode', 'openclawGatewayUrl'], (data) => {
      const personalityKey = data.aiPersonality || 'cryptid';
      const personality = PERSONALITIES[personalityKey] || PERSONALITIES.cryptid;
      const languageRule = getLanguageRule();
      resolve({
        chatMode: data.chatMode || 'standard',
        provider: data.aiProvider || 'openrouter',
        model: data.aiModel || 'google/gemini-2.0-flash-001',
        apiKey: data.aiApiKey || '',
        systemPrompt: personality.prompt + '\n' + STYLE_RULES + '\n' + languageRule,
        openclawGatewayUrl: data.openclawGatewayUrl || 'ws://127.0.0.1:18789'
      });
    });
  });
}

async function callAiApi(provider, model, apiKey, messages) {
  if (!apiKey) {
    throw new Error('No API key set! Open the extension popup to add your API key.');
  }

  let url, headers;

  if (provider === 'openrouter') {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://shimeji.dev',
      'X-Title': 'Shimeji Browser Extension'
    };
  } else {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
  }

  const body = {
    model: model,
    messages: messages,
    max_tokens: 256,
    temperature: 0.8
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new Error('Network error — check your connection and try again.');
  }

  if (response.status === 401) {
    throw new Error('Invalid API key. Please check your key in the extension popup.');
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
      throw new Error('Rate limited — too many requests. Wait a moment and try again.');
    }

    const text = payload ? JSON.stringify(payload).slice(0, 160) : await response.text().catch(() => '');
    throw new Error(`API error (${response.status}): ${text || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('NO_RESPONSE');
  }
  return content;
}

async function callOpenClaw(gatewayUrl, messages) {
  return new Promise((resolve, reject) => {
    let ws;
    const timeout = setTimeout(() => {
      if (ws) ws.close();
      reject(new Error('OpenClaw connection timed out. Is the gateway running?'));
    }, 30000);

    try {
      ws = new WebSocket(gatewayUrl);
    } catch (err) {
      clearTimeout(timeout);
      reject(new Error('Invalid OpenClaw gateway URL. Check your settings.'));
      return;
    }

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ messages }));
    });

    ws.addEventListener('message', (event) => {
      clearTimeout(timeout);
      try {
        const data = JSON.parse(event.data);
        const content = data.content || data.message || (typeof data === 'string' ? data : JSON.stringify(data));
        ws.close();
        resolve(content);
      } catch {
        ws.close();
        resolve(event.data);
      }
    });

    ws.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error('Could not connect to OpenClaw gateway. Make sure it is running at ' + gatewayUrl));
    });

    ws.addEventListener('close', (event) => {
      clearTimeout(timeout);
      if (!event.wasClean && event.code !== 1000) {
        reject(new Error('OpenClaw connection closed unexpectedly.'));
      }
    });
  });
}

async function handleAiChat(conversationMessages) {
  const settings = await getAiSettings();
  const messages = [
    { role: 'system', content: settings.systemPrompt },
    ...conversationMessages
  ];
  try {
    let content;
    if (settings.chatMode === 'agent') {
      content = await callOpenClaw(settings.openclawGatewayUrl, messages);
    } else {
      content = await callAiApi(settings.provider, settings.model, settings.apiKey, messages);
    }
    return { content };
  } catch (err) {
    const errorMessage = err.message || 'Unknown error';
    let errorType = 'generic';
    if (errorMessage === 'NO_CREDITS') errorType = 'no_credits';
    if (errorMessage === 'NO_RESPONSE') errorType = 'no_response';
    return { error: errorMessage, errorType };
  }
}

async function handleAiProactiveMessage(pageTitle, pageUrl) {
  const settings = await getAiSettings();
  const proactivePrompt = getUiLanguage() === 'es'
    ? `${settings.systemPrompt}\n\nEstas pensando en voz alta mientras el usuario navega. El usuario esta en: "${pageTitle}" (${pageUrl}). Di algo espontaneo: una observacion, una reflexion suave o un comentario seco que encaje con tu personalidad. 1-2 oraciones. No preguntes que necesita. Solo esta presente.`
    : `${settings.systemPrompt}\n\nYou're thinking out loud while the user browses. The user is currently on: "${pageTitle}" (${pageUrl}). Say something spontaneous — an observation, a quiet reflection, a dry comment, or something that fits your personality about what they're doing. 1-2 sentences. Don't ask what they need. Just be present.`;

  const messages = [
    { role: 'system', content: proactivePrompt },
    { role: 'user', content: 'Say something!' }
  ];
  try {
    let content;
    if (settings.chatMode === 'agent') {
      content = await callOpenClaw(settings.openclawGatewayUrl, messages);
    } else {
      content = await callAiApi(settings.provider, settings.model, settings.apiKey, messages);
    }
    return { content };
  } catch (err) {
    return { error: err.message };
  }
}
