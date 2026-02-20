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
        SPRAWLED: 'sprawled',
        WALKING_OFF: 'walking_off',
        WALKING_ON: 'walking_on'
    };

    const CALL_BACK_LINE_SPACING = 150;
    const CALL_BACK_LINE_MARGIN = 22;
    const CALL_BACK_RESET_DELAY = 1200;
    const callBackLineCount = { left: 0, right: 0 };
    let callBackLineResetTimer = null;

    function resetCallBackLineCounters() {
        callBackLineCount.left = 0;
        callBackLineCount.right = 0;
        callBackLineResetTimer = null;
    }

    function scheduleCallBackLineReset() {
        if (callBackLineResetTimer) {
            clearTimeout(callBackLineResetTimer);
        }
        callBackLineResetTimer = setTimeout(resetCallBackLineCounters, CALL_BACK_RESET_DELAY);
    }

    function computeCallBackX(edge, size) {
        const safeEdge = edge === -1 ? -1 : 1;
        const sideKey = safeEdge === -1 ? 'left' : 'right';
        const slot = Math.min(callBackLineCount[sideKey], MAX_SHIMEJIS - 1);
        callBackLineCount[sideKey] = Math.min(callBackLineCount[sideKey] + 1, MAX_SHIMEJIS);
        scheduleCallBackLineReset();
        const spacing = Math.max(CALL_BACK_LINE_SPACING, size * 1.1);
        const leftBase = CALL_BACK_LINE_MARGIN;
        const screenWidth = Math.max(window.innerWidth, size + CALL_BACK_LINE_MARGIN * 2);
        const rightBase = Math.max(screenWidth - size - CALL_BACK_LINE_MARGIN, CALL_BACK_LINE_MARGIN);
        if (safeEdge === -1) {
            return Math.min(leftBase + slot * spacing, window.innerWidth - size - CALL_BACK_LINE_MARGIN);
        }
        return Math.max(rightBase - slot * spacing, CALL_BACK_LINE_MARGIN);
    }

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

    const ANIMATIONS_FULL = {
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
    const ANIMATIONS_SIMPLE = {
        idle: [
            { sprite: 'stand-neutral', duration: 1 }
        ],
        walking: [
            { sprite: 'stand-neutral', duration: 8 },
            { sprite: 'walk-step-left', duration: 8 },
            { sprite: 'stand-neutral', duration: 8 },
            { sprite: 'walk-step-right', duration: 8 }
        ],
        crawling: [
            { sprite: 'sprawl-lying', duration: 1 }
        ],
        falling: [
            { sprite: 'fall', duration: 1 }
        ],
        jumping: [
            { sprite: 'jump', duration: 1 }
        ],
        landing: [
            { sprite: 'bounce-recover', duration: 6 }
        ],
        sitting: [
            { sprite: 'sit', duration: 1 }
        ],
        sittingLookUp: [
            { sprite: 'sit', duration: 1 }
        ],
        sprawled: [
            { sprite: 'sprawl-lying', duration: 1 }
        ],
        climbingWall: [
            { sprite: 'grab-wall', duration: 1 }
        ],
        climbingCeiling: [
            { sprite: 'grab-ceiling', duration: 1 }
        ],
        sittingEdge: [
            { sprite: 'sit-edge-legs-down', duration: 1 }
        ],
        headSpin: [
            { sprite: 'sit', duration: 1 }
        ]
    };

    const STORAGE_KEYS = {
        disabledAll: 'disabledAll',
        disabledPages: 'disabledPages'
    };

    const PERSONALITY_PITCH = {
        cryptid: 1.0, cozy: 0.85, chaotic: 1.35,
        philosopher: 0.75, hype: 1.25, noir: 0.7,
        egg: 0.95
    };
    const PERSONALITY_TTS = {
        cryptid: { pitch: 0.9, rate: 1.0 },
        cozy: { pitch: 1.1, rate: 0.85 },
        chaotic: { pitch: 1.4, rate: 1.4 },
        philosopher: { pitch: 0.7, rate: 0.8 },
        hype: { pitch: 1.3, rate: 1.3 },
        noir: { pitch: 0.6, rate: 0.9 },
        egg: { pitch: 1.15, rate: 0.95 }
    };

    const TTS_VOICE_PROFILES = {
        random: [],
        warm: ['female', 'maria', 'maria', 'samantha', 'sofia', 'sofia', 'lucia', 'lucía'],
        bright: ['google', 'zira', 'susan', 'catherine', 'linda'],
        deep: ['male', 'daniel', 'alex', 'jorge', 'diego', 'miguel'],
        calm: ['serena', 'paulina', 'audrey', 'amelie'],
        energetic: ['fred', 'mark', 'david', 'juan']
    };
    // Pitch/rate offsets applied on top of personality settings to make each voice profile distinct
    const TTS_PROFILE_MODIFIERS = {
        random: { pitchOffset: 0, rateOffset: 0 },
        warm: { pitchOffset: 0.15, rateOffset: -0.1 },
        bright: { pitchOffset: 0.3, rateOffset: 0.1 },
        deep: { pitchOffset: -0.35, rateOffset: -0.1 },
        calm: { pitchOffset: -0.1, rateOffset: -0.2 },
        energetic: { pitchOffset: 0.2, rateOffset: 0.25 }
    };
    const TTS_PROFILE_POOL = Object.keys(TTS_VOICE_PROFILES).filter((k) => k !== 'random');

    const SHIMEJI_PITCH_FACTORS = [0.85, 0.93, 1.0, 1.08, 1.18];

    function getShimejiPitchFactor(shimejiId) {
        const idx = parseInt((shimejiId.match(/(\d+)/) || [, '1'])[1], 10) - 1;
        return SHIMEJI_PITCH_FACTORS[idx % SHIMEJI_PITCH_FACTORS.length];
    }

    function pickRandomTtsProfile() {
        if (!TTS_PROFILE_POOL.length) return 'random';
        return TTS_PROFILE_POOL[Math.floor(Math.random() * TTS_PROFILE_POOL.length)];
    }

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

    let lastCursorY = null;
    window.addEventListener('mousemove', (e) => {
        lastCursorY = e.clientY;
    });

    function getNoApiKeyMessage() {
        return isSpanishLocale()
            ? 'Para hablar, necesito una API key de OpenRouter (tiene free trial). Créala y pégala en la configuración de la extensión.'
            : 'To talk, I need an OpenRouter API key (free trial available). Create it and paste it in the extension settings.';
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

        function getLockedMessage() {
            return isSpanishLocale()
            ? 'Estoy bloqueado. Abre la extensión y desbloquea la contraseña para poder hablar.'
            : 'I am locked. Open the extension and unlock the password to chat.';
        }

    function normalizeMode(modeValue) {
        if (modeValue === 'disabled') return 'off';
        if (modeValue === 'off') return 'off';
        if (modeValue === 'agent') return 'agent';
        if (modeValue === 'decorative') return 'off';
        return 'standard';
    }

    // Chrome Web Store readiness: avoid injecting remotely hosted fonts.
    function injectFontIfNeeded() {}

    function normalizePageUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.origin;
        } catch (error) {
            return null;
        }
    }

    function isExtensionContextValid() {
        try {
            return !!(chrome && chrome.runtime && chrome.runtime.id);
        } catch (e) {
            return false;
        }
    }

    let extensionInvalidated = false;

    function safeRuntimeGetURL(path) {
        try {
            if (extensionInvalidated || !isExtensionContextValid()) return null;
            return chrome.runtime.getURL(path);
        } catch (e) {
            extensionInvalidated = true;
            return null;
        }
    }

    function safeRuntimeSendMessage(message, callback) {
        try {
            if (extensionInvalidated || !isExtensionContextValid()) return;
            const result = chrome.runtime.sendMessage(message, callback);
            if (result && typeof result.catch === 'function') {
                result.catch(() => {});
            }
        } catch (e) {
            extensionInvalidated = true;
        }
    }

    function safeRuntimeConnect(name) {
        try {
            if (extensionInvalidated || !isExtensionContextValid()) return null;
            return chrome.runtime.connect({ name });
        } catch (e) {
            extensionInvalidated = true;
            return null;
        }
    }

    function safeRuntimeLastError() {
        try {
            if (extensionInvalidated || !isExtensionContextValid()) return null;
            return chrome.runtime ? chrome.runtime.lastError : null;
        } catch (e) {
            extensionInvalidated = true;
            return null;
        }
    }

    function safeStorageLocalGet(keys, callback) {
        try {
            if (extensionInvalidated || !isExtensionContextValid()) return;
            const result = chrome.storage.local.get(keys, (data) => {
                if (extensionInvalidated || !isExtensionContextValid()) return;
                callback(data || {});
            });
            if (result && typeof result.catch === 'function') {
                result.catch(() => {});
            }
        } catch (e) {
            extensionInvalidated = true;
        }
    }

    function safeStorageLocalSet(payload) {
        try {
            if (extensionInvalidated || !isExtensionContextValid()) return;
            const result = chrome.storage.local.set(payload);
            if (result && typeof result.catch === 'function') {
                result.catch(() => {});
            }
        } catch (e) {
            extensionInvalidated = true;
        }
    }

    function safeStorageSyncGet(keys, callback) {
        try {
            if (extensionInvalidated || !isExtensionContextValid()) return;
            const result = chrome.storage.sync.get(keys, (data) => {
                if (extensionInvalidated || !isExtensionContextValid()) return;
                callback(data || {});
            });
            if (result && typeof result.catch === 'function') {
                result.catch(() => {});
            }
        } catch (e) {
            extensionInvalidated = true;
        }
    }

    // Firefox MV3: emulate session storage with prefixed local storage keys
    const SESSION_PREFIX = '_session_';

    function safeStorageSessionGet(keys, callback) {
        try {
            if (extensionInvalidated || !isExtensionContextValid()) return;
            const keyArr = Array.isArray(keys) ? keys : [keys];
            const prefixed = keyArr.map(k => SESSION_PREFIX + k);
            const result = chrome.storage.local.get(prefixed, (data) => {
                if (extensionInvalidated || !isExtensionContextValid()) return;
                const unprefixed = {};
                for (const k of keyArr) {
                    if (data[SESSION_PREFIX + k] !== undefined) {
                        unprefixed[k] = data[SESSION_PREFIX + k];
                    }
                }
                callback(unprefixed);
            });
            if (result && typeof result.catch === 'function') {
                result.catch(() => {});
            }
        } catch (e) {
            extensionInvalidated = true;
        }
    }

    function isDisabledForCurrentPage(disabledAll, disabledPages) {
        if (disabledAll) return true;
        const pageKey = normalizePageUrl(window.location.href);
        if (!pageKey) return false;
        const pageList = Array.isArray(disabledPages) ? disabledPages : [];
        return pageList.includes(pageKey);
    }

    const fontSizeMap = { small: '11px', medium: '13px', large: '15px' };
    const widthMap = { small: '220px', medium: '280px', large: '360px' };
    const RESIZE_EDGE_PX = 10;

    let sharedAudioCtx = null;
    let audioUnlocked = false;
    let audioUnlockArmed = false;

    function getAudioContext() {
        if (!audioUnlocked) return null;
        if (!sharedAudioCtx) {
            sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return sharedAudioCtx;
    }

    function isUserGestureActive(evt) {
        if (!evt || evt.isTrusted === false) return false;
        const ua = navigator.userActivation;
        if (ua && !ua.isActive && !ua.hasBeenActive) return false;
        return true;
    }

    function unlockAudioContextFromGesture(evt) {
        if (!isUserGestureActive(evt)) return null;
        audioUnlocked = true;
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        return ctx;
    }

    function armAudioUnlock() {
        if (audioUnlockArmed) return;
        audioUnlockArmed = true;
        const unlock = (evt) => {
            if (!isUserGestureActive(evt)) return;
            audioUnlocked = true;
        };
        ['click', 'keydown', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, unlock, { capture: true, once: true });
        });
    }

    const audioBufferCache = {};
    async function loadAudioBuffer(url) {
        if (!url) return null;
        if (audioBufferCache[url]) return audioBufferCache[url];
        try {
            const resp = await fetch(url);
            if (!resp.ok) return null;
            const arrayBuf = await resp.arrayBuffer();
            const ctx = getAudioContext();
            if (!ctx) return null;
            const decoded = await ctx.decodeAudioData(arrayBuf);
            audioBufferCache[url] = decoded;
            return decoded;
        } catch (e) {
            return null;
        }
    }

    // Pentatonic notes so each shimeji slot sounds distinct
    const SHIMEJI_NOTE_FREQ = [523.25, 659.25, 783.99, 880.00, 1046.50]; // C5 E5 G5 A5 C6

    function synthesizeFluteNote(sampleRate, freq, duration) {
        const len = Math.ceil(sampleRate * duration);
        const data = new Float32Array(len);
        const attack = 0.045;
        const release = 0.15;
        const releaseStart = duration - release;
        for (let i = 0; i < len; i++) {
            const t = i / sampleRate;
            let env;
            if (t < attack) env = t / attack;
            else if (t < releaseStart) env = 1.0;
            else env = Math.max(0, (duration - t) / release);
            const vibrato = Math.sin(2 * Math.PI * 5.2 * t) * 2.5;
            const f = freq + vibrato;
            const s = Math.sin(2 * Math.PI * f * t) * 0.55
                + Math.sin(2 * Math.PI * f * 2 * t) * 0.22
                + Math.sin(2 * Math.PI * f * 3 * t) * 0.07;
            data[i] = s * env;
        }
        return data;
    }

    function synthesizeShimejiSounds(shimejiId) {
        const ctx = getAudioContext();
        if (!ctx) {
            return { success: null, error: null };
        }
        const sr = ctx.sampleRate;
        const idx = parseInt((shimejiId.match(/(\d+)/) || [, '1'])[1], 10) - 1;
        const baseFreq = SHIMEJI_NOTE_FREQ[idx % SHIMEJI_NOTE_FREQ.length];

        // Success: single flute note
        const successSamples = synthesizeFluteNote(sr, baseFreq, 0.38);
        const successBuf = ctx.createBuffer(1, successSamples.length, sr);
        successBuf.getChannelData(0).set(successSamples);

        // Error: two notes — second lower with slight dissonance (detuned tritone)
        const errorFreq2 = baseFreq * 0.69;
        const note1 = synthesizeFluteNote(sr, baseFreq, 0.2);
        const gapLen = Math.ceil(sr * 0.06);
        const note2 = synthesizeFluteNote(sr, errorFreq2, 0.28);
        const errorBuf = ctx.createBuffer(1, note1.length + gapLen + note2.length, sr);
        const errorData = errorBuf.getChannelData(0);
        errorData.set(note1, 0);
        errorData.set(note2, note1.length + gapLen);
        return { success: successBuf, error: errorBuf };
    }

    const CHARACTER_KEYS = ['shimeji', 'bunny', 'kitten', 'ghost', 'blob', 'lobster', 'mushroom', 'penguin'];
    const PERSONALITY_KEYS = ['cryptid', 'cozy', 'chaotic', 'philosopher', 'hype', 'noir', 'egg'];
    const MODEL_KEYS = [
        'google/gemini-2.0-flash-001', 'moonshotai/kimi-k2.5', 'anthropic/claude-sonnet-4',
        'meta-llama/llama-4-maverick', 'deepseek/deepseek-chat-v3-0324', 'mistralai/mistral-large-2411'
    ];
    const MODEL_KEYS_ENABLED = MODEL_KEYS.filter((model) => model !== 'moonshotai/kimi-k2.5');

    const SIZE_KEYS = ['small', 'medium', 'big'];
    const THEME_COLOR_POOL = [
        '#2a1f4e', '#1e3a5f', '#4a2040', '#0f4c3a', '#5c2d0e',
        '#3b1260', '#0e3d6b', '#6b1d3a', '#2e4a12', '#4c1a6b'
    ];

    const CHAT_THEMES = [
        {
            id: 'pastel',
            labelEn: 'Pastel',
            labelEs: 'Pastel',
            theme: '#3b1a77',
            bg: '#f0e8ff',
            bubble: 'glass'
        },
        {
            id: 'pink',
            labelEn: 'Pink',
            labelEs: 'Rosa',
            theme: '#7a124b',
            bg: '#ffd2ea',
            bubble: 'glass'
        },
        {
            id: 'kawaii',
            labelEn: 'Kawaii',
            labelEs: 'Kawaii',
            theme: '#5b1456',
            bg: '#ffd8f0',
            bubble: 'glass'
        },
        {
            id: 'mint',
            labelEn: 'Mint',
            labelEs: 'Menta',
            theme: '#0f5f54',
            bg: '#c7fff0',
            bubble: 'glass'
        },
        {
            id: 'ocean',
            labelEn: 'Ocean',
            labelEs: 'Océano',
            theme: '#103a7a',
            bg: '#cfe6ff',
            bubble: 'glass'
        },
        {
            id: 'neural',
            labelEn: 'Neural',
            labelEs: 'Neural',
            theme: '#86f0ff',
            bg: '#0b0d1f',
            bubble: 'dark'
        },
        {
            id: 'cyberpunk',
            labelEn: 'Cyberpunk',
            labelEs: 'Cyberpunk',
            theme: '#19d3ff',
            bg: '#0a0830',
            bubble: 'dark'
        },
        {
            id: 'noir-rose',
            labelEn: 'Noir Rose',
            labelEs: 'Noir Rosa',
            theme: '#ff5fbf',
            bg: '#0b0717',
            bubble: 'dark'
        },
        {
            id: 'midnight',
            labelEn: 'Midnight',
            labelEs: 'Medianoche',
            theme: '#7aa7ff',
            bg: '#0b1220',
            bubble: 'dark'
        },
        {
            id: 'ember',
            labelEn: 'Ember',
            labelEs: 'Brasas',
            theme: '#ff8b3d',
            bg: '#1a0c08',
            bubble: 'dark'
        }
    ];

    function pickRandomChatTheme() {
        return CHAT_THEMES[Math.floor(Math.random() * CHAT_THEMES.length)];
    }

    const OPENCLAW_AGENT_NAME_MAX = 32;

    function defaultOpenClawAgentName(indexOrId) {
        if (typeof indexOrId === 'number') {
            return `chrome-shimeji-${indexOrId + 1}`;
        }
        const match = String(indexOrId || '').match(/(\d+)/);
        const suffix = match ? match[1] : '1';
        return `chrome-shimeji-${suffix}`;
    }

    function normalizeOpenClawAgentName(rawValue, fallback) {
        const fallbackName = String(fallback || 'chrome-shimeji-1').slice(0, OPENCLAW_AGENT_NAME_MAX);
        const normalized = String(rawValue || '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .replace(/-+/g, '-')
            .replace(/_+/g, '_')
            .replace(/^[-_]+|[-_]+$/g, '')
            .slice(0, OPENCLAW_AGENT_NAME_MAX);
        return normalized || fallbackName;
    }

    function getDefaultShimeji(index) {
        const randomChar = CHARACTER_KEYS[Math.floor(Math.random() * CHARACTER_KEYS.length)];
        const randomPersonality = PERSONALITY_KEYS[Math.floor(Math.random() * PERSONALITY_KEYS.length)];
        const randomModel = MODEL_KEYS_ENABLED[Math.floor(Math.random() * MODEL_KEYS_ENABLED.length)];
        const randomVoiceProfile = pickRandomTtsProfile();
        const randomSize = SIZE_KEYS[Math.floor(Math.random() * SIZE_KEYS.length)];
        const randomThemeColor = THEME_COLOR_POOL[Math.floor(Math.random() * THEME_COLOR_POOL.length)];
            const preset = pickRandomChatTheme();
        return {
            id: `shimeji-${index + 1}`,
            character: randomChar,
            size: randomSize,
            mode: 'standard',
            standardProvider: 'openrouter',
            openrouterApiKey: '',
            openrouterModel: 'random',
            openrouterModelResolved: randomModel,
            ollamaUrl: 'http://127.0.0.1:11434',
            ollamaModel: 'gemma3:1b',
            openclawGatewayUrl: 'ws://127.0.0.1:18789',
            openclawGatewayToken: '',
            openclawAgentName: defaultOpenClawAgentName(index),
            personality: randomPersonality,
            enabled: true,
            chatThemeColor: preset?.theme || randomThemeColor,
            chatBgColor: preset?.bg || '#ffffff',
            chatFontSize: 'medium',
            chatWidth: 'medium',
            chatHeightPx: 320,
            chatBubbleStyle: preset?.bubble || 'glass',
            chatThemePreset: 'random',
            ttsEnabled: false,
            ttsVoiceProfile: randomVoiceProfile,
            ttsVoiceId: '',
            openMicEnabled: false,
            relayEnabled: false,
            animationQuality: 'full'
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
            openrouterModel: 'random',
            openrouterModelResolved: MODEL_KEYS_ENABLED[Math.floor(Math.random() * MODEL_KEYS_ENABLED.length)],
            openclawGatewayUrl: data.openclawGatewayUrl || 'ws://127.0.0.1:18789',
            openclawGatewayToken: data.openclawGatewayToken || '',
            openclawAgentName: defaultOpenClawAgentName(0),
            personality: data.aiPersonality || 'cryptid',
            enabled: true,
            ttsEnabled: false,
            ttsVoiceProfile: pickRandomTtsProfile(),
            ttsVoiceId: '',
            relayEnabled: false
        }];
    }

    function loadShimejiConfigs(callback) {
        const handleData = (data) => {
            let list = migrateLegacy(data);
            if (!!data.noShimejis) {
                list = [];
            } else if (!Array.isArray(list) || list.length === 0) {
                list = [getDefaultShimeji(0)];
            }
            const needsTtsMigration = !data.ttsEnabledMigrationDone;
            list = list.map((item) => {
                const needsRandom = !item.openrouterModel || item.openrouterModel === 'google/gemini-2.0-flash-001';
                const modelValue = needsRandom ? 'random' : item.openrouterModel;
                return {
                    ...item,
                    mode: normalizeMode(item.mode),
                    soundEnabled: item.soundEnabled !== false,
                    soundVolume: typeof item.soundVolume === 'number' ? item.soundVolume : 0.7,
                    standardProvider: item.standardProvider || 'openrouter',
                    openrouterModel: modelValue,
                    openrouterModelResolved: item.openrouterModelResolved
                        || (modelValue !== 'random'
                            ? modelValue
                            : MODEL_KEYS_ENABLED[Math.floor(Math.random() * MODEL_KEYS_ENABLED.length)]),
                    ollamaUrl: item.ollamaUrl || 'http://127.0.0.1:11434',
                    ollamaModel: item.ollamaModel || 'gemma3:1b',
                    openclawAgentName: normalizeOpenClawAgentName(
                        item.openclawAgentName,
                        defaultOpenClawAgentName(item.id)
                    ),
                    ttsEnabled: needsTtsMigration ? item.ttsEnabled === true : item.ttsEnabled === true,
                    ttsVoiceProfile: item.ttsVoiceProfile || pickRandomTtsProfile(),
                    ttsVoiceId: item.ttsVoiceId || '',
                    openMicEnabled: !!item.openMicEnabled,
                    relayEnabled: !!item.relayEnabled,
                    animationQuality: item.animationQuality || 'full',
                    masterKeyEnabled: !!data.masterKeyEnabled
                };
            });
            list = list.slice(0, MAX_SHIMEJIS);
            try {
                chrome.storage.local.set({ shimejis: list, ttsEnabledMigrationDone: true });
            } catch (e) {
                safeStorageLocalSet({ shimejis: list, ttsEnabledMigrationDone: true });
            }
            callback(list);
        };

        try {
            chrome.storage.local.get([
                'shimejis',
                'aiModel',
                'aiApiKey',
                'aiPersonality',
                'chatMode',
                'openclawGatewayUrl',
                'openclawGatewayToken',
                'ttsEnabledMigrationDone',
                'masterKeyEnabled',
                'noShimejis'
            ], (data) => handleData(data || {}));
        } catch (e) {
            safeStorageLocalGet([
                'shimejis',
                'aiModel',
                'aiApiKey',
                'aiPersonality',
                'chatMode',
                'openclawGatewayUrl',
                'openclawGatewayToken',
                'ttsEnabledMigrationDone',
                'masterKeyEnabled',
                'noShimejis'
            ], (data) => handleData(data || {}));
        }
    }

    function createShimejiRuntime(config, visibilityState, options = {}) {
        const shimejiId = config.id;
        const elementSuffix = shimejiId.replace(/[^a-zA-Z0-9_-]/g, '');
        const mascotId = `shimeji-mascot-${elementSuffix}`;
        const chatBubbleId = `shimeji-chat-bubble-${elementSuffix}`;
        const thinkingBubbleId = `shimeji-thinking-bubble-${elementSuffix}`;
        const alertBubbleId = `shimeji-alert-bubble-${elementSuffix}`;
        const micCountdownBubbleId = `shimeji-mic-countdown-${elementSuffix}`;
        const conversationKey = `conversationHistory.${elementSuffix}`;

        let currentCharacter = config.character || 'shimeji';
        let CHARACTER_BASE = safeRuntimeGetURL('characters/' + currentCharacter + '/') || '';
        let currentSize = config.size || 'medium';
        let animationQuality = config.animationQuality === 'simple' ? 'simple' : 'full';
        let animationSet = animationQuality === 'simple' ? ANIMATIONS_SIMPLE : ANIMATIONS_FULL;
        let isDisabled = false;
        let gameLoopTimer = null;
        let spritesLoadedPromise = null;
        const spriteImages = {};
        let spritesLoaded = false;
        const supportedAnimations = new Set();
        let startDelayTimer = null;
        const startDelayMs = options.startDelayMs || 0;

        let mascotElement;
        let chatBubbleEl = null;
        let thinkingBubbleEl = null;
        let alertBubbleEl = null;
        let micCountdownBubbleEl = null;
        let inlineThinkingEl = null;
        let chatMessagesEl = null;
        let chatInputEl = null;
        let chatInputAreaEl = null;
        let chatMetaEl = null;
        let chatControlsPanelEl = null;
        let lastAssistantText = '';
        let conversationHistory = [];
        let isChatOpen = false;
        let isThinking = false;
        let hasUnreadMessage = false;
        let pendingUnreadCount = 0;
        let pendingSpeechText = null;
        let soundBuffers = { success: null, error: null };
        let soundBuffersLoaded = false;
        const chatOpenKey = `shimejiChatOpen.${elementSuffix}`;

        function getChatOpenState() {
            try {
                return window.sessionStorage?.getItem(chatOpenKey) === '1';
            } catch (e) {
                return false;
            }
        }

        function setChatOpenState(value) {
            try {
                if (!window.sessionStorage) return;
                if (value) {
                    window.sessionStorage.setItem(chatOpenKey, '1');
                } else {
                    window.sessionStorage.removeItem(chatOpenKey);
                }
            } catch (e) {}
        }

        let recognition = null;
        let isListening = false;
        let micBtnEl = null;
        let chatThemePanelEl = null;
        let syncThemeInputsFn = null;
        let openMicBtnEl = null;
        let ttsToggleBtnEl = null;
        let quickTtsBtnEl = null;
        let relayToggleBtnEl = null;
        let micAutoSendEl = null;
        let micAutoSendTimer = null;
        let micAutoSendInterval = null;
        let micDraftText = '';
        let micAutoSendSeconds = 0;
        let autoSendArmed = false;
        let micSessionAutoRestart = false;
        let micSessionContinuous = false;
        let noKeyNudgeTimer = null;
        let noKeyNudgeShown = false;
        let isPrimary = !!options.isPrimary;
        let chatWiggleTimer = null;
        let isResizing = false;
        let resizeStartX = 0;
        let resizeStartY = 0;
        let resizeStartWidth = 0;
        let resizeStartHeight = 0;
        let resizeStartLeft = 0;
        let resizeStartTop = 0;
        let resizeLeft = false;
        let resizeRight = false;
        let resizeTop = false;
        let resizeBottom = false;
        let pendingSoundKind = null;
        let soundGestureArmed = false;
        let pendingOnboardingGreeting = false;
        let pendingApiReadyGreeting = false;

        async function isMasterKeyLocked() {
            if (!config.masterKeyEnabled) return false;
            return new Promise((resolve) => {
                safeRuntimeSendMessage({ type: 'masterKeyStatus' }, (resp) => {
                    const runtimeError = safeRuntimeLastError();
                    if (!runtimeError && resp && typeof resp.locked === 'boolean') {
                        resolve(resp.locked);
                        return;
                    }
                    safeStorageSessionGet(['masterKey'], (data) => {
                        resolve(!data.masterKey);
                    });
                });
            });
        }

        async function loadSoundBuffers() {
            if (!sharedAudioCtx) return;
            soundBuffersLoaded = false;
            const defaultUrls = {
                success: safeRuntimeGetURL('assets/shimeji-success.wav'),
                error: safeRuntimeGetURL('assets/shimeji-error.wav')
            };
            for (const kind of ['success', 'error']) {
                soundBuffers[kind] = await loadAudioBuffer(defaultUrls[kind]);
            }
            // Fill missing with per-shimeji synthesised flute tones
            if (!soundBuffers.success || !soundBuffers.error) {
                try {
                    const synth = synthesizeShimejiSounds(shimejiId);
                    if (!soundBuffers.success) soundBuffers.success = synth.success;
                    if (!soundBuffers.error) soundBuffers.error = synth.error;
                } catch (e) {}
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
                if (!ctx) return;
                if (ctx.state === 'suspended') return;
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                const personalityRate = PERSONALITY_PITCH[config.personality] || 1.0;
                const shimejiRate = getShimejiPitchFactor(shimejiId);
                source.playbackRate.value = Math.max(0.6, Math.min(1.6, personalityRate * shimejiRate));
                const gain = ctx.createGain();
                gain.gain.value = Math.max(0, Math.min(1, typeof config.soundVolume === 'number' ? config.soundVolume : 0.7));
                source.connect(gain);
                gain.connect(ctx.destination);
                source.start(0);
            } catch (e) {}
        }

        function scheduleSoundAfterUserGesture(kind) {
            if (!kind) return;
            pendingSoundKind = kind;
            if (soundGestureArmed) return;
            soundGestureArmed = true;
            const resumeAndPlay = (evt) => {
                if (!pendingSoundKind) return;
                const ctx = unlockAudioContextFromGesture(evt);
                if (!ctx) return;
                if (!soundBuffersLoaded) loadSoundBuffers();
                playSound(pendingSoundKind);
                pendingSoundKind = null;
                soundGestureArmed = false;
            };
            ['click', 'keydown', 'touchstart'].forEach((evt) => {
                window.addEventListener(evt, resumeAndPlay, { capture: true, once: true });
            });
        }

        function playSoundOrQueue(kind) {
            if (!kind) return;
            if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
                if (!soundBuffersLoaded) loadSoundBuffers();
                playSound(kind);
                return;
            }
            scheduleSoundAfterUserGesture(kind);
        }

        async function persistVoiceId(voiceName) {
            if (!voiceName || voiceName === config.ttsVoiceId) return;
            config.ttsVoiceId = voiceName;
            safeStorageLocalGet(['shimejis'], (data) => {
                const list = Array.isArray(data.shimejis) ? data.shimejis : [];
                const updated = list.map((s) => s.id === shimejiId ? { ...s, ttsVoiceId: voiceName } : s);
                safeStorageLocalSet({ shimejis: updated });
            });
        }

        function persistTtsEnabled(enabled) {
            safeStorageLocalGet(['shimejis'], (data) => {
                const list = Array.isArray(data.shimejis) ? data.shimejis : [];
                const updated = list.map((s) => s.id === shimejiId ? { ...s, ttsEnabled: enabled } : s);
                safeStorageLocalSet({ shimejis: updated });
            });
        }

        function persistOpenMicEnabled(enabled) {
            safeStorageLocalGet(['shimejis'], (data) => {
                const list = Array.isArray(data.shimejis) ? data.shimejis : [];
                const updated = list.map((s) => s.id === shimejiId ? { ...s, openMicEnabled: enabled } : s);
                safeStorageLocalSet({ shimejis: updated });
            });
        }

        function persistRelayEnabled(enabled) {
            safeStorageLocalGet(['shimejis'], (data) => {
                const list = Array.isArray(data.shimejis) ? data.shimejis : [];
                const updated = list.map((s) => s.id === shimejiId ? { ...s, relayEnabled: enabled } : s);
                safeStorageLocalSet({ shimejis: updated });
            });
        }

        function persistChatStyle(themeColor, bgColor, bubbleStyle, presetId) {
            safeStorageLocalGet(['shimejis'], (data) => {
                const list = Array.isArray(data.shimejis) ? data.shimejis : [];
                const updated = list.map((s) => {
                    if (s.id !== shimejiId) return s;
                    return {
                        ...s,
                        chatThemeColor: themeColor,
                        chatBgColor: bgColor,
                        chatBubbleStyle: bubbleStyle,
                        chatThemePreset: presetId || s.chatThemePreset || 'custom'
                    };
                });
                safeStorageLocalSet({ shimejis: updated });
            });
        }

        function persistChatFontSize(sizeKey) {
            safeStorageLocalGet(['shimejis'], (data) => {
                const list = Array.isArray(data.shimejis) ? data.shimejis : [];
                const updated = list.map((s) => s.id === shimejiId ? { ...s, chatFontSize: sizeKey } : s);
                safeStorageLocalSet({ shimejis: updated });
            });
        }

        function persistChatSize(widthPx, heightPx) {
            safeStorageLocalGet(['shimejis'], (data) => {
                const list = Array.isArray(data.shimejis) ? data.shimejis : [];
                const updated = list.map((s) => s.id === shimejiId ? {
                    ...s,
                    chatWidthPx: widthPx,
                    chatHeightPx: heightPx
                } : s);
                safeStorageLocalSet({ shimejis: updated });
            });
        }

        function updateOpenMicBtnVisual() {
            if (!openMicBtnEl) return;
            openMicBtnEl.classList.toggle('active', !!config.openMicEnabled);
            openMicBtnEl.title = config.openMicEnabled
                ? (isSpanishLocale() ? 'Desactivar micrófono abierto' : 'Disable open mic')
                : (isSpanishLocale() ? 'Activar micrófono abierto' : 'Enable open mic');
        }

        function updateTtsToggleBtnVisual() {
            if (!ttsToggleBtnEl) return;
            ttsToggleBtnEl.textContent = config.ttsEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07';
            ttsToggleBtnEl.title = config.ttsEnabled
                ? (isSpanishLocale() ? 'Silenciar voz' : 'Mute voice')
                : (isSpanishLocale() ? 'Activar voz' : 'Unmute voice');
        }

        function updateQuickTtsBtnVisual() {
            if (!quickTtsBtnEl) return;
            quickTtsBtnEl.textContent = config.ttsEnabled ? '🔊' : '🔇';
            quickTtsBtnEl.title = config.ttsEnabled
                ? (isSpanishLocale() ? 'Voz activada' : 'Voice on')
                : (isSpanishLocale() ? 'Voz desactivada' : 'Voice off');
            quickTtsBtnEl.classList.toggle('active', !!config.ttsEnabled);
        }

        function updateTtsClosedBtnVisual() {
            // Legacy hook: keep as no-op to avoid breaking runtime updates.
        }

        function updateRelayToggleBtnVisual() {
            if (!relayToggleBtnEl) return;
            relayToggleBtnEl.classList.toggle('active', !!config.relayEnabled);
            relayToggleBtnEl.title = config.relayEnabled
                ? (isSpanishLocale() ? 'Hablar con otros shimejis: activado' : 'Talk to other shimejis: on')
                : (isSpanishLocale() ? 'Hablar con otros shimejis: apagado' : 'Talk to other shimejis: off');
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

        function getSpeechManager() {
            if (!window.__shimejiSpeechManager) {
                window.__shimejiSpeechManager = {
                    queue: [],
                    speaking: false
                };
            }
            return window.__shimejiSpeechManager;
        }

        async function speakTextRaw(text, onEndCallback) {
            if (!config.ttsEnabled) {
                if (onEndCallback) onEndCallback();
                return;
            }
            if (!window.speechSynthesis) {
                if (onEndCallback) onEndCallback();
                return;
            }
            try {
                const utterance = new SpeechSynthesisUtterance(text);
                const ttsSettings = PERSONALITY_TTS[config.personality] || { pitch: 1.0, rate: 1.0 };
                const profileMod = TTS_PROFILE_MODIFIERS[config.ttsVoiceProfile] || { pitchOffset: 0, rateOffset: 0 };
                utterance.pitch = Math.max(0.1, Math.min(2, ttsSettings.pitch + profileMod.pitchOffset));
                utterance.rate = Math.max(0.1, Math.min(3, ttsSettings.rate + profileMod.rateOffset));
                utterance.volume = Math.max(0, Math.min(1, typeof config.soundVolume === 'number' ? config.soundVolume : 0.7));
                utterance.lang = isSpanishLocale() ? 'es' : 'en';
                const voice = await ensureVoiceForTts();
                if (voice) utterance.voice = voice;
                // Chrome pauses speechSynthesis after ~15s; keep-alive resumes it
                let keepAlive = null;
                let callbackFired = false;
                const fireCallback = () => {
                    if (callbackFired) return;
                    callbackFired = true;
                    if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
                    if (onEndCallback) onEndCallback();
                };
                utterance.onend = fireCallback;
                utterance.onerror = fireCallback;
                window.speechSynthesis.speak(utterance);
                keepAlive = setInterval(() => {
                    if (!window.speechSynthesis.speaking) {
                        fireCallback();
                    } else {
                        window.speechSynthesis.resume();
                    }
                }, 5000);
            } catch (e) {
                if (onEndCallback) onEndCallback();
            }
        }

        function enqueueSpeech(text, onEndCallback) {
            const manager = getSpeechManager();
            manager.queue.push({ text, onEndCallback });
            if (manager.speaking) return;
            const playNext = () => {
                const next = manager.queue.shift();
                if (!next) {
                    manager.speaking = false;
                    return;
                }
                manager.speaking = true;
                speakTextRaw(next.text, () => {
                    if (next.onEndCallback) next.onEndCallback();
                    playNext();
                });
            };
            playNext();
        }

        function cancelSpeech() {
            try {
                const manager = getSpeechManager();
                manager.queue.length = 0;
                manager.speaking = false;
                if (window.speechSynthesis) window.speechSynthesis.cancel();
            } catch (e) {}
        }

        function clearAutoSendPopup() {
            autoSendArmed = false;
            if (micAutoSendTimer) {
                clearTimeout(micAutoSendTimer);
                micAutoSendTimer = null;
            }
            if (micAutoSendInterval) {
                clearInterval(micAutoSendInterval);
                micAutoSendInterval = null;
            }
            if (micAutoSendEl) {
                micAutoSendEl.remove();
                micAutoSendEl = null;
            }
            if (micCountdownBubbleEl) {
                micCountdownBubbleEl.classList.remove('visible');
            }
        }

        function showAutoSendPopup() {
            if (!micBtnEl || !chatBubbleEl || !isChatOpen) {
                clearAutoSendPopup();
                micAutoSendSeconds = 3;
                if (!micCountdownBubbleEl) createMicCountdownBubble();
                updateMicCountdownBubbleText(micAutoSendSeconds);
                if (micCountdownBubbleEl) {
                    micCountdownBubbleEl.classList.add('visible');
                    updateBubblePosition();
                }
                micAutoSendInterval = setInterval(() => {
                    micAutoSendSeconds -= 1;
                    updateMicCountdownBubbleText(micAutoSendSeconds);
                }, 1000);
                micAutoSendTimer = setTimeout(() => {
                    clearAutoSendPopup();
                    safeSendChatMessage();
                }, micAutoSendSeconds * 1000);
                return;
            }
            clearAutoSendPopup();
            const isEs = isSpanishLocale();
            micAutoSendSeconds = 3;

            micAutoSendEl = document.createElement('div');
            micAutoSendEl.className = 'shimeji-mic-autosend';

            const textEl = document.createElement('span');
            const countdownEl = document.createElement('strong');
            const cancelBtn = document.createElement('button');

            textEl.textContent = isEs ? 'Enviando audio en' : 'Sending audio in';
            countdownEl.textContent = `${micAutoSendSeconds}`;
            cancelBtn.textContent = isEs ? 'Cancelar' : 'Cancel';

            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearAutoSendPopup();
            });

            micAutoSendEl.appendChild(textEl);
            micAutoSendEl.appendChild(countdownEl);
            micAutoSendEl.appendChild(cancelBtn);

            const inputArea = micBtnEl.closest('.shimeji-chat-input-area');
            if (inputArea) {
                inputArea.appendChild(micAutoSendEl);
            } else {
                chatBubbleEl.appendChild(micAutoSendEl);
            }

            micAutoSendInterval = setInterval(() => {
                micAutoSendSeconds -= 1;
                if (countdownEl) countdownEl.textContent = `${micAutoSendSeconds}`;
                updateMicCountdownBubbleText(micAutoSendSeconds);
            }, 1000);

            micAutoSendTimer = setTimeout(() => {
                clearAutoSendPopup();
                safeSendChatMessage();
            }, micAutoSendSeconds * 1000);
        }

        function setMicListeningState(listening) {
            isListening = listening;
            if (micBtnEl) micBtnEl.classList.toggle('listening', listening);
            if (chatInputAreaEl) chatInputAreaEl.classList.toggle('listening', listening);
        }

        function startVoiceInput(options = {}) {
            const { continuous = false, allowAutoRestart = false } = options;
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                appendErrorMessage(isSpanishLocale() ? 'Tu navegador no soporta reconocimiento de voz.' : 'Your browser does not support speech recognition.');
                return;
            }
            // Stop any other shimeji's recognition (browser only allows one at a time)
            if (window.__shimejiActiveRecognition && window.__shimejiActiveRecognition !== shimejiId) {
                try {
                    const evt = new CustomEvent('shimeji-stop-mic', { detail: { except: shimejiId } });
                    document.dispatchEvent(evt);
                } catch (e) {}
            }
            clearAutoSendPopup();
            micDraftText = '';
            micSessionAutoRestart = !!allowAutoRestart;
            micSessionContinuous = !!continuous;
            // Cancel any ongoing TTS before starting mic
            cancelSpeech();
            if (recognition) {
                try { recognition.abort(); } catch (e) {}
            }
            recognition = new SpeechRecognition();
            recognition.continuous = !!continuous;
            recognition.interimResults = true;
            recognition.lang = isSpanishLocale() ? 'es' : 'en';

            recognition.onresult = (event) => {
                let interim = '';
                let hasFinal = false;

                // Any new speech should cancel countdown until we hit the next silence.
                if (micAutoSendTimer || micAutoSendInterval || autoSendArmed) {
                    clearAutoSendPopup();
                }

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const text = result && result[0] ? result[0].transcript : '';
                    if (!text) continue;
                    if (result.isFinal) {
                        micDraftText += text;
                        hasFinal = true;
                    } else {
                        interim += text;
                    }
                }

                const displayText = (micDraftText + interim).trim();
                if (chatInputEl) {
                    chatInputEl.value = displayText;
                    try {
                        const end = chatInputEl.value.length;
                        chatInputEl.setSelectionRange(end, end);
                        chatInputEl.scrollLeft = chatInputEl.scrollWidth;
                    } catch (e) {}
                }

                if (hasFinal) {
                    autoSendArmed = true;
                    showAutoSendPopup();
                    if (!micSessionContinuous && recognition) {
                        try { recognition.stop(); } catch (e) {}
                    }
                }
            };

            recognition.onend = () => {
                setMicListeningState(false);
                if (window.__shimejiActiveRecognition === shimejiId) {
                    window.__shimejiActiveRecognition = null;
                }
                const draft = (chatInputEl ? chatInputEl.value : micDraftText || '').trim();
                if (autoSendArmed && draft) {
                    showAutoSendPopup();
                } else {
                    autoSendArmed = false;
                    // Open mic: auto-restart if still enabled and not sending/thinking
                    if (config.openMicEnabled && micSessionAutoRestart && !isListening && !isThinking) {
                        setTimeout(() => {
                            if (config.openMicEnabled && micSessionAutoRestart && !isListening && !isThinking) {
                                startVoiceInput({ continuous: true, allowAutoRestart: true });
                            }
                        }, 300);
                    }
                }
            };

            recognition.onerror = (event) => {
                setMicListeningState(false);
                if (window.__shimejiActiveRecognition === shimejiId) {
                    window.__shimejiActiveRecognition = null;
                }
                autoSendArmed = false;
                if (event.error === 'not-allowed') {
                    appendErrorMessage(isSpanishLocale() ? 'Permiso de micrófono denegado. Habilítalo en la configuración del navegador.' : 'Microphone permission denied. Enable it in browser settings.');
                } else if (config.openMicEnabled && micSessionAutoRestart && event.error !== 'aborted') {
                    // Open mic: retry on non-fatal errors (e.g. no-speech timeout)
                    setTimeout(() => {
                        if (config.openMicEnabled && micSessionAutoRestart && !isListening) {
                            startVoiceInput({ continuous: true, allowAutoRestart: true });
                        }
                    }, 500);
                }
            };

            try {
                recognition.start();
                setMicListeningState(true);
                window.__shimejiActiveRecognition = shimejiId;
            } catch (e) {
                setMicListeningState(false);
            }
        }

        function stopVoiceInput() {
            if (recognition) {
                try { recognition.stop(); } catch (e) {}
            }
            clearAutoSendPopup();
            micDraftText = '';
            micSessionAutoRestart = false;
            micSessionContinuous = false;
            setMicListeningState(false);
            if (window.__shimejiActiveRecognition === shimejiId) {
                window.__shimejiActiveRecognition = null;
            }
        }

        function toggleVoiceInput() {
            if (isListening) {
                stopVoiceInput();
            } else {
                startVoiceInput({ continuous: false, allowAutoRestart: false });
            }
        }

        // Listen for stop-mic events from other shimejis
        document.addEventListener('shimeji-stop-mic', (e) => {
            if (e.detail && e.detail.except !== shimejiId && isListening) {
                stopVoiceInput();
            }
        });

        document.addEventListener('shimeji-relay', (e) => {
            try {
                if (extensionInvalidated || !isExtensionContextValid()) return;
                if (!e.detail || e.detail.sourceId === shimejiId) return;
                if (config.enabled === false) return;
                const mode = getMode();
                if (mode === 'off') return;
                const raw = (e.detail.text || '').trim();
                if (!raw) return;
                const prefix = isSpanishLocale()
                    ? 'Esto es lo que dijo tu mascota shimeji AI pet: '
                    : 'This is what your shimeji AI pet said: ';
                sendChatMessageWithText(prefix + raw, { isRelay: true });
            } catch (e) {
                extensionInvalidated = true;
            }
        });

        // Listen for voice broadcast from open mic (send transcript to all open chats)
        document.addEventListener('shimeji-voice-broadcast', (e) => {
            try {
                if (extensionInvalidated || !isExtensionContextValid()) return;
                if (!isChatOpen || !chatInputEl || !e.detail || !e.detail.transcript) return;
                if (isThinking) return; // already processing a message
                chatInputEl.value = e.detail.transcript;
                sendChatMessage();
            } catch (e) {
                extensionInvalidated = true;
            }
        });

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
            climbSpeed: 1.5,
            isOffScreen: false,
            offScreenEdge: 0,
            offScreenSince: 0,
            chatClickTimeout: null,
            lastClickAt: 0
        };

        let pendingPosSave = null;
        let posSaveTimer = null;
        let lastSavedPos = { x: null, y: null };

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function applySavedPosition(saved) {
            if (!saved) return false;
            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;
            const maxX = Math.max(0, window.innerWidth - size);
            const minY = size;
            const maxY = window.innerHeight;
            const rawX = (typeof saved.xPct === 'number' ? saved.xPct : 0.5) * window.innerWidth;
            const rawY = (typeof saved.yPct === 'number' ? saved.yPct : (size / Math.max(1, window.innerHeight))) * window.innerHeight;
            mascot.x = clamp(rawX, 0, maxX);
            mascot.y = clamp(rawY, minY, maxY);
            mascot.velocityX = 0;
            mascot.velocityY = 0;
            if (isChatOpen) {
                mascot.state = State.SITTING;
                mascot.currentAnimation = 'sitting';
                mascot.direction = 0;
            } else {
                mascot.state = State.IDLE;
                mascot.currentAnimation = 'idle';
            }
            mascot.animationFrame = 0;
            mascot.animationTick = 0;
            mascot.stateTimer = 0;
            mascot.isDragging = false;
            mascot.dragPending = false;
            mascot.isResisting = false;
            mascot.climbSide = 0;
            return true;
        }

        function queuePositionSave() {
            pendingPosSave = { x: mascot.x, y: mascot.y };
            if (posSaveTimer) return;
            posSaveTimer = setTimeout(() => {
                posSaveTimer = null;
                if (!pendingPosSave) return;
                const { x, y } = pendingPosSave;
                pendingPosSave = null;
                if (lastSavedPos.x !== null && Math.abs(lastSavedPos.x - x) < 1 && Math.abs(lastSavedPos.y - y) < 1) {
                    return;
                }
                lastSavedPos = { x, y };
                const xPct = window.innerWidth ? x / window.innerWidth : 0.5;
                const yPct = window.innerHeight ? y / window.innerHeight : 0.5;
                safeStorageLocalGet(['shimejiLastPos'], (data) => {
                    const map = data.shimejiLastPos && typeof data.shimejiLastPos === 'object' ? data.shimejiLastPos : {};
                    map[shimejiId] = {
                        xPct: clamp(xPct, 0, 1),
                        yPct: clamp(yPct, 0, 1),
                        ts: Date.now()
                    };
                    safeStorageLocalSet({ shimejiLastPos: map });
                });
            }, 700);
        }

        function buildNoApiKeyMessageElement(includeWarning = false) {
            const msgEl = document.createElement('div');
            msgEl.className = 'shimeji-chat-msg ai shimeji-no-api-key-msg';

            const isEs = isSpanishLocale();
            const prefix = isEs
                ? 'Para hablar, necesito tu API key de '
                : 'To talk, I need your API key from ';
            const suffix = isEs
                ? ' (tiene free trial). Luego abre la configuración de la extensión y pégala.'
                : ' (free trial available). Then open the extension settings and paste it.';

            msgEl.appendChild(document.createTextNode(prefix));

            const openRouterLink = document.createElement('a');
            openRouterLink.href = 'https://openrouter.ai/settings/keys';
            openRouterLink.target = '_blank';
            openRouterLink.rel = 'noopener noreferrer';
            openRouterLink.textContent = 'OpenRouter';
            msgEl.appendChild(openRouterLink);

            msgEl.appendChild(document.createTextNode(suffix));

            if (includeWarning) {
                msgEl.appendChild(document.createTextNode(' ⚠️'));
            }

            return msgEl;
        }

        function ensureNoApiKeyOnboardingMessage() {
            if (!chatMessagesEl) return;

            const existing = chatMessagesEl.querySelector('.shimeji-no-api-key-msg');
            if (existing) existing.remove();

            chatMessagesEl.prepend(buildNoApiKeyMessageElement(false));
        }

        function ensureNoApiKeyNudgeMessage() {
            if (!chatMessagesEl) return;
            const existing = chatMessagesEl.querySelector('.shimeji-no-api-key-nudge');
            if (existing) return;
            const msgEl = document.createElement('div');
            msgEl.className = 'shimeji-chat-msg ai shimeji-no-api-key-nudge';
            const isEs = isSpanishLocale();
            const prefix = isEs
                ? '¡Hola! Necesito una API key de '
                : 'Hi! I need an API key from ';
            const suffix = isEs
                ? ' (tiene prueba gratis). Pégala en la configuración de la extensión para poder hablar.'
                : ' (free trial available). Paste it in the extension settings to chat.';
            msgEl.appendChild(document.createTextNode(prefix));
            const openRouterLink = document.createElement('a');
            openRouterLink.href = 'https://openrouter.ai/settings/keys';
            openRouterLink.target = '_blank';
            openRouterLink.rel = 'noopener noreferrer';
            openRouterLink.textContent = 'OpenRouter';
            msgEl.appendChild(openRouterLink);
            msgEl.appendChild(document.createTextNode(suffix));
            chatMessagesEl.prepend(msgEl);
        }

        function preloadSprites() {
            if (spritesLoadedPromise) return spritesLoadedPromise;

            Object.keys(spriteImages).forEach((key) => {
                delete spriteImages[key];
            });

            const promises = Object.entries(SPRITES).map(([key, filename]) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        spriteImages[key] = img;
                        resolve();
                    };
                    img.onerror = () => {
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

        function buildFilteredAnimationSet(baseSet) {
            const filteredSet = {};
            supportedAnimations.clear();
            Object.keys(baseSet || {}).forEach((key) => {
                const frames = baseSet[key] || [];
                const filtered = frames.filter((frame) => SPRITES[frame.sprite] && spriteImages[frame.sprite]);
                if (filtered.length) {
                    filteredSet[key] = filtered;
                    supportedAnimations.add(key);
                } else {
                    filteredSet[key] = [{ sprite: 'stand-neutral', duration: 1 }];
                }
            });
            return filteredSet;
        }

        function getFilteredAnimation(name) {
            const animation = animationSet[name];
            if (!animation || animation.length === 0) {
                return [{ sprite: 'stand-neutral', duration: 1 }];
            }
            return animation;
        }

        function updateSpriteDisplay() {
            if (!mascotElement || !spritesLoaded) return;

            const animation = getFilteredAnimation(mascot.currentAnimation);
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
        const CHAT_CLICK_DELAY = 300;
        const DOUBLE_CLICK_WINDOW = 420;

        function setupDragListeners() {
            mascotElement.addEventListener('pointerdown', onPointerDown);
            mascotElement.addEventListener('touchstart', onTouchStart, { passive: false });
            mascotElement.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                showShimejiContextMenu(e.clientX, e.clientY);
            });

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        }

        function clampDragPosition(size) {
            mascot.x = Math.max(-size * 0.5, Math.min(mascot.x, window.innerWidth - size * 0.5));
            mascot.y = Math.max(size * 0.5, Math.min(mascot.y, window.innerHeight + size * 0.5));
        }

        function onPointerDown(e) {
            if (e.pointerType === 'touch') return; // handled by touch listeners
            e.preventDefault();
            mascot.dragPending = true;
            mascot.dragStartX = e.clientX;
            mascot.dragStartY = e.clientY;
            mascot._dragPointerId = e.pointerId;

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

            // Capture pointer so drag survives cursor leaving the window
            if (mascot._dragPointerId != null && mascotElement.setPointerCapture) {
                try { mascotElement.setPointerCapture(mascot._dragPointerId); } catch (_) {}
            }

            mascot.prevDragX = mascot.x;
            mascot.prevDragY = mascot.y;
            mascot.smoothedVelocityX = 0;
            mascot.smoothedVelocityY = 0;
            mascot.dragTick = 0;
            mascot.isResisting = false;
            mascot.resistAnimTick = 0;

            mascotElement.style.cursor = 'grabbing';
        }

        function onPointerMove(e) {
            if (e.pointerType === 'touch') return;
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
            clampDragPosition(size);
            updatePosition();
        }

        function onPointerUp(e) {
            if (e.pointerType === 'touch') return;
            if (mascot._dragPointerId != null && mascotElement.releasePointerCapture) {
                try { mascotElement.releasePointerCapture(mascot._dragPointerId); } catch (_) {}
            }
            mascot._dragPointerId = null;

            if (mascot.dragPending) {
                mascot.dragPending = false;
                queueMascotClickAction();
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
            clampDragPosition(size);
            updatePosition();
        }

        function onTouchEnd() {
            if (mascot.dragPending) {
                mascot.dragPending = false;
                queueMascotClickAction();
                return;
            }

            if (!mascot.isDragging) return;
            endDrag();
        }

        function endDrag() {
            mascot.isDragging = false;
            mascot.dragPending = false;
            mascotElement.style.cursor = 'grab';

            const throwScale = 0.22;
            const maxThrow = 16;
            mascot.velocityX = Math.max(-maxThrow, Math.min(maxThrow, mascot.smoothedVelocityX * throwScale));
            mascot.velocityY = Math.max(-maxThrow, Math.min(maxThrow, mascot.smoothedVelocityY * throwScale));
            mascot.state = State.FALLING;
            mascot.currentAnimation = 'falling';
            mascot.animationFrame = 0;
            mascot.animationTick = 0;
        }

        function updateDragAnimation() {
            if (!mascotElement) return;

            mascot.dragTick++;
            const dragDelta = mascot.x - mascot.prevDragX;
            const dragDeltaY = mascot.y - mascot.prevDragY;
            mascot.prevDragX = mascot.x;
            mascot.prevDragY = mascot.y;

            const alpha = 0.2;
            mascot.smoothedVelocityX = mascot.smoothedVelocityX * (1 - alpha) + dragDelta * alpha * 5;
            mascot.smoothedVelocityY = mascot.smoothedVelocityY * (1 - alpha) + dragDeltaY * alpha * 5;

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

            const hasSprite = (key) => !!(SPRITES[key] && spriteImages[key]);
            const sv = mascot.smoothedVelocityX;
            if (sv > 8) {
                if (hasSprite('dragged-tilt-left-heavy')) {
                    setSprite('dragged-tilt-left-heavy');
                } else if (hasSprite('dragged-tilt-left')) {
                    setSprite('dragged-tilt-left');
                } else {
                    setSprite('stand-neutral');
                }
            } else if (sv > 2) {
                if (hasSprite('dragged-tilt-left')) {
                    setSprite('dragged-tilt-left');
                } else if (hasSprite('dragged-tilt-left-heavy')) {
                    setSprite('dragged-tilt-left-heavy');
                } else {
                    setSprite('stand-neutral');
                }
            } else if (sv < -8) {
                if (hasSprite('dragged-tilt-right-heavy')) {
                    setSprite('dragged-tilt-right-heavy');
                } else if (hasSprite('dragged-tilt-right')) {
                    setSprite('dragged-tilt-right');
                } else {
                    setSprite('stand-neutral');
                }
            } else if (sv < -2) {
                if (hasSprite('dragged-tilt-right')) {
                    setSprite('dragged-tilt-right');
                } else if (hasSprite('dragged-tilt-right-heavy')) {
                    setSprite('dragged-tilt-right-heavy');
                } else {
                    setSprite('stand-neutral');
                }
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
            setChatBubbleFront(chatBubbleEl);

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
            const headerBtns = document.createElement('div');
            headerBtns.className = 'shimeji-chat-header-btns';

            quickTtsBtnEl = document.createElement('button');
            quickTtsBtnEl.className = 'shimeji-chat-voice-quick';
            updateQuickTtsBtnVisual();
            quickTtsBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                config.ttsEnabled = !config.ttsEnabled;
                updateTtsToggleBtnVisual();
                updateQuickTtsBtnVisual();
                if (!config.ttsEnabled) {
                    cancelSpeech();
                } else if (lastAssistantText) {
                    const openMicAfter = config.openMicEnabled;
                    enqueueSpeech(lastAssistantText, openMicAfter ? () => {
                        if (!config.openMicEnabled || isListening) return;
                        startVoiceInput({ continuous: true, allowAutoRestart: true });
                    } : null);
                }
                persistTtsEnabled(config.ttsEnabled);
            });

            const settingsBtnEl = document.createElement('button');
            settingsBtnEl.className = 'shimeji-chat-settings-toggle';
            settingsBtnEl.textContent = '⚙️';
            settingsBtnEl.title = isSpanishLocale() ? 'Controles' : 'Controls';

            const themeBtnEl = document.createElement('button');
            themeBtnEl.className = 'shimeji-chat-theme-toggle';
            themeBtnEl.textContent = '🎨';
            themeBtnEl.title = isSpanishLocale() ? 'Tema de chat' : 'Chat theme';

            openMicBtnEl = document.createElement('button');
            openMicBtnEl.className = 'shimeji-chat-openmic-toggle';
            openMicBtnEl.textContent = '🎙️';
            updateOpenMicBtnVisual();
            openMicBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                config.openMicEnabled = !config.openMicEnabled;
                updateOpenMicBtnVisual();
                persistOpenMicEnabled(config.openMicEnabled);
                if (config.openMicEnabled) {
                    // Start listening immediately when enabled
                    if (!isListening) startVoiceInput({ continuous: true, allowAutoRestart: true });
                } else {
                    stopVoiceInput();
                }
            });

            relayToggleBtnEl = document.createElement('button');
            relayToggleBtnEl.className = 'shimeji-chat-relay-toggle';
            relayToggleBtnEl.textContent = '🔁';
            updateRelayToggleBtnVisual();
            relayToggleBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                config.relayEnabled = !config.relayEnabled;
                updateRelayToggleBtnVisual();
                persistRelayEnabled(config.relayEnabled);
            });

            const closeBtn = document.createElement('button');
            closeBtn.className = 'shimeji-chat-close';
            closeBtn.textContent = '\u00D7';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeChatBubble();
            });

            headerBtns.appendChild(quickTtsBtnEl);
            headerBtns.appendChild(settingsBtnEl);
            headerBtns.appendChild(closeBtn);
            header.appendChild(titleWrap);
            header.appendChild(headerBtns);

            const controlsPanel = document.createElement('div');
            controlsPanel.className = 'shimeji-chat-controls-panel';
            chatControlsPanelEl = controlsPanel;

            const micRow = document.createElement('div');
            micRow.className = 'shimeji-chat-control-row';
            const micLabel = document.createElement('span');
            micLabel.className = 'shimeji-chat-control-label';
            micLabel.textContent = isSpanishLocale() ? 'Micrófono abierto' : 'Open mic';
            micRow.appendChild(micLabel);
            micRow.appendChild(openMicBtnEl);
            micRow.addEventListener('click', (e) => {
                if (e.target && e.target.closest && e.target.closest('button')) return;
                openMicBtnEl.click();
            });
            controlsPanel.appendChild(micRow);

            const relayRow = document.createElement('div');
            relayRow.className = 'shimeji-chat-control-row';
            const relayLabel = document.createElement('span');
            relayLabel.className = 'shimeji-chat-control-label';
            relayLabel.textContent = isSpanishLocale()
                ? 'Hablar con otros shimejis'
                : 'Talk to other shimejis';
            relayRow.appendChild(relayLabel);
            relayRow.appendChild(relayToggleBtnEl);
            relayRow.addEventListener('click', (e) => {
                if (e.target && e.target.closest && e.target.closest('button')) return;
                relayToggleBtnEl.click();
            });
            controlsPanel.appendChild(relayRow);

            const themeRowControl = document.createElement('div');
            themeRowControl.className = 'shimeji-chat-control-row';
            const themeLabelControl = document.createElement('span');
            themeLabelControl.className = 'shimeji-chat-control-label';
            themeLabelControl.textContent = isSpanishLocale() ? 'Tema' : 'Theme';
            themeRowControl.appendChild(themeLabelControl);
            themeRowControl.appendChild(themeBtnEl);
            themeRowControl.addEventListener('click', (e) => {
                if (e.target && e.target.closest && e.target.closest('button')) return;
                themeBtnEl.click();
            });
            controlsPanel.appendChild(themeRowControl);

            const fontRow = document.createElement('div');
            fontRow.className = 'shimeji-chat-control-row';
            const fontLabel = document.createElement('span');
            fontLabel.className = 'shimeji-chat-control-label';
            fontLabel.textContent = isSpanishLocale() ? 'Tamaño de texto' : 'Text size';
            const fontSelect = document.createElement('select');
            fontSelect.className = 'shimeji-chat-font-select';
            const fontOptions = [
                { value: 'small', label: isSpanishLocale() ? 'Pequeño' : 'Small' },
                { value: 'medium', label: isSpanishLocale() ? 'Medio' : 'Medium' },
                { value: 'large', label: isSpanishLocale() ? 'Grande' : 'Large' }
            ];
            fontOptions.forEach((opt) => {
                const optionEl = document.createElement('option');
                optionEl.value = opt.value;
                optionEl.textContent = opt.label;
                fontSelect.appendChild(optionEl);
            });
            fontSelect.value = config.chatFontSize || 'medium';
            fontSelect.addEventListener('change', () => {
                config.chatFontSize = fontSelect.value;
                applyChatStyle();
                persistChatFontSize(config.chatFontSize);
            });
            fontRow.appendChild(fontLabel);
            fontRow.appendChild(fontSelect);
            controlsPanel.appendChild(fontRow);

            function setControlsPanelOpen(isOpen) {
                controlsPanel.classList.toggle('open', isOpen);
                if (isOpen) {
                    themePanel.classList.remove('open');
                }
            }

            const themePanel = document.createElement('div');
            themePanel.className = 'shimeji-chat-theme-panel';
            chatThemePanelEl = themePanel;

            const themeHeader = document.createElement('div');
            themeHeader.className = 'shimeji-chat-theme-header';
            const themeHeaderLabel = document.createElement('span');
            themeHeaderLabel.className = 'shimeji-chat-theme-header-label';
            themeHeaderLabel.textContent = isSpanishLocale() ? 'Tema de chat' : 'Chat theme';
            const themeCloseBtn = document.createElement('button');
            themeCloseBtn.type = 'button';
            themeCloseBtn.className = 'shimeji-chat-theme-close';
            themeCloseBtn.textContent = '\u00D7';
            themeCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                themePanel.classList.remove('open');
            });
            themeHeader.appendChild(themeHeaderLabel);
            themeHeader.appendChild(themeCloseBtn);
            themePanel.appendChild(themeHeader);

            const presetSection = document.createElement('div');
            presetSection.className = 'shimeji-chat-theme-section';
            const presetLabel = document.createElement('span');
            presetLabel.className = 'shimeji-chat-theme-label';
            presetLabel.textContent = isSpanishLocale() ? 'Temas' : 'Themes';
            const presetRow = document.createElement('div');
            presetRow.className = 'shimeji-theme-presets';
            presetSection.appendChild(presetLabel);
            presetSection.appendChild(presetRow);
            themePanel.appendChild(presetSection);

            const themeButtons = new Map();
            function createThemeChip(id, label, colors) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'shimeji-theme-circle';
                btn.dataset.themeId = id;
                btn.title = label;
                btn.setAttribute('aria-label', label);
                const outer = document.createElement('span');
                outer.className = 'shimeji-theme-circle-outer';
                const inner = document.createElement('span');
                inner.className = 'shimeji-theme-circle-inner';
                if (colors && colors.bg && colors.theme) {
                    outer.style.background = colors.bg;
                    inner.style.background = colors.theme;
                } else {
                    outer.classList.add('custom');
                    inner.classList.add('custom');
                }
                if (id === 'custom') {
                    inner.textContent = '🎨';
                    inner.classList.add('emoji');
                }
                if (id === 'random') {
                    inner.textContent = '🎲';
                    inner.classList.add('emoji');
                }
                outer.appendChild(inner);
                btn.appendChild(outer);
                themeButtons.set(id, btn);
                presetRow.appendChild(btn);
                return btn;
            }

            createThemeChip('custom', (isSpanishLocale() ? '🎨 Personalizado' : '🎨 Custom'));
            createThemeChip('random', (isSpanishLocale() ? '🎲 Aleatorio' : '🎲 Random'), { theme: '#111827', bg: '#f8fafc' });
            CHAT_THEMES.forEach((theme) => {
                createThemeChip(
                    theme.id,
                    isSpanishLocale() ? (theme.labelEs || theme.labelEn) : (theme.labelEn || theme.labelEs),
                    { theme: theme.theme, bg: theme.bg }
                );
            });

            const customSection = document.createElement('div');
            customSection.className = 'shimeji-chat-theme-section shimeji-chat-theme-custom';
            const customLabel = document.createElement('span');
            customLabel.className = 'shimeji-chat-theme-label';
            customLabel.textContent = isSpanishLocale() ? 'Colores' : 'Colors';
            const customRow = document.createElement('div');
            customRow.className = 'shimeji-theme-color-row';
            const themeColorInput = document.createElement('input');
            themeColorInput.type = 'color';
            themeColorInput.className = 'shimeji-chat-theme-color';
            const bgColorInput = document.createElement('input');
            bgColorInput.type = 'color';
            bgColorInput.className = 'shimeji-chat-theme-bg';
            customRow.appendChild(themeColorInput);
            customRow.appendChild(bgColorInput);
            customSection.appendChild(customLabel);
            customSection.appendChild(customRow);
            themePanel.appendChild(customSection);

            function applyThemePresetSelection(presetId, preset) {
                if (!preset) return;
                config.chatThemePreset = presetId;
                config.chatThemeColor = preset.theme;
                config.chatBgColor = preset.bg;
                updateStyleSelection(preset.bubble);
                applyChatStyle();
                persistChatStyle(config.chatThemeColor, config.chatBgColor, config.chatBubbleStyle, presetId);
            }

            function updateThemeFromInputs() {
                config.chatThemePreset = 'custom';
                config.chatThemeColor = themeColorInput.value;
                config.chatBgColor = bgColorInput.value;
                applyChatStyle();
                persistChatStyle(config.chatThemeColor, config.chatBgColor, config.chatBubbleStyle, 'custom');
            }

            function syncThemeInputs() {
                themeColorInput.value = config.chatThemeColor || '#2a1f4e';
                bgColorInput.value = config.chatBgColor || '#ffffff';
                updateStyleSelection(config.chatBubbleStyle || 'glass');
                if (config.chatThemePreset === 'random') {
                    setThemeSelection('random');
                    return;
                }
                const match = CHAT_THEMES.find((t) =>
                    t.theme.toLowerCase() === themeColorInput.value.toLowerCase()
                    && t.bg.toLowerCase() === bgColorInput.value.toLowerCase()
                    && t.bubble === (config.chatBubbleStyle || 'glass')
                );
                setThemeSelection(match ? match.id : 'custom');
            }
            syncThemeInputsFn = syncThemeInputs;

            function setThemePanelOpen(isOpen) {
                themePanel.classList.toggle('open', isOpen);
                if (isOpen) {
                    controlsPanel.classList.remove('open');
                }
            }

            settingsBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                setControlsPanelOpen(!controlsPanel.classList.contains('open'));
            });

            themeBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                setThemePanelOpen(!themePanel.classList.contains('open'));
            });

            function setThemeSelection(id) {
                themeButtons.forEach((btn, key) => {
                    btn.classList.toggle('active', key === id);
                });
                customSection.style.display = id === 'custom' ? '' : 'none';
            }

            function updateStyleSelection(style) {
                config.chatBubbleStyle = style || 'glass';
            }

            themeButtons.forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.themeId || 'custom';
                    if (id === 'custom') {
                        setThemeSelection('custom');
                        updateThemeFromInputs();
                        return;
                    }
                    if (id === 'random') {
                        const preset = pickRandomChatTheme();
                        if (!preset) return;
                        themeColorInput.value = preset.theme;
                        bgColorInput.value = preset.bg;
                        applyThemePresetSelection('random', preset);
                        setThemeSelection('random');
                        return;
                    }
                    const found = CHAT_THEMES.find((t) => t.id === id);
                    if (!found) return;
                    themeColorInput.value = found.theme;
                    bgColorInput.value = found.bg;
                    applyThemePresetSelection(id, found);
                    setThemeSelection(id);
                });
            });

            themeColorInput.addEventListener('input', () => {
                setThemeSelection('custom');
                updateThemeFromInputs();
            });

            bgColorInput.addEventListener('input', () => {
                setThemeSelection('custom');
                updateThemeFromInputs();
            });

            chatMessagesEl = document.createElement('div');
            chatMessagesEl.className = 'shimeji-chat-messages';
            const closePanels = () => {
                if (chatControlsPanelEl && chatControlsPanelEl.classList.contains('open')) {
                    chatControlsPanelEl.classList.remove('open');
                }
                if (chatThemePanelEl && chatThemePanelEl.classList.contains('open')) {
                    chatThemePanelEl.classList.remove('open');
                }
            };
            chatMessagesEl.addEventListener('click', closePanels);

            const inputArea = document.createElement('div');
            inputArea.className = 'shimeji-chat-input-area';
            inputArea.addEventListener('click', closePanels);
            chatInputAreaEl = inputArea;
            chatInputEl = document.createElement('input');
            chatInputEl.className = 'shimeji-chat-input';
            chatInputEl.type = 'text';
            chatInputEl.placeholder = isSpanishLocale() ? 'Di algo...' : 'Say something...';
            chatInputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    unlockAudioContextFromGesture(e);
                    safeSendChatMessage();
                }
            });
            chatInputEl.addEventListener('focus', () => {
                setChatBubbleFront(chatBubbleEl);
            });
            chatInputEl.addEventListener('mousedown', (e) => e.stopPropagation());
            chatInputEl.addEventListener('touchstart', (e) => e.stopPropagation());

            const sendBtn = document.createElement('button');
            sendBtn.className = 'shimeji-chat-send';
            sendBtn.textContent = '\u25B6';
            sendBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                unlockAudioContextFromGesture(e);
                safeSendChatMessage();
            });

            micBtnEl = document.createElement('button');
            micBtnEl.className = 'shimeji-chat-mic';
            micBtnEl.textContent = '\uD83C\uDF99';
            micBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                unlockAudioContextFromGesture(e);
                toggleVoiceInput();
            });

            inputArea.appendChild(chatInputEl);
            inputArea.appendChild(sendBtn);
            inputArea.appendChild(micBtnEl);

            chatBubbleEl.appendChild(header);
            chatBubbleEl.appendChild(controlsPanel);
            chatBubbleEl.appendChild(themePanel);
            chatBubbleEl.appendChild(chatMessagesEl);
            chatBubbleEl.appendChild(inputArea);
            const resizeHandleEl = document.createElement('div');
            resizeHandleEl.className = 'shimeji-chat-resize-handle';
            chatBubbleEl.appendChild(resizeHandleEl);

            const shouldFocusOnChatClick = (target) => {
                if (!target || !target.closest) return true;
                // Keep text selection behavior inside message history.
                if (target.closest('.shimeji-chat-messages')) return false;
                if (target.closest('.shimeji-chat-msg')) return false;
                if (target.closest('a')) return false;
                if (target.closest('input, textarea, select')) return false;
                if (target.closest('button')) return false;
                return true;
            };

            const focusChatInput = () => {
                if (!chatInputEl || !chatBubbleEl) return;
                setChatBubbleFront(chatBubbleEl);
                setTimeout(() => chatInputEl && chatInputEl.focus(), 0);
            };

            const bringToFront = (e) => {
                setChatBubbleFront(chatBubbleEl);
                if (!isChatOpen) return;
                if (shouldFocusOnChatClick(e?.target)) {
                    focusChatInput();
                }
            };
            chatBubbleEl.addEventListener('mousedown', bringToFront);
            chatBubbleEl.addEventListener('touchstart', bringToFront, { passive: true });
            chatMessagesEl.addEventListener('mousedown', bringToFront);
            chatMessagesEl.addEventListener('touchstart', bringToFront, { passive: true });

            function updateResizeCursor(e) {
                if (!chatBubbleEl || isResizing) return;
                const rect = chatBubbleEl.getBoundingClientRect();
                const nearLeft = e.clientX - rect.left <= RESIZE_EDGE_PX;
                const nearRight = rect.right - e.clientX <= RESIZE_EDGE_PX;
                const nearTop = e.clientY - rect.top <= RESIZE_EDGE_PX;
                const nearBottom = rect.bottom - e.clientY <= RESIZE_EDGE_PX;
                if (nearLeft && nearTop) {
                    chatBubbleEl.style.cursor = 'nw-resize';
                } else if (nearRight && nearTop) {
                    chatBubbleEl.style.cursor = 'ne-resize';
                } else if (nearLeft) {
                    chatBubbleEl.style.cursor = 'w-resize';
                } else if (nearRight) {
                    chatBubbleEl.style.cursor = 'e-resize';
                } else if (nearTop) {
                    chatBubbleEl.style.cursor = 'n-resize';
                } else {
                    chatBubbleEl.style.cursor = '';
                }
            }

            function onResizeMove(e) {
                if (!isResizing || !chatBubbleEl) return;
                const dx = e.clientX - resizeStartX;
                const dy = e.clientY - resizeStartY;
                const minW = 220;
                const minH = 160;
                const viewportW = window.innerWidth;
                const viewportH = window.innerHeight;

                let nextWidth = resizeStartWidth;
                let nextHeight = resizeStartHeight;
                let nextLeft = resizeStartLeft;
                let nextTop = resizeStartTop;

                if (resizeRight) {
                    nextWidth = resizeStartWidth + dx;
                }
                if (resizeBottom) {
                    nextHeight = resizeStartHeight + dy;
                }
                if (resizeLeft) {
                    nextWidth = resizeStartWidth - dx;
                    nextLeft = resizeStartLeft + dx;
                }
                if (resizeTop) {
                    nextHeight = resizeStartHeight - dy;
                    nextTop = resizeStartTop + dy;
                }

                nextWidth = Math.max(minW, nextWidth);
                nextHeight = Math.max(minH, nextHeight);

                const maxLeft = Math.max(0, viewportW - nextWidth);
                const maxTop = Math.max(0, viewportH - nextHeight);
                nextLeft = Math.max(0, Math.min(maxLeft, nextLeft));
                nextTop = Math.max(0, Math.min(maxTop, nextTop));

                config.chatWidthPx = Math.round(nextWidth);
                config.chatHeightPx = Math.round(nextHeight);
                applyChatStyle();
                if (chatBubbleEl) {
                    chatBubbleEl.style.left = `${Math.round(nextLeft)}px`;
                    chatBubbleEl.style.top = `${Math.round(nextTop)}px`;
                }
            }

            function stopResize() {
                if (!isResizing) return;
                isResizing = false;
                resizeLeft = false;
                resizeRight = false;
                resizeTop = false;
                resizeBottom = false;
                document.removeEventListener('mousemove', onResizeMove);
                document.removeEventListener('mouseup', stopResize);
                persistChatSize(config.chatWidthPx || null, config.chatHeightPx || null);
            }

            function onResizeStart(e) {
                if (!chatBubbleEl) return;
                const target = e.target;
                if (target && target.closest && target.closest('input, button, textarea, select, a')) return;
                const rect = chatBubbleEl.getBoundingClientRect();
                const nearLeft = e.clientX - rect.left <= RESIZE_EDGE_PX;
                const nearRight = rect.right - e.clientX <= RESIZE_EDGE_PX;
                const nearTop = e.clientY - rect.top <= RESIZE_EDGE_PX;
                const nearBottom = rect.bottom - e.clientY <= RESIZE_EDGE_PX;
                if (!nearLeft && !nearRight && !nearTop) return;
                isResizing = true;
                resizeLeft = nearLeft;
                resizeRight = nearRight;
                resizeTop = nearTop;
                resizeBottom = false;
                resizeStartX = e.clientX;
                resizeStartY = e.clientY;
                resizeStartWidth = rect.width;
                resizeStartHeight = rect.height;
                resizeStartLeft = rect.left;
                resizeStartTop = rect.top;
                document.addEventListener('mousemove', onResizeMove);
                document.addEventListener('mouseup', stopResize);
                e.stopPropagation();
                e.preventDefault();
            }

            chatBubbleEl.addEventListener('mousemove', updateResizeCursor);
            chatBubbleEl.addEventListener('mouseleave', () => {
                if (!isResizing && chatBubbleEl) chatBubbleEl.style.cursor = '';
            });
            chatBubbleEl.addEventListener('mousedown', (e) => {
                onResizeStart(e);
                e.stopPropagation();
            });
            chatBubbleEl.addEventListener('touchstart', (e) => e.stopPropagation());

            syncThemeInputs();
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
            if (config.chatWidthPx) {
                el.style.setProperty('--chat-width', `${config.chatWidthPx}px`);
            } else {
                el.style.setProperty('--chat-width', widthMap[config.chatWidth] || '280px');
            }
            if (config.chatHeightPx) {
                el.style.setProperty('--chat-height', `${config.chatHeightPx}px`);
            } else {
                el.style.removeProperty('--chat-height');
            }
            el.classList.remove('chat-style-glass', 'chat-style-solid', 'chat-style-dark');
            el.classList.add('chat-style-' + (config.chatBubbleStyle || 'glass'));
            applyAuxBubbleTheme(thinkingBubbleEl);
            applyAuxBubbleTheme(alertBubbleEl);
        }

        function applyAuxBubbleTheme(el) {
            if (!el) return;
            el.style.setProperty('--chat-theme', config.chatThemeColor || '#2a1f4e');
            el.style.setProperty('--chat-bg', config.chatBgColor || '#ffffff');
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
            applyAuxBubbleTheme(thinkingBubbleEl);
        }

        function createAlertBubble() {
            if (alertBubbleEl) return;

            alertBubbleEl = document.createElement('div');
            alertBubbleEl.id = alertBubbleId;
            alertBubbleEl.className = 'shimeji-alert-bubble';
            alertBubbleEl.textContent = '!';
            alertBubbleEl.style.cursor = 'pointer';
            alertBubbleEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!isChatOpen) openChatBubble();
            });
            document.body.appendChild(alertBubbleEl);
            applyAuxBubbleTheme(alertBubbleEl);
        }

        function createMicCountdownBubble() {
            if (micCountdownBubbleEl) return;
            micCountdownBubbleEl = document.createElement('div');
            micCountdownBubbleEl.id = micCountdownBubbleId;
            micCountdownBubbleEl.className = 'shimeji-mic-countdown';
            micCountdownBubbleEl.textContent = '3s';
            document.body.appendChild(micCountdownBubbleEl);
            applyAuxBubbleTheme(micCountdownBubbleEl);
        }

        function updateMicCountdownBubbleText(seconds) {
            if (!micCountdownBubbleEl) return;
            micCountdownBubbleEl.textContent = `${Math.max(0, seconds)}s`;
        }

        function updateAlertBubbleText() {
            if (!alertBubbleEl) return;
            if (!pendingUnreadCount) {
                alertBubbleEl.textContent = '!';
                return;
            }
            alertBubbleEl.textContent = pendingUnreadCount > 9 ? '9+!' : `${pendingUnreadCount}!`;
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
            if (e.target && e.target.closest && e.target.closest('.shimeji-chat-bubble, .shimeji-mascot')) return;
            closeChatBubble();
        }

        function getMode() {
            return normalizeMode(config.mode);
        }

        function setChatBubbleFront(target) {
            if (!target) return;
            const bubbles = document.querySelectorAll('.shimeji-chat-bubble');
            bubbles.forEach((bubble) => {
                bubble.classList.remove('chat-front');
                bubble.style.zIndex = '100000';
            });
            target.classList.add('chat-front');
            target.style.zIndex = '100050';
        }

        function openChatBubble() {
            if (isDisabled) return;
            if (!chatBubbleEl) createChatBubble();
            isChatOpen = true;
            chatBubbleEl.classList.add('visible');
            setChatBubbleFront(chatBubbleEl);
            if (chatInputEl) {
                setTimeout(() => chatInputEl && chatInputEl.focus(), 0);
            }
            updateBubblePosition();
            setChatOpenState(true);
            if (micCountdownBubbleEl) micCountdownBubbleEl.classList.remove('visible');

            hasUnreadMessage = false;
            pendingUnreadCount = 0;
            hideAlert();
            updateAlertBubbleText();

            if (mascot.state === State.SITTING_EDGE) {
                mascot.state = State.FALLING;
                mascot.currentAnimation = 'falling';
                mascot.velocityY = 0;
            } else if (mascot.state !== State.FALLING && mascot.state !== State.DRAGGED && mascot.state !== State.JUMPING
                && mascot.state !== State.CLIMBING_WALL && mascot.state !== State.CLIMBING_CEILING) {
                mascot.state = State.SITTING;
                mascot.currentAnimation = 'sitting';
                mascot.direction = 0;
                mascot.animationFrame = 0;
                mascot.animationTick = 0;
                mascot.stateTimer = 0;
                mascot.velocityX = 0;
                mascot.velocityY = 0;
            } else if (mascot.state === State.FALLING) {
                mascot.state = State.SITTING;
                mascot.currentAnimation = 'sitting';
                mascot.direction = 0;
                mascot.animationFrame = 0;
                mascot.animationTick = 0;
                mascot.stateTimer = 0;
                mascot.velocityX = 0;
                mascot.velocityY = 0;
                mascot.y = window.innerHeight;
            }

            loadConversation(async () => {
                renderConversationHistory();
                if (chatInputEl) {
                    // Focus after render so typing works immediately.
                    setTimeout(() => chatInputEl && chatInputEl.focus(), 0);
                }

                const mode = getMode();
                const provider = config.standardProvider || 'openrouter';
                const hasOpenRouterKey = !!(config.openrouterApiKey || '').trim() || !!config.openrouterApiKeyEnc;
                const hasOpenClawToken = !!(config.openclawGatewayToken || '').trim() || !!config.openclawGatewayTokenEnc;
                const needsApiKey = mode === 'standard' && provider === 'openrouter' && !hasOpenRouterKey;
                const needsAgent = mode === 'agent' && !hasOpenClawToken;
                const locked = await isMasterKeyLocked();
                if (locked) {
                    appendMessage('ai', getLockedMessage());
                } else if (mode === 'off') {
                    appendMessage('ai', isSpanishLocale() ? 'Aun no estoy configurado. Usa el popup para darme vida.' : 'I am not configured yet. Use the popup to bring me to life.');
                } else if (needsApiKey || needsAgent) {
                    ensureNoApiKeyOnboardingMessage();
                } else {
                    const existing = chatMessagesEl ? chatMessagesEl.querySelector('.shimeji-no-api-key-msg') : null;
                    if (existing) existing.remove();
                }

                if (pendingOnboardingGreeting) {
                    pendingOnboardingGreeting = false;
                    if (needsApiKeyForChat()) {
                        noKeyNudgeShown = true;
                        ensureNoApiKeyOnboardingMessage();
                        playSoundOrQueue('error');
                    } else {
                        const msg = isSpanishLocale()
                            ? 'Hola, soy tu shimeji. Estoy listo para hablar contigo.'
                            : 'Hi, I am your shimeji. I am ready to chat with you.';
                        appendMessage('ai', msg);
                        conversationHistory.push({ role: 'assistant', content: msg });
                        saveConversation();
                        playSoundOrQueue('success');
                    }
                }

                if (pendingApiReadyGreeting) {
                    pendingApiReadyGreeting = false;
                    appendApiReadyGreetingMessage();
                }

                updateChatMeta();

                setTimeout(() => {
                    if (chatMessagesEl) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
                    if (chatInputEl) chatInputEl.focus();
                    if (pendingSpeechText) {
                        const text = pendingSpeechText;
                        pendingSpeechText = null;
                        if (config.ttsEnabled) {
                            const openMicAfter = config.openMicEnabled;
                            enqueueSpeech(text, openMicAfter ? () => {
                                if (!config.openMicEnabled || isListening) return;
                                startVoiceInput({ continuous: true, allowAutoRestart: true });
                            } : null);
                        }
                    }
                }, 50);
            });
        }

        function closeChatBubble() {
            if (!config.openMicEnabled) {
                stopVoiceInput();
            }
            cancelSpeech();
            if (micAutoSendTimer && config.openMicEnabled) {
                if (micAutoSendEl) {
                    micAutoSendEl.remove();
                    micAutoSendEl = null;
                }
                if (!micCountdownBubbleEl) createMicCountdownBubble();
                updateMicCountdownBubbleText(micAutoSendSeconds);
                if (micCountdownBubbleEl) {
                    micCountdownBubbleEl.classList.add('visible');
                    updateBubblePosition();
                }
            } else {
                clearAutoSendPopup();
            }
            isChatOpen = false;
            if (chatBubbleEl) chatBubbleEl.classList.remove('visible');
            if (chatControlsPanelEl) chatControlsPanelEl.classList.remove('open');
            if (chatThemePanelEl) chatThemePanelEl.classList.remove('open');
            removeInlineThinking();
            setChatOpenState(false);

            if (mascot.state === State.SITTING || mascot.state === State.HEAD_SPIN || mascot.state === State.SPRAWLED) {
                mascot.state = State.IDLE;
                mascot.currentAnimation = 'idle';
                mascot.stateTimer = 0;
                mascot.animationFrame = 0;
            }
        }

        function updateChatMeta() {
            if (!chatMetaEl) return;
            const mode = getMode();
            if (mode === 'agent') {
                const fallbackName = defaultOpenClawAgentName(shimejiId);
                const agentName = normalizeOpenClawAgentName(config.openclawAgentName, fallbackName);
                chatMetaEl.textContent = `openclaw · ${agentName}`;
                return;
            }
            if (mode === 'off') {
                chatMetaEl.textContent = isSpanishLocale() ? 'sin configurar' : 'not configured';
                return;
            }
            const provider = config.standardProvider || 'openrouter';
            console.log('Chat meta update:', { provider, config, ollamaModel: config.ollamaModel });
            if (provider === 'ollama') {
                const model = config.ollamaModel || 'gemma3:1b';
                chatMetaEl.textContent = `ollama · ${model}`;
            } else {
                let model = config.openrouterModel || 'google/gemini-2.0-flash-001';
                if (model === 'random') {
                    if (!config.openrouterModelResolved) {
                        const resolved = MODEL_KEYS_ENABLED[Math.floor(Math.random() * MODEL_KEYS_ENABLED.length)];
                        config.openrouterModelResolved = resolved;
                        safeStorageLocalGet(['shimejis'], (data) => {
                            const list = Array.isArray(data.shimejis) ? data.shimejis : [];
                            const updated = list.map((s) => s.id === shimejiId ? { ...s, openrouterModelResolved: resolved } : s);
                            safeStorageLocalSet({ shimejis: updated });
                        });
                    }
                    model = config.openrouterModelResolved || MODEL_KEYS_ENABLED[0];
                }
                chatMetaEl.textContent = model;
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
            if (mascot.isOffScreen) callBackShimeji();
            if (!alertBubbleEl) createAlertBubble();
            hasUnreadMessage = true;
            pendingUnreadCount += 1;
            updateAlertBubbleText();
            alertBubbleEl.classList.add('visible');
            updateBubblePosition();
        }

        function hideAlert() {
            hasUnreadMessage = false;
            pendingUnreadCount = 0;
            updateAlertBubbleText();
            if (alertBubbleEl) alertBubbleEl.classList.remove('visible');
        }

        function hideOffScreen() {
            mascot.isOffScreen = true;
            mascot.offScreenSince = Date.now();
            mascot.velocityX = 0;
            mascot.velocityY = 0;
            if (isChatOpen) closeChatBubble();
            if (mascotElement) mascotElement.style.display = 'none';
            if (alertBubbleEl) alertBubbleEl.style.display = 'none';
            if (thinkingBubbleEl) thinkingBubbleEl.style.display = 'none';
        }

        function callBackShimeji() {
            if (!mascot.isOffScreen) return;
            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;
            const edge = mascot.offScreenEdge || -1;
            mascot.x = computeCallBackX(edge, size);
            mascot.y = window.innerHeight;
            mascot.isOffScreen = false;
            mascot.offScreenSince = 0;
            mascot.state = State.WALKING_ON;
            mascot.currentAnimation = 'walking';
            mascot.direction = edge === -1 ? 1 : -1;
            mascot.facingRight = mascot.direction > 0;
            mascot.stateTimer = 0;
            mascot.animationFrame = 0;
            mascot.animationTick = 0;
            if (mascotElement) mascotElement.style.display = '';
            if (alertBubbleEl) alertBubbleEl.style.display = '';
            if (thinkingBubbleEl) thinkingBubbleEl.style.display = '';
        }

        function dismissShimeji() {
            if (mascot.isOffScreen) return;
            if (mascot.chatClickTimeout) {
                clearTimeout(mascot.chatClickTimeout);
                mascot.chatClickTimeout = null;
            }
            mascot.lastClickAt = 0;
            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;
            const edge = mascot.x < (window.innerWidth - size) / 2 ? -1 : 1;
            mascot.offScreenEdge = edge;
            mascot.direction = edge;
            mascot.facingRight = edge > 0;
            mascot.state = State.WALKING_OFF;
            mascot.currentAnimation = 'walking';
            mascot.stateTimer = 0;
            mascot.animationFrame = 0;
            mascot.animationTick = 0;
        }

        function showShimejiContextMenu(clientX, clientY) {
            var existing = document.getElementById('shimeji-context-menu');
            if (existing) existing.remove();

            var menu = document.createElement('div');
            menu.id = 'shimeji-context-menu';
            menu.style.cssText = 'position:fixed;z-index:999999;background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:4px 0;min-width:140px;box-shadow:0 4px 16px rgba(0,0,0,0.4);font-family:sans-serif;font-size:13px;left:' + clientX + 'px;top:' + clientY + 'px;';

            var items = mascot.isOffScreen
                ? [{ label: 'Call Back', action: callBackShimeji }]
                : [{ label: 'Dismiss', action: dismissShimeji }];

            items.forEach(function(entry) {
                var item = document.createElement('div');
                item.textContent = entry.label;
                item.style.cssText = 'padding:6px 16px;color:#e0e0e0;cursor:pointer;';
                item.addEventListener('mouseenter', function() { item.style.background = '#2a2a4a'; });
                item.addEventListener('mouseleave', function() { item.style.background = 'none'; });
                item.addEventListener('click', function(e) {
                    e.stopPropagation();
                    menu.remove();
                    entry.action();
                });
                menu.appendChild(item);
            });

            document.body.appendChild(menu);

            var closeMenu = function(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('mousedown', closeMenu, true);
                }
            };
            setTimeout(function() { document.addEventListener('mousedown', closeMenu, true); }, 0);
        }

        function updateBubblePosition() {
            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;
            const mascotTopY = mascot.y - size;
            const mascotCenterX = mascot.x + size / 2;

            if (chatBubbleEl && isChatOpen) {
                const bubbleWidth = config.chatWidthPx ? Number(config.chatWidthPx) : parseInt(widthMap[config.chatWidth] || '280px', 10);
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

            if (micCountdownBubbleEl && micCountdownBubbleEl.classList.contains('visible') && !isChatOpen) {
                const countdownWidth = micCountdownBubbleEl.offsetWidth || 44;
                let left = mascotCenterX - countdownWidth / 2;
                let top = mascotTopY - 60;

                left = Math.max(8, Math.min(left, window.innerWidth - countdownWidth - 8));
                if (top < 8) top = 8;

                micCountdownBubbleEl.style.left = `${left}px`;
                micCountdownBubbleEl.style.top = `${top}px`;
            }

            if (alertBubbleEl && hasUnreadMessage && !isChatOpen) {
                const alertWidth = alertBubbleEl.offsetWidth || 28;
                let left = mascotCenterX - alertWidth / 2;
                let top = mascotTopY - 36;
                if (thinkingBubbleEl && isThinking) {
                    const thinkingHeight = thinkingBubbleEl.offsetHeight || 32;
                    top = mascotTopY - 36 - (thinkingHeight + 10);
                } else if (micCountdownBubbleEl && micCountdownBubbleEl.classList.contains('visible')) {
                    const countdownHeight = micCountdownBubbleEl.offsetHeight || 34;
                    top = mascotTopY - 60 - (countdownHeight + 10);
                }

                left = Math.max(8, Math.min(left, window.innerWidth - alertWidth - 8));
                if (top < 8) top = 8;

                alertBubbleEl.style.left = `${left}px`;
                alertBubbleEl.style.top = `${top}px`;
            }
        }

        function saveConversation() {
            safeStorageLocalSet({ [conversationKey]: conversationHistory });
        }

        function loadConversation(callback) {
            safeStorageLocalGet([conversationKey], (data) => {
                conversationHistory = Array.isArray(data[conversationKey]) ? data[conversationKey] : [];
                const lastAssistant = [...conversationHistory].reverse().find((msg) => msg.role === 'assistant');
                lastAssistantText = lastAssistant ? lastAssistant.content : '';
                if (callback) callback();
            });
        }

        const markdownCopyTextMap = new WeakMap();

        async function copyTextToClipboard(text) {
            const value = String(text || '');
            if (!value) return false;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(value);
                    return true;
                }
            } catch (err) {}
            try {
                const input = document.createElement('textarea');
                input.value = value;
                input.setAttribute('readonly', '');
                input.style.position = 'fixed';
                input.style.opacity = '0';
                input.style.left = '-9999px';
                document.body.appendChild(input);
                input.focus();
                input.select();
                const copied = document.execCommand('copy');
                input.remove();
                return Boolean(copied);
            } catch (err) {
                return false;
            }
        }

        function appendInlineMarkdown(target, rawText) {
            const text = String(rawText || '');
            let i = 0;
            while (i < text.length) {
                if (text[i] === '`') {
                    const end = text.indexOf('`', i + 1);
                    if (end > i + 1) {
                        const codeEl = document.createElement('code');
                        codeEl.className = 'shimeji-chat-inline-code';
                        codeEl.textContent = text.slice(i + 1, end);
                        target.appendChild(codeEl);
                        i = end + 1;
                        continue;
                    }
                }
                if (text.startsWith('**', i) || text.startsWith('__', i)) {
                    const marker = text.slice(i, i + 2);
                    const end = text.indexOf(marker, i + 2);
                    if (end > i + 2) {
                        const strongEl = document.createElement('strong');
                        appendInlineMarkdown(strongEl, text.slice(i + 2, end));
                        target.appendChild(strongEl);
                        i = end + 2;
                        continue;
                    }
                }

                let next = text.length;
                const codeIndex = text.indexOf('`', i);
                const starIndex = text.indexOf('**', i);
                const underscoreIndex = text.indexOf('__', i);
                if (codeIndex !== -1) next = Math.min(next, codeIndex);
                if (starIndex !== -1) next = Math.min(next, starIndex);
                if (underscoreIndex !== -1) next = Math.min(next, underscoreIndex);

                if (next === i) {
                    target.appendChild(document.createTextNode(text[i]));
                    i += 1;
                    continue;
                }

                target.appendChild(document.createTextNode(text.slice(i, next)));
                i = next;
            }
        }

        function appendMarkdownPlainText(container, rawText) {
            const normalized = String(rawText || '').replace(/\r\n?/g, '\n');
            const paragraphs = normalized.split(/\n{2,}/);
            paragraphs.forEach((paragraph) => {
                if (!paragraph) return;
                const paragraphEl = document.createElement('div');
                paragraphEl.className = 'shimeji-chat-md-paragraph';
                const lines = paragraph.split('\n');
                lines.forEach((line, index) => {
                    appendInlineMarkdown(paragraphEl, line);
                    if (index < lines.length - 1) {
                        paragraphEl.appendChild(document.createElement('br'));
                    }
                });
                container.appendChild(paragraphEl);
            });
        }

        function bindMarkdownCopyButtons(rootEl) {
            if (!rootEl) return;
            rootEl.querySelectorAll('.shimeji-chat-code-copy').forEach((btn) => {
                if (btn.dataset.bound === '1') return;
                btn.dataset.bound = '1';
                btn.addEventListener('click', async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const codeText = markdownCopyTextMap.get(btn) || '';
                    const copied = await copyTextToClipboard(codeText);
                    const originalLabel = btn.textContent;
                    btn.textContent = copied
                        ? (isSpanishLocale() ? 'Copiado' : 'Copied')
                        : (isSpanishLocale() ? 'Error' : 'Failed');
                    setTimeout(() => {
                        btn.textContent = originalLabel;
                    }, 1200);
                });
            });
        }

        function buildMarkdownFragment(content) {
            const fragment = document.createDocumentFragment();
            const normalized = String(content || '').replace(/\r\n?/g, '\n');
            const codeBlockRegex = /```([^\n`]*)\n?([\s\S]*?)```/g;
            let match;
            let cursor = 0;

            while ((match = codeBlockRegex.exec(normalized)) !== null) {
                const before = normalized.slice(cursor, match.index);
                appendMarkdownPlainText(fragment, before);

                const rawLang = (match[1] || '').trim();
                const codeText = (match[2] || '').replace(/\n$/, '');
                const blockEl = document.createElement('div');
                blockEl.className = 'shimeji-chat-code-block';

                const headerEl = document.createElement('div');
                headerEl.className = 'shimeji-chat-code-header';

                const labelEl = document.createElement('span');
                labelEl.className = 'shimeji-chat-code-lang';
                labelEl.textContent = rawLang || (isSpanishLocale() ? 'codigo' : 'code');

                const copyBtn = document.createElement('button');
                copyBtn.type = 'button';
                copyBtn.className = 'shimeji-chat-code-copy';
                copyBtn.textContent = isSpanishLocale() ? 'Copiar' : 'Copy';
                markdownCopyTextMap.set(copyBtn, codeText);

                const preEl = document.createElement('pre');
                preEl.className = 'shimeji-chat-code-pre';
                const codeEl = document.createElement('code');
                codeEl.className = 'shimeji-chat-code';
                codeEl.textContent = codeText;
                preEl.appendChild(codeEl);

                headerEl.appendChild(labelEl);
                headerEl.appendChild(copyBtn);
                blockEl.appendChild(headerEl);
                blockEl.appendChild(preEl);
                fragment.appendChild(blockEl);
                cursor = codeBlockRegex.lastIndex;
            }

            const trailing = normalized.slice(cursor);
            appendMarkdownPlainText(fragment, trailing);
            return fragment;
        }

        function renderMarkdownIntoMessage(msgEl, content) {
            if (!msgEl) return;
            msgEl.innerHTML = '';
            msgEl.appendChild(buildMarkdownFragment(content));
            bindMarkdownCopyButtons(msgEl);
        }

        function renderConversationHistory() {
            if (!chatMessagesEl) return;
            chatMessagesEl.innerHTML = '';
            conversationHistory.forEach((msg) => {
                const isUser = msg.role === 'user';
                const msgEl = document.createElement('div');
                msgEl.className = `shimeji-chat-msg ${isUser ? 'user' : 'ai'}`;
                if (!isUser) {
                    renderMarkdownIntoMessage(msgEl, msg.content);
                    lastAssistantText = msg.content;
                } else {
                    msgEl.textContent = msg.content;
                }
                chatMessagesEl.appendChild(msgEl);
            });
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }

        function appendMessage(role, content) {
            if (!chatMessagesEl) return;
            const msgEl = document.createElement('div');
            msgEl.className = `shimeji-chat-msg ${role}`;
            if (role === 'ai') {
                renderMarkdownIntoMessage(msgEl, content);
                lastAssistantText = content;
            } else {
                msgEl.textContent = content;
            }
            chatMessagesEl.appendChild(msgEl);
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }

        function escapeHtml(text) {
            return String(text || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function appendMessageHtml(role, htmlContent, plainTextFallback) {
            if (!chatMessagesEl) return;
            const msgEl = document.createElement('div');
            msgEl.className = `shimeji-chat-msg ${role}`;
            msgEl.innerHTML = htmlContent;
            chatMessagesEl.appendChild(msgEl);
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
            if (role === 'ai') {
                lastAssistantText = plainTextFallback || msgEl.textContent || '';
            }
        }

        function appendStreamingMessage() {
            if (!chatMessagesEl) return null;
            const msgEl = document.createElement('div');
            msgEl.className = 'shimeji-chat-msg ai';
            renderMarkdownIntoMessage(msgEl, '');
            chatMessagesEl.appendChild(msgEl);
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
            return msgEl;
        }

        function updateStreamingMessage(msgEl, content) {
            if (!chatMessagesEl || !msgEl) return;
            renderMarkdownIntoMessage(msgEl, content);
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
            lastAssistantText = content;
        }

        function appendErrorMessage(text) {
            if (!chatMessagesEl) return;
            const msgEl = document.createElement('div');
            msgEl.className = 'shimeji-chat-msg error';
            msgEl.textContent = addWarning(text);
            chatMessagesEl.appendChild(msgEl);
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }

        function addWarning(text) {
            if (!text) return '⚠️';
            const trimmed = text.trim();
            return trimmed.endsWith('⚠️') ? trimmed : `${trimmed} ⚠️`;
        }

        function extractResponseText(response) {
            if (!response) return '';
            if (typeof response === 'string') return response;
            if (typeof response.content === 'string') return response.content;
            if (typeof response.text === 'string') return response.text;
            if (typeof response.message === 'string') return response.message;
            if (response.content && typeof response.content.text === 'string') return response.content.text;
            if (Array.isArray(response.content)) {
                return response.content.map((c) => c?.text || c?.content || c?.value || '').join('');
            }
            return '';
        }

        function handleAiErrorResponse(error, errorType) {
            if (errorType === 'no_credits') {
                appendMessage('ai', addWarning(getNoCreditsMessage()));
                playSoundOrQueue('error');
                return;
            }
            if (errorType === 'locked') {
                appendMessage('ai', addWarning(getLockedMessage()));
                playSoundOrQueue('error');
                return;
            }
            if (errorType === 'no_response') {
                appendMessage('ai', addWarning(getNoResponseMessage()));
                playSoundOrQueue('error');
                return;
            }
            const errorText = error || '';
            // Check for Ollama model not found error
            console.error('AI Error:', errorText, 'Type:', errorType);
            const modelNotFoundMatch = errorText.match(/MODEL_NOT_FOUND:(.+)/);
            const ollamaForbiddenMatch = errorText.match(/OLLAMA_FORBIDDEN:(.+)/);
            const ollamaConnectMatch = errorText.match(/OLLAMA_CONNECT:(.+)/);
            const ollamaHttpOnlyMatch = errorText.match(/OLLAMA_HTTP_ONLY:(.+)/);
            const openclawInvalidUrlMatch = errorText.match(/OPENCLAW_INVALID_URL:(.+)/);
            const openclawAuthMatch = errorText.match(/OPENCLAW_AUTH_FAILED:(.+)/);
            const openclawConnectMatch = errorText.match(/OPENCLAW_CONNECT:(.+)/);
            const openclawTimeoutMatch = errorText.match(/OPENCLAW_TIMEOUT:(.+)/);
            const openclawClosedMatch = errorText.match(/OPENCLAW_CLOSED:(.+)/);
            const openclawErrorMatch = errorText.match(/OPENCLAW_ERROR:(.+)/);
            if (modelNotFoundMatch) {
                const modelName = modelNotFoundMatch[1];
                const command = isSpanishLocale() ? `ollama pull ${modelName}` : `ollama pull ${modelName}`;
                const wslHelp = isSpanishLocale() 
                    ? `\n\nSi estás en WSL, probá: ollama pull ${modelName} && OLLAMA_HOST=0.0.0.0:11434 ollama serve`
                    : `\n\nIf in WSL, try: ollama pull ${modelName} && OLLAMA_HOST=0.0.0.0:11434 ollama serve`;
                const windowsIpHelp = isSpanishLocale()
                    ? '\nO ejecuta: ip route show | grep default | awk \'{print $3}\' y usa esa IP'
                    : '\nOr run: ip route show | grep default | awk \'{print $3}\' and use that IP';
                
                appendMessage('ai', addWarning(
                    (isSpanishLocale() ? `Modelo "${modelName}" no encontrado. Ejecuta: ${command}` : `Model "${modelName}" not found. Run: ${command}`) + wslHelp + windowsIpHelp));
            } else if (ollamaHttpOnlyMatch) {
                const badEndpoint = ollamaHttpOnlyMatch[1] || (config.ollamaUrl || 'http://127.0.0.1:11434');
                appendMessage('ai', addWarning(isSpanishLocale()
                    ? `Ollama en esta extensión usa solo HTTP local. URL inválida: ${badEndpoint}. Usa por ejemplo: http://127.0.0.1:11434`
                    : `This extension only supports local HTTP for Ollama. Invalid URL: ${badEndpoint}. Use for example: http://127.0.0.1:11434`));
            } else if (ollamaForbiddenMatch) {
                const ollamaEndpoint = ollamaForbiddenMatch[1] || (config.ollamaUrl || 'http://127.0.0.1:11434');
                const safeEndpoint = escapeHtml(ollamaEndpoint);
                const command = 'setx OLLAMA_ORIGINS "chrome-extension://*"';
                const safeCommand = escapeHtml(command);
                if (isSpanishLocale()) {
                    const html = `Ollama rechazó la petición (403) en ${safeEndpoint}. Debes permitir el origen de la extensión con OLLAMA_ORIGINS.<br><br>En Windows (PowerShell):<br><strong>${safeCommand}</strong><br>Luego reinicia Ollama y el navegador. ⚠️`;
                    const plain = `Ollama rechazó la petición (403) en ${ollamaEndpoint}. Debes permitir el origen de la extensión con OLLAMA_ORIGINS.\n\nEn Windows (PowerShell):\n${command}\nLuego reinicia Ollama y el navegador. ⚠️`;
                    appendMessageHtml('ai', html, plain);
                } else {
                    const html = `Ollama rejected this request (403) at ${safeEndpoint}. You must allow extension origins via OLLAMA_ORIGINS.<br><br>On Windows (PowerShell):<br><strong>${safeCommand}</strong><br>Then restart Ollama and your browser. ⚠️`;
                    const plain = `Ollama rejected this request (403) at ${ollamaEndpoint}. You must allow extension origins via OLLAMA_ORIGINS.\n\nOn Windows (PowerShell):\n${command}\nThen restart Ollama and your browser. ⚠️`;
                    appendMessageHtml('ai', html, plain);
                }
            } else if (ollamaConnectMatch) {
                const ollamaEndpoint = ollamaConnectMatch[1] || (config.ollamaUrl || 'http://127.0.0.1:11434');
                const wslHint = isSpanishLocale()
                    ? `\nSi está en WSL, iniciá: OLLAMA_HOST=0.0.0.0:11434 ollama serve`
                    : `\nIf running in WSL, start with: OLLAMA_HOST=0.0.0.0:11434 ollama serve`;
                appendMessage('ai', addWarning(isSpanishLocale()
                    ? `No se pudo conectar a Ollama en ${ollamaEndpoint}. Verificá URL y que el servidor esté activo.` + wslHint
                    : `Could not connect to Ollama at ${ollamaEndpoint}. Check URL and that the server is running.` + wslHint));
            } else if (errorText === 'OPENCLAW_MISSING_TOKEN') {
                appendMessage('ai', addWarning(isSpanishLocale()
                    ? 'Falta el token de OpenClaw. Configúralo en el popup (AI Agent). Para obtenerlo ejecuta: openclaw config get gateway.auth.token'
                    : 'OpenClaw token is missing. Set it in the popup (AI Agent). To get it run: openclaw config get gateway.auth.token'));
            } else if (openclawInvalidUrlMatch) {
                const endpoint = openclawInvalidUrlMatch[1] || (config.openclawGatewayUrl || 'ws://127.0.0.1:18789');
                appendMessage('ai', addWarning(isSpanishLocale()
                    ? `URL inválida de OpenClaw: ${endpoint}. Usa por ejemplo ws://127.0.0.1:18789`
                    : `Invalid OpenClaw URL: ${endpoint}. Use for example ws://127.0.0.1:18789`));
            } else if (openclawAuthMatch) {
                const reason = openclawAuthMatch[1] || 'Authentication failed';
                appendMessage('ai', addWarning(isSpanishLocale()
                    ? `OpenClaw rechazó la autenticación: ${reason}. Revisa el token del gateway.`
                    : `OpenClaw authentication failed: ${reason}. Check your gateway token.`));
            } else if (openclawConnectMatch) {
                const endpoint = openclawConnectMatch[1] || (config.openclawGatewayUrl || 'ws://127.0.0.1:18789');
                appendMessage('ai', addWarning(isSpanishLocale()
                    ? `No se pudo conectar a OpenClaw en ${endpoint}. Verifica que el gateway esté activo.`
                    : `Could not connect to OpenClaw at ${endpoint}. Make sure the gateway is running.`));
            } else if (openclawTimeoutMatch) {
                const endpoint = openclawTimeoutMatch[1] || (config.openclawGatewayUrl || 'ws://127.0.0.1:18789');
                appendMessage('ai', addWarning(isSpanishLocale()
                    ? `OpenClaw tardó demasiado en responder (${endpoint}). Intenta de nuevo.`
                    : `OpenClaw timed out (${endpoint}). Try again.`));
            } else if (openclawClosedMatch) {
                const code = openclawClosedMatch[1] || '?';
                appendMessage('ai', addWarning(isSpanishLocale()
                    ? `OpenClaw cerró la conexión (code ${code}). Revisa logs del gateway.`
                    : `OpenClaw closed the connection (code ${code}). Check gateway logs.`));
            } else if (errorText === 'OPENCLAW_EMPTY_RESPONSE' || errorText === 'OPENCLAW_EMPTY_MESSAGE') {
                appendMessage('ai', addWarning(isSpanishLocale()
                    ? 'OpenClaw no devolvió respuesta útil. Intenta de nuevo.'
                    : 'OpenClaw returned no useful response. Try again.'));
            } else if (openclawErrorMatch) {
                const reason = openclawErrorMatch[1] || 'Unknown error';
                appendMessage('ai', addWarning(isSpanishLocale()
                    ? `Error del gateway OpenClaw: ${reason}`
                    : `OpenClaw gateway error: ${reason}`));
            } else if (/No API key set/i.test(errorText)) {
                if (chatMessagesEl) {
                    chatMessagesEl.appendChild(buildNoApiKeyMessageElement(true));
                    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
                } else {
                    appendMessage('ai', addWarning(getNoApiKeyMessage()));
                }
            } else if (/Invalid API key/i.test(errorText)) {
                appendMessage('ai', addWarning(isSpanishLocale()
                    ? 'La API key no es válida. Revisa la key en el popup de la extensión.'
                    : 'Invalid API key. Please check your key in the extension popup.'));
            } else {
                appendMessage('ai', addWarning(isSpanishLocale()
                    ? 'Ocurrió un error al hablar. Revisa tu configuración.'
                    : 'Something went wrong while chatting. Check your settings.'));
            }
            playSoundOrQueue('error');
        }

        function handleMascotClick() {
            if (isDisabled) return;
            if (isChatOpen) {
                closeChatBubble();
            } else {
                openChatBubble();
            }
        }

        function queueMascotClickAction() {
            const now = Date.now();
            const last = mascot.lastClickAt || 0;
            if (last > 0 && now - last <= DOUBLE_CLICK_WINDOW) {
                mascot.lastClickAt = 0;
                if (mascot.chatClickTimeout) {
                    clearTimeout(mascot.chatClickTimeout);
                    mascot.chatClickTimeout = null;
                }
                dismissShimeji();
                return;
            }
            mascot.lastClickAt = now;
            if (mascot.chatClickTimeout) {
                clearTimeout(mascot.chatClickTimeout);
            }
            mascot.chatClickTimeout = setTimeout(() => {
                mascot.chatClickTimeout = null;
                handleMascotClick();
            }, CHAT_CLICK_DELAY);
        }

        function dispatchRelay(text) {
            const relayEvent = new CustomEvent('shimeji-relay', {
                detail: {
                    sourceId: shimejiId,
                    text
                }
            });
            document.dispatchEvent(relayEvent);
        }

        async function sendChatMessageWithText(text, options = {}) {
            clearAutoSendPopup();
            if (!text) return;

            const mode = getMode();
            const locked = await isMasterKeyLocked();
            if (locked) {
                if (chatInputEl) chatInputEl.value = '';
                appendMessage('user', text);
                conversationHistory.push({ role: 'user', content: text });
                saveConversation();
                appendMessage('ai', getLockedMessage());
                conversationHistory.push({ role: 'assistant', content: getLockedMessage() });
                saveConversation();
                playSoundOrQueue('error');
                return;
            }
            if (mode === 'off') {
                if (chatInputEl) chatInputEl.value = '';
                appendMessage('ai', isSpanishLocale() ? 'Aun no estoy configurado. Usa el popup para darme vida.' : 'I am not configured yet. Use the popup to bring me to life.');
                playSoundOrQueue('error');
                return;
            }
            cancelSpeech();

            if (chatInputEl) chatInputEl.value = '';
            appendMessage('user', text);
            conversationHistory.push({ role: 'user', content: text });
            saveConversation();

            showThinking();

            const provider = config.standardProvider || 'openrouter';
            const shouldStream = mode === 'standard' && (provider === 'openrouter' || provider === 'ollama');
            console.log('Chat config:', { mode, provider, shouldStream, ollamaUrl: config.ollamaUrl, ollamaModel: config.ollamaModel });

            if (shouldStream) {
                const streamEl = appendStreamingMessage();
                const port = safeRuntimeConnect('aiChatStream');
                if (!port) {
                    hideThinking();
                    appendMessage('ai', addWarning(isSpanishLocale()
                        ? 'No pude comunicarme con la extensión. Recarga la página.'
                        : 'Could not reach extension. Try reloading the page.'));
                    playSoundOrQueue('error');
                    return;
                }

                let responseText = '';
                let finished = false;

                const finalizeResponse = (text) => {
                    if (finished) return;
                    finished = true;
                    hideThinking();
                    if (!text) {
                        appendMessage('ai', addWarning(getNoResponseMessage()));
                        playSoundOrQueue('error');
                        return;
                    }
                    updateStreamingMessage(streamEl, text);
                    conversationHistory.push({ role: 'assistant', content: text });
                    saveConversation();
                    if (!config.ttsEnabled) {
                        playSoundOrQueue('success');
                    }
                    if (isChatOpen) {
                        const openMicAfter = config.openMicEnabled;
                        if (config.ttsEnabled) {
                            enqueueSpeech(text, openMicAfter ? () => {
                                if (!config.openMicEnabled || isListening) return;
                                startVoiceInput({ continuous: true, allowAutoRestart: true });
                            } : null);
                        } else if (openMicAfter) {
                            setTimeout(() => {
                                if (config.openMicEnabled && !isListening) {
                                    startVoiceInput({ continuous: true, allowAutoRestart: true });
                                }
                            }, 300);
                        }
                    } else {
                        pendingSpeechText = text;
                        if (config.openMicEnabled && !isListening) {
                            setTimeout(() => {
                                if (config.openMicEnabled && !isListening) {
                                    startVoiceInput({ continuous: true, allowAutoRestart: true });
                                }
                            }, 300);
                        }
                    }
                    if (config.relayEnabled && !options.isRelay) {
                        dispatchRelay(text);
                    }
                    if (!isChatOpen) {
                        showAlert();
                    }
                };

                port.onMessage.addListener((msg) => {
                    if (!msg) return;
                    if (msg.type === 'delta') {
                        if (!responseText && (msg.text || msg.full)) {
                            hideThinking();
                        }
                        responseText = msg.full || (responseText + (msg.text || ''));
                        updateStreamingMessage(streamEl, responseText);
                        return;
                    }
                    if (msg.type === 'done') {
                        responseText = msg.text || responseText;
                        finalizeResponse(responseText);
                        try { port.disconnect(); } catch (e) {}
                        return;
                    }
                    if (msg.type === 'error') {
                        hideThinking();
                        if (streamEl && !responseText) streamEl.remove();
                        handleAiErrorResponse(msg.error, msg.errorType);
                        try { port.disconnect(); } catch (e) {}
                    }
                });

                port.onDisconnect.addListener(() => {
                    if (finished) return;
                    const runtimeError = safeRuntimeLastError();
                    console.error('Port disconnected:', runtimeError);
                    if (responseText) {
                        finalizeResponse(responseText);
                    } else {
                        hideThinking();
                        if (runtimeError) {
                            appendMessage('ai', addWarning(isSpanishLocale() 
                                ? `Error de conexión: ${runtimeError.message || 'Verifica que Ollama esté corriendo'}`
                                : `Connection error: ${runtimeError.message || 'Check that Ollama is running'}`));
                        } else {
                            appendMessage('ai', addWarning(getNoResponseMessage()));
                        }
                        playSoundOrQueue('error');
                    }
                });

                port.postMessage({ type: 'start', messages: conversationHistory, shimejiId });
                return;
            }

            safeRuntimeSendMessage(
                { type: 'aiChat', messages: conversationHistory, shimejiId },
                (response) => {
                    hideThinking();
                    const runtimeError = safeRuntimeLastError();
                    if (runtimeError) {
                        appendMessage('ai', addWarning(isSpanishLocale()
                            ? 'No pude comunicarme con la extensión. Recarga la página.'
                            : 'Could not reach extension. Try reloading the page.'));
                        playSoundOrQueue('error');
                        return;
                    }
                    if (response && response.error) {
                        handleAiErrorResponse(response.error, response.errorType);
                        return;
                    }
                    const responseText = extractResponseText(response);
                    if (responseText) {
                        conversationHistory.push({ role: 'assistant', content: responseText });
                        saveConversation();
                        appendMessage('ai', responseText);
                        if (!config.ttsEnabled) {
                            playSoundOrQueue('success');
                        }
                        if (isChatOpen) {
                            const openMicAfter = config.openMicEnabled;
                            enqueueSpeech(responseText, openMicAfter ? () => {
                                if (!config.openMicEnabled || isListening) return;
                                startVoiceInput({ continuous: true, allowAutoRestart: true });
                            } : null);
                            // If TTS is off but open mic is on, start listening after a short delay
                            if (openMicAfter && !config.ttsEnabled) {
                                setTimeout(() => {
                                    if (config.openMicEnabled && !isListening) {
                                        startVoiceInput({ continuous: true, allowAutoRestart: true });
                                    }
                                }, 300);
                            }
                        } else {
                            pendingSpeechText = responseText;
                            if (config.openMicEnabled && !isListening) {
                                setTimeout(() => {
                                    if (config.openMicEnabled && !isListening) {
                                        startVoiceInput({ continuous: true, allowAutoRestart: true });
                                    }
                                }, 300);
                            }
                        }
                        if (config.relayEnabled && !options.isRelay) {
                            dispatchRelay(responseText);
                        }
                        if (!isChatOpen) {
                            showAlert();
                        }
                    } else if (response && !response.error) {
                        appendMessage('ai', addWarning(isSpanishLocale()
                            ? 'No llegó una respuesta válida del agente.'
                            : 'No valid response received from the agent.'));
                        playSoundOrQueue('error');
                    }
                }
            );
        }

        function needsApiKeyForChat() {
            const mode = getMode();
            if (mode !== 'standard') return false;
            const provider = config.standardProvider || 'openrouter';
            if (provider !== 'openrouter') return false;
            return !((config.openrouterApiKey || '').trim() || config.openrouterApiKeyEnc);
        }

        function hasOpenRouterCredential(cfg = config) {
            return Boolean((cfg.openrouterApiKey || '').trim() || cfg.openrouterApiKeyEnc);
        }

        function hasOpenClawCredential(cfg = config) {
            return Boolean((cfg.openclawGatewayToken || '').trim() || cfg.openclawGatewayTokenEnc);
        }

        function hasAnyApiCredential(cfg = config) {
            return hasOpenRouterCredential(cfg) || hasOpenClawCredential(cfg);
        }

        function getApiReadyGreetingMessage() {
            return isSpanishLocale()
                ? '¡Listo! Ya tengo tu API key y estoy listo para conversar contigo.'
                : 'All set! I have your API key and I am ready to chat with you.';
        }

        function appendApiReadyGreetingMessage() {
            const msg = getApiReadyGreetingMessage();
            appendMessage('ai', msg);
            conversationHistory.push({ role: 'assistant', content: msg });
            saveConversation();
            playSoundOrQueue('success');
        }

        function announceReadyAfterApiKeyLoad() {
            if (isDisabled) return;
            if (isChatOpen) {
                appendApiReadyGreetingMessage();
                return;
            }
            pendingApiReadyGreeting = true;
            openChatBubble();
        }

        function scheduleNoKeyNudge() {
            if (!isPrimary || noKeyNudgeShown) return;
            if (noKeyNudgeTimer) {
                clearTimeout(noKeyNudgeTimer);
                noKeyNudgeTimer = null;
            }
            if (!needsApiKeyForChat()) return;
            noKeyNudgeTimer = setTimeout(() => {
                noKeyNudgeTimer = null;
                if (noKeyNudgeShown) return;
                if (!needsApiKeyForChat()) return;
                noKeyNudgeShown = true;
                ensureNoApiKeyNudgeMessage();
                if (!isChatOpen) {
                    showAlert();
                    playSoundOrQueue('error');
                }
            }, 4000);
        }

        function getAnimationDuration(name) {
            const anim = animationSet[name];
            if (!anim || !anim.length) return 0;
            return anim.reduce((sum, frame) => sum + frame.duration, 0) * TICK_MS;
        }

        function startChatLegWiggle() {
            if (chatWiggleTimer || mascot.state !== State.SITTING) return;
            const duration = getAnimationDuration('sittingEdge');
            if (!duration) return;
            mascot.currentAnimation = 'sittingEdge';
            mascot.animationFrame = 0;
            mascot.animationTick = 0;
            chatWiggleTimer = setTimeout(() => {
                chatWiggleTimer = null;
                if (mascot.state === State.SITTING && isChatOpen) {
                    mascot.currentAnimation = 'sitting';
                    mascot.animationFrame = 0;
                    mascot.animationTick = 0;
                }
            }, duration);
        }

        async function safeSendChatMessage() {
            try {
                await sendChatMessage();
            } catch (error) {
                console.error('Failed to send chat message', error);
                appendErrorMessage(isSpanishLocale()
                    ? 'No pude enviar el mensaje. Recarga la extensión o la página.'
                    : 'Could not send the message. Reload the extension or the page.');
                playSoundOrQueue('error');
            }
        }

        async function sendChatMessage() {
            const text = (chatInputEl ? chatInputEl.value : micDraftText || '').trim();
            if (!text) return;
            if (chatInputEl) {
                chatInputEl.value = '';
            }
            micDraftText = '';
            await sendChatMessageWithText(text);
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

            if (isChatOpen && (mascot.state === State.CLIMBING_WALL || mascot.state === State.CLIMBING_CEILING)) {
                // Freeze on walls/ceiling while chat is open so the bubble doesn't drift.
                mascot.velocityX = 0;
                mascot.velocityY = 0;
                return;
            }

            if (isChatOpen && (mascot.state === State.SITTING || mascot.state === State.HEAD_SPIN || mascot.state === State.SPRAWLED)) {
                if (mascot.state === State.SITTING) {
                    mascot.stateTimer++;
                    if (!chatWiggleTimer) {
                        if (supportedAnimations.has('sittingLookUp') && lastCursorY !== null && lastCursorY < window.innerHeight / 2) {
                            mascot.currentAnimation = 'sittingLookUp';
                        } else if (mascot.currentAnimation !== 'sittingEdge') {
                            mascot.currentAnimation = 'sitting';
                        }
                    }
                    if (supportedAnimations.has('sittingEdge') && mascot.stateTimer > 70 && Math.random() < 0.02) {
                        startChatLegWiggle();
                        mascot.stateTimer = 0;
                    }
                    if (supportedAnimations.has('headSpin') && mascot.stateTimer > 90 && Math.random() < 0.02) {
                        mascot.state = State.HEAD_SPIN;
                        mascot.currentAnimation = 'headSpin';
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    return;
                }
                if (mascot.state === State.HEAD_SPIN) {
                    mascot.stateTimer++;
                    const hsAnim = animationSet.headSpin;
                    const hsDuration = hsAnim.reduce((sum, f) => sum + f.duration, 0);
                    if (mascot.stateTimer >= hsDuration) {
                        mascot.state = State.SITTING;
                        mascot.currentAnimation = 'sitting';
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    return;
                }
                if (mascot.state === State.SPRAWLED) {
                    mascot.stateTimer++;
                    if (mascot.stateTimer > 150 && Math.random() < 0.02) {
                        mascot.state = State.SITTING;
                        mascot.currentAnimation = 'sitting';
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    return;
                }
            }

            switch (mascot.state) {
                case State.IDLE:
                    mascot.stateTimer++;
                    // Small chance to walk off-screen (only when chat is closed)
                    if (!isChatOpen && mascot.stateTimer > 80 && Math.random() < 0.003) {
                        const edge = Math.random() < 0.5 ? -1 : 1;
                        mascot.offScreenEdge = edge;
                        mascot.direction = edge;
                        mascot.facingRight = edge > 0;
                        mascot.state = State.WALKING_OFF;
                        mascot.currentAnimation = 'walking';
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                        break;
                    }
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
                        } else if (roll < 0.78 && supportedAnimations.has('crawling')) {
                            mascot.state = State.CRAWLING;
                            mascot.currentAnimation = 'crawling';
                            mascot.direction = Math.random() > 0.5 ? 1 : -1;
                            mascot.facingRight = mascot.direction > 0;
                        } else if (roll < 0.80 && supportedAnimations.has('jumping')) {
                            mascot.state = State.JUMPING;
                            mascot.currentAnimation = 'jumping';
                            mascot.velocityY = -14;
                            mascot.velocityX = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 2);
                            mascot.facingRight = mascot.velocityX > 0;
                        } else if (roll < 0.90 && supportedAnimations.has('headSpin')) {
                            mascot.state = State.HEAD_SPIN;
                            mascot.currentAnimation = 'headSpin';
                        } else if (supportedAnimations.has('sprawled')) {
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
                        if (supportedAnimations.has('climbingWall') && Math.random() < 0.4) {
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
                        if (supportedAnimations.has('climbingWall') && Math.random() < 0.4) {
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
                    const landingAnim = animationSet.landing;
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
                    if (supportedAnimations.has('sittingLookUp') && lastCursorY !== null && lastCursorY < window.innerHeight / 2) {
                        mascot.currentAnimation = 'sittingLookUp';
                    } else {
                        mascot.currentAnimation = 'sitting';
                    }
                    if (supportedAnimations.has('headSpin') && mascot.stateTimer > 100 && Math.random() < 0.01) {
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
                    const hsAnim = animationSet.headSpin;
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
                        if (supportedAnimations.has('climbingCeiling')) {
                            mascot.y = size;
                            mascot.state = State.CLIMBING_CEILING;
                            mascot.currentAnimation = 'climbingCeiling';
                            mascot.stateTimer = 0;
                            mascot.animationFrame = 0;
                            mascot.animationTick = 0;
                            break;
                        }
                        // No ceiling sprites — fall instead
                        mascot.state = State.FALLING;
                        mascot.currentAnimation = 'falling';
                        mascot.velocityY = 0;
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
                    if (supportedAnimations.has('sittingEdge') && mascot.stateTimer > 75 && Math.random() < 0.01) {
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

                case State.WALKING_OFF: {
                    mascot.stateTimer++;
                    mascot.x += PHYSICS.walkSpeed * mascot.direction;
                    mascot.y = groundY;
                    if (mascot.x < -size * 2 || mascot.x > rightBound + size * 2) {
                        hideOffScreen();
                    }
                    break;
                }

                case State.WALKING_ON: {
                    mascot.stateTimer++;
                    mascot.x += PHYSICS.walkSpeed * mascot.direction;
                    mascot.y = groundY;
                    const midZone = window.innerWidth * (0.3 + Math.random() * 0.001);
                    if ((mascot.direction > 0 && mascot.x >= midZone) ||
                        (mascot.direction < 0 && mascot.x <= window.innerWidth - midZone)) {
                        mascot.state = State.IDLE;
                        mascot.currentAnimation = 'idle';
                        mascot.stateTimer = 0;
                        mascot.animationFrame = 0;
                        mascot.animationTick = 0;
                    }
                    break;
                }

                case State.DRAGGED:
                    break;
            }

            // Skip boundary clamping when walking off/on screen
            if (mascot.state === State.WALKING_OFF || mascot.state === State.WALKING_ON) return;
            mascot.x = Math.max(leftBound, Math.min(mascot.x, rightBound));
        }

        function updateAnimation() {
            if (mascot.isDragging) return;

            if (!animationSet[mascot.currentAnimation]) {
                mascot.currentAnimation = 'idle';
                mascot.animationTick = 0;
                mascot.animationFrame = 0;
            }
            const animation = animationSet[mascot.currentAnimation];
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
            queuePositionSave();
        }

        function gameLoop() {
            if (mascot.isOffScreen) return;
            updateState();
            updateAnimation();
            updatePosition();
        }

        function resetMascotState() {
            const scale = sizes[currentSize].scale;
            const size = SPRITE_SIZE * scale;
            const maxX = Math.max(0, window.innerWidth - size);

            mascot.x = Math.random() * maxX;
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
            armAudioUnlock();

            safeStorageLocalGet(['shimejiLastPos'], (data) => {
                const saved = data.shimejiLastPos && data.shimejiLastPos[shimejiId];
            preloadSprites().then(() => {
                if (isDisabled) return;

                animationSet = buildFilteredAnimationSet(animationQuality === 'simple' ? ANIMATIONS_SIMPLE : ANIMATIONS_FULL);
                const applied = applySavedPosition(saved);
                if (!applied) {
                    resetMascotState();
                }
                    createMascot();
                    createChatBubble();
                    createThinkingBubble();
                    createAlertBubble();
                    loadSoundBuffers();
                    scheduleNoKeyNudge();
                    if (getChatOpenState()) {
                        openChatBubble();
                    }

                    gameLoopTimer = setInterval(gameLoop, TICK_MS);

                    setTimeout(() => {
                        updateSpriteDisplay();
                        updatePosition();
                    }, 100);
                });
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
            if (noKeyNudgeTimer) {
                clearTimeout(noKeyNudgeTimer);
                noKeyNudgeTimer = null;
            }
            if (chatWiggleTimer) {
                clearTimeout(chatWiggleTimer);
                chatWiggleTimer = null;
            }

            stopVoiceInput();
            cancelSpeech();
            mascot.isDragging = false;
            mascot.dragPending = false;
            mascot.isResisting = false;

            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
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
            if (micCountdownBubbleEl) {
                micCountdownBubbleEl.remove();
                micCountdownBubbleEl = null;
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
            CHARACTER_BASE = safeRuntimeGetURL('characters/' + currentCharacter + '/') || CHARACTER_BASE;
            if (currentCharacter === 'egg') {
                animationQuality = 'simple';
            } else {
                animationQuality = config.animationQuality === 'simple' ? 'simple' : 'full';
            }
            animationSet = animationQuality === 'simple' ? ANIMATIONS_SIMPLE : ANIMATIONS_FULL;
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
            stopVoiceInput();
            cancelSpeech();
            clearAutoSendPopup();
            if (gameLoopTimer) {
                clearInterval(gameLoopTimer);
                gameLoopTimer = null;
            }
            if (chatWiggleTimer) {
                clearTimeout(chatWiggleTimer);
                chatWiggleTimer = null;
            }
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            if (chatBubbleEl) { chatBubbleEl.remove(); chatBubbleEl = null; }
            if (thinkingBubbleEl) { thinkingBubbleEl.remove(); thinkingBubbleEl = null; }
            if (alertBubbleEl) { alertBubbleEl.remove(); alertBubbleEl = null; }
            if (micCountdownBubbleEl) { micCountdownBubbleEl.remove(); micCountdownBubbleEl = null; }
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
            callBack: callBackShimeji,
            dismiss: dismissShimeji,
            isOffScreen() { return mascot.isOffScreen; },
            applyVisibilityState,
            applyStoredPosition(saved) {
                if (!saved) return;
                if (mascot.isDragging || isResizing) return;
                if (isChatOpen) return;
                if (!mascotElement) return;
                if (applySavedPosition(saved)) {
                    lastSavedPos = { x: mascot.x, y: mascot.y };
                    updatePosition();
                }
            },
            showOnboardingHint() {
                if (visibilityState.disabledAll) return;
                pendingOnboardingGreeting = true;
                openChatBubble();
                playSoundOrQueue('success');
            },
            updateConfig(nextConfig) {
                const prevCharacter = config.character;
                const prevPersonality = config.personality;
                const prevTtsEnabled = !!config.ttsEnabled;
                const prevTtsProfile = config.ttsVoiceProfile;
                const prevAnimationQuality = animationQuality;
                const prevHadApiCredentials = hasAnyApiCredential(config);
                config = {
                    ...nextConfig,
                    mode: normalizeMode(nextConfig.mode)
                };
                const nextHasApiCredentials = hasAnyApiCredential(config);
                currentSize = config.size || currentSize;
                updateMascotStyle();
                applyChatStyle();
                updateChatMeta();
                const charChanged = config.character && config.character !== currentCharacter;
                const personalityChanged = config.personality !== prevPersonality;
                const ttsProfileChanged = prevTtsProfile && config.ttsVoiceProfile && prevTtsProfile !== config.ttsVoiceProfile;
                const nextAnimationQuality = (config.character === 'egg')
                    ? 'simple'
                    : (config.animationQuality === 'simple' ? 'simple' : 'full');
                if (prevAnimationQuality !== nextAnimationQuality) {
                    animationQuality = nextAnimationQuality;
                    animationSet = animationQuality === 'simple' ? ANIMATIONS_SIMPLE : ANIMATIONS_FULL;
                    if (spritesLoaded) {
                        animationSet = buildFilteredAnimationSet(animationSet);
                    }
                    updateSpriteDisplay();
                }
                if (charChanged) {
                    currentCharacter = config.character;
                    CHARACTER_BASE = safeRuntimeGetURL('characters/' + currentCharacter + '/') || CHARACTER_BASE;
                    spritesLoaded = false;
                    spritesLoadedPromise = null;
                    preloadSprites().then(() => {
                        animationSet = buildFilteredAnimationSet(animationQuality === 'simple' ? ANIMATIONS_SIMPLE : ANIMATIONS_FULL);
                        updateSpriteDisplay();
                    });
                }
                if (charChanged || personalityChanged) {
                    invalidateSoundBuffers();
                    loadSoundBuffers();
                }
                if (ttsProfileChanged) {
                    config.ttsVoiceId = '';
                }
                if (!prevTtsEnabled && config.ttsEnabled && !config.ttsVoiceId) {
                    ensureVoiceForTts().catch(() => {});
                }
                if (!prevTtsEnabled && config.ttsEnabled && lastAssistantText) {
                    const openMicAfter = config.openMicEnabled;
                    enqueueSpeech(lastAssistantText, openMicAfter ? () => {
                        if (!config.openMicEnabled || isListening) return;
                        startVoiceInput({ continuous: true, allowAutoRestart: true });
                    } : null);
                }
                updateTtsToggleBtnVisual();
                updateQuickTtsBtnVisual();
                updateOpenMicBtnVisual();
                updateTtsClosedBtnVisual();
                if (syncThemeInputsFn) {
                    syncThemeInputsFn();
                } else if (chatThemePanelEl) {
                    const colorInput = chatThemePanelEl.querySelector('.shimeji-chat-theme-color');
                    const bgInput = chatThemePanelEl.querySelector('.shimeji-chat-theme-bg');
                    if (colorInput) colorInput.value = config.chatThemeColor || '#2a1f4e';
                    if (bgInput) bgInput.value = config.chatBgColor || '#ffffff';
                }
                if (!prevHadApiCredentials && nextHasApiCredentials) {
                    announceReadyAfterApiKeyLoad();
                }
                scheduleNoKeyNudge();
            },
            setPrimary(value) {
                isPrimary = !!value;
                scheduleNoKeyNudge();
            }
        };
    }

    let runtimes = [];
    let visibilityState = { disabledAll: false, disabledPages: [] };

    function syncRuntimes(shimejiConfigs) {
        const nextEnabled = shimejiConfigs.filter(c => c && c.enabled !== false);
        const nextIds = new Set(nextEnabled.map(c => c.id));

        if (nextEnabled.length === 0) {
            runtimes.forEach((runtime) => runtime.destroy());
            runtimes = [];
            return;
        }

        // Remove runtimes that no longer exist
        runtimes = runtimes.filter((runtime) => {
            if (!nextIds.has(runtime.id)) {
                runtime.destroy();
                return false;
            }
            return true;
        });

        // Update existing or add new
        nextEnabled.forEach((config, index) => {
            const existing = runtimes.find(r => r.id === config.id);
            if (existing) {
                existing.updateConfig(config);
                if (typeof existing.setPrimary === 'function') {
                    existing.setPrimary(index === 0);
                }
            } else {
                runtimes.push(createShimejiRuntime(config, visibilityState, { isPrimary: index === 0 }));
            }
        });
    }

    function initManager() {
        safeStorageSyncGet([STORAGE_KEYS.disabledAll, STORAGE_KEYS.disabledPages], (syncData) => {
            visibilityState.disabledAll = !!syncData[STORAGE_KEYS.disabledAll];
            visibilityState.disabledPages = syncData[STORAGE_KEYS.disabledPages] || [];

            safeStorageLocalGet(['shimejiLanguage'], (data) => {
                uiLanguage = data.shimejiLanguage || detectBrowserLanguage();
                safeStorageLocalSet({ shimejiLanguage: uiLanguage });
            });

            loadShimejiConfigs((configs) => {
                syncRuntimes(configs);
                safeStorageLocalGet(['onboardingGreetingShown'], (data) => {
                    if (data.onboardingGreetingShown) return;
                    safeStorageLocalSet({ onboardingGreetingShown: true });
                    setTimeout(() => {
                        const target = runtimes[0];
                        if (target && typeof target.showOnboardingHint === 'function') {
                            target.showOnboardingHint();
                        }
                    }, 4000);
                });
            });
        });
    }

    function applyPositionsFromStorage() {
        safeStorageLocalGet(['shimejiLastPos'], (data) => {
            const map = data.shimejiLastPos && typeof data.shimejiLastPos === 'object' ? data.shimejiLastPos : {};
            runtimes.forEach((runtime) => {
                if (typeof runtime.applyStoredPosition === 'function') {
                    runtime.applyStoredPosition(map[runtime.id]);
                }
            });
        });
    }

    try {
        if (isExtensionContextValid()) {
    try {
        if (isExtensionContextValid()) {
            chrome.storage.onChanged.addListener((changes, areaName) => {
            if (extensionInvalidated || !isExtensionContextValid()) return;
            if (areaName === 'sync' && (changes.disabledAll || changes.disabledPages)) {
                safeStorageSyncGet([STORAGE_KEYS.disabledAll, STORAGE_KEYS.disabledPages], (data) => {
                    visibilityState.disabledAll = !!data[STORAGE_KEYS.disabledAll];
                    visibilityState.disabledPages = data[STORAGE_KEYS.disabledPages] || [];
                    runtimes.forEach((runtime) => runtime.applyVisibilityState(visibilityState.disabledAll, visibilityState.disabledPages));
                });
            }

                if (areaName === 'local' && changes.shimejis) {
                    const next = Array.isArray(changes.shimejis.newValue) ? changes.shimejis.newValue : [];
                    syncRuntimes(next.slice(0, MAX_SHIMEJIS));
                }

            if (areaName === 'local' && changes.shimejiLanguage) {
                const nextLang = changes.shimejiLanguage.newValue;
                if (nextLang === 'es' || nextLang === 'en') {
                    uiLanguage = nextLang;
                }
            }
            });
        }
    } catch (e) {
        extensionInvalidated = true;
    }
        }
    } catch (e) {
        extensionInvalidated = true;
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        applyPositionsFromStorage();
    });

    try {
        if (isExtensionContextValid()) {
    try {
        if (isExtensionContextValid()) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (extensionInvalidated || !isExtensionContextValid()) return false;
            if (message.action === 'shutdownShimejis') {
                try {
                    if (typeof window.__shimejiCleanup === 'function') {
                        window.__shimejiCleanup();
                    }
                } catch (e) {}
                sendResponse({ ok: true });
                return true;
            }
            if (message.action === 'refreshShimejis') {
                loadShimejiConfigs((configs) => {
                    syncRuntimes(configs);
                });
                sendResponse({ ok: true });
                return true;
            }
            if (message.action === 'callBackShimejis') {
                runtimes.forEach((runtime) => {
                    if (runtime.isOffScreen()) runtime.callBack();
                });
                sendResponse({ ok: true });
                return true;
            }
            if (message.action === 'callBackShimeji') {
                const target = runtimes.find((r) => r.id === message.shimejiId);
                if (target && target.isOffScreen()) target.callBack();
                sendResponse({ ok: true });
                return true;
            }
            if (message.action === 'dismissShimejis') {
                runtimes.forEach((runtime) => {
                    if (!runtime.isOffScreen()) runtime.dismiss();
                });
                sendResponse({ ok: true });
                return true;
            }
            if (message.action === 'dismissShimeji') {
                const target = runtimes.find((r) => r.id === message.shimejiId);
                if (target && !target.isOffScreen()) target.dismiss();
                sendResponse({ ok: true });
                return true;
            }
            return false;
            });
        }
    } catch (e) {
        extensionInvalidated = true;
    }
        }
    } catch (e) {
        extensionInvalidated = true;
    }

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
