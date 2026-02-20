(async () => {
  const callAllBtn = document.getElementById('call-all');
  const dismissAllBtn = document.getElementById('dismiss-all');
  const listEl = document.getElementById('shimeji-list');
  const settingsBtn = document.getElementById('open-settings');

  if (!window.shimejiTrayApi || !listEl) return;

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      window.shimejiTrayApi.openSettings();
      window.close();
    });
  }

  const state = await window.shimejiTrayApi.getState();
  const shimejis = Array.isArray(state?.shimejis) ? state.shimejis : [];

  const hasEntries = shimejis.length > 0;
  callAllBtn.disabled = !hasEntries;
  dismissAllBtn.disabled = !hasEntries;

  const createIcon = (character) => {
    const image = document.createElement('img');
    image.className = 'shimeji-sprite';
    const safeName = String(character || 'shimeji').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'shimeji';
    image.src = `characters/${safeName}/stand-neutral.png`;
    image.onerror = () => {
      image.onerror = null;
      image.src = 'characters/shimeji/stand-neutral.png';
    };
    return image;
  };

  const createTypeLabel = (type) => {
    const span = document.createElement('span');
    span.className = 'shimeji-type';
    span.textContent = type;
    return span;
  };

  const createRow = (entry) => {
    const row = document.createElement('div');
    row.className = 'tray-shimeji-row';

    const icon = createIcon(entry.character);
    const meta = document.createElement('div');
    meta.className = 'shimeji-meta';
    const label = document.createElement('div');
    label.className = 'shimeji-label';
    label.textContent = entry.label || `#${entry.index + 1}`;
    const typeLabel = createTypeLabel(entry.source || 'Standard');
    meta.appendChild(label);
    meta.appendChild(typeLabel);

    const actions = document.createElement('div');
    actions.className = 'shimeji-actions';
    const callBtn = document.createElement('button');
    callBtn.className = 'call';
    callBtn.type = 'button';
    callBtn.textContent = 'Call';
    callBtn.addEventListener('click', () => {
      window.shimejiTrayApi.call({ shimejiId: entry.id }).finally(() => window.close());
    });
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'dismiss';
    dismissBtn.type = 'button';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => {
      window.shimejiTrayApi.dismiss({ shimejiId: entry.id }).finally(() => window.close());
    });
    actions.appendChild(callBtn);
    actions.appendChild(dismissBtn);

    row.appendChild(icon);
    row.appendChild(meta);
    row.appendChild(actions);
    listEl.appendChild(row);
  };

  if (!hasEntries) {
    const emptyState = document.createElement('div');
    emptyState.textContent = 'No shimejis configured yet.';
    emptyState.style.opacity = '0.7';
    listEl.appendChild(emptyState);
  } else {
    shimejis.forEach(createRow);
  }

  callAllBtn.addEventListener('click', () => {
    window.shimejiTrayApi.call({ all: true }).finally(() => window.close());
  });
  dismissAllBtn.addEventListener('click', () => {
    window.shimejiTrayApi.dismiss({ all: true }).finally(() => window.close());
  });

  document.addEventListener('mousedown', (event) => {
    if (!event.target.closest('.tray-menu')) {
      window.close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      window.close();
    }
  });
})();
