// Solitaire Game - Klondike Rules
// A gift with love ❤️

class Solitaire {
    constructor() {
        this.suits = ['♠', '♥', '♦', '♣'];
        this.suitColors = { '♠': 'black', '♥': 'red', '♦': 'red', '♣': 'black' };
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];

        this.history = [];
        this.moves = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.gameStarted = false;

        this.selectedCard = null;
        this.draggedCards = [];
        this.dragStartPos = { x: 0, y: 0 };
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;

        // Streak tracking
        this.streak = 0;
        this.lastPlayDate = null;

        this.init();
    }

    init() {
        this.loadStreak();
        this.setupEventListeners();
        this.newGame();
    }

    loadStreak() {
        const savedStreak = localStorage.getItem('solitaire_streak');
        const savedDate = localStorage.getItem('solitaire_last_play');

        if (savedStreak && savedDate) {
            const lastPlay = new Date(savedDate);
            const today = new Date();

            // Reset time to midnight for comparison
            lastPlay.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const diffDays = Math.floor((today - lastPlay) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                // Same day - keep streak
                this.streak = parseInt(savedStreak);
            } else if (diffDays === 1) {
                // Next day - streak continues (will increment on win)
                this.streak = parseInt(savedStreak);
            } else {
                // Missed a day - reset streak
                this.streak = 0;
            }
            this.lastPlayDate = savedDate;
        }

        this.updateStreakDisplay();
    }

    updateStreak() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const savedDate = localStorage.getItem('solitaire_last_play');

        if (savedDate) {
            const lastPlay = new Date(savedDate);
            lastPlay.setHours(0, 0, 0, 0);
            const lastPlayStr = lastPlay.toISOString().split('T')[0];

            if (todayStr === lastPlayStr) {
                // Already played today - don't increment
                return;
            }
        }

        // Increment streak and save
        this.streak++;
        localStorage.setItem('solitaire_streak', this.streak.toString());
        localStorage.setItem('solitaire_last_play', todayStr);

        this.updateStreakDisplay();
    }

    updateStreakDisplay() {
        const streakEl = document.getElementById('streak');
        if (streakEl) {
            streakEl.textContent = `🔥 ${this.streak}`;
            // Add fire animation for milestones
            if (this.streak > 0 && this.streak % 10 === 0) {
                streakEl.classList.add('streak-milestone');
                setTimeout(() => streakEl.classList.remove('streak-milestone'), 2000);
            }
        }
    }

    createDeck() {
        const deck = [];
        for (const suit of this.suits) {
            for (let i = 0; i < this.ranks.length; i++) {
                deck.push({
                    suit,
                    rank: this.ranks[i],
                    value: i + 1,
                    color: this.suitColors[suit],
                    faceUp: false,
                    id: `${this.ranks[i]}${suit}`
                });
            }
        }
        return deck;
    }

    shuffle(deck) {
        // Fisher-Yates shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    newGame() {
        // Reset state
        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];
        this.history = [];
        this.moves = 0;
        this.timer = 0;
        this.gameStarted = false;
        this.selectedCard = null;

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Create and shuffle deck
        const deck = this.shuffle(this.createDeck());

        // Deal to tableau
        for (let col = 0; col < 7; col++) {
            for (let row = col; row < 7; row++) {
                const card = deck.pop();
                if (row === col) {
                    card.faceUp = true;
                }
                this.tableau[row].push(card);
            }
        }

        // Remaining cards go to stock
        this.stock = deck;

        this.render();
        this.updateUI();

        // Animate dealing
        this.animateDeal();
    }

    animateDeal() {
        const cards = document.querySelectorAll('.tableau-pile .card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translate(-100px, -100px)';
            setTimeout(() => {
                card.style.transition = 'all 0.2s ease';
                card.style.opacity = '1';
                card.style.transform = '';
                this.hapticFeedback('light');
            }, index * 30);
        });
    }

    startTimer() {
        if (!this.gameStarted) {
            this.gameStarted = true;
            this.timerInterval = setInterval(() => {
                this.timer++;
                this.updateTimerDisplay();
            }, 1000);
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timer / 60);
        const seconds = this.timer % 60;
        document.getElementById('timer').textContent =
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    updateUI() {
        document.getElementById('moves').textContent = `Moves: ${this.moves}`;
        document.getElementById('undo-btn').disabled = this.history.length === 0;
        this.updateTimerDisplay();
    }

    hapticFeedback(style = 'light') {
        if ('vibrate' in navigator) {
            const patterns = {
                light: 10,
                medium: 20,
                heavy: 30,
                success: [30, 50, 30]
            };
            navigator.vibrate(patterns[style] || 10);
        }
    }

    saveState() {
        this.history.push({
            stock: JSON.parse(JSON.stringify(this.stock)),
            waste: JSON.parse(JSON.stringify(this.waste)),
            foundations: JSON.parse(JSON.stringify(this.foundations)),
            tableau: JSON.parse(JSON.stringify(this.tableau)),
            moves: this.moves
        });

        // Limit history to prevent memory issues
        if (this.history.length > 50) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history.length === 0) return;

        const state = this.history.pop();
        this.stock = state.stock;
        this.waste = state.waste;
        this.foundations = state.foundations;
        this.tableau = state.tableau;
        this.moves = state.moves;

        this.hapticFeedback('light');
        this.render();
        this.updateUI();
    }

    drawFromStock() {
        this.startTimer();

        if (this.stock.length === 0) {
            // Recycle waste to stock
            if (this.waste.length === 0) return;

            this.saveState();
            this.stock = this.waste.reverse().map(card => {
                card.faceUp = false;
                return card;
            });
            this.waste = [];
            this.hapticFeedback('medium');
        } else {
            this.saveState();
            // Draw one card (classic rules)
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
            this.moves++;
            this.hapticFeedback('light');
        }

        this.render();
        this.updateUI();
    }

    canMoveToFoundation(card, foundationIndex) {
        const foundation = this.foundations[foundationIndex];

        if (foundation.length === 0) {
            return card.rank === 'A';
        }

        const topCard = foundation[foundation.length - 1];
        return card.suit === topCard.suit && card.value === topCard.value + 1;
    }

    canMoveToTableau(card, tableauIndex) {
        const pile = this.tableau[tableauIndex];

        if (pile.length === 0) {
            return card.rank === 'K';
        }

        const topCard = pile[pile.length - 1];
        if (!topCard.faceUp) return false;

        return card.color !== topCard.color && card.value === topCard.value - 1;
    }

    findCardLocation(card) {
        // Check waste
        const wasteIndex = this.waste.findIndex(c => c.id === card.id);
        if (wasteIndex !== -1) {
            return { type: 'waste', index: wasteIndex };
        }

        // Check foundations
        for (let i = 0; i < 4; i++) {
            const foundIndex = this.foundations[i].findIndex(c => c.id === card.id);
            if (foundIndex !== -1) {
                return { type: 'foundation', pileIndex: i, cardIndex: foundIndex };
            }
        }

        // Check tableau
        for (let i = 0; i < 7; i++) {
            const foundIndex = this.tableau[i].findIndex(c => c.id === card.id);
            if (foundIndex !== -1) {
                return { type: 'tableau', pileIndex: i, cardIndex: foundIndex };
            }
        }

        return null;
    }

    moveCard(card, targetType, targetIndex) {
        const location = this.findCardLocation(card);
        if (!location) return false;

        this.startTimer();

        let cardsToMove = [];

        // Get cards to move
        if (location.type === 'waste') {
            if (this.waste[this.waste.length - 1].id !== card.id) return false;
            cardsToMove = [this.waste[this.waste.length - 1]];
        } else if (location.type === 'foundation') {
            const foundation = this.foundations[location.pileIndex];
            if (foundation[foundation.length - 1].id !== card.id) return false;
            cardsToMove = [foundation[foundation.length - 1]];
        } else if (location.type === 'tableau') {
            cardsToMove = this.tableau[location.pileIndex].slice(location.cardIndex);
        }

        // Validate move
        if (targetType === 'foundation') {
            if (cardsToMove.length !== 1) return false;
            if (!this.canMoveToFoundation(cardsToMove[0], targetIndex)) return false;
        } else if (targetType === 'tableau') {
            if (!this.canMoveToTableau(cardsToMove[0], targetIndex)) return false;
        }

        // Execute move
        this.saveState();

        // Remove from source
        if (location.type === 'waste') {
            this.waste.pop();
        } else if (location.type === 'foundation') {
            this.foundations[location.pileIndex].pop();
        } else if (location.type === 'tableau') {
            this.tableau[location.pileIndex] = this.tableau[location.pileIndex].slice(0, location.cardIndex);
            // Flip the new top card if needed
            const pile = this.tableau[location.pileIndex];
            if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
                pile[pile.length - 1].faceUp = true;
            }
        }

        // Add to target
        if (targetType === 'foundation') {
            this.foundations[targetIndex].push(...cardsToMove);
            this.hapticFeedback('medium');
        } else if (targetType === 'tableau') {
            this.tableau[targetIndex].push(...cardsToMove);
            this.hapticFeedback('light');
        }

        this.moves++;
        this.render();
        this.updateUI();
        this.checkWin();

        return true;
    }

    autoMoveToFoundation(card) {
        const location = this.findCardLocation(card);
        if (!location) return false;

        // Can only auto-move single cards
        if (location.type === 'tableau') {
            const pile = this.tableau[location.pileIndex];
            if (location.cardIndex !== pile.length - 1) return false;
        }

        // Try each foundation
        for (let i = 0; i < 4; i++) {
            if (this.canMoveToFoundation(card, i)) {
                return this.moveCard(card, 'foundation', i);
            }
        }

        return false;
    }

    findHint() {
        // Priority 1: Move to foundation
        // Check waste
        if (this.waste.length > 0) {
            const card = this.waste[this.waste.length - 1];
            for (let i = 0; i < 4; i++) {
                if (this.canMoveToFoundation(card, i)) {
                    return { card, targetType: 'foundation', targetIndex: i };
                }
            }
        }
        // Check tableau top cards
        for (let t = 0; t < 7; t++) {
            const pile = this.tableau[t];
            if (pile.length > 0) {
                const card = pile[pile.length - 1];
                for (let i = 0; i < 4; i++) {
                    if (this.canMoveToFoundation(card, i)) {
                        return { card, targetType: 'foundation', targetIndex: i };
                    }
                }
            }
        }

        // Priority 2: Move cards between tableau piles
        for (let t = 0; t < 7; t++) {
            const pile = this.tableau[t];
            for (let cardIdx = 0; cardIdx < pile.length; cardIdx++) {
                const card = pile[cardIdx];
                if (!card.faceUp) continue;

                for (let targetT = 0; targetT < 7; targetT++) {
                    if (targetT === t) continue;
                    if (this.canMoveToTableau(card, targetT)) {
                        // Prefer moves that reveal face-down cards
                        if (cardIdx > 0 && !pile[cardIdx - 1].faceUp) {
                            return { card, targetType: 'tableau', targetIndex: targetT };
                        }
                        // Or moves to non-empty piles (moving Kings to empty is less useful)
                        if (this.tableau[targetT].length > 0) {
                            return { card, targetType: 'tableau', targetIndex: targetT };
                        }
                    }
                }
            }
        }

        // Priority 3: Move waste card to tableau
        if (this.waste.length > 0) {
            const card = this.waste[this.waste.length - 1];
            for (let t = 0; t < 7; t++) {
                if (this.canMoveToTableau(card, t)) {
                    return { card, targetType: 'tableau', targetIndex: t };
                }
            }
        }

        // Priority 4: Move Kings to empty tableau slots
        for (let t = 0; t < 7; t++) {
            const pile = this.tableau[t];
            for (let cardIdx = 0; cardIdx < pile.length; cardIdx++) {
                const card = pile[cardIdx];
                if (!card.faceUp || card.rank !== 'K') continue;
                if (cardIdx === 0) continue; // King already at bottom, no point moving

                for (let targetT = 0; targetT < 7; targetT++) {
                    if (targetT === t) continue;
                    if (this.tableau[targetT].length === 0) {
                        return { card, targetType: 'tableau', targetIndex: targetT };
                    }
                }
            }
        }

        // No move found - suggest drawing from stock
        if (this.stock.length > 0 || this.waste.length > 0) {
            return { drawStock: true };
        }

        return null;
    }

    showHint() {
        this.clearSelection();
        const hint = this.findHint();

        if (!hint) {
            this.hapticFeedback('heavy');
            return;
        }

        if (hint.drawStock) {
            // Highlight the stock pile
            const stockEl = document.getElementById('stock');
            stockEl.classList.add('hint-pulse');
            setTimeout(() => stockEl.classList.remove('hint-pulse'), 1500);
            this.hapticFeedback('light');
            return;
        }

        // Highlight the source card
        const cardEl = document.querySelector(`[data-card-id="${hint.card.id}"]`);
        if (cardEl) {
            cardEl.classList.add('hint-pulse');
            setTimeout(() => cardEl.classList.remove('hint-pulse'), 1500);
        }

        // Highlight the target
        if (hint.targetType === 'foundation') {
            const foundEl = document.getElementById(`foundation-${hint.targetIndex}`);
            foundEl.classList.add('hint-pulse');
            setTimeout(() => foundEl.classList.remove('hint-pulse'), 1500);
        } else if (hint.targetType === 'tableau') {
            const pile = this.tableau[hint.targetIndex];
            if (pile.length > 0) {
                const topCard = pile[pile.length - 1];
                const topCardEl = document.querySelector(`[data-card-id="${topCard.id}"]`);
                if (topCardEl) {
                    topCardEl.classList.add('hint-pulse');
                    setTimeout(() => topCardEl.classList.remove('hint-pulse'), 1500);
                }
            } else {
                const pileEl = document.getElementById(`tableau-${hint.targetIndex}`);
                pileEl.classList.add('hint-pulse');
                setTimeout(() => pileEl.classList.remove('hint-pulse'), 1500);
            }
        }

        this.hapticFeedback('medium');
    }

    tryAutoComplete() {
        // Check if all cards are face up (game is winnable)
        let allFaceUp = true;
        for (const pile of this.tableau) {
            for (const card of pile) {
                if (!card.faceUp) {
                    allFaceUp = false;
                    break;
                }
            }
        }

        if (!allFaceUp || this.stock.length > 0) return;

        // Auto-complete animation
        const autoMove = () => {
            // Try to move from waste first
            if (this.waste.length > 0) {
                const card = this.waste[this.waste.length - 1];
                for (let i = 0; i < 4; i++) {
                    if (this.canMoveToFoundation(card, i)) {
                        this.moveCard(card, 'foundation', i);
                        setTimeout(autoMove, 100);
                        return;
                    }
                }
            }

            // Try tableau
            for (let t = 0; t < 7; t++) {
                const pile = this.tableau[t];
                if (pile.length > 0) {
                    const card = pile[pile.length - 1];
                    for (let i = 0; i < 4; i++) {
                        if (this.canMoveToFoundation(card, i)) {
                            this.moveCard(card, 'foundation', i);
                            setTimeout(autoMove, 100);
                            return;
                        }
                    }
                }
            }
        };

        setTimeout(autoMove, 300);
    }

    checkWin() {
        const totalInFoundations = this.foundations.reduce((sum, f) => sum + f.length, 0);
        if (totalInFoundations === 52) {
            clearInterval(this.timerInterval);
            this.hapticFeedback('success');
            this.showWinModal();
        } else {
            // Check for auto-complete opportunity
            this.tryAutoComplete();
        }
    }

    showWinModal() {
        // Update streak on win
        this.updateStreak();

        const modal = document.getElementById('win-modal');
        const stats = document.getElementById('win-stats');
        const minutes = Math.floor(this.timer / 60);
        const seconds = this.timer % 60;
        stats.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')} | Moves: ${this.moves}`;

        // Show streak in modal
        let streakModalEl = modal.querySelector('.streak-display');
        if (!streakModalEl) {
            streakModalEl = document.createElement('p');
            streakModalEl.className = 'streak-display';
            streakModalEl.style.cssText = 'font-size: 20px; margin: 10px 0; color: #ff6b00;';
            stats.insertAdjacentElement('beforebegin', streakModalEl);
        }
        streakModalEl.textContent = `🔥 ${this.streak} Day Streak!`;

        // Show the special message on every win
        let messageEl = modal.querySelector('.special-message');
        if (!messageEl) {
            const specialMsg = document.createElement('p');
            specialMsg.className = 'special-message';
            specialMsg.textContent = 'To my duchess, I love you';
            specialMsg.style.cssText = 'font-style: italic; color: #d32f2f; font-size: 18px; margin: 15px 0; font-weight: 500;';
            stats.insertAdjacentElement('afterend', specialMsg);
        }

        modal.classList.remove('hidden');

        // Celebration animation
        this.celebrateWin();
    }

    celebrateWin() {
        // Create confetti-like card cascade
        const container = document.getElementById('game-board');
        const cards = document.querySelectorAll('.foundation-pile .card');

        cards.forEach((card, i) => {
            setTimeout(() => {
                const clone = card.cloneNode(true);
                clone.style.position = 'fixed';
                clone.style.left = `${Math.random() * window.innerWidth}px`;
                clone.style.top = '-100px';
                clone.style.transition = 'all 2s ease-in';
                clone.style.zIndex = '3000';
                document.body.appendChild(clone);

                requestAnimationFrame(() => {
                    clone.style.top = `${window.innerHeight + 100}px`;
                    clone.style.transform = `rotate(${Math.random() * 720 - 360}deg)`;
                });

                setTimeout(() => clone.remove(), 2000);
            }, i * 50);
        });

        // Show Mikaela animation
        this.showMikaelaAnimation();
    }

    showMikaelaAnimation() {
        // Remove any existing Mikaela container
        const existing = document.querySelector('.mikaela-container');
        if (existing) existing.remove();

        // Create Mikaela container
        const container = document.createElement('div');
        container.className = 'mikaela-container';

        // Create glow effect
        const glow = document.createElement('div');
        glow.className = 'mikaela-glow';
        container.appendChild(glow);

        // Check if custom image exists, otherwise use CSS silhouette with streak
        const img = new Image();
        img.src = 'icons/8fe63f31-7b0f-4650-a009-9b0361d14bf1-removebg-preview.png';

        img.onload = () => {
            // Image exists - use it with dynamic streak overlay
            img.className = 'mikaela-character';
            img.alt = 'Mikaela';
            container.insertBefore(img, glow);

            // Add dynamic streak display next to Mikaela
            const streakDisplay = document.createElement('div');
            streakDisplay.className = 'mikaela-streak-display';
            streakDisplay.innerHTML = `
                <div class="streak-label">WIN STREAK</div>
                <div class="streak-number">${this.streak}</div>
            `;
            container.appendChild(streakDisplay);

            this.addMikaelaMagicEffects(container);
        };

        img.onerror = () => {
            // No image - use CSS silhouette with dynamic streak
            const silhouette = document.createElement('div');
            silhouette.className = 'mikaela-silhouette';
            silhouette.innerHTML = `
                <div class="mikaela-hair"></div>
                <div class="mikaela-body"></div>
                <div class="mikaela-arm left"></div>
                <div class="mikaela-arm right"></div>
                <div class="mikaela-hand left"></div>
                <div class="mikaela-hand right"></div>
            `;
            container.insertBefore(silhouette, glow);

            // Add streak display for silhouette fallback
            const streakDisplay = document.createElement('div');
            streakDisplay.className = 'mikaela-streak-display';
            streakDisplay.innerHTML = `
                <div class="streak-label">WIN STREAK</div>
                <div class="streak-number">${this.streak}</div>
            `;
            container.appendChild(streakDisplay);

            this.addMikaelaMagicEffects(container);
        };

        document.body.appendChild(container);

        // Trigger animation after a brief delay
        setTimeout(() => {
            container.classList.add('show');
        }, 300);

        // Remove after animation completes
        setTimeout(() => {
            container.classList.remove('show');
            setTimeout(() => container.remove(), 1000);
        }, 5000);
    }

    addMikaelaMagicEffects(container) {
        // Add sparkles around the streak number
        for (let i = 0; i < 8; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'magic-sparkle';
            container.appendChild(sparkle);
        }

        // Add floating embers around Mikaela
        for (let i = 0; i < 8; i++) {
            const ember = document.createElement('div');
            ember.className = 'mikaela-ember';
            container.appendChild(ember);
        }
    }

    hideWinModal() {
        document.getElementById('win-modal').classList.add('hidden');
    }

    // Auto-win for testing
    autoWin() {
        // Clear everything
        this.stock = [];
        this.waste = [];
        this.tableau = [[], [], [], [], [], [], []];

        // Fill foundations with complete suits
        const suits = ['♠', '♥', '♦', '♣'];
        this.foundations = suits.map(suit => {
            return this.ranks.map((rank, i) => ({
                suit,
                rank,
                value: i + 1,
                color: this.suitColors[suit],
                faceUp: true,
                id: `${rank}${suit}`
            }));
        });

        this.render();
        this.checkWin();
    }

    // Rendering
    render() {
        this.renderStock();
        this.renderWaste();
        this.renderFoundations();
        this.renderTableau();
    }

    createCardElement(card, index = 0) {
        const el = document.createElement('div');
        const isFaceCard = ['J', 'Q', 'K'].includes(card.rank);
        el.className = `card ${card.faceUp ? 'face-up ' + card.color : 'face-down'}${isFaceCard && card.faceUp ? ' face-card' : ''}`;
        el.dataset.cardId = card.id;

        if (card.faceUp) {
            // Face cards get special sinister symbols
            const faceSymbols = {
                'J': '☠',  // Skull - The Killer
                'Q': '⛧',  // Entity symbol - The Entity
                'K': '🗡'   // Dagger - The Slayer
            };
            const centerContent = isFaceCard ? faceSymbols[card.rank] : card.suit;

            el.innerHTML = `
                <div class="card-corner top">
                    <span class="card-rank">${card.rank}</span>
                    <span class="card-suit">${card.suit}</span>
                </div>
                <span class="card-center">${centerContent}</span>
                <div class="card-corner bottom">
                    <span class="card-rank">${card.rank}</span>
                    <span class="card-suit">${card.suit}</span>
                </div>
            `;
        }

        return el;
    }

    renderStock() {
        const stockEl = document.getElementById('stock');
        stockEl.innerHTML = '';
        stockEl.classList.toggle('empty', this.stock.length === 0);

        if (this.stock.length > 0) {
            // Show visual stack depth
            const depth = Math.min(3, Math.ceil(this.stock.length / 8));
            for (let i = 0; i < depth; i++) {
                const card = document.createElement('div');
                card.className = 'card face-down';
                card.style.top = `${i * 2}px`;
                card.style.left = `${i * 2}px`;
                stockEl.appendChild(card);
            }
        }
    }

    renderWaste() {
        const wasteEl = document.getElementById('waste');
        wasteEl.innerHTML = '';

        // Show up to 3 cards spread
        const show = Math.min(3, this.waste.length);
        const start = Math.max(0, this.waste.length - show);

        for (let i = start; i < this.waste.length; i++) {
            const card = this.waste[i];
            const el = this.createCardElement(card);
            // Fan cards to the left (negative offset) since stock is on the right
            el.style.left = `${(i - start) * -15}px`;
            el.style.zIndex = i;

            if (i === this.waste.length - 1) {
                this.addCardInteraction(el, card);
            }

            wasteEl.appendChild(el);
        }
    }

    renderFoundations() {
        for (let i = 0; i < 4; i++) {
            const foundationEl = document.getElementById(`foundation-${i}`);
            foundationEl.innerHTML = '';

            const foundation = this.foundations[i];
            if (foundation.length > 0) {
                const topCard = foundation[foundation.length - 1];
                const el = this.createCardElement(topCard);
                this.addCardInteraction(el, topCard);
                foundationEl.appendChild(el);
            }
        }
    }

    renderTableau() {
        const tableauOffset = parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--tableau-offset')) || 25;

        for (let i = 0; i < 7; i++) {
            const pileEl = document.getElementById(`tableau-${i}`);
            pileEl.innerHTML = '';

            const pile = this.tableau[i];
            pile.forEach((card, index) => {
                const el = this.createCardElement(card, index);
                el.style.top = `${index * tableauOffset}px`;
                el.style.zIndex = index;

                if (card.faceUp) {
                    this.addCardInteraction(el, card);
                }

                pileEl.appendChild(el);
            });
        }
    }

    addCardInteraction(el, card) {
        // Touch/click handling
        let touchStart = null;
        let hasMoved = false;

        const handleStart = (e) => {
            e.preventDefault();
            const point = e.touches ? e.touches[0] : e;
            touchStart = { x: point.clientX, y: point.clientY, time: Date.now() };
            hasMoved = false;

            this.dragStartPos = { x: point.clientX, y: point.clientY };
            const rect = el.getBoundingClientRect();
            this.dragOffset = {
                x: point.clientX - rect.left,
                y: point.clientY - rect.top
            };
        };

        const handleMove = (e) => {
            if (!touchStart) return;

            const point = e.touches ? e.touches[0] : e;
            const dx = point.clientX - touchStart.x;
            const dy = point.clientY - touchStart.y;

            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                hasMoved = true;
                if (!this.isDragging) {
                    this.startDrag(el, card);
                }
                this.updateDrag(point.clientX, point.clientY);
            }
        };

        const handleEnd = (e) => {
            if (!touchStart) return;

            const elapsed = Date.now() - touchStart.time;

            if (this.isDragging) {
                const point = e.changedTouches ? e.changedTouches[0] : e;
                this.endDrag(point.clientX, point.clientY);
            } else if (!hasMoved) {
                // It's a tap/click
                if (elapsed < 300) {
                    this.handleCardClick(card);
                }
            }

            touchStart = null;
            hasMoved = false;
        };

        // Double-tap/double-click for auto-foundation
        let lastTap = 0;
        const handleDoubleTap = () => {
            const now = Date.now();
            if (now - lastTap < 300) {
                this.autoMoveToFoundation(card);
            }
            lastTap = now;
        };

        el.addEventListener('touchstart', handleStart, { passive: false });
        el.addEventListener('touchmove', handleMove, { passive: false });
        el.addEventListener('touchend', handleEnd);
        el.addEventListener('mousedown', handleStart);
        el.addEventListener('dblclick', () => this.autoMoveToFoundation(card));
        el.addEventListener('click', handleDoubleTap);

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
    }

    handleCardClick(card) {
        // Try to auto-move with animation on single tap
        const bestMove = this.findBestMoveForCard(card);
        if (bestMove) {
            this.animateCardMove(card, bestMove.targetType, bestMove.targetIndex);
            return;
        }

        // No valid move - just provide feedback
        this.hapticFeedback('light');
    }

    findBestMoveForCard(card) {
        const location = this.findCardLocation(card);
        if (!location) return null;

        // For tableau cards, check if it's the top card or a valid stack
        if (location.type === 'tableau') {
            const pile = this.tableau[location.pileIndex];
            // Only allow moving if it's a face-up card
            if (!card.faceUp) return null;
        }

        // For waste, only top card can move
        if (location.type === 'waste') {
            if (this.waste[this.waste.length - 1].id !== card.id) return null;
        }

        // For foundation, only top card can move
        if (location.type === 'foundation') {
            const foundation = this.foundations[location.pileIndex];
            if (foundation[foundation.length - 1].id !== card.id) return null;
        }

        // Priority 1: Move to foundation (single cards only)
        if (location.type !== 'tableau' || location.cardIndex === this.tableau[location.pileIndex].length - 1) {
            for (let i = 0; i < 4; i++) {
                if (this.canMoveToFoundation(card, i)) {
                    return { targetType: 'foundation', targetIndex: i };
                }
            }
        }

        // Priority 2: Move to tableau
        for (let t = 0; t < 7; t++) {
            // Don't move to same pile
            if (location.type === 'tableau' && location.pileIndex === t) continue;
            if (this.canMoveToTableau(card, t)) {
                // Prefer moves to non-empty piles
                if (this.tableau[t].length > 0) {
                    return { targetType: 'tableau', targetIndex: t };
                }
            }
        }

        // Priority 3: Move King to empty tableau
        if (card.rank === 'K') {
            for (let t = 0; t < 7; t++) {
                if (location.type === 'tableau' && location.pileIndex === t) continue;
                if (this.tableau[t].length === 0) {
                    return { targetType: 'tableau', targetIndex: t };
                }
            }
        }

        return null;
    }

    animateCardMove(card, targetType, targetIndex) {
        const location = this.findCardLocation(card);
        if (!location) return;

        // Get all cards to animate (for tableau stacks)
        let cardsToAnimate = [];
        if (location.type === 'tableau') {
            const pile = this.tableau[location.pileIndex];
            cardsToAnimate = pile.slice(location.cardIndex).map(c => ({
                card: c,
                el: document.querySelector(`[data-card-id="${c.id}"]`)
            }));
        } else {
            const el = document.querySelector(`[data-card-id="${card.id}"]`);
            cardsToAnimate = [{ card, el }];
        }

        // Calculate target position
        let targetEl;
        if (targetType === 'foundation') {
            targetEl = document.getElementById(`foundation-${targetIndex}`);
        } else {
            const pile = this.tableau[targetIndex];
            if (pile.length > 0) {
                const topCard = pile[pile.length - 1];
                targetEl = document.querySelector(`[data-card-id="${topCard.id}"]`);
            } else {
                targetEl = document.getElementById(`tableau-${targetIndex}`);
            }
        }

        if (!targetEl || cardsToAnimate.length === 0 || !cardsToAnimate[0].el) {
            // Fallback to instant move
            this.moveCard(card, targetType, targetIndex);
            return;
        }

        const targetRect = targetEl.getBoundingClientRect();
        const tableauOffset = parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--tableau-offset')) || 25;

        // Animate each card
        cardsToAnimate.forEach(({ el }, i) => {
            const startRect = el.getBoundingClientRect();

            // Calculate target Y offset for stacking
            let targetY = targetRect.top;
            if (targetType === 'tableau' && this.tableau[targetIndex].length > 0) {
                targetY += tableauOffset;
            }
            targetY += i * tableauOffset;

            const deltaX = targetRect.left - startRect.left;
            const deltaY = targetY - startRect.top;

            el.style.transition = 'none';
            el.style.position = 'fixed';
            el.style.left = `${startRect.left}px`;
            el.style.top = `${startRect.top}px`;
            el.style.zIndex = 1000 + i;
            el.style.width = `${startRect.width}px`;
            el.style.height = `${startRect.height}px`;

            // Force reflow
            el.offsetHeight;

            el.style.transition = 'left 0.25s ease-out, top 0.25s ease-out';
            el.style.left = `${startRect.left + deltaX}px`;
            el.style.top = `${startRect.top + deltaY}px`;
        });

        // After animation, do the actual move
        setTimeout(() => {
            // Reset styles
            cardsToAnimate.forEach(({ el }) => {
                if (el) {
                    el.style.transition = '';
                    el.style.position = '';
                    el.style.left = '';
                    el.style.top = '';
                    el.style.zIndex = '';
                    el.style.width = '';
                    el.style.height = '';
                }
            });

            // Perform the actual game state move
            this.moveCard(card, targetType, targetIndex);
        }, 250);

        this.hapticFeedback('light');
    }

    clearSelection() {
        if (this.selectedCard) {
            const cardEl = document.querySelector(`[data-card-id="${this.selectedCard.id}"]`);
            if (cardEl) {
                cardEl.classList.remove('selected');
            }
            this.selectedCard = null;
        }

        // Remove all highlights
        document.querySelectorAll('.valid-drop').forEach(el => {
            el.classList.remove('valid-drop');
        });
    }

    highlightValidTargets(card) {
        // Check foundations
        for (let i = 0; i < 4; i++) {
            if (this.canMoveToFoundation(card, i)) {
                document.getElementById(`foundation-${i}`).classList.add('valid-drop');
            }
        }

        // Check tableau
        for (let i = 0; i < 7; i++) {
            if (this.canMoveToTableau(card, i)) {
                const pile = this.tableau[i];
                if (pile.length > 0) {
                    const topCard = pile[pile.length - 1];
                    const topCardEl = document.querySelector(`[data-card-id="${topCard.id}"]`);
                    if (topCardEl) topCardEl.classList.add('valid-drop');
                } else {
                    document.getElementById(`tableau-${i}`).classList.add('valid-drop');
                }
            }
        }
    }

    startDrag(el, card) {
        this.isDragging = true;
        this.clearSelection();

        const location = this.findCardLocation(card);
        if (!location) return;

        // Get all cards being dragged (for tableau stacks)
        if (location.type === 'tableau') {
            const pile = this.tableau[location.pileIndex];
            this.draggedCards = pile.slice(location.cardIndex).map(c => ({
                card: c,
                el: document.querySelector(`[data-card-id="${c.id}"]`)
            }));
        } else {
            this.draggedCards = [{ card, el }];
        }

        // Style dragged cards
        this.draggedCards.forEach(({ el }, i) => {
            el.classList.add('dragging');
            el.style.position = 'fixed';
            el.style.zIndex = 1000 + i;
        });

        this.highlightValidTargets(card);
    }

    updateDrag(x, y) {
        if (!this.isDragging) return;

        const tableauOffset = parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--tableau-offset')) || 25;

        this.draggedCards.forEach(({ el }, i) => {
            el.style.left = `${x - this.dragOffset.x}px`;
            el.style.top = `${y - this.dragOffset.y + (i * tableauOffset)}px`;
        });
    }

    endDrag(x, y) {
        if (!this.isDragging) return;

        this.isDragging = false;

        // Find drop target
        const dropTarget = this.findDropTarget(x, y);

        if (dropTarget && this.draggedCards.length > 0) {
            const card = this.draggedCards[0].card;
            this.moveCard(card, dropTarget.type, dropTarget.index);
        } else {
            // Return cards to original position
            this.render();
        }

        // Clean up
        this.draggedCards.forEach(({ el }) => {
            el.classList.remove('dragging');
            el.style.position = '';
            el.style.left = '';
            el.style.top = '';
            el.style.zIndex = '';
        });

        this.draggedCards = [];
        this.clearSelection();
    }

    findDropTarget(x, y) {
        if (this.draggedCards.length === 0) return null;

        const card = this.draggedCards[0].card;

        // Check foundations (only for single cards)
        if (this.draggedCards.length === 1) {
            for (let i = 0; i < 4; i++) {
                const el = document.getElementById(`foundation-${i}`);
                const rect = el.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                    if (this.canMoveToFoundation(card, i)) {
                        return { type: 'foundation', index: i };
                    }
                }
            }
        }

        // Check tableau
        for (let i = 0; i < 7; i++) {
            const el = document.getElementById(`tableau-${i}`);
            const rect = el.getBoundingClientRect();

            // Expand hitbox for tableau piles
            const expandedRect = {
                left: rect.left - 10,
                right: rect.right + 10,
                top: rect.top - 10,
                bottom: rect.bottom + 50
            };

            if (x >= expandedRect.left && x <= expandedRect.right &&
                y >= expandedRect.top && y <= expandedRect.bottom) {
                if (this.canMoveToTableau(card, i)) {
                    return { type: 'tableau', index: i };
                }
            }
        }

        return null;
    }

    setupEventListeners() {
        // Stock click
        document.getElementById('stock').addEventListener('click', () => this.drawFromStock());
        document.getElementById('stock').addEventListener('touchend', (e) => {
            e.preventDefault();
            this.drawFromStock();
        });

        // New game button
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());

        // Undo button
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());

        // Hint button
        document.getElementById('hint-btn').addEventListener('click', () => this.showHint());

        // Play again button
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.hideWinModal();
            this.newGame();
        });

        // Tap empty tableau to move King
        for (let i = 0; i < 7; i++) {
            const pileEl = document.getElementById(`tableau-${i}`);
            pileEl.addEventListener('click', (e) => {
                if (e.target === pileEl && this.selectedCard && this.selectedCard.rank === 'K') {
                    this.moveCard(this.selectedCard, 'tableau', i);
                    this.clearSelection();
                }
            });
        }

        // Tap foundation to auto-move
        for (let i = 0; i < 4; i++) {
            const foundEl = document.getElementById(`foundation-${i}`);
            foundEl.addEventListener('click', (e) => {
                if (e.target === foundEl || e.target.classList.contains('foundation-pile')) {
                    if (this.selectedCard && this.canMoveToFoundation(this.selectedCard, i)) {
                        this.moveCard(this.selectedCard, 'foundation', i);
                        this.clearSelection();
                    }
                }
            });
        }

        // Clear selection when tapping empty space
        document.getElementById('game-board').addEventListener('click', (e) => {
            if (e.target.id === 'game-board') {
                this.clearSelection();
            }
        });

        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Solitaire();
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}
