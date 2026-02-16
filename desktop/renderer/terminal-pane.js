(function exposeShimejiTerminalPane() {
  const DEFAULT_MAX_LINES = 4000;

  function isFunction(value) {
    return typeof value === 'function';
  }

  function normalizeText(raw) {
    return String(raw || '').replace(/\r\n/g, '\n');
  }

  class ShimejiTerminalPane {
    constructor(container, options = {}) {
      this.container = container;
      this.options = options || {};
      this.maxLines = Number.isFinite(this.options.maxLines)
        ? Math.max(300, this.options.maxLines)
        : DEFAULT_MAX_LINES;

      this.term = null;
      this.fitAddon = null;
      this.resizeObserver = null;
      this.fallbackPre = null;
      this.boundKeyDown = (event) => this.onKeyDown(event);
      this.boundPaste = (event) => this.onPaste(event);
      this.boundMouseDown = () => this.focus();

      this.container.innerHTML = '';
      this.container.tabIndex = 0;
      this.container.addEventListener('keydown', this.boundKeyDown);
      this.container.addEventListener('paste', this.boundPaste);
      this.container.addEventListener('mousedown', this.boundMouseDown);

      if (window.Terminal) {
        this.mountXterm();
      } else {
        this.mountFallback();
      }

      if (typeof ResizeObserver === 'function') {
        this.resizeObserver = new ResizeObserver(() => this.fit());
        this.resizeObserver.observe(this.container);
      }
    }

    mountXterm() {
      const term = new window.Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.34,
        scrollback: this.maxLines,
        allowTransparency: true,
        convertEol: false,
        macOptionIsMeta: true,
        theme: {
          background: '#090f18',
          foreground: '#ebf1ff',
          cursor: '#8cc8ff',
          cursorAccent: '#090f18',
          selectionBackground: 'rgba(120, 170, 255, 0.28)',
          black: '#1b2534',
          red: '#ff5f56',
          green: '#27c93f',
          yellow: '#f2cc60',
          blue: '#4aa9ff',
          magenta: '#c792ea',
          cyan: '#4fd8c7',
          white: '#d6deeb',
          brightBlack: '#63718d',
          brightRed: '#ff8b8b',
          brightGreen: '#5ef0a0',
          brightYellow: '#ffe38b',
          brightBlue: '#7acbff',
          brightMagenta: '#e0b8ff',
          brightCyan: '#8ef5e7',
          brightWhite: '#f3f7ff'
        }
      });

      if (window.FitAddon && window.FitAddon.FitAddon) {
        this.fitAddon = new window.FitAddon.FitAddon();
        term.loadAddon(this.fitAddon);
      }

      term.open(this.container);

      // Handle copy/paste shortcuts inside xterm (xterm captures keys before DOM)
      term.attachCustomKeyEventHandler((event) => {
        if (event.type !== 'keydown') return true;
        const key = event.key;

        // Ctrl+Shift+C or Ctrl+C with selection: copy
        if (event.ctrlKey && (key === 'C' || key === 'c')) {
          const selected = this.getSelectedText();
          if (selected) {
            event.preventDefault();
            this.copyText(selected);
            return false;
          }
          // Ctrl+C without selection: send interrupt (let xterm handle it)
          if (!event.shiftKey) return true;
          return false;
        }

        // Ctrl+Shift+V or Ctrl+V: paste
        if (event.ctrlKey && (key === 'V' || key === 'v')) {
          event.preventDefault();
          this.pasteTextFromClipboard();
          return false;
        }

        return true;
      });

      term.onData((data) => {
        if (isFunction(this.options.onData)) {
          this.options.onData(data);
        }
      });

      term.onResize((size) => {
        if (isFunction(this.options.onResize)) {
          this.options.onResize({ cols: size.cols, rows: size.rows });
        }
      });

      this.term = term;
      this.fit();
    }

    mountFallback() {
      const pre = document.createElement('pre');
      pre.className = 'shimeji-chat-terminal-output';
      pre.textContent = '';
      this.container.appendChild(pre);
      this.fallbackPre = pre;
      if (isFunction(this.options.onResize)) {
        this.options.onResize({ cols: 80, rows: 24 });
      }
    }

    dispose() {
      this.container.removeEventListener('keydown', this.boundKeyDown);
      this.container.removeEventListener('paste', this.boundPaste);
      this.container.removeEventListener('mousedown', this.boundMouseDown);
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      if (this.term) {
        this.term.dispose();
        this.term = null;
      }
      this.fitAddon = null;
      this.fallbackPre = null;
    }

    focus() {
      if (this.term) {
        this.term.focus();
        return;
      }
      try {
        this.container.focus();
      } catch {}
    }

    clear() {
      if (this.term) {
        this.term.reset();
        this.fit();
        return;
      }
      if (this.fallbackPre) {
        this.fallbackPre.textContent = '';
      }
    }

    write(rawChunk) {
      const text = String(rawChunk || '');
      if (!text) return;
      if (this.term) {
        this.term.write(text);
        return;
      }
      if (!this.fallbackPre) return;
      this.fallbackPre.textContent += text;
      this.container.scrollTop = this.container.scrollHeight;
    }

    fit() {
      if (this.fitAddon && this.term) {
        try {
          this.fitAddon.fit();
        } catch {}
      }
      if (this.term && isFunction(this.options.onResize)) {
        this.options.onResize({ cols: this.term.cols, rows: this.term.rows });
      }
    }

    getSelectedText() {
      if (this.term) {
        return String(this.term.getSelection() || '');
      }
      const selection = window.getSelection ? window.getSelection() : null;
      const text = String(selection?.toString?.() || '');
      return text;
    }

    async copyText(text) {
      const value = String(text || '');
      if (!value) return;
      try {
        if (window.shimejiApi?.clipboardWriteText) {
          window.shimejiApi.clipboardWriteText(value);
          return;
        }
      } catch {}
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

    pasteTextFromClipboard() {
      if (!this.term && !isFunction(this.options.onData)) return;
      try {
        let text = '';
        if (window.shimejiApi?.clipboardReadText) {
          text = window.shimejiApi.clipboardReadText();
        } else if (navigator.clipboard?.readText) {
          // Fallback (may not work on Windows Electron)
          navigator.clipboard.readText().then((t) => {
            const normalized = normalizeText(t);
            if (!normalized) return;
            if (this.term) { this.term.paste(normalized); return; }
            if (isFunction(this.options.onData)) this.options.onData(normalized);
          }).catch(() => {});
          return;
        }
        const normalized = normalizeText(text);
        if (!normalized) return;
        if (this.term) {
          this.term.paste(normalized);
          return;
        }
        if (isFunction(this.options.onData)) this.options.onData(normalized);
      } catch {}
    }

    onPaste(event) {
      const text = event?.clipboardData?.getData('text/plain');
      if (!text) return;
      const normalized = normalizeText(text);
      event.preventDefault();
      if (this.term) {
        this.term.paste(normalized);
        return;
      }
      if (isFunction(this.options.onData)) {
        this.options.onData(normalized);
      }
    }

    onKeyDown(event) {
      const key = event.key;
      const selected = this.getSelectedText();

      if (event.ctrlKey && event.shiftKey && (key === 'C' || key === 'c')) {
        if (selected) {
          event.preventDefault();
          event.stopPropagation();
          this.copyText(selected);
        }
        return;
      }

      if (event.ctrlKey && event.shiftKey && (key === 'V' || key === 'v')) {
        event.preventDefault();
        event.stopPropagation();
        this.pasteTextFromClipboard();
        return;
      }

      if (event.ctrlKey && !event.altKey && (key === 'C' || key === 'c') && selected) {
        event.preventDefault();
        event.stopPropagation();
        this.copyText(selected);
      }
    }
  }

  window.ShimejiTerminalPane = ShimejiTerminalPane;
})();
