# Multi-Shimeji AI Chat Implementation Plan

## Phase 2-4 Implementation Details

### Files to Modify:
1. `/home/lulox/Shimeji-AI-Pets/desktop-mvp/main.js` - Multi-shimeji manager + chat IPC handlers
2. `/home/lulox/Shimeji-AI-Pets/desktop-mvp/preload.js` - Extended API for chat and AI
3. `/home/lulox/Shimeji-AI-Pets/desktop-mvp/renderer/overlay.html` - Chat bubble HTML structure
4. `/home/lulox/Shimeji-AI-Pets/desktop-mvp/renderer/overlay.js` - Multi-shimeji logic + chat UI
5. `/home/lulox/Shimeji-AI-Pets/desktop-mvp/renderer/chat.css` - Chat bubble styles

### Key Features to Implement:

#### 1. Multi-Shimeji Support (5 max)
- Track multiple shimeji instances with unique IDs
- Each has individual: position, direction, animation state, personality, conversation history
- Global active shimeji tracking (last clicked)
- Message relay between shimejis

#### 2. Chat Bubble UI
- Resizable with drag handles
- 3 visual styles: glass (default), solid, dark
- 10 theme presets
- Components: header, messages area, input, controls panel
- Thinking bubble (animated dots)
- Alert bubble (new message notification)
- Close/open on shimeji click

#### 3. OpenRouter Streaming API
- 7 personalities: cryptid, cozy, chaotic, philosopher, hype, noir, egg
- Streaming responses with SSE parsing
- 5 models: Gemini 2.0 Flash, Claude Sonnet 4, Llama 4 Maverick, DeepSeek Chat v3, Mistral Large
- Conversation history per shimeji
- System prompts with style rules

#### 4. Configuration
- Default personality: random
- Chat persistence: enabled
- Max shimejis: 5

### Implementation Steps:
1. Update package.json electron-store version to 8.2.0
2. Refactor main.js for multi-shimeji architecture
3. Extend preload.js with chat/AI APIs
4. Create new overlay.html with chat structure
5. Implement overlay.js with multi-shimeji logic
6. Create chat.css with all styles
7. Test and build Windows executable

### Testing Checklist:
- [ ] Multiple shimejis render correctly
- [ ] Each shimeji has independent state
- [ ] Chat opens on shimeji click
- [ ] Chat themes apply correctly
- [ ] OpenRouter streaming works
- [ ] Personalities respond differently
- [ ] Conversation history persists
- [ ] No ES module errors
