// Content script for Shimeji with state machine and individual sprites

(function() {
    // Clean up any previous instance (e.g., after extension reinstall/update)
    if (window.__shimejiCleanup) {
        try { window.__shimejiCleanup(); } catch(e) {}
    }
    window.__shimejiInitialized = true;

    // --- Configuration ---
    const SPRITE_SIZE = 128; // Original sprite size
    const TICK_MS = 40; // ~25 FPS (original Shimeji timing)

    const sizes = {
        small: { scale: 0.5 },    // 64px
        medium: { scale: 0.75 },  // 96px
        big: { scale: 1.0 },      // 128px
    };

    // Physics constants from original Shimeji
    const PHYSICS = {
        gravity: 2,
        walkSpeed: 2,
        fallTerminalVelocity: 20
    };

    // States
    const State = {
        IDLE: 'idle',
        WALKING: 'walking',
        FALLING: 'falling',
        LANDING: 'landing',
        SITTING: 'sitting',
        DRAGGED: 'dragged'
    };

    // Sprite paths (relative to character folder)
    const SPRITES = {
        'stand-neutral': 'stand-neutral.png',
        'walk-step-left': 'walk-step-left.png',
        'walk-step-right': 'walk-step-right.png',
        'fall': 'fall.png',
        'bounce-squish': 'bounce-squish.png',
        'bounce-recover': 'bounce-recover.png',
        'sit': 'sit.png',
        'dragged-tilt-left': 'dragged-tilt-left-light.png',
        'dragged-tilt-right': 'dragged-tilt-right-light.png',
        'resist-frame-1': 'resist-frame-1.png',
        'resist-frame-2': 'resist-frame-2.png'
    };

    // Animation sequences (sprite name, duration in ticks)
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
        falling: [
            { sprite: 'fall', duration: 1 }
        ],
        landing: [
            { sprite: 'bounce-squish', duration: 4 },
            { sprite: 'bounce-recover', duration: 4 }
        ],
        sitting: [
            { sprite: 'sit', duration: 1 }
        ]
    };

    // Character base path (updated dynamically on character switch)
    let currentCharacter = 'shimeji';
    let CHARACTER_BASE = chrome.runtime.getURL('characters/shimeji/');

    // Mascot state
    let mascotElement;
    let currentSize = 'medium';
    let isDisabled = false;
    let gameLoopTimer = null;
    let spritesLoadedPromise = null;
    let documentDragListenersReady = false;

    const STORAGE_KEYS = {
        disabledAll: 'disabledAll',
        disabledPages: 'disabledPages'
    };

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

    const mascot = {
        x: window.innerWidth / 2,
        y: 0, // Y position of feet (ground = window.innerHeight)
        velocityX: 0,
        velocityY: 0,
        state: State.FALLING, // Start falling from sky
        facingRight: false,
        direction: 0, // -1 left, 0 none, 1 right

        // Animation state
        currentAnimation: 'falling',
        animationFrame: 0,
        animationTick: 0,

        // Drag state
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,

        // Click vs drag detection
        dragPending: false,
        dragStartX: 0,
        dragStartY: 0,

        // Drag animation state
        prevDragX: 0,           // Previous X position for velocity calculation
        smoothedVelocityX: 0,   // Smoothed horizontal velocity
        dragTick: 0,            // Tick counter during drag
        isResisting: false,     // Whether currently playing resist animation
        resistAnimTick: 0,      // Current tick in resist animation

        // Behavior timers
        stateTimer: 0
    };

    // Preloaded sprite images
    const spriteImages = {};
    let spritesLoaded = false;

    // --- Chat State ---
    let chatBubbleEl = null;
    let thinkingBubbleEl = null;
    let alertBubbleEl = null;
    let inlineThinkingEl = null;
    let chatMessagesEl = null;
    let chatInputEl = null;
    let chatMetaEl = null;
    let conversationHistory = []; // {role, content} array for API
    let isChatOpen = false;
    let isThinking = false;
    let hasUnreadMessage = false;
    let proactiveEnabled = false;
    let proactiveTimer = null;

    function isSpanishLocale() {
        const locale = (navigator.language || '').toLowerCase();
        return locale.startsWith('es');
    }

    function getNoApiKeyMessage() {
        return isSpanishLocale()
            ? 'Shimeji quiere estar vivo. Para eso necesita tu API key. Recomendado: OpenRouter (tiene version gratuita). OpenAI como segunda opcion.'
            : 'Shimeji wants to be alive. It needs your API key. Recommended: OpenRouter (has a free tier). OpenAI as a second option.';
    }

    function getNoCreditsMessage() {
        return isSpanishLocale()
            ? 'No puedo hablar sin creditos. Necesito que cargues creditos en tu cuenta para seguir vivo.'
            : 'I cannot speak without credits. Please add credits to your account so I can stay alive.';
    }

    function getNoResponseMessage() {
        return isSpanishLocale()
            ? 'No pude recibir respuesta. Puede ser falta de creditos o conexion. Si puedes, revisa tu saldo.'
            : 'I could not get a response. It may be a lack of credits or a connection issue. Please check your balance.';
    }

    function ensureNoApiKeyOnboardingMessage() {
        if (!chatMessagesEl) return;

        const existing = document.getElementById('shimeji-no-api-key-msg');
        if (existing) existing.remove();

        const msgEl = document.createElement('div');
        msgEl.id = 'shimeji-no-api-key-msg';
        msgEl.className = 'shimeji-chat-msg ai';

        const isEs = isSpanishLocale();
        const prefix = isEs
            ? 'Shimeji quiere estar vivo. Para eso necesita tu API key. Recomendado: OpenRouter (tiene version gratuita). Consiguela en '
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

    // --- Font Injection ---
    function injectFontIfNeeded() {
        if (document.getElementById('shimeji-nunito-font')) return;
        const link = document.createElement('link');
        link.id = 'shimeji-nunito-font';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap';
        document.head.appendChild(link);
    }

    // --- Sprite Loading ---
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
            console.log('All Shimeji sprites loaded');
        });

        return spritesLoadedPromise;
    }

    // --- Mascot Creation ---
    function createMascot() {
        const existingMascot = document.getElementById('shimeji-mascot');
        if (existingMascot) {
            mascotElement = existingMascot;
            updateMascotStyle();
            return;
        }

        mascotElement = document.createElement('div');
        mascotElement.id = 'shimeji-mascot';
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
        if (!mascotElement || !SPRITES[spriteKey]) return;
        const spritePath = CHARACTER_BASE + SPRITES[spriteKey];
        mascotElement.style.backgroundImage = `url('${spritePath}')`;
    }

    function updateSpriteDisplay() {
        if (!mascotElement || !spritesLoaded) return;

        const animation = ANIMATIONS[mascot.currentAnimation];
        if (!animation || animation.length === 0) return;

        const frame = animation[mascot.animationFrame % animation.length];
        setSprite(frame.sprite);

        // Flip sprite if facing right (sprites face left by default)
        mascotElement.style.transform = mascot.facingRight ? 'scaleX(-1)' : 'scaleX(1)';
    }

    // --- Drag Handling (with click vs drag detection) ---
    const DRAG_THRESHOLD = 5; // pixels before mousedown becomes a drag

    function setupDragListeners() {
        mascotElement.addEventListener('mousedown', onMouseDown);
        mascotElement.addEventListener('touchstart', onTouchStart, { passive: false });

        if (!documentDragListenersReady) {
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
            documentDragListenersReady = true;
        }
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

        // Close chat if open
        if (isChatOpen) closeChatBubble();

        // Initialize drag animation state
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

    function onMouseUp(e) {
        if (mascot.dragPending) {
            // Never exceeded threshold → treat as click
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
        if (mascot.dragPending) {
            const touch = e.touches[0];
            const dx = touch.clientX - mascot.dragStartX;
            const dy = touch.clientY - mascot.dragStartY;
            if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
                promoteToDrag();
            }
        }

        if (!mascot.isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];

        const scale = sizes[currentSize].scale;
        const size = SPRITE_SIZE * scale;
        mascot.x = touch.clientX - mascot.dragOffsetX;
        mascot.y = touch.clientY - mascot.dragOffsetY + size;
        updatePosition();
    }

    function onTouchEnd(e) {
        if (mascot.dragPending) {
            mascot.dragPending = false;
            handleMascotClick();
            return;
        }

        if (!mascot.isDragging) return;
        endDrag();
    }

    function endDrag() {
        if (!mascot.isDragging) return;

        mascot.isDragging = false;
        mascot.isResisting = false;
        mascotElement.style.cursor = 'grab';

        // Check if in air
        const groundY = window.innerHeight;

        if (mascot.y < groundY - 5) {
            mascot.state = State.FALLING;
            mascot.currentAnimation = 'falling';
            mascot.velocityY = 0;
        } else {
            mascot.y = groundY;
            mascot.state = State.IDLE;
            mascot.currentAnimation = 'idle';
        }

        mascot.animationFrame = 0;
        mascot.animationTick = 0;
    }

    // --- Drag Animation (called from game loop) ---
    function updateDragAnimation() {
        if (!mascotElement || !mascot.isDragging) return;

        mascot.dragTick++;

        // Calculate velocity from position change
        const rawVelocityX = mascot.x - mascot.prevDragX;
        mascot.prevDragX = mascot.x;

        // Smooth the velocity using exponential moving average
        mascot.smoothedVelocityX = mascot.smoothedVelocityX * 0.6 + rawVelocityX * 0.4;

        // Check if we should trigger resist animation (every ~2 seconds = 50 ticks)
        if (!mascot.isResisting && mascot.dragTick > 0 && mascot.dragTick % 50 === 0) {
            mascot.isResisting = true;
            mascot.resistAnimTick = 0;
        }

        // Handle resist animation
        if (mascot.isResisting) {
            mascot.resistAnimTick++;

            // Resist animation: alternate between two frames
            // Each frame lasts 5 ticks, total animation is 20 ticks (2 cycles)
            const resistCycle = Math.floor(mascot.resistAnimTick / 5) % 2;
            if (resistCycle === 0) {
                setSprite('resist-frame-1');
            } else {
                setSprite('resist-frame-2');
            }

            // End resist animation after 20 ticks (2 full cycles)
            if (mascot.resistAnimTick >= 20) {
                mascot.isResisting = false;
            }

            mascotElement.style.transform = 'scaleX(1)';
            return;
        }

        // Normal drag tilt based on smoothed velocity
        if (mascot.smoothedVelocityX > 2) {
            // Moving right - tilt left (being pulled right)
            setSprite('dragged-tilt-left');
        } else if (mascot.smoothedVelocityX < -2) {
            // Moving left - tilt right (being pulled left)
            setSprite('dragged-tilt-right');
        } else {
            // Stationary or slow - neutral pose
            setSprite('stand-neutral');
        }

        mascotElement.style.transform = 'scaleX(1)';
    }

    // --- Chat Bubble UI ---
    function createChatBubble() {
        if (chatBubbleEl) return;
        injectFontIfNeeded();

        // Chat bubble container
        chatBubbleEl = document.createElement('div');
        chatBubbleEl.id = 'shimeji-chat-bubble';

        // Header
        const header = document.createElement('div');
        header.className = 'shimeji-chat-header';
        const titleWrap = document.createElement('div');
        titleWrap.className = 'shimeji-chat-title-wrap';
        const title = document.createElement('span');
        title.textContent = 'Chat';
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

        // Messages area
        chatMessagesEl = document.createElement('div');
        chatMessagesEl.className = 'shimeji-chat-messages';

        // Input area
        const inputArea = document.createElement('div');
        inputArea.className = 'shimeji-chat-input-area';
        chatInputEl = document.createElement('input');
        chatInputEl.className = 'shimeji-chat-input';
        chatInputEl.type = 'text';
        chatInputEl.placeholder = 'Say something...';
        chatInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
        // Prevent mascot interaction when typing
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

        // Prevent clicks inside bubble from propagating
        chatBubbleEl.addEventListener('mousedown', (e) => e.stopPropagation());
        chatBubbleEl.addEventListener('touchstart', (e) => e.stopPropagation());

        document.body.appendChild(chatBubbleEl);

        // Close when clicking outside
        document.addEventListener('mousedown', onClickOutsideChat);
    }

    function createThinkingBubble() {
        if (thinkingBubbleEl) return;

        thinkingBubbleEl = document.createElement('div');
        thinkingBubbleEl.id = 'shimeji-thinking-bubble';
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
        alertBubbleEl.id = 'shimeji-alert-bubble';
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

    function openChatBubble() {
        if (!chatBubbleEl) createChatBubble();
        isChatOpen = true;
        chatBubbleEl.classList.add('visible');
        updateBubblePosition();

        // Clear unread indicator
        hasUnreadMessage = false;
        hideAlert();

        // Sit still while chatting
        if (mascot.state !== State.FALLING && mascot.state !== State.DRAGGED) {
            mascot.state = State.SITTING;
            mascot.currentAnimation = 'sitting';
            mascot.direction = 0;
            mascot.animationFrame = 0;
            mascot.animationTick = 0;
            mascot.stateTimer = 0;
        }

        // Load persisted conversation, render, scroll to bottom and focus
        loadConversation(() => {
            renderConversationHistory();
            chrome.storage.local.get(['aiApiKey'], (data) => {
                if (!data.aiApiKey) {
                    ensureNoApiKeyOnboardingMessage();
                } else {
                    const existing = document.getElementById('shimeji-no-api-key-msg');
                    if (existing) existing.remove();
                }
            });
            chrome.storage.local.get(['aiProvider', 'aiModel'], (data) => {
                if (!chatMetaEl) return;
                const provider = data.aiProvider || 'openrouter';
                const model = data.aiModel || 'google/gemini-2.0-flash-001';
                chatMetaEl.textContent = `${provider} · ${model}`;
            });
            setTimeout(() => {
                if (chatMessagesEl) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
                if (chatInputEl) chatInputEl.focus();
            }, 50);
        });
    }

    function closeChatBubble() {
        isChatOpen = false;
        if (chatBubbleEl) chatBubbleEl.classList.remove('visible');
        // Remove inline thinking if present
        removeInlineThinking();

        // Resume normal behavior
        if (mascot.state === State.SITTING) {
            mascot.state = State.IDLE;
            mascot.currentAnimation = 'idle';
            mascot.stateTimer = 0;
            mascot.animationFrame = 0;
        }
    }

    function showThinking() {
        isThinking = true;
        if (isChatOpen) {
            // Show inline thinking dots inside chat
            showInlineThinking();
        } else {
            // Show floating thinking bubble above mascot
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
            const bubbleWidth = 280;
            const bubbleHeight = chatBubbleEl.offsetHeight || 200;
            let left = mascotCenterX - bubbleWidth / 2;
            let top = mascotTopY - bubbleHeight - 12;

            // Keep within viewport
            left = Math.max(8, Math.min(left, window.innerWidth - bubbleWidth - 8));
            if (top < 8) top = mascot.y + 12; // Below mascot if no room above

            chatBubbleEl.style.left = `${left}px`;
            chatBubbleEl.style.top = `${top}px`;
        }

        // Floating thinking bubble (only when chat is closed)
        if (thinkingBubbleEl && isThinking && !isChatOpen) {
            const thinkingWidth = thinkingBubbleEl.offsetWidth || 56;
            let left = mascotCenterX - thinkingWidth / 2;
            let top = mascotTopY - 36;

            left = Math.max(8, Math.min(left, window.innerWidth - thinkingWidth - 8));
            if (top < 8) top = 8;

            thinkingBubbleEl.style.left = `${left}px`;
            thinkingBubbleEl.style.top = `${top}px`;
        }

        // Alert bubble (unread message indicator)
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
        chrome.storage.local.set({ conversationHistory });
    }

    function loadConversation(callback) {
        chrome.storage.local.get(['conversationHistory'], (data) => {
            conversationHistory = Array.isArray(data.conversationHistory) ? data.conversationHistory : [];
            if (callback) callback();
        });
    }

    function renderConversationHistory() {
        if (!chatMessagesEl) return;
        // Clear existing messages
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

        chatInputEl.value = '';
        appendMessage('user', text);
        conversationHistory.push({ role: 'user', content: text });
        saveConversation();

        showThinking();

        chrome.runtime.sendMessage(
            { type: 'aiChat', messages: conversationHistory },
            (response) => {
                hideThinking();
                if (chrome.runtime.lastError) {
                    appendErrorMessage('Could not reach extension. Try reloading the page.');
                    return;
                }
                if (response && response.error) {
                    if (response.errorType === 'no_credits') {
                        appendMessage('ai', getNoCreditsMessage());
                    } else if (response.errorType === 'no_response') {
                        appendMessage('ai', getNoResponseMessage());
                    } else {
                        appendErrorMessage(response.error);
                    }
                    return;
                }
                if (response && response.content) {
                    conversationHistory.push({ role: 'assistant', content: response.content });
                    saveConversation();
                    appendMessage('ai', response.content);
                    // Show alert if chat was closed while waiting
                    if (!isChatOpen) {
                        showAlert();
                    }
                }
            }
        );
    }

    // --- Proactive Messages ---
    function scheduleProactiveMessage() {
        clearProactiveTimer();
        if (!proactiveEnabled) return;

        // Random interval between 3-7 minutes (180000-420000ms)
        const delay = 180000 + Math.random() * 240000;
        proactiveTimer = setTimeout(triggerProactiveMessage, delay);
    }

    function clearProactiveTimer() {
        if (proactiveTimer) {
            clearTimeout(proactiveTimer);
            proactiveTimer = null;
        }
    }

    function triggerProactiveMessage() {
        // Skip if chat is already open or mascot is disabled
        if (isChatOpen || isDisabled) {
            scheduleProactiveMessage();
            return;
        }

        showThinking();

        chrome.runtime.sendMessage(
            {
                type: 'aiProactiveMessage',
                pageTitle: document.title,
                pageUrl: window.location.href
            },
            (response) => {
                hideThinking();
                if (chrome.runtime.lastError || !response || response.error) {
                    // Silently fail for proactive messages
                    scheduleProactiveMessage();
                    return;
                }
                if (response.content) {
                    conversationHistory.push({ role: 'assistant', content: response.content });
                    saveConversation();
                    appendMessage('ai', response.content);
                    // Don't force open chat — just show alert
                    showAlert();
                }
                scheduleProactiveMessage();
            }
        );
    }

    function loadProactiveState() {
        chrome.storage.local.get(['proactiveMessages'], (data) => {
            proactiveEnabled = !!data.proactiveMessages;
            if (proactiveEnabled) {
                scheduleProactiveMessage();
            }
        });
    }

    // --- State Machine ---
    function updateState() {
        const scale = sizes[currentSize].scale;
        const size = SPRITE_SIZE * scale;
        const groundY = window.innerHeight;
        const leftBound = 0;
        const rightBound = window.innerWidth - size;

        // Handle drag state separately
        if (mascot.isDragging) {
            updateDragAnimation();
            return;
        }

        // Stay sitting while chat is open
        if (isChatOpen && mascot.state === State.SITTING) {
            return;
        }

        switch (mascot.state) {
            case State.IDLE:
                mascot.stateTimer++;

                // Random transitions (wander mode only)
                if (mascot.stateTimer > 50 && Math.random() < 0.02) {
                    if (Math.random() < 0.7) {
                        mascot.state = State.WALKING;
                        mascot.currentAnimation = 'walking';
                        mascot.direction = Math.random() > 0.5 ? 1 : -1;
                        mascot.facingRight = mascot.direction > 0;
                    } else {
                        mascot.state = State.SITTING;
                        mascot.currentAnimation = 'sitting';
                    }
                    mascot.stateTimer = 0;
                    mascot.animationFrame = 0;
                }
                break;

            case State.WALKING:
                mascot.stateTimer++;
                mascot.x += PHYSICS.walkSpeed * mascot.direction;

                // Boundary check
                if (mascot.x <= leftBound) {
                    mascot.x = leftBound;
                    mascot.direction = 1;
                    mascot.facingRight = true;
                } else if (mascot.x >= rightBound) {
                    mascot.x = rightBound;
                    mascot.direction = -1;
                    mascot.facingRight = false;
                }

                // Random stop
                if (mascot.stateTimer > 50 && Math.random() < 0.01) {
                    mascot.state = State.IDLE;
                    mascot.currentAnimation = 'idle';
                    mascot.direction = 0;
                    mascot.stateTimer = 0;
                }

                // Ensure on ground
                mascot.y = groundY;
                break;

            case State.FALLING:
                mascot.velocityY += PHYSICS.gravity;
                mascot.velocityY = Math.min(mascot.velocityY, PHYSICS.fallTerminalVelocity);
                mascot.y += mascot.velocityY;

                // Check ground collision
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

            case State.LANDING:
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

            case State.SITTING:
                mascot.stateTimer++;

                // Return to idle after some time
                if (mascot.stateTimer > 100 && Math.random() < 0.02) {
                    mascot.state = State.IDLE;
                    mascot.currentAnimation = 'idle';
                    mascot.stateTimer = 0;
                    mascot.animationFrame = 0;
                }
                break;

            case State.DRAGGED:
                // Handled above
                break;
        }

        // Keep within horizontal bounds
        mascot.x = Math.max(leftBound, Math.min(mascot.x, rightBound));
    }

    // --- Animation Update ---
    function updateAnimation() {
        // Drag animation is handled in updateState -> updateDragAnimation
        if (mascot.isDragging) return;

        const animation = ANIMATIONS[mascot.currentAnimation];
        if (!animation || animation.length === 0) return;

        mascot.animationTick++;

        // Calculate current frame based on tick
        let tickCount = 0;
        for (let i = 0; i < animation.length; i++) {
            tickCount += animation[i].duration;
            if (mascot.animationTick <= tickCount) {
                mascot.animationFrame = i;
                break;
            }
        }

        // Loop animation
        const totalDuration = animation.reduce((sum, f) => sum + f.duration, 0);
        if (mascot.animationTick >= totalDuration) {
            mascot.animationTick = 0;
            mascot.animationFrame = 0;
        }

        updateSpriteDisplay();
    }

    // --- Position Update ---
    function updatePosition() {
        if (!mascotElement) return;

        const scale = sizes[currentSize].scale;
        const size = SPRITE_SIZE * scale;

        // Position is anchor at bottom-center, so adjust for CSS top-left positioning
        const drawX = mascot.x;
        const drawY = mascot.y - size;

        mascotElement.style.left = `${drawX}px`;
        mascotElement.style.top = `${drawY}px`;

        // Update bubble positions to follow mascot
        updateBubblePosition();
    }

    // --- Main Game Loop ---
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

            gameLoopTimer = setInterval(gameLoop, TICK_MS);

            setTimeout(() => {
                updateSpriteDisplay();
                updatePosition();
            }, 100);

            // Start proactive messages if enabled
            loadProactiveState();
        });
    }

    function stopShimeji() {
        if (gameLoopTimer) {
            clearInterval(gameLoopTimer);
            gameLoopTimer = null;
        }

        mascot.isDragging = false;
        mascot.dragPending = false;
        mascot.isResisting = false;

        // Clean up chat elements
        closeChatBubble();
        hideThinking();
        hideAlert();
        clearProactiveTimer();

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

    // --- Message Listeners ---
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'ping') {
            sendResponse({ pong: true });
            return true;
        }

        if (message.action === 'updateCharacter') {
            console.log('Character update received:', message.character);
            if (message.character && message.character !== currentCharacter) {
                currentCharacter = message.character;
                CHARACTER_BASE = chrome.runtime.getURL('characters/' + currentCharacter + '/');
                spritesLoaded = false;
                spritesLoadedPromise = null;
                preloadSprites().then(() => {
                    updateSpriteDisplay();
                });
            }
        } else if (message.action === 'updateSize') {
            currentSize = message.size;
            updateMascotStyle();

            if (mascot.state !== State.FALLING && mascot.state !== State.DRAGGED) {
                mascot.y = window.innerHeight;
            }
        } else if (message.action === 'updateProactiveMessages') {
            proactiveEnabled = !!message.enabled;
            if (proactiveEnabled) {
                scheduleProactiveMessage();
            } else {
                clearProactiveTimer();
            }
        }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync') {
            if (changes.character) {
                const newChar = changes.character.newValue;
                if (newChar && newChar !== currentCharacter) {
                    currentCharacter = newChar;
                    CHARACTER_BASE = chrome.runtime.getURL('characters/' + currentCharacter + '/');
                    spritesLoaded = false;
                    spritesLoadedPromise = null;
                    preloadSprites().then(() => {
                        updateSpriteDisplay();
                    });
                }
            }

            if (changes.size) {
                currentSize = changes.size.newValue;
                updateMascotStyle();

                if (mascot.state !== State.FALLING && mascot.state !== State.DRAGGED) {
                    mascot.y = window.innerHeight;
                }
            }

            if (changes.disabledAll || changes.disabledPages) {
                chrome.storage.sync.get([STORAGE_KEYS.disabledAll, STORAGE_KEYS.disabledPages], (data) => {
                    applyVisibilityState(data.disabledAll, data.disabledPages);
                });
            }
        }

        if (areaName === 'local') {
            if (changes.proactiveMessages) {
                proactiveEnabled = !!changes.proactiveMessages.newValue;
                if (proactiveEnabled) {
                    scheduleProactiveMessage();
                } else {
                    clearProactiveTimer();
                }
            }
            if (changes.conversationHistory) {
                const newHistory = changes.conversationHistory.newValue;
                if (Array.isArray(newHistory) && newHistory.length !== conversationHistory.length) {
                    conversationHistory = newHistory;
                    if (isChatOpen) {
                        renderConversationHistory();
                    }
                }
            }
        }
    });

    // --- Window Resize Handler ---
    function handleResize() {
        const scale = sizes[currentSize].scale;
        const size = SPRITE_SIZE * scale;
        const groundY = window.innerHeight;

        // Keep mascot in bounds
        mascot.x = Math.max(0, Math.min(mascot.x, window.innerWidth - size));

        // Put back on ground if was on ground
        if (mascot.state !== State.FALLING && mascot.state !== State.DRAGGED) {
            mascot.y = groundY;
        }
    }

    window.addEventListener('resize', handleResize);

    // --- Initialization ---
    function init() {
        chrome.storage.sync.get(['character', 'size', STORAGE_KEYS.disabledAll, STORAGE_KEYS.disabledPages], (data) => {
            currentSize = data.size || 'medium';
            if (data.character && data.character !== currentCharacter) {
                currentCharacter = data.character;
                CHARACTER_BASE = chrome.runtime.getURL('characters/' + currentCharacter + '/');
            }
            applyVisibilityState(data.disabledAll, data.disabledPages);

            if (!isDisabled) {
                startShimeji();
            }
        });
    }

    // Expose cleanup for future re-injections (extension update/reinstall)
    window.__shimejiCleanup = function() {
        if (gameLoopTimer) {
            clearInterval(gameLoopTimer);
            gameLoopTimer = null;
        }
        clearProactiveTimer();
        if (chatBubbleEl) { chatBubbleEl.remove(); chatBubbleEl = null; }
        if (thinkingBubbleEl) { thinkingBubbleEl.remove(); thinkingBubbleEl = null; }
        if (alertBubbleEl) { alertBubbleEl.remove(); alertBubbleEl = null; }
        inlineThinkingEl = null;
        document.removeEventListener('mousedown', onClickOutsideChat);
        if (mascotElement) {
            mascotElement.remove();
            mascotElement = null;
        }
        documentDragListenersReady = false;
        window.__shimejiInitialized = false;
    };

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

})();
