// Content script for Shimeji with multi-instance support

(function() {
    if (window.__shimejiCleanup) {
        try { window.__shimejiCleanup(); } catch (e) {}
    }
    window.__shimejiInitialized = true;

    const SPRITE_SIZE = 128;
    const TICK_MS = 40;
    const MAX_SHIMEJIS = 5;

    const sizes = {
        small: { scale: 0.5 },
        medium: { scale: 0.75 },
        big: { scale: 1.0 }
    };

    const PHYSICS = {
        gravity: 2,
        walkSpeed: 2,
        fallTerminalVelocity: 20
    };

    const State = {
        IDLE: 'idle',
        WALKING: 'walking',
        CRAWLING: 'crawling',
        FALLING: 'falling',
        LANDING: 'landing',
        SITTING: 'sitting',
        DRAGGED: 'dragged',
        JUMPING: 'jumping',
        CLIMBING_WALL: 'climbing_wall',
        CLIMBING_CEILING: 'climbing_ceiling',
        SITTING_EDGE: 'sitting_edge',
        HEAD_SPIN: 'head_spin',
        SPRAWLED: 'sprawled'
    };

    const SPRITES = {
        'stand-neutral': 'stand-neutral.png',
        'walk-step-left': 'walk-step-left.png',
        'walk-step-right': 'walk-step-right.png',
        'fall': 'fall.png',
        'bounce-squish': 'bounce-squish.png',
        'bounce-recover': 'bounce-recover.png',
        'sit': 'sit.png',
        'sit-look-up': 'sit-look-up.png',
        'sprawl-lying': 'sprawl-lying.png',
        'crawl-crouch': 'crawl-crouch.png',
        'jump': 'jump.png',
        'dragged-tilt-left': 'dragged-tilt-left-light.png',
        'dragged-tilt-right': 'dragged-tilt-right-light.png',
        'dragged-tilt-left-heavy': 'dragged-tilt-left-heavy.png',
        'dragged-tilt-right-heavy': 'dragged-tilt-right-heavy.png',
        'resist-frame-1': 'resist-frame-1.png',
        'resist-frame-2': 'resist-frame-2.png',
        'grab-wall': 'grab-wall.png',
        'climb-wall-frame-1': 'climb-wall-frame-1.png',
        'climb-wall-frame-2': 'climb-wall-frame-2.png',
        'grab-ceiling': 'grab-ceiling.png',
        'climb-ceiling-frame-1': 'climb-ceiling-frame-1.png',
        'climb-ceiling-frame-2': 'climb-ceiling-frame-2.png',
        'sit-edge-legs-up': 'sit-edge-legs-up.png',
        'sit-edge-legs-down': 'sit-edge-legs-down.png',
        'sit-edge-dangle-frame-1': 'sit-edge-dangle-frame-1.png',
        'sit-edge-dangle-frame-2': 'sit-edge-dangle-frame-2.png',
        'spin-head-frame-1': 'spin-head-frame-1.png',
        'spin-head-frame-2': 'spin-head-frame-2.png',
        'spin-head-frame-3': 'spin-head-frame-3.png',
        'spin-head-frame-4': 'spin-head-frame-4.png',
        'spin-head-frame-5': 'spin-head-frame-5.png',
        'spin-head-frame-6': 'spin-head-frame-6.png'
    };

    const ANIMATIONS = {
        idle: [
            { sprite: 'stand-neutral', duration: 1 }
        ],
        walking: [
            { sprite: 'stand-neutral', duration: 6 },
            { sprite: 'walk-step-left', duration: 6 },
            { sprite: 'stand-neutral', duration: 6 },
            { sprite: 'walk-step-right', duration: 6 }
        ],
        crawling: [
            { sprite: 'crawl-crouch', duration: 8 },
            { sprite: 'sprawl-lying', duration: 8 }
        ],
        falling: [
            { sprite: 'fall', duration: 1 }
        ],
        jumping: [
            { sprite: 'jump', duration: 1 }
        ],
        landing: [
            { sprite: 'bounce-squish', duration: 4 },
            { sprite: 'bounce-recover', duration: 4 }
        ],
        sitting: [
            { sprite: 'sit', duration: 1 }
        ],
        sittingLookUp: [
            { sprite: 'sit-look-up', duration: 1 }
        ],
        sprawled: [
            { sprite: 'sprawl-lying', duration: 1 }
        ],
        climbingWall: [
            { sprite: 'grab-wall', duration: 16 },
            { sprite: 'climb-wall-frame-1', duration: 4 },
            { sprite: 'grab-wall', duration: 4 },
            { sprite: 'climb-wall-frame-2', duration: 4 }
        ],
        climbingCeiling: [
            { sprite: 'grab-ceiling', duration: 16 },
            { sprite: 'climb-ceiling-frame-1', duration: 4 },
            { sprite: 'grab-ceiling', duration: 4 },
            { sprite: 'climb-ceiling-frame-2', duration: 4 }
        ],
        sittingEdge: [
            { sprite: 'sit-edge-legs-up', duration: 10 },
            { sprite: 'sit-edge-legs-down', duration: 20 },
            { sprite: 'sit-edge-dangle-frame-1', duration: 15 },
            { sprite: 'sit-edge-legs-down', duration: 20 },
            { sprite: 'sit-edge-dangle-frame-2', duration: 15 }
        ],
        headSpin: [
            { sprite: 'sit-look-up', duration: 5 },
            { sprite: 'spin-head-frame-1', duration: 5 },
            { sprite: 'spin-head-frame-4', duration: 5 },
            { sprite: 'spin-head-frame-2', duration: 5 },
            { sprite: 'spin-head-frame-5', duration: 5 },
            { sprite: 'spin-head-frame-3', duration: 5 },
            { sprite: 'spin-head-frame-6', duration: 5 },
            { sprite: 'sit', duration: 5 }
        ]
    };

    const STORAGE_KEYS = {
        disabledAll: 'disabledAll',
        disabledPages: 'disabledPages'
    };

    const PERSONALITY_PITCH = {
        cryptid: 1.0, cozy: 0.85, chaotic: 1.35,
        philosopher: 0.75, hype: 1.25, noir: 0.7
    };
    const PERSONALITY_TTS = {
        cryptid: { pitch: 0.9, rate: 1.0 },
        cozy: { pitch: 1.1, rate: 0.85 },
        chaotic: { pitch: 1.4, rate: 1.4 },
        philosopher: { pitch: 0.7, rate: 0.8 },
        hype: { pitch: 1.3, rate: 1.3 },
        noir: { pitch: 0.6, rate: 0.9 }
    };

    const TTS_VOICE_PROFILES = {
        random: [],
        warm: ['female', 'maria', 'maria', 'samantha', 'sofia', 'sofia', 'lucia', 'lucía'],
        bright: ['google', 'zira', 'susan', 'catherine', 'linda'],
        deep: ['male', 'daniel', 'alex', 'jorge', 'diego', 'miguel'],
        calm: ['serena', 'paulina', 'audrey', 'amelie'],
        energetic: ['fred', 'mark', 'david', 'juan']
    };

    function getVoicesAsync() {
        return new Promise((resolve) => {
            const synth = window.speechSynthesis;
            if (!synth) return resolve([]);
            let voices = synth.getVoices();
            if (voices && voices.length) return resolve(voices);
            const handler = () => {
                voices = synth.getVoices();
                resolve(voices || []);
                synth.removeEventListener?.('voiceschanged', handler);
            };
            synth.addEventListener?.('voiceschanged', handler);
            setTimeout(() => resolve(synth.getVoices() || []), 600);
        });
    }

    function pickVoiceByProfile(profile, voices, langPrefix) {
        const filtered = voices.filter(v => (v.lang || '').toLowerCase().startsWith(langPrefix));
        const pool = filtered.length ? filtered : voices;
        if (!pool.length) return null;
        if (profile === 'random') {
            return pool[Math.floor(Math.random() * pool.length)];
        }
        const keywords = TTS_VOICE_PROFILES[profile] || [];
        if (!keywords.length) return pool[0];
        const found = pool.find(v => {
            const name = (v.name || '').toLowerCase();
            return keywords.some(k => name.includes(k));
        });
        return found || pool[0];
    }

    function isSpanishLocale() {
        const locale = (navigator.language || '').toLowerCase();
        return locale.startsWith('es');
    }

    let lastCursorY = null;
    window.addEventListener('mousemove', (e) => {
        lastCursorY = e.clientY;
    });

    function getNoApiKeyMessage() {
        return isSpanishLocale()
            ? 'Shimeji quiere estar vivo. Para eso necesita tu API key. Recomendado: OpenRouter (tiene version gratuita). Consíguela en OpenRouter o OpenAI.'
            : 'Shimeji wants to be alive. It needs your API key. Recommended: OpenRouter (has a free tier). OpenAI as a second option.';
    }

    function getNoCreditsMessage() {
        return isSpanishLocale()
            ? 'No puedo hablar sin créditos. Necesito que cargues créditos en tu cuenta para seguir vivo.'
            : 'I cannot speak without credits. Please add credits to your account so I can stay alive.';
    }

    function getNoResponseMessage() {
        return isSpanishLocale()
            ? 'No pude recibir respuesta. Puede ser falta de créditos o conexión. Si puedes, revisa tu saldo.'
            : 'I could not get a response. It may be a lack of credits or a connection issue. Please check your balance.';
    }

    function getDecorativeMessage() {
        return isSpanishLocale()
            ? 'Estoy en modo decorativo. Puedo moverme, pero no hablo ni ejecuto acciones.'
            : 'I am in decorative mode. I can move, but I do not talk or run actions.';
    }

    function getLockedMessage() {
        return isSpanishLocale()
            ? 'Las claves estan protegidas. Abre el popup y desbloquea la clave maestra.'
            : 'Keys are protected. Open the popup and unlock the master key.';
    }

    function normalizeMode(modeValue) {
        if (modeValue === 'disabled') return 'off';
        if (modeValue === 'off') return 'off';
        if (modeValue === 'agent') return 'agent';
        if (modeValue === 'decorative') return 'decorative';
        return 'standard';
    }

    function injectFontIfNeeded() {
        if (document.getElementById('shimeji-nunito-font')) return;
        const link = document.createElement('link');
        link.id = 'shimeji-nunito-font';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap';
        document.head.appendChild(link);
    }

    function normalizePageUrl(url) {
        try {
            const parsed = new URL(url);
            parsed.hash = '';
            return parsed.toString();
        } catch (error) {
            return url;
        }
    }

    function isDisabledForCurrentPage(disabledAll, disabledPages) {
        if (disabledAll) return true;
        const pageKey = normalizePageUrl(window.location.href);
        const pageList = Array.isArray(disabledPages) ? disabledPages : [];
        return pageList.includes(pageKey);
    }

    const fontSizeMap = { small: '11px', medium: '13px', large: '15px' };
    const widthMap = { small: '220px', medium: '280px', large: '360px' };

    let sharedAudioCtx = null;
    function getAudioContext() {
        if (!sharedAudioCtx) {
            sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const resume = () => {
                if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
                    sharedAudioCtx.resume().catch(() => {});
                }
            };
            ['click', 'keydown', 'touchstart'].forEach(evt => {
                document.addEventListener(evt, resume, { once: true });
            });
        }
        if (sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume().catch(() => {});
        }
        return sharedAudioCtx;
    }

    const audioBufferCache = {};
    async function loadAudioBuffer(url) {
        if (audioBufferCache[url]) return audioBufferCache[url];
        try {
            const resp = await fetch(url);
            if (!resp.ok) return null;
            const arrayBuf = await resp.arrayBuffer();
            const ctx = getAudioContext();
            const decoded = await ctx.decodeAudioData(arrayBuf);
            audioBufferCache[url] = decoded;
            return decoded;
        } catch (e) {
            return null;
        }
    }

    const CHARACTER_KEYS = ['shimeji', 'bunny', 'kitten', 'ghost', 'blob', 'neon', 'glitch', 'panda', 'star'];
    const PERSONALITY_KEYS = ['cryptid', 'cozy', 'chaotic', 'philosopher', 'hype', 'noir'];
    const MODEL_KEYS = [
        'google/gemini-2.0-flash-001', 'moonshotai/kimi-k2.5', 'anthropic/claude-sonnet-4',
        'meta-llama/llama-4-maverick', 'deepseek/deepseek-chat-v3-0324', 'mistralai/mistral-large-2411'
    ];

    function getDefaultShimeji(index) {
        const randomChar = CHARACTER_KEYS[Math.floor(Math.random() * CHARACTER_KEYS.length)];
        const randomPersonality = PERSONALITY_KEYS[Math.floor(Math.random() * PERSONALITY_KEYS.length)];
        const randomModel = MODEL_KEYS[Math.floor(Math.random() * MODEL_KEYS.length)];
        return {
            id: `shimeji-${index + 1}`,
            character: randomChar,
            size: 'medium',
            mode: 'standard',
            standardProvider: 'openrouter',
            openrouterApiKey: '',
            openrouterModel: randomModel,
            ollamaUrl: 'http://127.0.0.1:11434',
            ollamaModel: 'llama3.1',
            openclawGatewayUrl: 'ws://127.0.0.1:18789',
            openclawGatewayToken: '',
            personality: randomPersonality,
            enabled: true,
            chatThemeColor: '#2a1f4e',
            chatBgColor: '#ffffff',
            chatFontSize: 'medium',
            chatWidth: 'medium',
            chatBubbleStyle: 'glass',
            ttsEnabled: false
        };
    }

    function migrateLegacy(data) {
        if (Array.isArray(data.shimejis) && data.shimejis.length > 0) {
            return data.shimejis;
        }

        return [{
            id: 'shimeji-1',
            character: 'shimeji',
            size: 'medium',
            mode: data.chatMode || 'standard',
            openrouterApiKey: data.aiApiKey || '',
            openrouterModel: data.aiModel || 'google/gemini-2.0-flash-001',
            openclawGatewayUrl: data.openclawGatewayUrl || 'ws://127.0.0.1:18789',
            openclawGatewayToken: data.openclawGatewayToken || '',
            personality: data.aiPersonality || 'cryptid',
            enabled: true
        }];
    }

    function loadShimejiConfigs(callback) {
        chrome.storage.local.get([
            'shimejis',
            'aiModel',
            'aiApiKey',
            'aiPersonality',
            'chatMode',
            'openclawGatewayUrl',
            'openclawGatewayToken'
        ], (data) => {
            let list = migrateLegacy(data);
            if (!Array.isArray(list) || list.length === 0) {
                list = [getDefaultShimeji(0)];
            }
            list = list.map((item) => ({
                ...item,
                mode: normalizeMode(item.mode),
                soundEnabled: item.soundEnabled !== false,
                soundVolume: typeof item.soundVolume === 'number' ? item.soundVolume : 0.7,
                standardProvider: item.standardProvider || 'openrouter',
                ollamaUrl: item.ollamaUrl || 'http://127.0.0.1:11434',
                ollamaModel: item.ollamaModel || 'llama3.1',
                ttsEnabled: !!item.ttsEnabled,
                ttsVoiceProfile: item.ttsVoiceProfile || 'random',
                ttsVoiceId: item.ttsVoiceId || ''
            }));
            list = list.slice(0, MAX_SHIMEJIS);
            chrome.storage.local.set({ shimejis: list });
            callback(list);
        });
    }

    function createShimejiRuntime(config, visibilityState, options = {}) {
        const shimejiId = config.id;
        const elementSuffix = shimejiId.replace(/[^a-zA-Z0-9_-]/g, '');
        const mascotId = `shimeji-mascot-${elementSuffix}`;
        const chatBubbleId = `shimeji-chat-bubble-${elementSuffix}`;
        const thinkingBubbleId = `shimeji-thinking-bubble-${elementSuffix}`;
        const alertBubbleId = `shimeji-alert-bubble-${elementSuffix}`;
        const conversationKey = `conversationHistory.${elementSuffix}`;

        let currentCharacter = config.character || 'shimeji';
        let CHARACTER_BASE = chrome.runtime.getURL('characters/' + currentCharacter + '/');
        let currentSize = config.size || 'medium';
        let isDisabled = false;
        let gameLoopTimer = null;
        let spritesLoadedPromise = null;
        const spriteImages = {};
        let spritesLoaded = false;
        let startDelayTimer = null;
        const startDelayMs = options.startDelayMs || 0;

        let mascotElement;
        let chatBubbleEl = null;
        let thinkingBubbleEl = null;
        let alertBubbleEl = null;
        let inlineThinkingEl = null;
        let chatMessagesEl = null;
        let chatInputEl = null;
        let chatMetaEl = null;
        let conversationHistory = [];
        let isChatOpen = false;
        let isThinking = false;
        let hasUnreadMessage = false;
        let soundBuffers = { success: null, error: null };
        let soundBuffersLoaded = false;

        async function loadSoundBuffers() {
            soundBuffersLoaded = false;
            const kinds = ['success', 'error'];
            for (const kind of kinds) {
                const charUrl = chrome.runtime.getURL(`characters/${currentCharacter}/${kind}.wav`);
                const personalityUrl = chrome.runtime.getURL(`assets/sounds/${config.personality || 'cryptid'}-${kind}.wav`);
                const defaultUrl = chrome.runtime.getURL(`assets/shimeji-${kind}.wav`);

                const buf = await loadAudioBuffer(charUrl)
                    || await loadAudioBuffer(personalityUrl)
                    || await loadAudioBuffer(defaultUrl);
                soundBuffers[kind] = buf;
            }
            soundBuffersLoaded = true;
        }

        function invalidateSoundBuffers() {
            soundBuffers = { success: null, error: null };
            soundBuffersLoaded = false;
        }

        function playSound(kind) {
            if (config.soundEnabled === false) return;
            const buffer = soundBuffers[kind];
            if (!buffer) return;
            try {
                const ctx = getAudioContext();
                if (ctx.state === 'suspended') return;
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.playbackRate.value = PERSONALITY_PITCH[config.personality] || 1.0;
                const gain = ctx.createGain();
                gain.gain.value = Math.max(0, Math.min(1, typeof config.soundVolume === 'number' ? config.soundVolume : 0.7));
                source.connect(gain);
                gain.connect(ctx.destination);
                source.start(0);
            } catch (e) {}
        }

        async function persistVoiceId(voiceName) {
            if (!voiceName || voiceName === config.ttsVoiceId) return;
            config.ttsVoiceId = voiceName;
            chrome.storage.local.get(['shimejis'], (data) => {
                const list = Array.isArray(data.shimejis) ? data.shimejis : [];
                const updated = list.map((s) => s.id === shimejiId ? { ...s, ttsVoiceId: voiceName } : s);
                chrome.storage.local.set({ shimejis: updated });
            });
        }

        async function ensureVoiceForTts() {
            const voices = await getVoicesAsync();
            if (!voices.length) return null;
            const langPrefix = isSpanishLocale() ? 'es' : 'en';
            if (config.ttsVoiceId) {
                const match = voices.find(v => v.name === config.ttsVoiceId);
                if (match) return match;
            }
            const profile = config.ttsVoiceProfile || 'random';
            const picked = pickVoiceByProfile(profile, voices, langPrefix);
            if (picked) persistVoiceId(picked.name);
            return picked;
        }

        async function speakText(text) {
            if (!config.ttsEnabled) return;
            if (!window.speechSynthesis) return;
            try {
                const utterance = new SpeechSynthesisUtterance(text);
                const ttsSettings = PERSONALITY_TTS[config.personality] || { pitch: 1.0, rate: 1.0 };
                utterance.pitch = ttsSettings.pitch;
                utterance.rate = ttsSettings.rate;
                utterance.volume = Math.max(0, Math.min(1, typeof config.soundVolume === 'number' ? config.soundVolume : 0.7));
                utterance.lang = isSpanishLocale() ? 'es' : 'en';
                const voice = await ensureVoiceForTts();
                if (voice) utterance.voice = voice;
                window.speechSynthesis.speak(utterance);
            } catch (e) {}
        }

        function cancelSpeech() {
            try {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
            } catch (e) {}
        }

        const mascot = {
            x: window.innerWidth / 2,
            y: 0,
            velocityX: 0,
            velocityY: 0,
            state: State.FALLING,
            facingRight: false,
            direction: 0,
            currentAnimation: 'falling',
            animationFrame: 0,
            animationTick: 0,
            isDragging: false,
            dragOffsetX: 0,
            dragOffsetY: 0,
            dragPending: false,
            dragStartX: 0,
            dragStartY: 0,
            prevDragX: 0,
            smoothedVelocityX: 0,
            dragTick: 0,
            isResisting: false,
            resistAnimTick: 0,
            stateTimer: 0,
            climbSide: 0,
            climbSpeed: 1.5
        };

        function ensureNoApiKeyOnboardingMessage() {
            if (!chatMessagesEl) return;

            const existing = chatMessagesEl.querySelector('.shimeji-no-api-key-msg');
            if (existing) existing.remove();

            const msgEl = document.createElement('div');
            msgEl.className = 'shimeji-chat-msg ai shimeji-no-api-key-msg';

            const isEs = isSpanishLocale();
            const prefix = isEs
                ? 'Shimeji quiere estar vivo. Para eso necesita tu API key. Recomendado: OpenRouter (tiene version gratuita). Consíguela en '
                : 'Shimeji wants to be alive. It needs your API key. Recommended: OpenRouter (has a free tier). Get it from ';
            const middle = isEs ? ' o ' : ' or ';
            const suffix = isEs
                ? '. Luego haz clic en el icono de la extension y configuralo ahi pegando tu API key.'
                : '. Then click the extension icon and configure it there by pasting your API key.';

            msgEl.appendChild(document.createTextNode(prefix));

            const openRouterLink = document.createElement('a');
            openRouterLink.href = 'https://openrouter.ai/settings/keys';
            openRouterLink.target = '_blank';
            openRouterLink.rel = 'noopener noreferrer';
            openRouterLink.textContent = 'OpenRouter';
            msgEl.appendChild(openRouterLink);

            msgEl.appendChild(document.createTextNode(middle));

            const openAiLink = document.createElement('a');
            openAiLink.href = 'https://platform.openai.com/api-keys';
            openAiLink.target = '_blank';
            openAiLink.rel = 'noopener noreferrer';
            openAiLink.textContent = 'OpenAI';
            msgEl.appendChild(openAiLink);

            msgEl.appendChild(document.createTextNode(suffix));

            chatMessagesEl.prepend(msgEl);
        }

        function preloadSprites() {
            if (spritesLoadedPromise) return spritesLoadedPromise;

            const promises = Object.entries(SPRITES).map(([key, filename]) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        spriteImages[key] = img;
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Failed to load sprite: ${filename}`);
                        resolve();
                    };
                    img.src = CHARACTER_BASE + filename;
                });
            });

            spritesLoadedPromise = Promise.all(promises).then(() => {
                spritesLoaded = true;
            });

            return spritesLoadedPromise;
        }

        function createMascot() {
            const existingMascot = document.getElementById(mascotId);
            if (existingMascot) {
                mascotElement = existingMascot;
                updateMascotStyle();
                return;
            }

            mascotElement = document.createElement('div');
            mascotElement.id = mascotId;
            mascotElement.className = 'shimeji-mascot';
            document.body.appendChild(mascotElement);
            updateMascotStyle();
            setupDragListeners();
        }

        function updateMascotStyle() {
            if (!mascotElement) return;

            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;

            mascotElement.style.position = 'fixed';
            mascotElement.style.width = `${size}px`;
            mascotElement.style.height = `${size}px`;
            mascotElement.style.zIndex = '9999';
            mascotElement.style.pointerEvents = 'auto';
            mascotElement.style.cursor = 'grab';
            mascotElement.style.imageRendering = 'pixelated';
            mascotElement.style.backgroundSize = 'contain';
            mascotElement.style.backgroundRepeat = 'no-repeat';
            mascotElement.style.backgroundPosition = 'center';
        }

        function setSprite(spriteKey) {
            if (!mascotElement) return;
            const key = (SPRITES[spriteKey] && spriteImages[spriteKey]) ? spriteKey : 'stand-neutral';
            const spritePath = CHARACTER_BASE + SPRITES[key];
            mascotElement.style.backgroundImage = `url('${spritePath}')`;
        }

        function updateSpriteDisplay() {
            if (!mascotElement || !spritesLoaded) return;

            const animation = ANIMATIONS[mascot.currentAnimation];
            if (!animation || animation.length === 0) return;

            const frame = animation[mascot.animationFrame % animation.length];
            setSprite(frame.sprite);

            if (mascot.state === State.CLIMBING_WALL) {
                if (mascot.climbSide === -1) {
                    mascotElement.style.transform = 'rotate(90deg)';
                } else {
                    mascotElement.style.transform = 'rotate(-90deg) scaleX(-1)';
                }
            } else if (mascot.state === State.CLIMBING_CEILING || mascot.state === State.SITTING_EDGE) {
                const flipX = mascot.facingRight ? ' scaleX(-1)' : '';
                mascotElement.style.transform = 'scaleY(-1)' + flipX;
            } else {
                mascotElement.style.transform = mascot.facingRight ? 'scaleX(-1)' : 'scaleX(1)';
            }
        }

        const DRAG_THRESHOLD = 5;

        function setupDragListeners() {
            mascotElement.addEventListener('mousedown', onMouseDown);
            mascotElement.addEventListener('touchstart', onTouchStart, { passive: false });

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        }

        function onMouseDown(e) {
            e.preventDefault();
            mascot.dragPending = true;
            mascot.dragStartX = e.clientX;
            mascot.dragStartY = e.clientY;

            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;
            mascot.dragOffsetX = e.clientX - mascot.x;
            mascot.dragOffsetY = e.clientY - (mascot.y - size);
        }

        function promoteToDrag() {
            mascot.dragPending = false;
            mascot.isDragging = true;
            mascot.state = State.DRAGGED;

            if (isChatOpen) closeChatBubble();

            mascot.prevDragX = mascot.x;
            mascot.smoothedVelocityX = 0;
            mascot.dragTick = 0;
            mascot.isResisting = false;
            mascot.resistAnimTick = 0;

            mascotElement.style.cursor = 'grabbing';
        }

        function onMouseMove(e) {
            if (mascot.dragPending) {
                const dx = e.clientX - mascot.dragStartX;
                const dy = e.clientY - mascot.dragStartY;
                if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
                    promoteToDrag();
                }
            }

            if (!mascot.isDragging) return;

            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;
            mascot.x = e.clientX - mascot.dragOffsetX;
            mascot.y = e.clientY - mascot.dragOffsetY + size;
            updatePosition();
        }

        function onMouseUp() {
            if (mascot.dragPending) {
                mascot.dragPending = false;
                handleMascotClick();
                return;
            }

            if (!mascot.isDragging) return;
            endDrag();
        }

        function onTouchStart(e) {
            e.preventDefault();
            const touch = e.touches[0];
            mascot.dragPending = true;
            mascot.dragStartX = touch.clientX;
            mascot.dragStartY = touch.clientY;

            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;
            mascot.dragOffsetX = touch.clientX - mascot.x;
            mascot.dragOffsetY = touch.clientY - (mascot.y - size);
        }

        function onTouchMove(e) {
            if (!mascot.dragPending && !mascot.isDragging) return;
            e.preventDefault();
            const touch = e.touches[0];

            if (mascot.dragPending) {
                const dx = touch.clientX - mascot.dragStartX;
                const dy = touch.clientY - mascot.dragStartY;
                if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
                    promoteToDrag();
                }
            }

            if (!mascot.isDragging) return;

            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;
            mascot.x = touch.clientX - mascot.dragOffsetX;
            mascot.y = touch.clientY - mascot.dragOffsetY + size;
            updatePosition();
        }

        function onTouchEnd() {
            if (mascot.dragPending) {
                mascot.dragPending = false;
                handleMascotClick();
                return;
            }

            if (!mascot.isDragging) return;
            endDrag();
        }

        function endDrag() {
            mascot.isDragging = false;
            mascot.dragPending = false;
            mascotElement.style.cursor = 'grab';

            mascot.velocityX = mascot.smoothedVelocityX * 0.2;
            mascot.velocityY = 0;
            mascot.state = State.FALLING;
            mascot.currentAnimation = 'falling';
            mascot.animationFrame = 0;
            mascot.animationTick = 0;
        }

        function updateDragAnimation() {
            if (!mascotElement) return;

            mascot.dragTick++;
            const dragDelta = mascot.x - mascot.prevDragX;
            mascot.prevDragX = mascot.x;

            const alpha = 0.2;
            mascot.smoothedVelocityX = mascot.smoothedVelocityX * (1 - alpha) + dragDelta * alpha * 5;

            if (mascot.dragTick % 60 === 0) {
                mascot.isResisting = true;
                mascot.resistAnimTick = 0;
            }

            if (mascot.isResisting) {
                mascot.resistAnimTick++;
                const resistCycle = Math.floor(mascot.resistAnimTick / 5) % 2;
                if (resistCycle === 0) {
                    setSprite('resist-frame-1');
                } else {
                    setSprite('resist-frame-2');
                }

                if (mascot.resistAnimTick >= 20) {
                    mascot.isResisting = false;
                }

                mascotElement.style.transform = 'scaleX(1)';
                return;
            }

            const sv = mascot.smoothedVelocityX;
            if (sv > 8) {
                setSprite('dragged-tilt-left-heavy');
            } else if (sv > 2) {
                setSprite('dragged-tilt-left');
            } else if (sv < -8) {
                setSprite('dragged-tilt-right-heavy');
            } else if (sv < -2) {
                setSprite('dragged-tilt-right');
            } else {
                setSprite('stand-neutral');
            }

            mascotElement.style.transform = 'scaleX(1)';
        }

        function createChatBubble() {
            if (chatBubbleEl) return;
            injectFontIfNeeded();

            chatBubbleEl = document.createElement('div');
            chatBubbleEl.id = chatBubbleId;
            chatBubbleEl.className = 'shimeji-chat-bubble';

            const header = document.createElement('div');
            header.className = 'shimeji-chat-header';
            const titleWrap = document.createElement('div');
            titleWrap.className = 'shimeji-chat-title-wrap';
            const title = document.createElement('span');
            title.textContent = isSpanishLocale() ? 'Chat' : 'Chat';
            chatMetaEl = document.createElement('span');
            chatMetaEl.className = 'shimeji-chat-meta';
            titleWrap.appendChild(title);
            titleWrap.appendChild(chatMetaEl);
            const closeBtn = document.createElement('button');
            closeBtn.className = 'shimeji-chat-close';
            closeBtn.textContent = '\u00D7';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeChatBubble();
            });
            header.appendChild(titleWrap);
            header.appendChild(closeBtn);

            chatMessagesEl = document.createElement('div');
            chatMessagesEl.className = 'shimeji-chat-messages';

            const inputArea = document.createElement('div');
            inputArea.className = 'shimeji-chat-input-area';
            chatInputEl = document.createElement('input');
            chatInputEl.className = 'shimeji-chat-input';
            chatInputEl.type = 'text';
            chatInputEl.placeholder = isSpanishLocale() ? 'Di algo...' : 'Say something...';
            chatInputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') sendChatMessage();
            });
            chatInputEl.addEventListener('mousedown', (e) => e.stopPropagation());
            chatInputEl.addEventListener('touchstart', (e) => e.stopPropagation());

            const sendBtn = document.createElement('button');
            sendBtn.className = 'shimeji-chat-send';
            sendBtn.textContent = '\u25B6';
            sendBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sendChatMessage();
            });

            inputArea.appendChild(chatInputEl);
            inputArea.appendChild(sendBtn);

            chatBubbleEl.appendChild(header);
            chatBubbleEl.appendChild(chatMessagesEl);
            chatBubbleEl.appendChild(inputArea);

            chatBubbleEl.addEventListener('mousedown', (e) => e.stopPropagation());
            chatBubbleEl.addEventListener('touchstart', (e) => e.stopPropagation());

            applyChatStyle();

            document.body.appendChild(chatBubbleEl);

            document.addEventListener('mousedown', onClickOutsideChat);
        }

        function applyChatStyle() {
            if (!chatBubbleEl) return;
            const el = chatBubbleEl;
            el.style.setProperty('--chat-theme', config.chatThemeColor || '#2a1f4e');
            el.style.setProperty('--chat-bg', config.chatBgColor || '#ffffff');
            el.style.setProperty('--chat-font-size', fontSizeMap[config.chatFontSize] || '13px');
            el.style.setProperty('--chat-width', widthMap[config.chatWidth] || '280px');
            el.classList.remove('chat-style-glass', 'chat-style-solid', 'chat-style-dark');
            el.classList.add('chat-style-' + (config.chatBubbleStyle || 'glass'));
        }

        function createThinkingBubble() {
            if (thinkingBubbleEl) return;

            thinkingBubbleEl = document.createElement('div');
            thinkingBubbleEl.id = thinkingBubbleId;
            thinkingBubbleEl.className = 'shimeji-thinking-bubble';
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('div');
                dot.className = 'shimeji-thinking-dot';
                thinkingBubbleEl.appendChild(dot);
            }
            document.body.appendChild(thinkingBubbleEl);
        }

        function createAlertBubble() {
            if (alertBubbleEl) return;

            alertBubbleEl = document.createElement('div');
            alertBubbleEl.id = alertBubbleId;
            alertBubbleEl.className = 'shimeji-alert-bubble';
            alertBubbleEl.textContent = '!';
            document.body.appendChild(alertBubbleEl);
        }

        function createInlineThinking() {
            if (inlineThinkingEl) return;
            inlineThinkingEl = document.createElement('div');
            inlineThinkingEl.className = 'shimeji-inline-thinking';
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('div');
                dot.className = 'shimeji-thinking-dot';
                inlineThinkingEl.appendChild(dot);
            }
        }

        function onClickOutsideChat(e) {
            if (!isChatOpen) return;
            if (chatBubbleEl && chatBubbleEl.contains(e.target)) return;
            if (mascotElement && mascotElement.contains(e.target)) return;
            closeChatBubble();
        }

        function getMode() {
            return normalizeMode(config.mode);
        }

        function openChatBubble() {
            if (!chatBubbleEl) createChatBubble();
            isChatOpen = true;
            chatBubbleEl.classList.add('visible');
            updateBubblePosition();

            hasUnreadMessage = false;
            hideAlert();

            if (mascot.state === State.CLIMBING_WALL || mascot.state === State.CLIMBING_CEILING || mascot.state === State.SITTING_EDGE) {
                mascot.state = State.FALLING;
                mascot.currentAnimation = 'falling';
                mascot.velocityY = 0;
            } else if (mascot.state !== State.FALLING && mascot.state !== State.DRAGGED && mascot.state !== State.JUMPING) {
                mascot.state = State.SITTING;
                mascot.currentAnimation = 'sitting';
                mascot.direction = 0;
                mascot.animationFrame = 0;
                mascot.animationTick = 0;
                mascot.stateTimer = 0;
            }

            loadConversation(() => {
                renderConversationHistory();

                const mode = getMode();
                const provider = config.standardProvider || 'openrouter';
                const needsApiKey = mode === 'standard' && provider === 'openrouter' && !(config.openrouterApiKey || '').trim();
                const needsAgent = mode === 'agent' && !(config.openclawGatewayToken || '').trim();
                if (mode === 'off') {
                    appendMessage('ai', isSpanishLocale() ? 'Aun no estoy configurado. Usa el popup para darme vida.' : 'I am not configured yet. Use the popup to bring me to life.');
                } else if (mode === 'decorative') {
                    appendMessage('ai', getDecorativeMessage());
                } else if (needsApiKey || needsAgent) {
                    ensureNoApiKeyOnboardingMessage();
                } else {
                    const existing = chatMessagesEl ? chatMessagesEl.querySelector('.shimeji-no-api-key-msg') : null;
                    if (existing) existing.remove();
                }

                if (chatMetaEl) {
                    if (mode === 'agent') {
                        chatMetaEl.textContent = 'openclaw · agent';
                    } else if (mode === 'off') {
                        chatMetaEl.textContent = isSpanishLocale() ? 'sin configurar' : 'not configured';
                    } else if (mode === 'decorative') {
                        chatMetaEl.textContent = isSpanishLocale() ? 'decorativo' : 'decorative';
                    } else {
                        const provider = config.standardProvider || 'openrouter';
                        if (provider === 'ollama') {
                            const model = config.ollamaModel || 'llama3.1';
                            chatMetaEl.textContent = `ollama · ${model}`;
                        } else {
                            const model = config.openrouterModel || 'google/gemini-2.0-flash-001';
                            chatMetaEl.textContent = `openrouter · ${model}`;
                        }
                    }
                }

                setTimeout(() => {
                    if (chatMessagesEl) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
                    if (chatInputEl) chatInputEl.focus();
                }, 50);
            });
        }

        function closeChatBubble() {
            cancelSpeech();
            isChatOpen = false;
            if (chatBubbleEl) chatBubbleEl.classList.remove('visible');
            removeInlineThinking();

            if (mascot.state === State.SITTING || mascot.state === State.HEAD_SPIN || mascot.state === State.SPRAWLED) {
                mascot.state = State.IDLE;
                mascot.currentAnimation = 'idle';
                mascot.stateTimer = 0;
                mascot.animationFrame = 0;
            }
        }

        function showThinking() {
            isThinking = true;
            if (isChatOpen) {
                showInlineThinking();
            } else {
                if (!thinkingBubbleEl) createThinkingBubble();
                thinkingBubbleEl.classList.add('visible');
                updateBubblePosition();
            }
        }

        function hideThinking() {
            isThinking = false;
            if (thinkingBubbleEl) thinkingBubbleEl.classList.remove('visible');
            removeInlineThinking();
        }

        function showInlineThinking() {
            if (!chatMessagesEl) return;
            createInlineThinking();
            if (!inlineThinkingEl.parentNode) {
                chatMessagesEl.appendChild(inlineThinkingEl);
            }
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }

        function removeInlineThinking() {
            if (inlineThinkingEl && inlineThinkingEl.parentNode) {
                inlineThinkingEl.parentNode.removeChild(inlineThinkingEl);
            }
        }

        function showAlert() {
            if (!alertBubbleEl) createAlertBubble();
            hasUnreadMessage = true;
            alertBubbleEl.classList.add('visible');
            updateBubblePosition();
        }

        function hideAlert() {
            hasUnreadMessage = false;
            if (alertBubbleEl) alertBubbleEl.classList.remove('visible');
        }

        function updateBubblePosition() {
            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;
            const mascotTopY = mascot.y - size;
            const mascotCenterX = mascot.x + size / 2;

            if (chatBubbleEl && isChatOpen) {
                const widthVal = widthMap[config.chatWidth] || '280px';
                const bubbleWidth = parseInt(widthVal, 10);
                const bubbleHeight = chatBubbleEl.offsetHeight || 200;
                let left = mascotCenterX - bubbleWidth / 2;
                let top = mascotTopY - bubbleHeight - 12;

                left = Math.max(8, Math.min(left, window.innerWidth - bubbleWidth - 8));
                if (top < 8) top = mascot.y + 12;

                chatBubbleEl.style.left = `${left}px`;
                chatBubbleEl.style.top = `${top}px`;
            }

            if (thinkingBubbleEl && isThinking && !isChatOpen) {
                const thinkingWidth = thinkingBubbleEl.offsetWidth || 56;
                let left = mascotCenterX - thinkingWidth / 2;
                let top = mascotTopY - 36;

                left = Math.max(8, Math.min(left, window.innerWidth - thinkingWidth - 8));
                if (top < 8) top = 8;

                thinkingBubbleEl.style.left = `${left}px`;
                thinkingBubbleEl.style.top = `${top}px`;
            }

            if (alertBubbleEl && hasUnreadMessage && !isChatOpen) {
                const alertWidth = alertBubbleEl.offsetWidth || 28;
                let left = mascotCenterX - alertWidth / 2;
                let top = mascotTopY - 36;

                left = Math.max(8, Math.min(left, window.innerWidth - alertWidth - 8));
                if (top < 8) top = 8;

                alertBubbleEl.style.left = `${left}px`;
                alertBubbleEl.style.top = `${top}px`;
            }
        }

        function saveConversation() {
            chrome.storage.local.set({ [conversationKey]: conversationHistory });
        }

        function loadConversation(callback) {
            chrome.storage.local.get([conversationKey], (data) => {
                conversationHistory = Array.isArray(data[conversationKey]) ? data[conversationKey] : [];
                if (callback) callback();
            });
        }

        function renderConversationHistory() {
            if (!chatMessagesEl) return;
            chatMessagesEl.innerHTML = '';
            conversationHistory.forEach((msg) => {
                const msgEl = document.createElement('div');
                msgEl.className = `shimeji-chat-msg ${msg.role === 'user' ? 'user' : 'ai'}`;
                msgEl.textContent = msg.content;
                chatMessagesEl.appendChild(msgEl);
            });
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }

        function appendMessage(role, content) {
            if (!chatMessagesEl) return;
            const msgEl = document.createElement('div');
            msgEl.className = `shimeji-chat-msg ${role}`;
            msgEl.textContent = content;
            chatMessagesEl.appendChild(msgEl);
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }

        function appendErrorMessage(text) {
            if (!chatMessagesEl) return;
            const msgEl = document.createElement('div');
            msgEl.className = 'shimeji-chat-msg error';
            msgEl.textContent = text;
            chatMessagesEl.appendChild(msgEl);
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }

        function handleMascotClick() {
            if (isChatOpen) {
                closeChatBubble();
            } else {
                openChatBubble();
            }
        }

        function sendChatMessage() {
            if (!chatInputEl) return;
            const text = chatInputEl.value.trim();
            if (!text) return;

            const mode = getMode();
            if (mode === 'off') {
                chatInputEl.value = '';
                appendMessage('ai', isSpanishLocale() ? 'Aun no estoy configurado. Usa el popup para darme vida.' : 'I am not configured yet. Use the popup to bring me to life.');
                return;
            }
            if (mode === 'decorative') {
                chatInputEl.value = '';
                appendMessage('ai', getDecorativeMessage());
                return;
            }

            // Resume AudioContext on user gesture so Chrome autoplay policy allows later playback
            getAudioContext();
            cancelSpeech();

            chatInputEl.value = '';
            appendMessage('user', text);
            conversationHistory.push({ role: 'user', content: text });
            saveConversation();

            showThinking();

            chrome.runtime.sendMessage(
                { type: 'aiChat', messages: conversationHistory, shimejiId },
                (response) => {
                    hideThinking();
                    if (chrome.runtime.lastError) {
                        appendErrorMessage('Could not reach extension. Try reloading the page.');
                        return;
                    }
                    if (response && response.error) {
                        if (response.errorType === 'no_credits') {
                            appendMessage('ai', getNoCreditsMessage());
                            playSound('error');
                        } else if (response.errorType === 'locked') {
                            appendMessage('ai', getLockedMessage());
                            playSound('error');
                        } else if (response.errorType === 'decorative') {
                            appendMessage('ai', getDecorativeMessage());
                            playSound('error');
                        } else if (response.errorType === 'no_response') {
                            appendMessage('ai', getNoResponseMessage());
                            playSound('error');
                        } else {
                            appendErrorMessage(response.error);
                            playSound('error');
                        }
                        return;
                    }
                    if (response && response.content) {
                        conversationHistory.push({ role: 'assistant', content: response.content });
                        saveConversation();
                        appendMessage('ai', response.content);
                        playSound('success');
                        speakText(response.content);
                        if (!isChatOpen) {
                            showAlert();
                        }
                    }
                }
            );
        }

        function updateState() {
            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;
            const groundY = window.innerHeight;
            const leftBound = 0;
            const rightBound = window.innerWidth - size;

            if (mascot.isDragging) {
                updateDragAnimation();
                return;
            }

            if (isChatOpen && (mascot.state === State.SITTING || mascot.state === State.HEAD_SPIN || mascot.state === State.SPRAWLED)) {
                return;
            }

            switch (mascot.state) {
                case State.IDLE:
                    mascot.stateTimer++;
                    if (mascot.stateTimer > 50 && Math.random() < 0.02) {
                        const roll = Math.random();
                        if (roll < 0.50) {
                            mascot.state = State.WALKING;
                            mascot.currentAnimation = 'walking';
                            mascot.direction = Math.random() > 0.5 ? 1 : -1;
                            mascot.facingRight = mascot.direction > 0;
                        } else if (roll < 0.70) {
                            mascot.state = State.SITTING;
                            mascot.currentAnimation = 'sitting';
                        } else if (roll < 0.78) {
                            mascot.state = State.CRAWLING;
                            mascot.currentAnimation = 'crawling';
                            mascot.direction = Math.random() > 0.5 ? 1 : -1;
                            mascot.facingRight = mascot.direction > 0;
                        } else if (roll < 0.80) {
                            mascot.state = State.JUMPING;
                            mascot.currentAnimation = 'jumping';
                            mascot.velocityY = -14;
                            mascot.velocityX = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 2);
                            mascot.facingRight = mascot.velocityX > 0;
                        } else if (roll < 0.90) {
                            mascot.state = State.HEAD_SPIN;
                            mascot.currentAnimation = 'headSpin';
                        } else {
                            mascot.state = State.SPRAWLED;
                            mascot.currentAnimation = 'sprawled';
                        }
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    break;

                case State.CRAWLING:
                    mascot.stateTimer++;
                    mascot.x += (PHYSICS.walkSpeed * 0.6) * mascot.direction;
                    mascot.y = groundY;
                    if (mascot.x <= leftBound) { mascot.x = leftBound; mascot.direction = 1; mascot.facingRight = true; }
                    if (mascot.x >= rightBound) { mascot.x = rightBound; mascot.direction = -1; mascot.facingRight = false; }
                    if (mascot.stateTimer > 60 && Math.random() < 0.02) {
                        mascot.state = State.IDLE;
                        mascot.currentAnimation = 'idle';
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    break;

                case State.WALKING:
                    mascot.stateTimer++;
                    mascot.x += PHYSICS.walkSpeed * mascot.direction;
                    if (mascot.x <= leftBound) {
                        mascot.x = leftBound;
                        if (Math.random() < 0.4) {
                            mascot.state = State.CLIMBING_WALL;
                            mascot.currentAnimation = 'climbingWall';
                            mascot.climbSide = -1;
                            mascot.facingRight = false;
                            mascot.stateTimer = 0;
                            mascot.animationFrame = 0;
                            mascot.animationTick = 0;
                            break;
                        }
                        mascot.direction = 1;
                        mascot.facingRight = true;
                    } else if (mascot.x >= rightBound) {
                        mascot.x = rightBound;
                        if (Math.random() < 0.4) {
                            mascot.state = State.CLIMBING_WALL;
                            mascot.currentAnimation = 'climbingWall';
                            mascot.climbSide = 1;
                            mascot.facingRight = true;
                            mascot.stateTimer = 0;
                            mascot.animationFrame = 0;
                            mascot.animationTick = 0;
                            break;
                        }
                        mascot.direction = -1;
                        mascot.facingRight = false;
                    }
                    if (mascot.stateTimer > 50 && Math.random() < 0.01) {
                        mascot.state = State.IDLE;
                        mascot.currentAnimation = 'idle';
                        mascot.direction = 0;
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    mascot.y = groundY;
                    break;

                case State.JUMPING:
                    mascot.velocityY += PHYSICS.gravity;
                    mascot.velocityY = Math.min(mascot.velocityY, PHYSICS.fallTerminalVelocity);
                    mascot.y += mascot.velocityY;
                    mascot.x += mascot.velocityX;
                    if (mascot.velocityY > 0 && mascot.currentAnimation !== 'falling') {
                        mascot.currentAnimation = 'falling';
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    if (mascot.x <= leftBound) { mascot.x = leftBound; mascot.velocityX = Math.abs(mascot.velocityX); }
                    if (mascot.x >= rightBound) { mascot.x = rightBound; mascot.velocityX = -Math.abs(mascot.velocityX); }
                    if (mascot.y >= groundY) {
                        mascot.y = groundY;
                        mascot.velocityY = 0;
                        mascot.velocityX = 0;
                        mascot.state = State.LANDING;
                        mascot.currentAnimation = 'landing';
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                        mascot.stateTimer = 0;
                    }
                    break;

                case State.FALLING:
                    mascot.velocityY += PHYSICS.gravity;
                    mascot.velocityY = Math.min(mascot.velocityY, PHYSICS.fallTerminalVelocity);
                    mascot.y += mascot.velocityY;
                    if (mascot.y >= groundY) {
                        mascot.y = groundY;
                        mascot.velocityY = 0;
                        mascot.state = State.LANDING;
                        mascot.currentAnimation = 'landing';
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                        mascot.stateTimer = 0;
                    }
                    break;

                case State.LANDING: {
                    mascot.stateTimer++;
                    const landingAnim = ANIMATIONS.landing;
                    const totalLandingDuration = landingAnim.reduce((sum, f) => sum + f.duration, 0);
                    if (mascot.stateTimer >= totalLandingDuration) {
                        mascot.state = State.IDLE;
                        mascot.currentAnimation = 'idle';
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                        mascot.stateTimer = 0;
                    }
                    break;
                }

                case State.SITTING:
                    mascot.stateTimer++;
                    if (lastCursorY !== null && lastCursorY < window.innerHeight / 2) {
                        mascot.currentAnimation = 'sittingLookUp';
                    } else {
                        mascot.currentAnimation = 'sitting';
                    }
                    if (mascot.stateTimer > 100 && Math.random() < 0.01) {
                        mascot.state = State.HEAD_SPIN;
                        mascot.currentAnimation = 'headSpin';
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                        break;
                    }
                    if (mascot.stateTimer > 100 && Math.random() < 0.02) {
                        mascot.state = State.IDLE;
                        mascot.currentAnimation = 'idle';
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    break;

                case State.SPRAWLED:
                    mascot.stateTimer++;
                    if (mascot.stateTimer > 150 && Math.random() < 0.02) {
                        mascot.state = State.IDLE;
                        mascot.currentAnimation = 'idle';
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    break;

                case State.HEAD_SPIN: {
                    mascot.stateTimer++;
                    const hsAnim = ANIMATIONS.headSpin;
                    const hsDuration = hsAnim.reduce((sum, f) => sum + f.duration, 0);
                    if (mascot.stateTimer >= hsDuration) {
                        mascot.state = State.SITTING;
                        mascot.currentAnimation = 'sitting';
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    break;
                }

                case State.CLIMBING_WALL: {
                    mascot.stateTimer++;
                    mascot.y -= mascot.climbSpeed;
                    if (mascot.climbSide === -1) {
                        mascot.x = leftBound;
                    } else {
                        mascot.x = rightBound;
                    }
                    if (mascot.y <= size) {
                        mascot.y = size;
                        mascot.state = State.CLIMBING_CEILING;
                        mascot.currentAnimation = 'climbingCeiling';
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                        break;
                    }
                    if (mascot.stateTimer > 60 && Math.random() < 0.01) {
                        mascot.state = State.FALLING;
                        mascot.currentAnimation = 'falling';
                        mascot.velocityY = 0;
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    break;
                }

                case State.CLIMBING_CEILING: {
                    mascot.stateTimer++;
                    mascot.y = size;
                    if (mascot.stateTimer === 1) {
                        mascot.direction = Math.random() > 0.5 ? 1 : -1;
                    }
                    mascot.x += mascot.climbSpeed * mascot.direction;
                    mascot.facingRight = mascot.direction > 0;
                    if (mascot.x <= leftBound) { mascot.x = leftBound; mascot.direction = 1; mascot.facingRight = true; }
                    if (mascot.x >= rightBound) { mascot.x = rightBound; mascot.direction = -1; mascot.facingRight = false; }
                    if (mascot.stateTimer > 75 && Math.random() < 0.01) {
                        mascot.state = State.SITTING_EDGE;
                        mascot.currentAnimation = 'sittingEdge';
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    } else if (mascot.stateTimer > 75 && Math.random() < 0.015) {
                        mascot.state = State.FALLING;
                        mascot.currentAnimation = 'falling';
                        mascot.velocityY = 0;
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    break;
                }

                case State.SITTING_EDGE: {
                    mascot.stateTimer++;
                    mascot.y = size;
                    if (mascot.stateTimer > 200 && Math.random() < 0.02) {
                        mascot.state = State.FALLING;
                        mascot.currentAnimation = 'falling';
                        mascot.velocityY = 0;
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    break;
                }

                case State.DRAGGED:
                    break;
            }

            mascot.x = Math.max(leftBound, Math.min(mascot.x, rightBound));
        }

        function updateAnimation() {
            if (mascot.isDragging) return;

            const animation = ANIMATIONS[mascot.currentAnimation];
            if (!animation || animation.length === 0) return;

            mascot.animationTick++;

            let tickCount = 0;
            for (let i = 0; i < animation.length; i++) {
                tickCount += animation[i].duration;
                if (mascot.animationTick <= tickCount) {
                    mascot.animationFrame = i;
                    break;
                }
            }

            const totalDuration = animation.reduce((sum, f) => sum + f.duration, 0);
            if (mascot.animationTick >= totalDuration) {
                mascot.animationTick = 0;
                mascot.animationFrame = 0;
            }

            updateSpriteDisplay();
        }

        function updatePosition() {
            if (!mascotElement) return;

            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;

            const drawX = mascot.x;
            const drawY = mascot.y - size;

            mascotElement.style.left = `${drawX}px`;
            mascotElement.style.top = `${drawY}px`;

            updateBubblePosition();
        }

        function gameLoop() {
            updateState();
            updateAnimation();
            updatePosition();
        }

        function resetMascotState() {
            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;

            mascot.x = window.innerWidth / 2 - size / 2;
            mascot.y = size;
            mascot.velocityX = 0;
            mascot.velocityY = 0;
            mascot.state = State.FALLING;
            mascot.currentAnimation = 'falling';
            mascot.animationFrame = 0;
            mascot.animationTick = 0;
            mascot.stateTimer = 0;
            mascot.isDragging = false;
            mascot.dragPending = false;
            mascot.isResisting = false;
            mascot.climbSide = 0;
        }

        function startShimeji() {
            if (gameLoopTimer) return;

            preloadSprites().then(() => {
                if (isDisabled) return;

                resetMascotState();
                createMascot();
                createChatBubble();
                createThinkingBubble();
                createAlertBubble();
                loadSoundBuffers();

                gameLoopTimer = setInterval(gameLoop, TICK_MS);

                setTimeout(() => {
                    updateSpriteDisplay();
                    updatePosition();
                }, 100);
            });
        }

        function stopShimeji() {
            if (gameLoopTimer) {
                clearInterval(gameLoopTimer);
                gameLoopTimer = null;
            }
            if (startDelayTimer) {
                clearTimeout(startDelayTimer);
                startDelayTimer = null;
            }

            cancelSpeech();
            mascot.isDragging = false;
            mascot.dragPending = false;
            mascot.isResisting = false;

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);

            closeChatBubble();
            hideThinking();
            hideAlert();

            if (chatBubbleEl) {
                chatBubbleEl.remove();
                chatBubbleEl = null;
                chatMessagesEl = null;
                chatInputEl = null;
            }
            if (thinkingBubbleEl) {
                thinkingBubbleEl.remove();
                thinkingBubbleEl = null;
            }
            if (alertBubbleEl) {
                alertBubbleEl.remove();
                alertBubbleEl = null;
            }
            inlineThinkingEl = null;
            document.removeEventListener('mousedown', onClickOutsideChat);

            if (mascotElement) {
                mascotElement.remove();
                mascotElement = null;
            }
        }

        function applyVisibilityState(disabledAll, disabledPages) {
            const shouldDisable = isDisabledForCurrentPage(disabledAll, disabledPages);
            if (shouldDisable === isDisabled) return;

            isDisabled = shouldDisable;
            if (isDisabled) {
                stopShimeji();
            } else {
                startShimeji();
            }
        }

        function handleResize() {
            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;
            const groundY = window.innerHeight;

            mascot.x = Math.max(0, Math.min(mascot.x, window.innerWidth - size));

            if (mascot.state === State.CLIMBING_CEILING || mascot.state === State.SITTING_EDGE) {
                mascot.y = size;
            } else if (mascot.state !== State.FALLING && mascot.state !== State.DRAGGED && mascot.state !== State.CLIMBING_WALL && mascot.state !== State.JUMPING) {
                mascot.y = groundY;
            }
        }

        window.addEventListener('resize', handleResize);

        function init() {
            currentSize = config.size || 'medium';
            currentCharacter = config.character || 'shimeji';
            CHARACTER_BASE = chrome.runtime.getURL('characters/' + currentCharacter + '/');
            applyVisibilityState(visibilityState.disabledAll, visibilityState.disabledPages);

            if (!isDisabled) {
                if (startDelayMs > 0) {
                    startDelayTimer = setTimeout(() => {
                        startDelayTimer = null;
                        startShimeji();
                    }, startDelayMs);
                } else {
                    startShimeji();
                }
            }
        }

        function destroy() {
            cancelSpeech();
            if (gameLoopTimer) {
                clearInterval(gameLoopTimer);
                gameLoopTimer = null;
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            if (chatBubbleEl) { chatBubbleEl.remove(); chatBubbleEl = null; }
            if (thinkingBubbleEl) { thinkingBubbleEl.remove(); thinkingBubbleEl = null; }
            if (alertBubbleEl) { alertBubbleEl.remove(); alertBubbleEl = null; }
            inlineThinkingEl = null;
            document.removeEventListener('mousedown', onClickOutsideChat);
            window.removeEventListener('resize', handleResize);
            if (mascotElement) {
                mascotElement.remove();
                mascotElement = null;
            }
        }

        init();

        return {
            id: shimejiId,
            destroy,
            applyVisibilityState,
            updateConfig(nextConfig) {
                const prevCharacter = config.character;
                const prevPersonality = config.personality;
                config = {
                    ...nextConfig,
                    mode: normalizeMode(nextConfig.mode)
                };
                currentSize = config.size || currentSize;
                updateMascotStyle();
                applyChatStyle();
                const charChanged = config.character && config.character !== currentCharacter;
                const personalityChanged = config.personality !== prevPersonality;
                if (charChanged) {
                    currentCharacter = config.character;
                    CHARACTER_BASE = chrome.runtime.getURL('characters/' + currentCharacter + '/');
                    spritesLoaded = false;
                    spritesLoadedPromise = null;
                    preloadSprites().then(updateSpriteDisplay);
                }
                if (charChanged || personalityChanged) {
                    invalidateSoundBuffers();
                    loadSoundBuffers();
                }
            }
        };
    }

    let runtimes = [];
    let visibilityState = { disabledAll: false, disabledPages: [] };

    function syncRuntimes(shimejiConfigs) {
        const nextEnabled = shimejiConfigs.filter(c => c && c.enabled !== false);
        const nextIds = new Set(nextEnabled.map(c => c.id));

        // Remove runtimes that no longer exist
        runtimes = runtimes.filter((runtime) => {
            if (!nextIds.has(runtime.id)) {
                runtime.destroy();
                return false;
            }
            return true;
        });

        // Update existing or add new
        nextEnabled.forEach((config) => {
            const existing = runtimes.find(r => r.id === config.id);
            if (existing) {
                existing.updateConfig(config);
            } else {
                runtimes.push(createShimejiRuntime(config, visibilityState));
            }
        });
    }

    function initManager() {
        chrome.storage.sync.get([STORAGE_KEYS.disabledAll, STORAGE_KEYS.disabledPages], (syncData) => {
            visibilityState.disabledAll = !!syncData[STORAGE_KEYS.disabledAll];
            visibilityState.disabledPages = syncData[STORAGE_KEYS.disabledPages] || [];

            loadShimejiConfigs((configs) => {
                syncRuntimes(configs);
            });
        });
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync' && (changes.disabledAll || changes.disabledPages)) {
            chrome.storage.sync.get([STORAGE_KEYS.disabledAll, STORAGE_KEYS.disabledPages], (data) => {
                visibilityState.disabledAll = !!data[STORAGE_KEYS.disabledAll];
                visibilityState.disabledPages = data[STORAGE_KEYS.disabledPages] || [];
                runtimes.forEach((runtime) => runtime.applyVisibilityState(visibilityState.disabledAll, visibilityState.disabledPages));
            });
        }

        if (areaName === 'local' && changes.shimejis) {
            const next = Array.isArray(changes.shimejis.newValue) ? changes.shimejis.newValue : [];
            syncRuntimes(next.slice(0, MAX_SHIMEJIS));
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'refreshShimejis') {
            loadShimejiConfigs((configs) => {
                syncRuntimes(configs);
            });
            sendResponse({ ok: true });
            return true;
        }
        return false;
    });

    window.__shimejiCleanup = function() {
        runtimes.forEach((runtime) => runtime.destroy());
        runtimes = [];
        window.__shimejiInitialized = false;
    };

    if (document.readyState === 'complete') {
        initManager();
    } else {
        window.addEventListener('load', initManager);
    }
})();
