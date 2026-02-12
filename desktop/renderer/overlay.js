const SPRITE_SIZE = 128;
const TICK_MS = 40;
const MAX_SHIMEJIS = 5;
const DRAG_THRESHOLD_PX = 4;
const CHAT_EDGE_MARGIN_PX = 8;
const CHAT_VERTICAL_GAP_PX = 10;

const SPRITE_SCALES = {
  small: 0.75,
  medium: 1,
  big: 1.5
};

const ANIMATION_FRAMES = {
  idle: ['stand-neutral.png'],
  walking: ['walk-step-left.png', 'stand-neutral.png', 'walk-step-right.png', 'stand-neutral.png'],
  running: ['walk-step-left.png', 'stand-neutral.png', 'walk-step-right.png', 'stand-neutral.png'],
  jumping: ['jump.png'],
  falling: ['fall.png'],
  landing: ['bounce-squish.png', 'bounce-recover.png'],
  dragging: ['dragged-tilt-right-light.png'],
  draggingHeavy: ['dragged-tilt-right-heavy.png'],
  resisting: ['resist-frame-1.png', 'resist-frame-2.png'],
  sitting: ['sit.png'],
  sittingLookUp: ['sit-look-up.png'],
  sittingEdge: ['sit-edge-legs-down.png'],
  danglingLegs: ['sit-edge-dangle-frame-1.png', 'sit-edge-dangle-frame-2.png'],
  crawling: ['crawl-crouch.png'],
  lyingDown: ['sprawl-lying.png'],
  grabbingWall: ['grab-wall.png'],
  climbingWall: ['climb-wall-frame-1.png', 'climb-wall-frame-2.png'],
  grabbingCeiling: ['grab-ceiling.png'],
  climbingCeiling: ['climb-ceiling-frame-1.png', 'climb-ceiling-frame-2.png'],
  headSpin: ['spin-head-frame-1.png', 'spin-head-frame-2.png', 'spin-head-frame-3.png', 'spin-head-frame-4.png', 'spin-head-frame-5.png', 'spin-head-frame-6.png']
};

const SHIMEJI_STATES = {
  IDLE: 'idle',
  WALKING: 'walking',
  RUNNING: 'running',
  JUMPING: 'jumping',
  FALLING: 'falling',
  LANDING: 'landing',
  DRAGGING: 'dragging',
  DRAGGING_HEAVY: 'draggingHeavy',
  RESISTING: 'resisting',
  SITTING: 'sitting',
  SITTING_LOOK_UP: 'sittingLookUp',
  SITTING_EDGE: 'sittingEdge',
  DANGLING_LEGS: 'danglingLegs',
  CRAWLING: 'crawling',
  LYING_DOWN: 'lyingDown',
  GRABBING_WALL: 'grabbingWall',
  CLIMBING_WALL: 'climbingWall',
  GRABBING_CEILING: 'grabbingCeiling',
  CLIMBING_CEILING: 'climbingCeiling',
  HEAD_SPIN: 'headSpin'
};

const PHYSICS = {
  gravity: 0.5,
  fallTerminalVelocity: 12,
  walkSpeed: 1.2,
  runSpeed: 3.0,
  crawlSpeed: 0.4,
  climbSpeed: -1.5,
  jumpForce: -12
};

// Weighted behavior selection (inspired by shimeji-ee frequency system)
function weightedRandom(choices) {
  const total = choices.reduce((sum, c) => sum + c.weight, 0);
  let r = Math.random() * total;
  for (const choice of choices) {
    r -= choice.weight;
    if (r <= 0) return choice.action;
  }
  return choices[choices.length - 1].action;
}

const CHAT_THEMES = [
  { id: 'pastel', label: 'Pastel', theme: '#3b1a77', bg: '#f0e8ff', bubble: 'glass' },
  { id: 'pink', label: 'Pink', theme: '#7a124b', bg: '#ffd2ea', bubble: 'glass' },
  { id: 'kawaii', label: 'Kawaii', theme: '#5b1456', bg: '#ffd8f0', bubble: 'glass' },
  { id: 'mint', label: 'Mint', theme: '#0f5f54', bg: '#c7fff0', bubble: 'glass' },
  { id: 'ocean', label: 'Ocean', theme: '#103a7a', bg: '#cfe6ff', bubble: 'glass' },
  { id: 'neural', label: 'Neural', theme: '#86f0ff', bg: '#0b0d1f', bubble: 'dark' },
  { id: 'cyberpunk', label: 'Cyberpunk', theme: '#19d3ff', bg: '#0a0830', bubble: 'dark' },
  { id: 'noir-rose', label: 'Noir Rose', theme: '#ff5fbf', bg: '#0b0717', bubble: 'dark' },
  { id: 'midnight', label: 'Midnight', theme: '#7aa7ff', bg: '#0b1220', bubble: 'dark' },
  { id: 'ember', label: 'Ember', theme: '#ff8b3d', bg: '#1a0c08', bubble: 'dark' }
];

function hexToRgb(hex) {
  if (!hex) return null;
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return null;
  const num = parseInt(cleaned, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

const CHARACTERS = [
  { id: 'shimeji', label: 'Shimeji' },
  { id: 'bunny', label: 'Bunny' },
  { id: 'kitten', label: 'Kitten' },
  { id: 'egg', label: 'Egg' },
  { id: 'ghost', label: 'Ghost' },
  { id: 'blob', label: 'Blob' },
  { id: 'lobster', label: 'Lobster' }
];

let shimejis = [];
let globalConfig = {};

class Shimeji {
  constructor(id, config = {}) {
    this.id = id;
    this.config = {
      character: config.character || 'shimeji',
      size: config.size || 'medium',
      enabled: config.enabled !== false,
      personality: config.personality || 'cryptid',
      chatTheme: config.chatTheme || 'pastel',
      ...config
    };

    this.state = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      direction: 1,
      currentState: SHIMEJI_STATES.FALLING,
      onGround: false,
      onWall: false,
      onCeiling: false,
      animFrame: 0,
      animTimer: 0,
      jumpCooldown: 0,
      wanderTarget: 0,
      wanderUntil: 0,
      behaviorTimer: 0,
      behaviorDuration: 0,
      lastMouseMove: 0,
      dragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      lastDragX: 0,
      lastDragY: 0,
      lastDragTime: 0,
      dragMoved: false,
      dragSpeed: 0,
      pointerDown: false,
      pressStartX: 0,
      pressStartY: 0,
      chatPoseUntil: 0,
      suppressClickUntil: 0
    };

    this.chatOpen = false;
    this.messages = [];
    this.pendingAssistantIndex = null;
    this.pendingStreamText = '';
    this.elements = {};
    this.chatClickTimeout = null;

    this.init();
  }

  init() {
    const scale = SPRITE_SCALES[this.config.size] || 1;
    const size = SPRITE_SIZE * scale;

    this.state.x = Math.random() * (window.innerWidth - size);
    this.state.y = -size;
    this.state.wanderTarget = this.state.x;

    this.createElements();
    this.setupEventListeners();

    console.log(`Shimeji ${this.id} created with character "${this.config.character}" at (${this.state.x.toFixed(0)}, ${this.state.y.toFixed(0)})`);
  }

  getCharacterPath() {
    const char = this.config.character || 'shimeji';
    return `characters/${char}/`;
  }

  createElements() {
    let container = document.getElementById('shimeji-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'shimeji-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
      `;
      document.body.appendChild(container);
    }

    const scale = SPRITE_SCALES[this.config.size] || 1;
    const wrapper = document.createElement('div');
    wrapper.className = 'shimeji-wrapper';
    const isEnabled = this.config.enabled !== false;
    wrapper.style.cssText = `
      position: absolute;
      left: ${this.state.x}px;
      top: ${this.state.y}px;
      pointer-events: auto;
      cursor: pointer !important;
      z-index: 1000;
      display: ${isEnabled ? 'flex' : 'none'};
      align-items: flex-end;
    `;

    const sprite = document.createElement('img');
    sprite.className = 'shimeji-sprite';
    sprite.alt = this.id;
    sprite.style.cssText = `
      width: ${SPRITE_SIZE * scale}px;
      height: ${SPRITE_SIZE * scale}px;
      image-rendering: pixelated;
      transform-origin: bottom center;
      display: block;
    `;

    const charPath = this.getCharacterPath();
    sprite.src = charPath + 'stand-neutral.png';

    wrapper.appendChild(sprite);
    container.appendChild(wrapper);

    this.elements = { wrapper, sprite, container };
    this.createChatBubble();
  }

  createChatBubble() {
    const chat = document.createElement('div');
    chat.className = 'chat-bubble glass hidden';
    chat.style.position = 'absolute';

    const header = document.createElement('div');
    header.className = 'chat-header';

    const title = document.createElement('div');
    title.className = 'chat-title';
    title.innerHTML = `
      <span class="chat-name">Shimeji</span>
      <span class="chat-personality">OpenRouter</span>
    `;

    const controls = document.createElement('div');
    controls.className = 'chat-controls';
    controls.innerHTML = `
      <button class="chat-btn chat-settings-btn" title="Chat settings" disabled>⚙</button>
      <button class="chat-btn chat-mic-btn" title="Mic (coming soon)" disabled>🎙</button>
      <button class="chat-btn chat-close-btn" title="Close">✕</button>
    `;

    header.appendChild(title);
    header.appendChild(controls);

    const controlsRow = document.createElement('div');
    controlsRow.className = 'chat-controls-row';
    controlsRow.innerHTML = `
      <button class="chat-toggle-btn" disabled>Open Mic</button>
      <button class="chat-toggle-btn" disabled>Relay</button>
      <button class="chat-toggle-btn" disabled>Theme</button>
    `;

    const messagesArea = document.createElement('div');
    messagesArea.className = 'chat-messages';

    const inputArea = document.createElement('div');
    inputArea.className = 'chat-input-area';
    inputArea.innerHTML = `
      <textarea class="chat-input" placeholder="Type a message..." rows="1"></textarea>
      <button class="chat-send-btn" aria-label="Send">➤</button>
    `;

    chat.appendChild(header);
    chat.appendChild(controlsRow);
    chat.appendChild(messagesArea);
    chat.appendChild(inputArea);
    document.body.appendChild(chat);

    this.elements.chat = chat;
    this.elements.messagesArea = messagesArea;
    this.elements.input = inputArea.querySelector('.chat-input');
    this.elements.sendBtn = inputArea.querySelector('.chat-send-btn');
    this.elements.closeBtn = header.querySelector('.chat-close-btn');
    this.elements.chatName = title.querySelector('.chat-name');
    this.elements.chatTitle = title.querySelector('.chat-personality');

    this.applyChatTheme();
    this.updateChatHeader();

    this.elements.closeBtn.addEventListener('click', () => this.toggleChat());
    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
    this.elements.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Chat bubble interactions - hover shows pointer, click brings to front and focuses
    chat.addEventListener('mouseenter', () => {
      chat.style.cursor = 'pointer';
    });
    
    chat.addEventListener('click', (e) => {
      // Don't interfere with input, buttons, or close button clicks
      if (e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' || 
          e.target.tagName === 'BUTTON' ||
          e.target.closest('.chat-close-btn')) {
        return;
      }
      
      this.bringToFront();
      this.elements.input.focus();
    });

    // Prevent chat from closing when clicking inside it
    chat.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (window.shimejiApi?.setIgnoreMouseEvents) {
        isMouseOverInteractive = true;
        window.shimejiApi.setIgnoreMouseEvents(false);
      }
    });

    this.elements.input.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.focusInput();
    });

    this.elements.input.addEventListener('focus', () => {
      this.bringToFront();
      if (window.shimejiApi?.setIgnoreMouseEvents) {
        isMouseOverInteractive = true;
        window.shimejiApi.setIgnoreMouseEvents(false);
      }
    });
  }

  getShimejiNumber() {
    const match = `${this.id}`.match(/(\d+)$/);
    if (match) return Number(match[1]);
    const index = shimejis.indexOf(this);
    return index >= 0 ? index + 1 : 1;
  }

  getAiBrainLabel() {
    const mode = this.config.mode || globalConfig.aiMode || 'standard';
    if (mode === 'off') return 'AI Off';
    if (mode === 'agent') return 'OpenClaw';

    const provider = this.config.standardProvider || 'openrouter';
    if (provider === 'openrouter') {
      let model = this.config.openrouterModel || globalConfig.openrouterModel || 'google/gemini-2.0-flash-001';
      if (model === 'random') {
        model = this.config.openrouterModelResolved
          || globalConfig.openrouterModelResolved
          || 'google/gemini-2.0-flash-001';
      }
      return `OpenRouter · ${model}`;
    }
    if (provider === 'ollama') {
      const model = this.config.ollamaModel || globalConfig.ollamaModel || 'gemma3:1b';
      return `Ollama · ${model}`;
    }
    if (provider === 'openclaw') return 'OpenClaw';

    return provider;
  }

  updateChatHeader() {
    if (this.elements.chatName) {
      this.elements.chatName.textContent = `Shimeji #${this.getShimejiNumber()}`;
    }
    if (this.elements.chatTitle) {
      this.elements.chatTitle.textContent = this.getAiBrainLabel();
    }
  }

  focusInput() {
    if (!this.elements.input) return;
    if (window.shimejiApi?.setIgnoreMouseEvents) {
      isMouseOverInteractive = true;
      window.shimejiApi.setIgnoreMouseEvents(false);
    }
    window.focus();
    requestAnimationFrame(() => {
      this.elements.input.focus();
      const length = this.elements.input.value.length;
      this.elements.input.setSelectionRange(length, length);
    });
  }

  setupEventListeners() {
    this.elements.wrapper.addEventListener('mousedown', (e) => this.onPointerDown(e));
    this.elements.wrapper.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (this.chatClickTimeout) {
        clearTimeout(this.chatClickTimeout);
        this.chatClickTimeout = null;
      }
      this.jump();
    });
  }

  onPointerDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();

    const rect = this.elements.wrapper.getBoundingClientRect();
    this.state.pointerDown = true;
    this.state.dragging = false;
    this.state.dragMoved = false;
    this.state.dragSpeed = 0;
    this.state.pressStartX = e.clientX;
    this.state.pressStartY = e.clientY;
    this.state.dragOffsetX = e.clientX - rect.left;
    this.state.dragOffsetY = e.clientY - rect.top;
    this.state.lastDragX = e.clientX;
    this.state.lastDragY = e.clientY;
    this.state.lastDragTime = Date.now();

    const moveHandler = (evt) => this.onPointerMove(evt);
    const upHandler = (evt) => this.onPointerUp(evt, moveHandler, upHandler);
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  }

  onPointerMove(e) {
    if (!this.state.pointerDown) return;

    const movedX = Math.abs(e.clientX - this.state.pressStartX);
    const movedY = Math.abs(e.clientY - this.state.pressStartY);
    const exceedsThreshold = movedX > DRAG_THRESHOLD_PX || movedY > DRAG_THRESHOLD_PX;

    if (!this.state.dragging) {
      if (!exceedsThreshold) return;
      this.state.dragging = true;
      this.state.dragMoved = true;
      this.state.vx = 0;
      this.state.vy = 0;
      this.state.currentState = SHIMEJI_STATES.RESISTING;
      this.state.animFrame = 0;
      this.state.behaviorTimer = 0;
      this.state.onGround = false;
    }

    const scale = SPRITE_SCALES[this.config.size] || 1;
    const size = SPRITE_SIZE * scale;
    const maxX = Math.max(0, window.innerWidth - size);
    const maxY = Math.max(0, window.innerHeight - size);

    const targetX = e.clientX - this.state.dragOffsetX;
    const targetY = e.clientY - this.state.dragOffsetY;

    const nextX = Math.max(0, Math.min(targetX, maxX));
    const nextY = Math.max(0, Math.min(targetY, maxY));

    const now = Date.now();
    const dt = Math.max(1, now - this.state.lastDragTime);
    const dx = nextX - this.state.x;
    const dy = nextY - this.state.y;

    this.state.vx = (dx / dt) * 16;
    this.state.vy = (dy / dt) * 16;

    const speed = Math.sqrt(dx * dx + dy * dy) / dt;
    this.state.dragSpeed = speed;

    this.state.dragMoved = this.state.dragMoved || Math.abs(dx) > 3 || Math.abs(dy) > 3;
    if (Math.abs(dx) > 1) {
      this.state.direction = dx > 0 ? 1 : -1;
    }

    // Switch between drag states based on speed
    if (this.state.dragMoved) {
      this.state.currentState = speed > 3 ? SHIMEJI_STATES.DRAGGING_HEAVY : SHIMEJI_STATES.DRAGGING;
    }

    this.state.x = nextX;
    this.state.y = nextY;
    this.state.lastDragX = e.clientX;
    this.state.lastDragY = e.clientY;
    this.state.lastDragTime = now;
    this.updateVisuals();
  }

  onPointerUp(e, moveHandler, upHandler) {
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
    this.state.pointerDown = false;

    if (!this.state.dragging) {
      this.chatClickTimeout = setTimeout(() => {
        this.toggleChat();
        this.chatClickTimeout = null;
      }, 300);
      return;
    }

    const scale = SPRITE_SCALES[this.config.size] || 1;
    const size = SPRITE_SIZE * scale;
    const groundY = Math.max(0, window.innerHeight - size);

    this.state.dragging = false;

    if (this.state.y >= groundY) {
      this.state.y = groundY;
      this.state.vy = 0;
      this.state.onGround = true;
      if (Math.abs(this.state.vx) > 0.5) {
        this.state.currentState = SHIMEJI_STATES.WALKING;
      } else {
        this.state.currentState = SHIMEJI_STATES.IDLE;
        this.state.wanderUntil = 0;
      }
    } else {
      this.state.onGround = false;
      this.state.currentState = SHIMEJI_STATES.FALLING;
    }
  }

  toggleChat() {
    if (this.chatOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    this.elements.chat.classList.remove('hidden');
    this.chatOpen = true;
    this.updateChatHeader();
    this.positionChatBubble();
    this.bringToFront();
    this.applyChatTheme();
    this.renderMessages();
    this.focusInput();
    // Retry once to guarantee cursor appears even on slow focus transitions.
    setTimeout(() => this.focusInput(), 120);
  }

  closeChat() {
    this.elements.chat.classList.add('hidden');
    this.chatOpen = false;
    this.state.chatPoseUntil = 0;
    const S = SHIMEJI_STATES;
    if ([S.SITTING, S.SITTING_LOOK_UP, S.DANGLING_LEGS, S.HEAD_SPIN].includes(this.state.currentState)) {
      this.state.currentState = this.state.onGround ? S.IDLE : S.FALLING;
      this.state.animFrame = 0;
      this.state.animTimer = 0;
      this.state.wanderUntil = 0;
    }
  }

  bringToFront() {
    // Bring this shimeji's chat to highest z-index
    shimejis.forEach(s => {
      if (s.elements.chat) {
        s.elements.chat.style.zIndex = s === this ? '3000' : '2000';
      }
    });
  }

  getChatDimensions() {
    if (!this.elements.chat) return { width: 280, height: 340 };
    const computed = window.getComputedStyle(this.elements.chat);
    const width = this.elements.chat.offsetWidth || parseFloat(computed.width) || parseFloat(computed.getPropertyValue('--chat-width')) || 280;
    const height = this.elements.chat.offsetHeight || parseFloat(computed.height) || parseFloat(computed.getPropertyValue('--chat-height')) || 340;
    return { width, height };
  }

  positionChatBubble() {
    if (!this.elements.chat || !this.elements.wrapper) return;

    const rect = this.elements.wrapper.getBoundingClientRect();
    const { width: chatWidth, height: chatHeight } = this.getChatDimensions();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let chatLeft = rect.left + ((rect.width - chatWidth) / 2);
    chatLeft = Math.max(CHAT_EDGE_MARGIN_PX, Math.min(chatLeft, viewportWidth - chatWidth - CHAT_EDGE_MARGIN_PX));

    const preferredAboveTop = rect.top - chatHeight - CHAT_VERTICAL_GAP_PX;
    const fallbackBelowTop = rect.bottom + CHAT_VERTICAL_GAP_PX;
    const canShowAbove = preferredAboveTop >= CHAT_EDGE_MARGIN_PX;
    const canShowBelow = fallbackBelowTop + chatHeight <= viewportHeight - CHAT_EDGE_MARGIN_PX;

    let chatTop = canShowAbove ? preferredAboveTop : fallbackBelowTop;
    if (!canShowAbove && !canShowBelow) {
      chatTop = preferredAboveTop;
    }
    chatTop = Math.max(CHAT_EDGE_MARGIN_PX, Math.min(chatTop, viewportHeight - chatHeight - CHAT_EDGE_MARGIN_PX));

    this.elements.chat.style.left = `${chatLeft}px`;
    this.elements.chat.style.top = `${chatTop}px`;
  }

  async sendMessage() {
    const text = this.elements.input.value.trim();
    if (!text) return;

    this.messages.push({ role: 'user', content: text });
    this.elements.input.value = '';

    const requestMessages = this.messages.slice();
    const assistantIndex = this.messages.push({ role: 'assistant', content: '' }) - 1;
    this.pendingAssistantIndex = assistantIndex;
    this.pendingStreamText = '';
    this.renderMessages();

    if (window.shimejiApi) {
      try {
        const result = await window.shimejiApi.aiChatStream({
          shimejiId: this.id,
          messages: requestMessages,
          personality: this.config.personality || 'cryptid'
        });
        if (this.pendingAssistantIndex !== assistantIndex) {
          return;
        }
        if (result.ok) {
          const finalText = result.content || this.pendingStreamText || '';
          this.messages[assistantIndex] = { role: 'assistant', content: finalText || 'Error: NO_RESPONSE' };
        } else {
          this.messages[assistantIndex] = { role: 'assistant', content: `Error: ${result.error}` };
        }
      } catch {
        if (this.pendingAssistantIndex === assistantIndex) {
          this.messages[assistantIndex] = { role: 'assistant', content: 'AI service unavailable' };
        }
      }
    } else {
      const responses = [
        "Hello! I'm your shimeji companion!",
        "That's interesting! Tell me more.",
        "*nods*",
        "I'm here to brighten your day!"
      ];
      this.messages[assistantIndex] = { role: 'assistant', content: responses[Math.floor(Math.random() * responses.length)] };
    }
    this.pendingAssistantIndex = null;
    this.pendingStreamText = '';
    this.renderMessages();
  }

  applyStreamDelta(delta, accumulated) {
    if (this.pendingAssistantIndex === null) return;
    const index = this.pendingAssistantIndex;
    if (!this.messages[index] || this.messages[index].role !== 'assistant') return;
    const nextText = accumulated || `${this.pendingStreamText}${delta || ''}`;
    if (!nextText) return;
    this.pendingStreamText = nextText;
    this.messages[index] = { role: 'assistant', content: nextText };
    this.renderMessages();
  }

  renderMessages() {
    this.elements.messagesArea.innerHTML = '';
    this.messages.forEach((msg) => {
      const msgEl = document.createElement('div');
      msgEl.className = `chat-message ${msg.role === 'user' ? 'user' : 'assistant'}`;
      msgEl.textContent = msg.content;
      this.elements.messagesArea.appendChild(msgEl);
    });
    this.elements.messagesArea.scrollTop = this.elements.messagesArea.scrollHeight;
  }

  jump() {
    if (this.state.onGround && this.state.jumpCooldown <= 0) {
      this.state.vy = PHYSICS.jumpForce;
      this.state.vx = this.state.direction * (PHYSICS.walkSpeed * 2.4);
      this.state.onGround = false;
      this.state.currentState = SHIMEJI_STATES.JUMPING;
      this.state.jumpCooldown = 30;
      console.log(`Shimeji ${this.id} jumped!`);
    }
  }

  updateChatBehavior() {
    const S = SHIMEJI_STATES;
    const st = this.state;
    st.vx = 0;
    st.vy = 0;

    if (![S.SITTING, S.SITTING_LOOK_UP, S.DANGLING_LEGS, S.HEAD_SPIN].includes(st.currentState)) {
      st.currentState = S.SITTING;
      st.animFrame = 0;
      st.animTimer = 0;
      st.chatPoseUntil = 0;
    }

    const now = Date.now();
    if (st.chatPoseUntil > now) return;

    const roll = Math.random();
    let nextState = S.SITTING;
    let duration = 1500 + Math.random() * 2200;

    if (roll < 0.18) {
      nextState = S.HEAD_SPIN;
      duration = 800 + Math.random() * 900;
    } else if (roll < 0.48) {
      nextState = S.SITTING_LOOK_UP;
      duration = 900 + Math.random() * 1300;
    } else if (roll < 0.72) {
      nextState = S.DANGLING_LEGS;
      duration = 1100 + Math.random() * 1400;
    }

    st.currentState = nextState;
    st.animFrame = 0;
    st.animTimer = 0;
    st.chatPoseUntil = now + duration;
  }

  update() {
    if (!this.config.enabled) return;

    if (this.state.pointerDown && !this.state.dragging) {
      this.updateVisuals();
      return;
    }

    if (this.chatOpen && !this.state.dragging) {
      this.updateChatBehavior();
      this.updateAnimation();
      this.updateVisuals();
      return;
    }

    if (!this.state.dragging) {
      this.updatePhysics();
      this.updateBehavior();
      this.updateAnimation();
    } else {
      this.updateSprite();
    }
    this.updateVisuals();
  }

  updatePhysics() {
    const scale = SPRITE_SCALES[this.config.size] || 1;
    const size = SPRITE_SIZE * scale;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const st = this.state;
    const S = SHIMEJI_STATES;

    // States that defy gravity (attached to surfaces)
    const attachedStates = [S.CLIMBING_WALL, S.CLIMBING_CEILING, S.GRABBING_WALL, S.GRABBING_CEILING];
    const isAttached = attachedStates.includes(st.currentState);

    // Apply gravity when not on ground and not attached to a surface
    if (!st.onGround && !isAttached) {
      st.vy = Math.min(st.vy + PHYSICS.gravity, PHYSICS.fallTerminalVelocity);
      if (st.currentState === S.JUMPING && st.vy > 0) {
        st.currentState = S.FALLING;
      }
    }

    // Wall climbing: move upward
    if (st.currentState === S.CLIMBING_WALL) {
      st.vy = PHYSICS.climbSpeed;
      st.vx = 0;
    }

    // Ceiling climbing: move sideways
    if (st.currentState === S.CLIMBING_CEILING) {
      st.vx = st.direction * PHYSICS.walkSpeed;
      st.vy = 0;
    }

    st.x += st.vx;
    st.y += st.vy;

    // Ground collision
    const groundY = screenHeight - size;
    if (st.y >= groundY) {
      st.y = groundY;
      st.vy = 0;
      st.onGround = true;

      if (st.currentState === S.JUMPING || st.currentState === S.FALLING) {
        st.currentState = S.LANDING;
        st.animFrame = 0;
      }
    } else {
      st.onGround = false;
    }

    // Ceiling collision
    if (st.y <= 0) {
      st.y = 0;
      st.vy = 0;
      st.onCeiling = true;
      // Transition from climbing wall to grabbing ceiling
      if (st.currentState === S.CLIMBING_WALL) {
        st.currentState = S.GRABBING_CEILING;
        st.behaviorTimer = 0;
        st.behaviorDuration = 40 + Math.random() * 60;
      }
    } else {
      st.onCeiling = false;
    }

    // Wall collisions
    if (st.x <= 0) {
      st.x = 0;
      if (!isAttached) {
        st.vx = Math.abs(st.vx);
        st.direction = 1;
      }
      st.onWall = true;
    } else if (st.x >= screenWidth - size) {
      st.x = screenWidth - size;
      if (!isAttached) {
        st.vx = -Math.abs(st.vx);
        st.direction = -1;
      }
      st.onWall = true;
    } else {
      st.onWall = false;
    }

    if (st.jumpCooldown > 0) st.jumpCooldown--;

    // Friction for walking/running
    if (st.currentState === S.WALKING || st.currentState === S.RUNNING) {
      st.vx *= 0.92;
    }
  }

  setBehavior(state, duration) {
    this.state.currentState = state;
    this.state.behaviorTimer = 0;
    this.state.behaviorDuration = duration || (60 + Math.random() * 120);
    this.state.animFrame = 0;
    this.state.animTimer = 0;
  }

  updateBehavior() {
    const scale = SPRITE_SCALES[this.config.size] || 1;
    const size = SPRITE_SIZE * scale;
    const maxX = Math.max(0, window.innerWidth - size);
    const now = Date.now();
    const st = this.state;
    const S = SHIMEJI_STATES;

    st.behaviorTimer++;

    // --- Floor behaviors (idle/walking/running) ---
    if (st.currentState === S.IDLE || st.currentState === S.WALKING || st.currentState === S.RUNNING) {
      // Wandering
      if (now > st.wanderUntil) {
        st.wanderTarget = Math.random() * maxX;
        st.wanderUntil = now + 2000 + Math.random() * 4000;
      }

      const dx = st.wanderTarget - st.x;
      if (Math.abs(dx) > 5) {
        const speed = st.currentState === S.RUNNING ? PHYSICS.runSpeed : PHYSICS.walkSpeed;
        st.vx = Math.sign(dx) * speed;
        st.direction = Math.sign(dx);
        if (st.currentState !== S.RUNNING) st.currentState = S.WALKING;
      } else {
        st.vx = 0;
        if (st.currentState === S.WALKING || st.currentState === S.RUNNING) {
          st.currentState = S.IDLE;
        }
      }

      // Weighted random action selection (shimeji-ee style)
      if (Math.random() < 0.012) {
        const choices = [];

        // Floor actions
        if (st.onGround) {
          choices.push({ weight: 100, action: 'walk' });
          choices.push({ weight: 50, action: 'run' });
          choices.push({ weight: 100, action: 'sit' });
          choices.push({ weight: 30, action: 'crawl' });
          if (st.jumpCooldown <= 0) {
            choices.push({ weight: 50, action: 'jump' });
          }
        }

        // Wall actions (at screen edges)
        if (st.onWall && st.onGround) {
          choices.push({ weight: 80, action: 'grabWall' });
        }

        // Edge sitting (near screen edge on ground)
        if (st.onGround && (st.x <= 5 || st.x >= maxX - 5)) {
          choices.push({ weight: 60, action: 'sitEdge' });
        }

        if (choices.length > 0) {
          const action = weightedRandom(choices);
          switch (action) {
            case 'walk':
              st.wanderTarget = Math.random() * maxX;
              st.wanderUntil = now + 3000 + Math.random() * 4000;
              break;
            case 'run':
              st.currentState = S.RUNNING;
              st.wanderTarget = Math.random() * maxX;
              st.wanderUntil = now + 1500 + Math.random() * 2000;
              break;
            case 'jump':
              this.jump();
              break;
            case 'sit':
              this.setBehavior(S.SITTING, 80 + Math.random() * 120);
              break;
            case 'crawl':
              this.setBehavior(S.CRAWLING, 60 + Math.random() * 80);
              st.wanderTarget = Math.random() * maxX;
              break;
            case 'grabWall':
              this.setBehavior(S.GRABBING_WALL, 30 + Math.random() * 40);
              st.vx = 0;
              break;
            case 'sitEdge':
              this.setBehavior(S.SITTING_EDGE, 80 + Math.random() * 100);
              break;
          }
        }
      }
    }

    // --- Crawling along floor ---
    if (st.currentState === S.CRAWLING) {
      const dx = st.wanderTarget - st.x;
      if (Math.abs(dx) > 5) {
        st.vx = Math.sign(dx) * PHYSICS.crawlSpeed;
        st.direction = Math.sign(dx);
      } else {
        st.vx = 0;
      }
      if (st.behaviorTimer >= st.behaviorDuration) {
        // After crawling, either lie down or stand up
        const next = Math.random() < 0.4 ? S.LYING_DOWN : S.IDLE;
        this.setBehavior(next, next === S.LYING_DOWN ? 80 + Math.random() * 100 : 0);
        st.wanderUntil = 0;
      }
    }

    // --- Lying down ---
    if (st.currentState === S.LYING_DOWN) {
      st.vx = 0;
      if (st.behaviorTimer >= st.behaviorDuration) {
        // Get up: sit first or stand
        const next = Math.random() < 0.5 ? S.SITTING : S.IDLE;
        this.setBehavior(next, next === S.SITTING ? 60 + Math.random() * 80 : 0);
        st.wanderUntil = 0;
      }
    }

    // --- Sitting behaviors ---
    if (st.currentState === S.SITTING) {
      st.vx = 0;
      if (st.behaviorTimer >= st.behaviorDuration) {
        // After sitting, maybe look up, spin head, or stand
        const choices = [
          { weight: 40, action: S.IDLE },
          { weight: 30, action: S.SITTING_LOOK_UP },
          { weight: 15, action: S.HEAD_SPIN },
          { weight: 15, action: S.LYING_DOWN }
        ];
        const next = weightedRandom(choices);
        this.setBehavior(next, 60 + Math.random() * 80);
        if (next === S.IDLE) st.wanderUntil = 0;
      }
    }

    if (st.currentState === S.SITTING_LOOK_UP) {
      st.vx = 0;
      if (st.behaviorTimer >= st.behaviorDuration) {
        const next = Math.random() < 0.3 ? S.HEAD_SPIN : S.IDLE;
        this.setBehavior(next, next === S.HEAD_SPIN ? 48 : 0);
        st.wanderUntil = 0;
      }
    }

    // --- Edge sitting → dangling legs ---
    if (st.currentState === S.SITTING_EDGE) {
      st.vx = 0;
      if (st.behaviorTimer >= st.behaviorDuration) {
        // Transition to dangling legs or stand up
        const next = Math.random() < 0.6 ? S.DANGLING_LEGS : S.IDLE;
        this.setBehavior(next, next === S.DANGLING_LEGS ? 80 + Math.random() * 100 : 0);
        if (next === S.IDLE) st.wanderUntil = 0;
      }
    }

    if (st.currentState === S.DANGLING_LEGS) {
      st.vx = 0;
      if (st.behaviorTimer >= st.behaviorDuration) {
        st.currentState = S.IDLE;
        st.wanderUntil = 0;
      }
    }

    // --- Head spin (timed animation) ---
    if (st.currentState === S.HEAD_SPIN) {
      st.vx = 0;
      if (st.behaviorTimer >= st.behaviorDuration) {
        st.currentState = S.IDLE;
        st.wanderUntil = 0;
      }
    }

    // --- Wall grab → climb transition ---
    if (st.currentState === S.GRABBING_WALL) {
      st.vx = 0;
      st.vy = 0;
      if (st.behaviorTimer >= st.behaviorDuration) {
        // Start climbing or let go
        if (Math.random() < 0.7) {
          this.setBehavior(S.CLIMBING_WALL, 80 + Math.random() * 120);
        } else {
          st.currentState = S.FALLING;
        }
      }
    }

    // --- Wall climbing ---
    if (st.currentState === S.CLIMBING_WALL) {
      if (st.behaviorTimer >= st.behaviorDuration || !st.onWall) {
        if (st.onCeiling) {
          this.setBehavior(S.GRABBING_CEILING, 30 + Math.random() * 40);
        } else {
          // Fall off or keep climbing
          st.currentState = S.FALLING;
          st.vy = 0;
        }
      }
    }

    // --- Ceiling grab → climb transition ---
    if (st.currentState === S.GRABBING_CEILING) {
      st.vx = 0;
      st.vy = 0;
      if (st.behaviorTimer >= st.behaviorDuration) {
        if (Math.random() < 0.7) {
          this.setBehavior(S.CLIMBING_CEILING, 80 + Math.random() * 120);
        } else {
          st.currentState = S.FALLING;
        }
      }
    }

    // --- Ceiling climbing ---
    if (st.currentState === S.CLIMBING_CEILING) {
      if (st.behaviorTimer >= st.behaviorDuration) {
        // Fall off ceiling
        st.currentState = S.FALLING;
        st.vx = 0;
      }
    }
  }

  updateAnimation() {
    const S = SHIMEJI_STATES;
    const frames = ANIMATION_FRAMES[this.state.currentState] || ANIMATION_FRAMES.idle;
    this.state.animTimer++;

    // Frame durations tuned per state (inspired by shimeji-ee action durations)
    const durations = {
      [S.IDLE]: 10,
      [S.WALKING]: 8,
      [S.RUNNING]: 4,
      [S.CRAWLING]: 12,
      [S.CLIMBING_WALL]: 12,
      [S.CLIMBING_CEILING]: 12,
      [S.GRABBING_WALL]: 20,
      [S.GRABBING_CEILING]: 20,
      [S.HEAD_SPIN]: 5,
      [S.LANDING]: 8,
      [S.DANGLING_LEGS]: 15,
      [S.RESISTING]: 8,
      [S.SITTING]: 10,
      [S.SITTING_LOOK_UP]: 10,
      [S.SITTING_EDGE]: 10,
      [S.LYING_DOWN]: 10
    };
    const frameDuration = durations[this.state.currentState] || 10;

    if (this.state.animTimer >= frameDuration) {
      this.state.animTimer = 0;

      if (this.state.currentState === S.LANDING) {
        this.state.animFrame++;
        if (this.state.animFrame >= 2) {
          this.state.currentState = S.IDLE;
          this.state.animFrame = 0;
          this.state.wanderUntil = 0;
        }
      } else if (this.state.currentState === S.RESISTING) {
        // Play resist animation then switch to drag
        this.state.animFrame++;
        if (this.state.animFrame >= 2) {
          if (this.state.dragging) {
            this.state.currentState = S.DRAGGING;
          } else {
            this.state.currentState = this.state.onGround ? S.IDLE : S.FALLING;
            this.state.wanderUntil = 0;
          }
          this.state.animFrame = 0;
        }
      } else {
        this.state.animFrame = (this.state.animFrame + 1) % frames.length;
      }

      this.updateSprite();
    }
  }

  updateSprite() {
    const S = SHIMEJI_STATES;
    const charPath = this.getCharacterPath();

    if (this.state.dragging) {
      let dragFrame;
      if (this.state.currentState === S.RESISTING) {
        const frames = ANIMATION_FRAMES.resisting;
        dragFrame = frames[this.state.animFrame % frames.length];
      } else if (this.state.currentState === S.DRAGGING_HEAVY) {
        dragFrame = this.state.direction >= 0 ? 'dragged-tilt-right-heavy.png' : 'dragged-tilt-left-heavy.png';
      } else {
        dragFrame = this.state.direction >= 0 ? 'dragged-tilt-right-light.png' : 'dragged-tilt-left-light.png';
      }
      this.elements.sprite.src = charPath + dragFrame;
      return;
    }

    const frames = ANIMATION_FRAMES[this.state.currentState] || ANIMATION_FRAMES.idle;
    const frameFile = frames[this.state.animFrame % frames.length];
    if (frameFile) {
      this.elements.sprite.src = charPath + frameFile;
    }
  }

  updateVisuals() {
    if (!this.elements.wrapper) return;

    this.elements.wrapper.style.left = `${this.state.x}px`;
    this.elements.wrapper.style.top = `${this.state.y}px`;
    this.elements.sprite.style.transform = `scaleX(${-this.state.direction})`;
    this.elements.wrapper.style.cursor = this.state.dragging ? 'grabbing' : 'pointer';

    if (this.chatOpen) this.positionChatBubble();
  }

  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    const scale = SPRITE_SCALES[this.config.size] || 1;
    this.elements.sprite.style.width = `${SPRITE_SIZE * scale}px`;
    this.elements.sprite.style.height = `${SPRITE_SIZE * scale}px`;
    this.updateChatHeader();
    this.applyChatTheme();
  }

  applyChatTheme() {
    if (!this.elements.chat) return;
    const themeId = this.config.chatTheme || 'pastel';
    const theme = CHAT_THEMES.find((t) => t.id === themeId) || CHAT_THEMES[0];
    const bubbleStyle = theme.bubble || 'glass';
    this.elements.chat.classList.remove('glass', 'dark', 'solid');
    this.elements.chat.classList.add(bubbleStyle);
    this.elements.chat.style.setProperty('--chat-theme', theme.theme);
    this.elements.chat.style.setProperty('--chat-bg', theme.bg);
    const rgb = hexToRgb(theme.theme);
    if (rgb) {
      this.elements.chat.style.setProperty('--chat-theme-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
    this.updateChatHeader();
  }

  remove() {
    if (this.elements.wrapper) this.elements.wrapper.remove();
    if (this.elements.chat) this.elements.chat.remove();
  }
}

function createShimeji(id, config = {}) {
  const shimeji = new Shimeji(id, config);
  shimejis.push(shimeji);
  return shimeji;
}

function removeShimeji(shimeji) {
  shimeji.remove();
  const index = shimejis.indexOf(shimeji);
  if (index > -1) shimejis.splice(index, 1);
}

function getConfigForIndex(index) {
  const list = Array.isArray(globalConfig.shimejis) ? globalConfig.shimejis : [];
  if (list[index]) {
    return { ...list[index] };
  }
  return {
    character: globalConfig[`shimeji${index + 1}_character`] || CHARACTERS[index % CHARACTERS.length].id,
    size: globalConfig[`shimeji${index + 1}_size`] || 'medium',
    personality: globalConfig[`shimeji${index + 1}_personality`] || 'cryptid',
    chatTheme: globalConfig[`shimeji${index + 1}_chatTheme`] || 'pastel',
    mode: globalConfig[`shimeji${index + 1}_mode`] || globalConfig.aiMode || 'standard',
    standardProvider: globalConfig[`shimeji${index + 1}_standardProvider`] || 'openrouter',
    openrouterModel: globalConfig[`shimeji${index + 1}_openrouterModel`] || globalConfig.openrouterModel || 'google/gemini-2.0-flash-001',
    openrouterModelResolved: globalConfig[`shimeji${index + 1}_openrouterModelResolved`] || globalConfig.openrouterModelResolved || '',
    ollamaModel: globalConfig[`shimeji${index + 1}_ollamaModel`] || globalConfig.ollamaModel || 'gemma3:1b',
    ollamaUrl: globalConfig[`shimeji${index + 1}_ollamaUrl`] || globalConfig.ollamaUrl || 'http://127.0.0.1:11434',
    enabled: globalConfig.enabled !== false
  };
}

function updateShimejiCount(count) {
  const targetCount = Math.max(0, Math.min(count, MAX_SHIMEJIS));

  while (shimejis.length < targetCount) {
    const id = `shimeji-${shimejis.length + 1}`;
    const config = getConfigForIndex(shimejis.length);
    createShimeji(id, config);
  }

  while (shimejis.length > targetCount) {
    removeShimeji(shimejis[shimejis.length - 1]);
  }

  console.log(`Shimeji count updated: ${shimejis.length}`);
}

function applyShimejiList(list) {
  if (!Array.isArray(list)) return;
  updateShimejiCount(list.length);
  shimejis.forEach((shimeji, index) => {
    const nextConfig = list[index];
    if (!nextConfig) return;
    const prevChar = shimeji.config.character;
    shimeji.setConfig(nextConfig);
    if (nextConfig.character && nextConfig.character !== prevChar) {
      shimeji.config.character = nextConfig.character;
      shimeji.updateSprite();
    }
    if (nextConfig.enabled !== undefined) {
      shimeji.config.enabled = nextConfig.enabled;
    }
  });
}

function startAnimationLoop() {
  function loop() {
    shimejis.forEach(shimeji => shimeji.update());
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// Track mouse for click-through behavior
document.addEventListener('mousemove', (e) => {
  updateMouseCapture(e.clientX, e.clientY);
}, { passive: true });

// Mouse tracking for click-through overlay
let isMouseOverInteractive = false;
let lastMouseX = window.innerWidth / 2;
let lastMouseY = window.innerHeight / 2;

function hasOpenChats() {
  return shimejis.some((shimeji) => shimeji.chatOpen);
}

function closeAllChats() {
  let closedAny = false;
  shimejis.forEach((shimeji) => {
    if (shimeji.chatOpen) {
      shimeji.closeChat();
      closedAny = true;
    }
  });
  return closedAny;
}

function checkMouseOverShimeji(x, y) {
  // Check if mouse is over any shimeji or chat bubble
  for (const shimeji of shimejis) {
    if (!shimeji.elements.wrapper) continue;
    
    const rect = shimeji.elements.wrapper.getBoundingClientRect();
    const isOverShimeji = x >= rect.left && x <= rect.right && 
                          y >= rect.top && y <= rect.bottom;
    
    if (shimeji.chatOpen && shimeji.elements.chat) {
      const chatRect = shimeji.elements.chat.getBoundingClientRect();
      const isOverChat = x >= chatRect.left && x <= chatRect.right && 
                         y >= chatRect.top && y <= chatRect.bottom;
      if (isOverChat) return true;
    }
    
    if (isOverShimeji) return true;
  }
  return false;
}

function updateMouseCapture(x, y) {
  if (!window.shimejiApi?.setIgnoreMouseEvents) return;
  
  lastMouseX = x;
  lastMouseY = y;
  const shouldCapture = checkMouseOverShimeji(x, y) || hasOpenChats();
  
  if (shouldCapture !== isMouseOverInteractive) {
    isMouseOverInteractive = shouldCapture;
    // When shouldCapture is true, we DON'T ignore mouse events
    // When shouldCapture is false, we DO ignore mouse events (click-through)
    window.shimejiApi.setIgnoreMouseEvents(!shouldCapture);
  }
}

async function init() {
  console.log('Initializing Shimeji Desktop...');

  let container = document.getElementById('shimeji-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'shimeji-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    `;
    document.body.appendChild(container);
  }

  // Always create at least one shimeji immediately
  let shimejiCreated = false;
  
  try {
    if (window.shimejiApi) {
      console.log('Loading config from API...');
      globalConfig = await window.shimejiApi.getConfig() || {};
      console.log('Config loaded:', globalConfig);

      const list = Array.isArray(globalConfig.shimejis) ? globalConfig.shimejis : [];
      const shimejiCount = globalConfig.shimejiCount || list.length || 1;
      const enabled = globalConfig.enabled !== false;

      if (enabled) {
        const showShimejis = globalConfig.showShimejis !== false;
        for (let i = 0; i < shimejiCount; i++) {
          const id = `shimeji-${i + 1}`;
          const config = list[i] || getConfigForIndex(i);
          config.enabled = showShimejis;
          createShimeji(id, config);
          shimejiCreated = true;
        }
      }

      window.shimejiApi.onConfigUpdated((next) => {
        globalConfig = { ...globalConfig, ...next };
        console.log('Config updated:', globalConfig);

        if (next.shimejis) {
          applyShimejiList(next.shimejis);
        } else if (next.shimejiCount !== undefined) {
          updateShimejiCount(next.shimejiCount);
        }

        if (next.enabled !== undefined) {
          shimejis.forEach(s => s.config.enabled = next.enabled);
        }

        if (next.showShimejis !== undefined) {
          const show = next.showShimejis;
          shimejis.forEach(s => {
            s.config.enabled = show;
            if (s.elements.wrapper) {
              s.elements.wrapper.style.display = show ? 'flex' : 'none';
            }
            if (s.elements.chat && !show) {
              s.closeChat();
            }
          });
        }

        shimejis.forEach((shimeji, index) => {
          if (next[`shimeji${index + 1}_character`] !== undefined) {
            shimeji.config.character = next[`shimeji${index + 1}_character`];
            shimeji.updateSprite();
          }
          if (next[`shimeji${index + 1}_size`] !== undefined) {
            shimeji.setConfig({ size: next[`shimeji${index + 1}_size`] });
          }
          if (next[`shimeji${index + 1}_personality`] !== undefined) {
            shimeji.setConfig({ personality: next[`shimeji${index + 1}_personality`] });
          }
          if (next[`shimeji${index + 1}_chatTheme`] !== undefined) {
            shimeji.setConfig({ chatTheme: next[`shimeji${index + 1}_chatTheme`] });
          }
          if (next[`shimeji${index + 1}_mode`] !== undefined) {
            shimeji.setConfig({ mode: next[`shimeji${index + 1}_mode`] });
          }
          if (next[`shimeji${index + 1}_standardProvider`] !== undefined) {
            shimeji.setConfig({ standardProvider: next[`shimeji${index + 1}_standardProvider`] });
          }
          if (next[`shimeji${index + 1}_openrouterModel`] !== undefined) {
            shimeji.setConfig({ openrouterModel: next[`shimeji${index + 1}_openrouterModel`] });
          }
          if (next[`shimeji${index + 1}_openrouterModelResolved`] !== undefined) {
            shimeji.setConfig({ openrouterModelResolved: next[`shimeji${index + 1}_openrouterModelResolved`] });
          }
          if (next[`shimeji${index + 1}_ollamaUrl`] !== undefined) {
            shimeji.setConfig({ ollamaUrl: next[`shimeji${index + 1}_ollamaUrl`] });
          }
          if (next[`shimeji${index + 1}_ollamaModel`] !== undefined) {
            shimeji.setConfig({ ollamaModel: next[`shimeji${index + 1}_ollamaModel`] });
          }
          if (next[`shimeji${index + 1}_openclawGatewayUrl`] !== undefined) {
            shimeji.setConfig({ openclawGatewayUrl: next[`shimeji${index + 1}_openclawGatewayUrl`] });
          }
          if (next[`shimeji${index + 1}_openclawGatewayToken`] !== undefined) {
            shimeji.setConfig({ openclawGatewayToken: next[`shimeji${index + 1}_openclawGatewayToken`] });
          }
        });

        if (
          next.aiMode !== undefined
          || next.openrouterModel !== undefined
          || next.openrouterModelResolved !== undefined
          || next.ollamaModel !== undefined
          || next.openclawGatewayUrl !== undefined
        ) {
          shimejis.forEach((shimeji) => shimeji.updateChatHeader());
        }
      });

      if (window.shimejiApi.onAiStreamDelta) {
        window.shimejiApi.onAiStreamDelta((payload) => {
          if (!payload || !payload.shimejiId) return;
          const target = shimejis.find((s) => s.id === payload.shimejiId);
          if (!target) return;
          target.applyStreamDelta(payload.delta || '', payload.accumulated || '');
        });
      }
    } else {
      console.log('No API available, creating default shimeji...');
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }

    // Create default shimeji if none were created
    if (!shimejiCreated) {
      console.log('Creating default shimeji...');
      createShimeji('shimeji-1', { 
        character: 'shimeji', 
        enabled: true, 
        personality: 'random', 
        chatTheme: 'pastel',
        mode: 'standard',
        standardProvider: 'openrouter',
        openrouterModel: 'random'
      });
    }

  startAnimationLoop();
  console.log('Shimeji Desktop initialized with', shimejis.length, 'shimeji(s)');

  // Global click handler to close all chats when clicking outside
  document.addEventListener('mousedown', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    if (checkMouseOverShimeji(e.clientX, e.clientY)) {
      return;
    }

    if (!hasOpenChats()) return;

    closeAllChats();

    // Best-effort passthrough: switch back to click-through immediately.
    if (window.shimejiApi?.setIgnoreMouseEvents) {
      isMouseOverInteractive = false;
      window.shimejiApi.setIgnoreMouseEvents(true);
      setTimeout(() => updateMouseCapture(lastMouseX, lastMouseY), 0);
    }
  });

  window.addEventListener('blur', () => {
    if (!hasOpenChats()) return;
    closeAllChats();
    if (window.shimejiApi?.setIgnoreMouseEvents) {
      isMouseOverInteractive = false;
      window.shimejiApi.setIgnoreMouseEvents(true);
    }
  });
}

init();
