/**
 * index.js - Wallet connection and character selection interface
 *
 * IMPORTANT: This file is hosted on Vercel (externally), NOT served from the extension.
 * Therefore, it does NOT have access to Chrome extension APIs (chrome.runtime, etc.).
 *
 * Communication with the extension happens via window.postMessage:
 *   index.js <-> dapp_content_script.js (injected by extension) <-> background.js
 *
 * When updating this file, deploy to Vercel for changes to take effect.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const connectWalletBtn = document.getElementById('connect-wallet-btn');
    const networkBadge = document.getElementById('network-badge');
    const accountBadge = document.getElementById('account-badge');
    const accountDisplay = document.getElementById('account-display');
    const accountTooltip = document.getElementById('account-tooltip');
    const statusCard = document.getElementById('status-card');
    const statusActionBtn = document.getElementById('status-action-btn');
    const characterSection = document.getElementById('character-section');
    const characterGrid = document.getElementById('character-grid');
    const refreshBtn = document.getElementById('refresh-btn');

    // --- State ---
    let currentPublicKey = null;
    let currentNetwork = null;
    let currentCharacter = 'shimeji';
    let unlockedCharacters = { shimeji: true };

    // --- Constants ---
    const CHARACTERS = {
        shimeji: { name: 'Shimeji', icon: 'characters/shimeji/icon.png', alwaysUnlocked: true },
        ghost: { name: 'Ghost', icon: 'characters/ghost/icon.png', alwaysUnlocked: true },
        bunny: { name: 'Bunny', icon: 'characters/bunny/icon.png', alwaysUnlocked: true },
        kitten: { name: 'Kitten', icon: 'characters/kitten/icon.png', alwaysUnlocked: true },
        blob: { name: 'Blob', icon: 'characters/blob/icon.png', alwaysUnlocked: true }
    };

    function getFreighterApi() {
        return window.freighterApi || window.freighter || null;
    }

    async function getNetworkLabel(api) {
        if (api.getNetwork) {
            return api.getNetwork();
        }
        if (api.getNetworkDetails) {
            const details = await api.getNetworkDetails();
            return details.network || details.networkPassphrase || null;
        }
        return null;
    }

    // --- Message Communication with Extension ---
    function sendMessageToExtension(type, payload) {
        console.log('[Index] Sending message via postMessage:', type, payload);
        window.postMessage({ type: 'DAPP_MESSAGE', payload: { type, payload } }, '*');
    }

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        const data = event.data;
        if (!data || !data.type) return;

        console.log('[Index] Received message:', data);

        if (data.type === 'EXTENSION_RESPONSE') {
            if (data.payload) {
                if (data.payload.character) {
                    currentCharacter = data.payload.character;
                    renderCharacterGrid();
                }
                if (data.payload.payload && data.originalType === 'getUnlockedCharacters') {
                    console.log('[Index] Processing getUnlockedCharacters response:', data.payload.payload);
                    unlockedCharacters = data.payload.payload;
                    renderCharacterGrid();
                }
            }
        } else if (data.type === 'EXTENSION_MESSAGE') {
            if (data.payload) {
                if (data.payload.type === 'disconnectFromBackground' || data.payload.type === 'revokePermissionsFromBackground') {
                    disconnectWallet();
                } else if (data.payload.type === 'updateUnlockedCharacters') {
                    console.log('[Index] Processing updateUnlockedCharacters push:', data.payload.payload);
                    unlockedCharacters = data.payload.payload;
                    renderCharacterGrid();
                }
            }
        }
    });

    // --- Character Grid ---
    function renderCharacterGrid() {
        characterGrid.innerHTML = '';

        Object.entries(CHARACTERS).forEach(([id, char]) => {
            const isUnlocked = char.alwaysUnlocked || unlockedCharacters[id];
            const isSelected = currentCharacter === id;

            const card = document.createElement('div');
            card.className = 'character-card';
            if (isSelected) card.classList.add('selected');
            if (!isUnlocked) card.classList.add('locked');
            card.dataset.character = id;

            card.innerHTML = `
                <img src="${char.icon}" alt="${char.name}">
                <span class="name">${char.name}</span>
                <span class="status">${isSelected ? 'Active' : (isUnlocked ? 'Owned' : 'Locked')}</span>
            `;

            if (isUnlocked) {
                card.addEventListener('click', () => selectCharacter(id));
            } else {
                card.addEventListener('click', () => {
                    alert('This character is locked. Visit the factory to get an egg and unlock more!');
                });
            }

            characterGrid.appendChild(card);
        });
    }

    function selectCharacter(characterId) {
        currentCharacter = characterId;
        sendMessageToExtension('setCharacter', { character: characterId });
        renderCharacterGrid();
    }

    // --- Refresh Button ---
    refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('spinning');

        if (currentPublicKey) {
            sendMessageToExtension('walletConnected', {
                publicKey: currentPublicKey,
                network: currentNetwork
            });
        }

        sendMessageToExtension('getUnlockedCharacters', null);
        sendMessageToExtension('getCharacter', null);

        setTimeout(() => {
            refreshBtn.classList.remove('spinning');
        }, 1000);
    });

    // --- Wallet Connection ---
    async function connectWallet() {
        console.log('[Index] connectWallet called');

        const api = getFreighterApi();
        if (!api || !api.getPublicKey) {
            alert('Please install the Freighter wallet to connect.');
            window.open('https://www.freighter.app/', '_blank');
            return;
        }

        try {
            if (api.connect) {
                await api.connect();
            }
            currentPublicKey = await api.getPublicKey();
            currentNetwork = await getNetworkLabel(api);

            showConnectedUI(currentPublicKey, currentNetwork);

            sendMessageToExtension('walletConnected', {
                publicKey: currentPublicKey,
                network: currentNetwork
            });

        } catch (error) {
            console.error('[Index] Connection error:', error);
            alert('Failed to connect Freighter: ' + (error.message || error));
        }
    }

    function disconnectWallet() {
        currentPublicKey = null;
        currentNetwork = null;
        unlockedCharacters = { shimeji: true };

        showDisconnectedUI();
        sendMessageToExtension('walletDisconnected', null);
    }

    function showConnectedUI(publicKey, network) {
        const shortAddress = `${publicKey.substring(0, 6)}...${publicKey.substring(publicKey.length - 4)}`;

        accountDisplay.textContent = shortAddress;
        accountTooltip.textContent = publicKey;
        accountBadge.classList.remove('hidden');

        if (network) {
            networkBadge.classList.remove('hidden');
        } else {
            networkBadge.classList.add('hidden');
        }

        connectWalletBtn.textContent = 'Disconnect';
        connectWalletBtn.classList.add('connected');

        statusCard.classList.add('connected');
        characterSection.style.display = 'block';
    }

    function showDisconnectedUI() {
        accountDisplay.textContent = '';
        accountTooltip.textContent = '';
        accountBadge.classList.add('hidden');
        networkBadge.classList.add('hidden');
        connectWalletBtn.textContent = 'Connect Freighter';
        connectWalletBtn.classList.remove('connected');

        statusCard.classList.remove('connected');
        renderCharacterGrid();
    }

    // --- Event Listeners ---
    connectWalletBtn.addEventListener('click', () => {
        if (connectWalletBtn.textContent === 'Connect Freighter') {
            connectWallet();
        } else {
            disconnectWallet();
        }
    });

    statusActionBtn.addEventListener('click', () => {
        connectWallet();
    });

    // --- Auto-connect if already connected ---
    (async () => {
        const api = getFreighterApi();
        if (!api || !api.isConnected || !api.getPublicKey) return;

        try {
            const connected = await api.isConnected();
            if (!connected) return;

            currentPublicKey = await api.getPublicKey();
            currentNetwork = await getNetworkLabel(api);
            showConnectedUI(currentPublicKey, currentNetwork);

            sendMessageToExtension('walletConnected', {
                publicKey: currentPublicKey,
                network: currentNetwork
            });
        } catch (err) {
            console.error('[Index] Auto-connect error:', err);
        }
    })();

    // --- Initial Load ---
    sendMessageToExtension('getUnlockedCharacters', null);
    sendMessageToExtension('getCharacter', null);
    renderCharacterGrid();
});
