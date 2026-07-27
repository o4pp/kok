// ============================================================
// KOTCHA - Frontend Application v1.0.0
// Premium Interactive Streaming Platform
// ============================================================

import { APP_CONFIG, API_CONFIG, THEMES } from './config.js';

class KOTCHA {
    constructor() {
        this.config = APP_CONFIG;
        this.api = API_CONFIG;
        this.ws = null;
        this.roomId = null;
        this.user = null;
        this.isOwner = false;
        this.gameState = null;
        this.chatMessages = [];
        this.theme = 'dark';
        this.connected = false;
        
        this.init();
    }
    
    async init() {
        // Load theme preference
        this.loadTheme();
        
        // Check URL for room
        const params = new URLSearchParams(window.location.search);
        this.roomId = params.get('room') || this.generateRoomId();
        
        // Render app
        this.render();
        
        // Connect to WebSocket
        await this.connectWebSocket();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start heartbeat
        this.startHeartbeat();
    }
    
    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    loadTheme() {
        const saved = localStorage.getItem('kotcha-theme');
        if (saved) {
            this.theme = saved;
        }
        document.documentElement.setAttribute('data-theme', this.theme);
    }
    
    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('kotcha-theme', this.theme);
        document.documentElement.setAttribute('data-theme', this.theme);
    }
    
    // ============================================================
    // RENDER
    // ============================================================
    
    render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            ${this.renderNavbar()}
            ${this.renderMain()}
            ${this.renderFooter()}
        `;
        
        // Reconnect event listeners after render
        this.setupEventListeners();
    }
    
    renderNavbar() {
        return `
            <nav class="navbar">
                <div class="container">
                    <div class="navbar-brand">
                        <div class="logo-icon">K</div>
                        <span>KOTCHA</span>
                    </div>
                    <div class="navbar-links">
                        <a href="/">Home</a>
                        <a href="/rooms">Rooms</a>
                        <a href="/games">Games</a>
                        <a href="/subscription">Premium</a>
                        <a href="#" onclick="window.kotcha.toggleTheme()">
                            ${this.theme === 'dark' ? '🌙' : '☀️'}
                        </a>
                    </div>
                    <div class="navbar-actions">
                        ${this.user ? `
                            <span class="user-badge">${this.user.displayName || this.user.username}</span>
                            <button class="btn btn-outline btn-sm" onclick="window.kotcha.logout()">Logout</button>
                        ` : `
                            <button class="btn btn-primary btn-sm" onclick="window.kotcha.showLogin()">Login</button>
                            <button class="btn btn-secondary btn-sm" onclick="window.kotcha.showSignup()">Sign Up</button>
                        `}
                    </div>
                </div>
            </nav>
        `;
    }
    
    renderMain() {
        const room = this.roomId;
        return `
            <main class="container">
                <div class="room-container">
                    <div class="room-main">
                        ${this.renderGameArea()}
                    </div>
                    <div class="room-sidebar">
                        ${this.renderChat()}
                        ${this.renderStatus()}
                    </div>
                </div>
            </main>
        `;
    }
    
    renderGameArea() {
        return `
            <div class="game-area">
                <div class="game-header">
                    <h3>🎮 Game Room</h3>
                    <div class="game-controls">
                        <span class="game-status ${this.gameState?.active ? 'active' : 'inactive'}">
                            ${this.gameState?.active ? '🟢 Live' : '⚪ Waiting'}
                        </span>
                        ${this.isOwner ? `
                            <button class="btn btn-primary btn-sm" onclick="window.kotcha.startGame()">
                                Start Game
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="window.kotcha.stopGame()">
                                Stop Game
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="game-content">
                    ${this.renderGameContent()}
                </div>
            </div>
        `;
    }
    
    renderGameContent() {
        if (!this.gameState || !this.gameState.active) {
            return `
                <div class="game-placeholder">
                    <h4>⏳ Waiting for game to start...</h4>
                    <p>${this.isOwner ? 'Start a game using the controls above.' : 'The host will start the game soon!'}</p>
                </div>
            `;
        }
        
        switch (this.gameState.type) {
            case 'VOTE':
                return this.renderVoteGame();
            case 'NUMBER_GUESS':
                return this.renderNumberGuess();
            default:
                return `
                    <div class="game-placeholder">
                        <h4>🎯 ${this.gameState.type} Game</h4>
                        <p>Game is active! Type: ${this.gameState.type}</p>
                    </div>
                `;
        }
    }
    
    renderVoteGame() {
        const votes = this.gameState.votes || [0, 0, 0, 0, 0];
        const total = votes.reduce((a, b) => a + b, 0) || 1;
        
        return `
            <div class="vote-game">
                <h4>📊 Vote Now!</h4>
                <div class="vote-buttons">
                    ${[1, 2, 3, 4, 5].map(i => `
                        <button class="vote-button" onclick="window.kotcha.castVote(${i})">
                            ${i}
                        </button>
                    `).join('')}
                </div>
                <div class="vote-results">
                    ${votes.map((count, i) => `
                        <div class="vote-result">
                            <div>${i + 1}</div>
                            <div class="bar">
                                <div class="bar-fill" style="width: ${(count / total * 100)}%"></div>
                            </div>
                            <div>${count}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    renderNumberGuess() {
        return `
            <div class="number-guess-game">
                <h4>🔢 Guess the Number</h4>
                <p>Guess a number between 1 and 100</p>
                <div class="guess-input">
                    <input type="number" id="guess-input" min="1" max="100" />
                    <button class="btn btn-primary" onclick="window.kotcha.guessNumber()">Guess</button>
                </div>
                <div id="guess-feedback"></div>
            </div>
        `;
    }
    
    renderChat() {
        return `
            <div class="chat-container">
                <div class="chat-messages" id="chat-messages">
                    ${this.chatMessages.map(msg => `
                        <div class="chat-message">
                            <div class="avatar">${(msg.user?.displayName || 'U')[0]}</div>
                            <div>
                                <div class="username">${msg.user?.displayName || 'Anonymous'}</div>
                                <div class="content">${this.escapeHtml(msg.message)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="chat-input">
                    <input type="text" id="chat-input" placeholder="Type a message..." maxlength="500" />
                    <button class="btn btn-primary btn-sm" onclick="window.kotcha.sendChatMessage()">Send</button>
                </div>
            </div>
        `;
    }
    
    renderStatus() {
        return `
            <div class="card card-glass">
                <h4>📊 Room Status</h4>
                <div class="status-info">
                    <p><strong>Room:</strong> ${this.roomId}</p>
                    <p><strong>Viewers:</strong> ${this.viewers || 0}</p>
                    <p><strong>Messages:</strong> ${this.chatMessages.length}</p>
                    <p><strong>Status:</strong> ${this.connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
                </div>
            </div>
        `;
    }
    
    renderFooter() {
        return `
            <footer class="footer">
                <div class="container">
                    <p>&copy; 2024 KOTCHA - Interactive Streaming Platform</p>
                </div>
            </footer>
        `;
    }
    
    // ============================================================
    // WEBSOCKET
    // ============================================================
    
    async connectWebSocket() {
        const wsUrl = `${this.api.ws}/room/${this.roomId}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                this.connected = true;
                console.log('WebSocket connected');
                this.authenticate();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };
            
            this.ws.onclose = () => {
                this.connected = false;
                console.log('WebSocket disconnected');
                // Attempt reconnect after 3 seconds
                setTimeout(() => this.connectWebSocket(), 3000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
        }
    }
    
    authenticate() {
        if (!this.user) {
            // Create anonymous user
            this.user = {
                id: `user_${Math.random().toString(36).substring(2, 10)}`,
                username: `Guest_${Math.floor(Math.random() * 10000)}`,
                displayName: `Guest_${Math.floor(Math.random() * 10000)}`,
                avatar: null
            };
        }
        
        this.sendWebSocketMessage({
            type: 'AUTH',
            user: this.user,
            platform: 'kotcha'
        });
    }
    
    sendWebSocketMessage(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'CONNECTED':
                this.viewers = data.viewers || 0;
                this.updateStatus();
                break;
                
            case 'AUTH_SUCCESS':
                this.isOwner = data.isOwner || false;
                console.log('Authenticated:', data);
                break;
                
            case 'CHAT':
                if (data.data) {
                    this.chatMessages.push(data.data);
                    this.renderChat();
                }
                break;
                
            case 'GAME_STARTED':
            case 'GAME_STOPPED':
            case 'GAME_RESET':
                this.updateGameState();
                break;
                
            case 'USER_JOINED':
            case 'USER_LEFT':
                this.viewers = data.viewers || this.viewers || 0;
                this.updateStatus();
                break;
                
            case 'VOTE':
            case 'NUMBER_GUESS':
                this.updateGameState();
                break;
                
            default:
                console.log('WebSocket message:', data);
        }
    }
    
    // ============================================================
    // API METHODS
    // ============================================================
    
    async apiRequest(endpoint, options = {}) {
        const url = `${this.api.base}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(this.user?.id ? { 'Authorization': `Bearer ${this.user.id}` } : {}),
            ...(options.headers || {})
        };
        
        try {
            const response = await fetch(url, {
                ...options,
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    async updateGameState() {
        try {
            const response = await this.apiRequest(`/room/${this.roomId}/api/game/state`);
            if (response.success) {
                this.gameState = response.game;
                this.render();
            }
        } catch (error) {
            console.error('Failed to update game state:', error);
        }
    }
    
    async startGame(gameType = 'VOTE') {
        if (!this.isOwner) return;
        
        try {
            const response = await this.apiRequest(`/room/${this.roomId
