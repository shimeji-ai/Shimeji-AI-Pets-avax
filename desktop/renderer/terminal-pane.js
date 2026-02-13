(function exposeShimejiTerminalPane() {
  const DEFAULT_MAX_LINES = 4000;
  const DEFAULT_CELL_WIDTH = 8;
  const DEFAULT_CELL_HEIGHT = 17;

  const ANSI_16 = [
    '#1b2534', '#ff5f56', '#27c93f', '#f2cc60',
    '#4aa9ff', '#c792ea', '#4fd8c7', '#d6deeb',
    '#63718d', '#ff8b8b', '#5ef0a0', '#ffe38b',
    '#7acbff', '#e0b8ff', '#8ef5e7', '#f3f7ff'
  ];

  const OSC_DEFAULT_FG = 'rgb:eaea/f0f0/ffff';
  const OSC_DEFAULT_BG = 'rgb:0909/1010/1818';
  const OSC_DEFAULT_CURSOR = 'rgb:7a7a/caca/fefe';

  function parseParam(value, fallback = 0) {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number.parseInt(`${value}`, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function defaultStyle() {
    return {
      fg: null,
      bg: null,
      bold: false,
      dim: false,
      italic: false,
      underline: false,
      inverse: false
    };
  }

  function copyStyle(style) {
    return {
      fg: style?.fg || null,
      bg: style?.bg || null,
      bold: style?.bold === true,
      dim: style?.dim === true,
      italic: style?.italic === true,
      underline: style?.underline === true,
      inverse: style?.inverse === true
    };
  }

  function styleKey(style) {
    return [
      style?.fg || '',
      style?.bg || '',
      style?.bold ? '1' : '0',
      style?.dim ? '1' : '0',
      style?.italic ? '1' : '0',
      style?.underline ? '1' : '0',
      style?.inverse ? '1' : '0'
    ].join('|');
  }

  function ansi256Color(index) {
    const n = clamp(parseParam(index, 0), 0, 255);
    if (n < 16) return ANSI_16[n];
    if (n >= 232) {
      const level = 8 + (n - 232) * 10;
      const hex = level.toString(16).padStart(2, '0');
      return `#${hex}${hex}${hex}`;
    }
    const cube = n - 16;
    const r = Math.floor(cube / 36);
    const g = Math.floor((cube % 36) / 6);
    const b = cube % 6;
    const convert = (value) => (value === 0 ? 0 : 55 + value * 40);
    const rr = convert(r).toString(16).padStart(2, '0');
    const gg = convert(g).toString(16).padStart(2, '0');
    const bb = convert(b).toString(16).padStart(2, '0');
    return `#${rr}${gg}${bb}`;
  }

  function parseSgrColor(parts, startIndex) {
    const mode = parseParam(parts[startIndex], -1);
    if (mode === 2) {
      const r = clamp(parseParam(parts[startIndex + 1], 0), 0, 255);
      const g = clamp(parseParam(parts[startIndex + 2], 0), 0, 255);
      const b = clamp(parseParam(parts[startIndex + 3], 0), 0, 255);
      return {
        color: `rgb(${r}, ${g}, ${b})`,
        nextIndex: startIndex + 3
      };
    }
    if (mode === 5) {
      const indexed = clamp(parseParam(parts[startIndex + 1], 0), 0, 255);
      return {
        color: ansi256Color(indexed),
        nextIndex: startIndex + 1
      };
    }
    if (mode >= 0 && mode <= 255) {
      return {
        color: ansi256Color(mode),
        nextIndex: startIndex
      };
    }
    return null;
  }

  class ShimejiTerminalPane {
    constructor(container, options = {}) {
      this.container = container;
      this.options = options || {};
      this.maxLines = Number.isFinite(this.options.maxLines)
        ? Math.max(300, this.options.maxLines)
        : DEFAULT_MAX_LINES;

      this.rows = [[]];
      this.cursorRow = 0;
      this.cursorCol = 0;
      this.cols = 80;
      this.visibleRows = 24;
      this.scrollRegionTop = 0;
      this.scrollRegionBottom = this.visibleRows - 1;

      this.currentStyle = defaultStyle();
      this.savedCursor = null;
      this.altScreenSnapshot = null;
      this.cursorVisible = true;
      this.bracketedPaste = false;
      this.focusTracking = false;

      this.styleCache = new Map();
      this.inlineStyleCache = new Map();
      this.ensureStyleCached(this.currentStyle);

      this.renderPending = false;
      this.cellWidth = DEFAULT_CELL_WIDTH;
      this.cellHeight = DEFAULT_CELL_HEIGHT;
      this.lastFit = { cols: 0, rows: 0 };

      this.viewport = container;
      this.output = document.createElement('pre');
      this.output.className = 'shimeji-chat-terminal-output';
      this.viewport.innerHTML = '';
      this.viewport.appendChild(this.output);
      this.viewport.tabIndex = 0;

      this.boundKeyDown = (event) => this.onKeyDown(event);
      this.boundPaste = (event) => this.onPaste(event);
      this.boundMouseDown = () => this.focus();
      this.boundFocus = () => this.onFocusChange(true);
      this.boundBlur = () => this.onFocusChange(false);

      this.viewport.addEventListener('keydown', this.boundKeyDown);
      this.viewport.addEventListener('paste', this.boundPaste);
      this.viewport.addEventListener('mousedown', this.boundMouseDown);
      this.viewport.addEventListener('focus', this.boundFocus);
      this.viewport.addEventListener('blur', this.boundBlur);

      this.resizeObserver = null;
      if (typeof ResizeObserver === 'function') {
        this.resizeObserver = new ResizeObserver(() => this.fit());
        this.resizeObserver.observe(this.viewport);
      }

      this.measureCellSize();
      this.fit();
      this.scheduleRender();
    }

    dispose() {
      this.viewport.removeEventListener('keydown', this.boundKeyDown);
      this.viewport.removeEventListener('paste', this.boundPaste);
      this.viewport.removeEventListener('mousedown', this.boundMouseDown);
      this.viewport.removeEventListener('focus', this.boundFocus);
      this.viewport.removeEventListener('blur', this.boundBlur);
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    }

    focus() {
      try {
        this.viewport.focus();
      } catch {}
    }

    clear() {
      this.rows = [[]];
      this.cursorRow = 0;
      this.cursorCol = 0;
      this.scrollRegionTop = 0;
      this.scrollRegionBottom = Math.max(0, this.visibleRows - 1);
      this.savedCursor = null;
      this.altScreenSnapshot = null;
      this.currentStyle = defaultStyle();
      this.ensureStyleCached(this.currentStyle);
      this.scheduleRender();
    }

    write(rawChunk) {
      const text = String(rawChunk || '');
      if (!text) return;
      this.consume(text);
      this.scheduleRender();
    }

    fit() {
      this.measureCellSize();
      const width = Math.max(1, this.viewport.clientWidth || 1);
      const height = Math.max(1, this.viewport.clientHeight || 1);
      const cols = Math.max(20, Math.floor(width / this.cellWidth));
      const rows = Math.max(6, Math.floor(height / this.cellHeight));
      if (cols === this.lastFit.cols && rows === this.lastFit.rows) return;

      this.lastFit = { cols, rows };
      this.cols = cols;
      this.visibleRows = rows;
      this.scrollRegionTop = 0;
      this.scrollRegionBottom = Math.max(0, rows - 1);

      this.cursorCol = clamp(this.cursorCol, 0, Math.max(0, this.cols - 1));

      if (typeof this.options.onResize === 'function') {
        this.options.onResize({ cols, rows });
      }
      this.scheduleRender();
    }

    measureCellSize() {
      const probe = document.createElement('span');
      probe.style.visibility = 'hidden';
      probe.style.position = 'absolute';
      probe.style.pointerEvents = 'none';
      probe.style.whiteSpace = 'pre';
      probe.style.font = '13px ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
      probe.textContent = 'WWWWWWWWWW';
      this.viewport.appendChild(probe);
      const rect = probe.getBoundingClientRect();
      probe.remove();
      const width = rect.width / 10;
      const height = rect.height;
      if (Number.isFinite(width) && width > 2) this.cellWidth = width;
      if (Number.isFinite(height) && height > 8) this.cellHeight = height;
    }

    onFocusChange(focused) {
      if (!this.focusTracking || typeof this.options.onData !== 'function') return;
      this.options.onData(focused ? '\x1b[I' : '\x1b[O');
    }

    onPaste(event) {
      if (typeof this.options.onData !== 'function') return;
      const text = event?.clipboardData?.getData('text/plain');
      if (!text) return;
      event.preventDefault();
      const normalized = text.replace(/\r\n/g, '\n');
      if (this.bracketedPaste) {
        this.options.onData(`\x1b[200~${normalized}\x1b[201~`);
        return;
      }
      this.options.onData(normalized);
    }

    onKeyDown(event) {
      if (typeof this.options.onData !== 'function') return;
      if (event.metaKey) return;

      const key = event.key;
      let payload = null;
      const selectedText = this.getSelectedTextInPane();

      if (event.ctrlKey && event.shiftKey && (key === 'C' || key === 'c')) {
        if (selectedText) {
          event.preventDefault();
          event.stopPropagation();
          this.copyText(selectedText);
        }
        return;
      }

      if (event.ctrlKey && event.shiftKey && (key === 'V' || key === 'v')) {
        event.preventDefault();
        event.stopPropagation();
        this.pasteTextFromClipboard();
        return;
      }

      if (event.ctrlKey && !event.altKey && (key === 'C' || key === 'c') && selectedText) {
        event.preventDefault();
        event.stopPropagation();
        this.copyText(selectedText);
        return;
      }

      if (event.ctrlKey && !event.altKey) {
        if (key.length === 1) {
          const code = key.toUpperCase().charCodeAt(0);
          if (code >= 64 && code <= 95) {
            payload = String.fromCharCode(code - 64);
          } else if (code >= 97 && code <= 122) {
            payload = String.fromCharCode(code - 96);
          }
        } else if (key === ' ') {
          payload = '\x00';
        }
      } else if (event.altKey && key.length === 1) {
        payload = `\x1b${key}`;
      } else {
        switch (key) {
          case 'Enter':
            payload = '\r';
            break;
          case 'Backspace':
            payload = '\x7f';
            break;
          case 'Tab':
            payload = event.shiftKey ? '\x1b[Z' : '\t';
            break;
          case 'Escape':
            payload = '\x1b';
            break;
          case 'ArrowUp':
            payload = '\x1b[A';
            break;
          case 'ArrowDown':
            payload = '\x1b[B';
            break;
          case 'ArrowRight':
            payload = '\x1b[C';
            break;
          case 'ArrowLeft':
            payload = '\x1b[D';
            break;
          case 'Home':
            payload = '\x1b[H';
            break;
          case 'End':
            payload = '\x1b[F';
            break;
          case 'Delete':
            payload = '\x1b[3~';
            break;
          case 'PageUp':
            payload = '\x1b[5~';
            break;
          case 'PageDown':
            payload = '\x1b[6~';
            break;
          default:
            if (key.length === 1) {
              payload = key;
            }
        }
      }

      if (payload === null) return;
      event.preventDefault();
      event.stopPropagation();
      this.options.onData(payload);
    }

    getSelectedTextInPane() {
      const selection = window.getSelection ? window.getSelection() : null;
      if (!selection || selection.rangeCount === 0) return '';
      const text = String(selection.toString() || '');
      if (!text) return '';
      const range = selection.getRangeAt(0);
      const node = range?.commonAncestorContainer;
      if (!node) return '';
      const elementNode = node.nodeType === Node.ELEMENT_NODE ? node : node.parentNode;
      if (!elementNode || !this.viewport.contains(elementNode)) return '';
      return text;
    }

    async copyText(text) {
      const value = String(text || '');
      if (!value) return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
          return;
        }
      } catch {}
      try {
        document.execCommand('copy');
      } catch {}
    }

    async pasteTextFromClipboard() {
      if (typeof this.options.onData !== 'function') return;
      try {
        if (!navigator.clipboard?.readText) return;
        const text = await navigator.clipboard.readText();
        if (!text) return;
        const normalized = String(text).replace(/\r\n/g, '\n');
        if (this.bracketedPaste) {
          this.options.onData(`\x1b[200~${normalized}\x1b[201~`);
          return;
        }
        this.options.onData(normalized);
      } catch {}
    }

    consume(text) {
      let i = 0;
      while (i < text.length) {
        const ch = text[i];
        if (ch === '\x1b') {
          i = this.consumeEscape(text, i);
          continue;
        }
        this.consumeChar(ch);
        i += 1;
      }
    }

    consumeEscape(text, startIndex) {
      const next = text[startIndex + 1];
      if (!next) return text.length;

      if (next === '[') {
        let idx = startIndex + 2;
        while (idx < text.length) {
          const code = text.charCodeAt(idx);
          if (code >= 0x40 && code <= 0x7e) {
            const paramsRaw = text.slice(startIndex + 2, idx);
            const finalChar = text[idx];
            this.handleCsi(paramsRaw, finalChar);
            return idx + 1;
          }
          idx += 1;
        }
        return text.length;
      }

      if (next === ']') {
        let idx = startIndex + 2;
        while (idx < text.length) {
          const code = text.charCodeAt(idx);
          if (code === 0x07) {
            this.handleOsc(text.slice(startIndex + 2, idx));
            return idx + 1;
          }
          if (code === 0x1b && text[idx + 1] === '\\') {
            this.handleOsc(text.slice(startIndex + 2, idx));
            return idx + 2;
          }
          idx += 1;
        }
        return text.length;
      }

      if (next === '7') {
        this.savedCursor = { row: this.cursorRow, col: this.cursorCol };
        return startIndex + 2;
      }

      if (next === '8') {
        if (this.savedCursor) {
          this.cursorRow = Math.max(0, this.savedCursor.row);
          this.cursorCol = Math.max(0, this.savedCursor.col);
          this.ensureRow(this.cursorRow);
        }
        return startIndex + 2;
      }

      if (next === 'D') {
        this.cursorRow += 1;
        this.ensureRow(this.cursorRow);
        this.trimOverflow();
        return startIndex + 2;
      }

      if (next === 'M') {
        this.cursorRow = Math.max(0, this.cursorRow - 1);
        return startIndex + 2;
      }

      if (next === 'E') {
        this.cursorRow += 1;
        this.cursorCol = 0;
        this.ensureRow(this.cursorRow);
        this.trimOverflow();
        return startIndex + 2;
      }

      if (next === 'c') {
        this.clear();
        this.cursorVisible = true;
        this.bracketedPaste = false;
        this.focusTracking = false;
        return startIndex + 2;
      }

      if ((next === '(' || next === ')') && text[startIndex + 2]) {
        return startIndex + 3;
      }

      return startIndex + 2;
    }

    handleOsc(rawPayload) {
      if (typeof this.options.onData !== 'function') return;
      const payload = String(rawPayload || '');
      const separator = payload.indexOf(';');
      if (separator <= 0) return;
      const code = payload.slice(0, separator).trim();
      const value = payload.slice(separator + 1).trim();
      if (value !== '?') return;

      if (code === '10') {
        this.options.onData(`\x1b]10;${OSC_DEFAULT_FG}\x1b\\`);
        return;
      }
      if (code === '11') {
        this.options.onData(`\x1b]11;${OSC_DEFAULT_BG}\x1b\\`);
        return;
      }
      if (code === '12') {
        this.options.onData(`\x1b]12;${OSC_DEFAULT_CURSOR}\x1b\\`);
      }
    }

    handleCsi(rawParams, finalChar) {
      const params = String(rawParams || '');
      let prefix = '';
      let normalized = params;
      if (normalized && ['?', '>', '!', '='].includes(normalized[0])) {
        prefix = normalized[0];
        normalized = normalized.slice(1);
      }
      const parts = normalized.length ? normalized.split(';') : [];

      switch (finalChar) {
        case 'm':
          this.applySgr(parts);
          return;
        case 'h':
          if (prefix === '?') this.handleDecSet(parts);
          return;
        case 'l':
          if (prefix === '?') this.handleDecReset(parts);
          return;
        case 's':
          this.savedCursor = { row: this.cursorRow, col: this.cursorCol };
          return;
        case 'u':
          if (prefix === '?') {
            if (typeof this.options.onData === 'function') {
              this.options.onData('\x1b[?0u');
            }
            return;
          }
          if (this.savedCursor) {
            this.cursorRow = Math.max(0, this.savedCursor.row);
            this.cursorCol = Math.max(0, this.savedCursor.col);
            this.ensureRow(this.cursorRow);
          }
          return;
        case 'J':
          this.clearDisplay(parseParam(parts[0], 0));
          return;
        case 'K':
          this.clearCurrentLine(parseParam(parts[0], 0));
          return;
        case 'H':
        case 'f': {
          const row = Math.max(1, parseParam(parts[0], 1)) - 1;
          const col = Math.max(1, parseParam(parts[1], 1)) - 1;
          this.cursorRow = row;
          this.cursorCol = col;
          this.ensureRow(this.cursorRow);
          return;
        }
        case 'A':
          this.cursorRow = Math.max(0, this.cursorRow - Math.max(1, parseParam(parts[0], 1)));
          this.ensureRow(this.cursorRow);
          return;
        case 'B':
          this.cursorRow += Math.max(1, parseParam(parts[0], 1));
          this.ensureRow(this.cursorRow);
          this.trimOverflow();
          return;
        case 'C':
          this.cursorCol += Math.max(1, parseParam(parts[0], 1));
          return;
        case 'D':
          this.cursorCol = Math.max(0, this.cursorCol - Math.max(1, parseParam(parts[0], 1)));
          return;
        case 'E':
          this.cursorRow += Math.max(1, parseParam(parts[0], 1));
          this.cursorCol = 0;
          this.ensureRow(this.cursorRow);
          this.trimOverflow();
          return;
        case 'F':
          this.cursorRow = Math.max(0, this.cursorRow - Math.max(1, parseParam(parts[0], 1)));
          this.cursorCol = 0;
          this.ensureRow(this.cursorRow);
          return;
        case 'G':
          this.cursorCol = Math.max(0, Math.max(1, parseParam(parts[0], 1)) - 1);
          return;
        case 'd':
          this.cursorRow = Math.max(0, Math.max(1, parseParam(parts[0], 1)) - 1);
          this.ensureRow(this.cursorRow);
          return;
        case 'P':
          this.deleteChars(Math.max(1, parseParam(parts[0], 1)));
          return;
        case '@':
          this.insertChars(Math.max(1, parseParam(parts[0], 1)));
          return;
        case 'X':
          this.eraseChars(Math.max(1, parseParam(parts[0], 1)));
          return;
        case 'L':
          this.insertLines(Math.max(1, parseParam(parts[0], 1)));
          return;
        case 'M':
          this.deleteLines(Math.max(1, parseParam(parts[0], 1)));
          return;
        case 'S':
          this.scrollUp(Math.max(1, parseParam(parts[0], 1)));
          return;
        case 'T':
          this.scrollDown(Math.max(1, parseParam(parts[0], 1)));
          return;
        case 'r': {
          const top = Math.max(1, parseParam(parts[0], 1));
          const bottom = Math.max(top, parseParam(parts[1], this.visibleRows));
          this.scrollRegionTop = top - 1;
          this.scrollRegionBottom = bottom - 1;
          this.cursorRow = 0;
          this.cursorCol = 0;
          return;
        }
        case 'n': {
          if (typeof this.options.onData !== 'function') return;
          const reportCode = parseParam(parts[0], 0);
          if (reportCode === 5) {
            this.options.onData('\x1b[0n');
            return;
          }
          if (reportCode === 6) {
            const row = Math.max(1, this.cursorRow + 1);
            const col = Math.max(1, this.cursorCol + 1);
            const privatePrefix = prefix === '?' ? '?' : '';
            this.options.onData(`\x1b[${privatePrefix}${row};${col}R`);
          }
          return;
        }
        case 'c': {
          if (typeof this.options.onData !== 'function') return;
          if (prefix === '>') {
            this.options.onData('\x1b[>0;115;0c');
          } else {
            this.options.onData('\x1b[?1;2c');
          }
          return;
        }
        case 't': {
          if (typeof this.options.onData !== 'function') return;
          const op = parseParam(parts[0], 0);
          if (op === 18) {
            this.options.onData(`\x1b[8;${Math.max(1, this.visibleRows)};${Math.max(1, this.cols)}t`);
          } else if (op === 14) {
            const pxHeight = Math.max(1, Math.round(this.visibleRows * this.cellHeight));
            const pxWidth = Math.max(1, Math.round(this.cols * this.cellWidth));
            this.options.onData(`\x1b[4;${pxHeight};${pxWidth}t`);
          }
          return;
        }
        default:
          return;
      }
    }

    handleDecSet(parts) {
      for (const rawMode of parts) {
        const mode = parseParam(rawMode, 0);
        if (mode === 25) {
          this.cursorVisible = true;
          continue;
        }
        if (mode === 2004) {
          this.bracketedPaste = true;
          continue;
        }
        if (mode === 1004) {
          this.focusTracking = true;
          if (document.activeElement === this.viewport && typeof this.options.onData === 'function') {
            this.options.onData('\x1b[I');
          }
          continue;
        }
        if (mode === 1049 || mode === 1047 || mode === 47) {
          this.enterAltScreen();
        }
      }
    }

    handleDecReset(parts) {
      for (const rawMode of parts) {
        const mode = parseParam(rawMode, 0);
        if (mode === 25) {
          this.cursorVisible = false;
          continue;
        }
        if (mode === 2004) {
          this.bracketedPaste = false;
          continue;
        }
        if (mode === 1004) {
          this.focusTracking = false;
          continue;
        }
        if (mode === 1049 || mode === 1047 || mode === 47) {
          this.exitAltScreen();
        }
      }
    }

    enterAltScreen() {
      this.altScreenSnapshot = {
        rows: this.rows.map((line) => line.slice()),
        cursorRow: this.cursorRow,
        cursorCol: this.cursorCol,
        savedCursor: this.savedCursor ? { ...this.savedCursor } : null
      };
      this.rows = [[]];
      this.cursorRow = 0;
      this.cursorCol = 0;
      this.savedCursor = null;
    }

    exitAltScreen() {
      if (!this.altScreenSnapshot) return;
      this.rows = this.altScreenSnapshot.rows.map((line) => line.slice());
      this.cursorRow = this.altScreenSnapshot.cursorRow;
      this.cursorCol = this.altScreenSnapshot.cursorCol;
      this.savedCursor = this.altScreenSnapshot.savedCursor;
      this.altScreenSnapshot = null;
      this.ensureRow(this.cursorRow);
      this.trimOverflow();
    }

    applySgr(parts) {
      if (!parts.length) {
        this.currentStyle = defaultStyle();
        this.ensureStyleCached(this.currentStyle);
        return;
      }

      for (let i = 0; i < parts.length; i += 1) {
        const code = parseParam(parts[i], 0);
        switch (code) {
          case 0:
            this.currentStyle = defaultStyle();
            break;
          case 1:
            this.currentStyle.bold = true;
            break;
          case 2:
            this.currentStyle.dim = true;
            break;
          case 3:
            this.currentStyle.italic = true;
            break;
          case 4:
            this.currentStyle.underline = true;
            break;
          case 7:
            this.currentStyle.inverse = true;
            break;
          case 22:
            this.currentStyle.bold = false;
            this.currentStyle.dim = false;
            break;
          case 23:
            this.currentStyle.italic = false;
            break;
          case 24:
            this.currentStyle.underline = false;
            break;
          case 27:
            this.currentStyle.inverse = false;
            break;
          case 39:
            this.currentStyle.fg = null;
            break;
          case 49:
            this.currentStyle.bg = null;
            break;
          case 38: {
            const parsedFg = parseSgrColor(parts, i + 1);
            if (parsedFg) {
              this.currentStyle.fg = parsedFg.color;
              i = parsedFg.nextIndex;
            }
            break;
          }
          case 48: {
            const parsedBg = parseSgrColor(parts, i + 1);
            if (parsedBg) {
              this.currentStyle.bg = parsedBg.color;
              i = parsedBg.nextIndex;
            }
            break;
          }
          default:
            if (code >= 30 && code <= 37) {
              this.currentStyle.fg = ANSI_16[code - 30];
            } else if (code >= 40 && code <= 47) {
              this.currentStyle.bg = ANSI_16[code - 40];
            } else if (code >= 90 && code <= 97) {
              this.currentStyle.fg = ANSI_16[8 + (code - 90)];
            } else if (code >= 100 && code <= 107) {
              this.currentStyle.bg = ANSI_16[8 + (code - 100)];
            }
            break;
        }
      }

      this.ensureStyleCached(this.currentStyle);
    }

    consumeChar(ch) {
      switch (ch) {
        case '\n':
          this.cursorRow += 1;
          this.cursorCol = 0;
          this.ensureRow(this.cursorRow);
          this.trimOverflow();
          return;
        case '\r':
          this.cursorCol = 0;
          return;
        case '\b':
          this.cursorCol = Math.max(0, this.cursorCol - 1);
          return;
        case '\t': {
          const mod = this.cursorCol % 8;
          const spaces = mod === 0 ? 8 : 8 - mod;
          for (let i = 0; i < spaces; i += 1) {
            this.writeChar(' ');
          }
          return;
        }
        default:
          if (ch < ' ' || ch === '\u007f') return;
          this.writeChar(ch);
      }
    }

    clearDisplay(mode) {
      if (mode === 2 || mode === 3) {
        this.rows = [[]];
        this.cursorRow = 0;
        this.cursorCol = 0;
        return;
      }

      if (mode === 1) {
        for (let r = 0; r < this.cursorRow; r += 1) {
          this.rows[r] = [];
        }
        this.clearCurrentLine(1);
        return;
      }

      this.clearCurrentLine(0);
      for (let r = this.cursorRow + 1; r < this.rows.length; r += 1) {
        this.rows[r] = [];
      }
    }

    clearCurrentLine(mode) {
      this.ensureRow(this.cursorRow);
      const row = this.rows[this.cursorRow];

      if (mode === 2) {
        this.rows[this.cursorRow] = [];
        return;
      }

      if (mode === 1) {
        while (row.length <= this.cursorCol) {
          row.push(this.makeBlankCell());
        }
        for (let i = 0; i <= this.cursorCol; i += 1) {
          row[i] = this.makeBlankCell();
        }
        return;
      }

      if (this.cursorCol < row.length) {
        row.splice(this.cursorCol);
      }
    }

    insertChars(count) {
      this.ensureRow(this.cursorRow);
      const row = this.rows[this.cursorRow];
      const amount = Math.max(1, count);
      const cells = Array.from({ length: amount }, () => this.makeBlankCell());
      row.splice(this.cursorCol, 0, ...cells);
      if (this.cols > 0 && row.length > this.cols) {
        row.length = this.cols;
      }
    }

    deleteChars(count) {
      this.ensureRow(this.cursorRow);
      const row = this.rows[this.cursorRow];
      row.splice(this.cursorCol, Math.max(1, count));
    }

    eraseChars(count) {
      this.ensureRow(this.cursorRow);
      const row = this.rows[this.cursorRow];
      const amount = Math.max(1, count);
      while (row.length < this.cursorCol + amount) {
        row.push(this.makeBlankCell());
      }
      for (let i = 0; i < amount; i += 1) {
        row[this.cursorCol + i] = this.makeBlankCell();
      }
    }

    insertLines(count) {
      const amount = Math.max(1, count);
      const rows = Array.from({ length: amount }, () => []);
      this.rows.splice(this.cursorRow, 0, ...rows);
      this.trimOverflow();
    }

    deleteLines(count) {
      const amount = Math.max(1, count);
      this.rows.splice(this.cursorRow, amount);
      this.ensureRow(this.cursorRow);
    }

    scrollUp(count) {
      const amount = Math.max(1, count);
      this.rows.splice(0, amount);
      for (let i = 0; i < amount; i += 1) {
        this.rows.push([]);
      }
      this.cursorRow = Math.max(0, this.cursorRow - amount);
      this.ensureRow(this.cursorRow);
    }

    scrollDown(count) {
      const amount = Math.max(1, count);
      for (let i = 0; i < amount; i += 1) {
        this.rows.unshift([]);
      }
      if (this.rows.length > this.maxLines) {
        this.rows.splice(this.maxLines);
      }
      this.cursorRow = Math.min(this.rows.length - 1, this.cursorRow + amount);
      this.ensureRow(this.cursorRow);
    }

    writeChar(ch) {
      if (this.cols > 0 && this.cursorCol >= this.cols) {
        this.cursorRow += 1;
        this.cursorCol = 0;
        this.ensureRow(this.cursorRow);
        this.trimOverflow();
      }

      this.ensureRow(this.cursorRow);
      const row = this.rows[this.cursorRow];

      while (row.length < this.cursorCol) {
        row.push(this.makeBlankCell());
      }

      row[this.cursorCol] = {
        ch,
        styleKey: this.ensureStyleCached(this.currentStyle)
      };
      this.cursorCol += 1;

      if (this.cols > 0 && this.cursorCol >= this.cols) {
        this.cursorRow += 1;
        this.cursorCol = 0;
        this.ensureRow(this.cursorRow);
        this.trimOverflow();
      }
    }

    ensureRow(index) {
      while (this.rows.length <= index) {
        this.rows.push([]);
      }
    }

    trimOverflow() {
      const overflow = this.rows.length - this.maxLines;
      if (overflow <= 0) return;
      this.rows.splice(0, overflow);
      this.cursorRow = Math.max(0, this.cursorRow - overflow);
      if (this.savedCursor) {
        this.savedCursor.row = Math.max(0, this.savedCursor.row - overflow);
      }
      if (this.altScreenSnapshot) {
        this.altScreenSnapshot.cursorRow = Math.max(0, this.altScreenSnapshot.cursorRow - overflow);
      }
    }

    makeBlankCell() {
      return {
        ch: ' ',
        styleKey: this.ensureStyleCached(this.currentStyle)
      };
    }

    ensureStyleCached(style) {
      const key = styleKey(style);
      if (!this.styleCache.has(key)) {
        this.styleCache.set(key, copyStyle(style));
      }
      return key;
    }

    getInlineStyle(styleCellKey) {
      const key = String(styleCellKey || '');
      if (this.inlineStyleCache.has(key)) return this.inlineStyleCache.get(key);

      const style = this.styleCache.get(key) || defaultStyle();
      let fg = style.fg;
      let bg = style.bg;

      if (style.inverse) {
        const nextFg = bg || 'var(--shimeji-term-bg, #090f18)';
        const nextBg = fg || 'var(--shimeji-term-fg, #eaf0ff)';
        fg = nextFg;
        bg = nextBg;
      }

      let css = '';
      if (fg) css += `color:${fg};`;
      if (bg) css += `background-color:${bg};`;
      if (style.bold) css += 'font-weight:700;';
      if (style.dim) css += 'opacity:0.72;';
      if (style.italic) css += 'font-style:italic;';
      if (style.underline) css += 'text-decoration:underline;';

      this.inlineStyleCache.set(key, css);
      return css;
    }

    renderTextRun(text, styleCellKey) {
      const escaped = escapeHtml(text);
      if (!escaped) return '';
      const css = this.getInlineStyle(styleCellKey);
      if (!css) return escaped;
      return `<span style="${css}">${escaped}</span>`;
    }

    renderCursor(styleCellKey) {
      const css = this.getInlineStyle(styleCellKey);
      if (css) {
        return `<span style="${css}"><span class="shimeji-term-cursor"></span></span>`;
      }
      return '<span class="shimeji-term-cursor"></span>';
    }

    renderRow(rowIndex) {
      const row = this.rows[rowIndex] || [];
      const cursorOnRow = this.cursorVisible && rowIndex === this.cursorRow;
      const cursorLimit = cursorOnRow ? Math.min(this.cols, this.cursorCol + 1) : 0;
      const length = Math.max(row.length, cursorLimit);

      let html = '';
      let runStyleKey = null;
      let runText = '';

      const flush = () => {
        if (!runText) return;
        html += this.renderTextRun(runText, runStyleKey);
        runText = '';
      };

      const maxLength = Math.max(0, length);
      for (let col = 0; col < maxLength; col += 1) {
        const cell = row[col] || null;

        if (cursorOnRow && col === this.cursorCol) {
          flush();
          runStyleKey = null;
          html += this.renderCursor(cell?.styleKey || this.ensureStyleCached(this.currentStyle));
        }

        if (!cell) {
          if (cursorOnRow && col < this.cursorCol) {
            const gapStyle = this.ensureStyleCached(this.currentStyle);
            if (runStyleKey !== gapStyle) {
              flush();
              runStyleKey = gapStyle;
            }
            runText += ' ';
          }
          continue;
        }

        if (runStyleKey !== cell.styleKey) {
          flush();
          runStyleKey = cell.styleKey;
        }
        runText += cell.ch;
      }

      if (cursorOnRow && this.cursorCol >= maxLength) {
        flush();
        html += this.renderCursor(this.ensureStyleCached(this.currentStyle));
      }

      flush();
      return html;
    }

    scheduleRender() {
      if (this.renderPending) return;
      this.renderPending = true;
      requestAnimationFrame(() => {
        this.renderPending = false;
        const lastRow = Math.max(this.rows.length - 1, this.cursorRow);
        const lines = [];
        for (let rowIndex = 0; rowIndex <= lastRow; rowIndex += 1) {
          lines.push(this.renderRow(rowIndex));
        }
        this.output.innerHTML = lines.join('\n');
        this.viewport.scrollTop = this.viewport.scrollHeight;
      });
    }
  }

  window.ShimejiTerminalPane = ShimejiTerminalPane;
})();
