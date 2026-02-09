const SPRITE_SIZE = 128;
const TICK_MS = 40;

const SIZES = {
  small: 0.5,
  medium: 0.75,
  big: 1.0
};

const ANIMATIONS = {
  idle: [
    { sprite: 'stand-neutral.png', duration: 12 }
  ],
  walking: [
    { sprite: 'stand-neutral.png', duration: 6 },
    { sprite: 'walk-step-left.png', duration: 6 },
    { sprite: 'stand-neutral.png', duration: 6 },
    { sprite: 'walk-step-right.png', duration: 6 }
  ]
};

let config = {
  enabled: true,
  character: 'shimeji',
  size: 'medium',
  behavior: 'wander'
};

let charactersDir = null;
const spriteEl = document.getElementById('shimeji');

const state = {
  x: 0,
  y: 0,
  targetX: 0,
  direction: 1,
  speed: 2.4,
  anim: 'idle',
  animTick: 0,
  animFrame: 0,
  lastMouseMove: 0,
  wanderingUntil: 0
};

function toFileUrl(filePath) {
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/');
  return encodeURI(`file:///${normalized.startsWith('/') ? normalized.slice(1) : normalized}`);
}

function getSpriteUrl(name) {
  if (!charactersDir) return '';
  return `${toFileUrl(charactersDir)}/${config.character}/${name}`;
}

function applySize() {
  const scale = SIZES[config.size] || SIZES.medium;
  const size = SPRITE_SIZE * scale;
  spriteEl.style.width = `${size}px`;
  spriteEl.style.height = `${size}px`;
}

function setSprite(name) {
  const next = getSpriteUrl(name);
  if (spriteEl.src !== next) {
    spriteEl.src = next;
  }
}

function setAnimation(name) {
  if (state.anim === name) return;
  state.anim = name;
  state.animTick = 0;
  state.animFrame = 0;
}

function updateAnimation() {
  const frames = ANIMATIONS[state.anim] || ANIMATIONS.idle;
  const frame = frames[state.animFrame] || frames[0];
  if (!frame) return;
  setSprite(frame.sprite);
  state.animTick += 1;
  if (state.animTick >= frame.duration) {
    state.animTick = 0;
    state.animFrame = (state.animFrame + 1) % frames.length;
  }
}

function updateTarget() {
  const now = Date.now();
  const width = window.innerWidth;
  const scale = SIZES[config.size] || SIZES.medium;
  const spriteWidth = SPRITE_SIZE * scale;
  const maxX = Math.max(0, width - spriteWidth);

  if (config.behavior === 'follow') {
    state.targetX = Math.min(maxX, Math.max(0, state.targetX));
    return;
  }

  if (now - state.lastMouseMove < 1200) {
    state.targetX = Math.min(maxX, Math.max(0, state.targetX));
    return;
  }

  if (now < state.wanderingUntil) return;
  state.wanderingUntil = now + 2200 + Math.random() * 2600;
  state.targetX = Math.random() * maxX;
}

function updatePosition() {
  const scale = SIZES[config.size] || SIZES.medium;
  const size = SPRITE_SIZE * scale;
  const maxX = Math.max(0, window.innerWidth - size);
  state.x = Math.max(0, Math.min(state.x, maxX));
  state.y = window.innerHeight - size;

  const dx = state.targetX - state.x;
  const distance = Math.abs(dx);
  if (distance < 0.5) {
    setAnimation('idle');
    return;
  }
  setAnimation('walking');
  const step = Math.sign(dx) * Math.min(distance, state.speed);
  state.x += step;
  state.direction = step >= 0 ? 1 : -1;
}

function render() {
  spriteEl.style.transform = `translate(${state.x}px, ${state.y}px) scaleX(${state.direction})`;
}

function tick() {
  if (!config.enabled) {
    spriteEl.style.display = 'none';
    return;
  }
  spriteEl.style.display = 'block';
  updateTarget();
  updatePosition();
  updateAnimation();
  render();
}

function startLoop() {
  let lastTime = performance.now();
  let accumulator = 0;

  function loop(now) {
    const delta = now - lastTime;
    lastTime = now;
    accumulator += delta;
    while (accumulator >= TICK_MS) {
      tick();
      accumulator -= TICK_MS;
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

function applyConfig(next) {
  config = { ...config, ...next };
  applySize();
  state.x = Math.min(state.x, window.innerWidth - SPRITE_SIZE * (SIZES[config.size] || SIZES.medium));
  setAnimation('idle');
}

window.addEventListener('mousemove', (event) => {
  state.lastMouseMove = Date.now();
  state.targetX = event.clientX - (SPRITE_SIZE * (SIZES[config.size] || SIZES.medium)) / 2;
});

window.addEventListener('resize', () => {
  applySize();
});

spriteEl.addEventListener('dblclick', () => {
  if (window.shimejiApi) {
    window.shimejiApi.openSettings();
  }
});

async function init() {
  if (window.shimejiApi) {
    charactersDir = await window.shimejiApi.getCharactersDir();
    const stored = await window.shimejiApi.getConfig();
    applyConfig(stored);
    window.shimejiApi.onConfigUpdated((next) => {
      applyConfig(next);
    });
  } else {
    applyConfig(config);
  }
  applySize();
  state.x = Math.random() * Math.max(0, window.innerWidth - SPRITE_SIZE * (SIZES[config.size] || SIZES.medium));
  state.targetX = state.x;
  startLoop();
}

init();
