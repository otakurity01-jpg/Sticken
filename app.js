// ===== STICKMAN FIGHTER GAME =====
// This is your complete 2D fighting game with all the mechanics!

// Game Configuration
const GAME_CONFIG = {
    canvas: {
        width: 1000,
        height: 600
    },
    physics: {
        gravity: 0.8,
        jumpPower: 15,
        moveSpeed: 5,
        friction: 0.8
    },
    combat: {
        maxHealth: 100,
        maxSuperMeter: 100,
        damage: {
            light: 8,
            heavy: 15,
            combo: 25,
            super: 90 // Leaves enemy with 10% HP
        }
    }
};

// Character Data
const CHARACTERS = {
    yukito: {
        name: "Yukito",
        type: "male",
        specialty: "punches",
        color: "#4A90E2",
        superMove: "One Punch Smash"
    },
    yuka: {
        name: "Yuka",
        type: "female", 
        specialty: "punches",
        color: "#E24A90",
        superMove: "One Punch Smash"
    },
    chao: {
        name: "Chao",
        type: "male",
        specialty: "kicks", 
        color: "#4AE290",
        superMove: "Dragon Kick Barrage"
    },
    chaoli: {
        name: "Chaoli",
        type: "female",
        specialty: "kicks",
        color: "#9A4AE2", 
        superMove: "Dragon Kick Barrage"
    }
};

// Game State Manager
class GameState {
    constructor() {
        this.current = 'character-select'; // character-select, playing, game-over
        this.selectedCharacter = null;
        this.enemyCharacter = null;
    }

    setState(newState) {
        this.current = newState;
        this.updateUI();
    }

    updateUI() {
        // Hide all screens
        document.getElementById('character-select').classList.add('hidden');
        document.getElementById('game-container').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');

        // Show current screen
        switch(this.current) {
            case 'character-select':
                document.getElementById('character-select').classList.remove('hidden');
                break;
            case 'playing':
                document.getElementById('game-container').classList.remove('hidden');
                break;
            case 'game-over':
                document.getElementById('game-over').classList.remove('hidden');
                break;
        }
    }
}

// Fighter Class - This represents each character in the game
class Fighter {
    constructor(character, x, y, isPlayer = true) {
        this.character = character;
        this.name = character.name;
        this.color = character.color;
        this.specialty = character.specialty;
        
        // Position and physics
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 80;
        this.velocityX = 0;
        this.velocityY = 0;
        this.onGround = false;
        this.facingRight = isPlayer ? true : false;
        
        // Combat stats
        this.health = GAME_CONFIG.combat.maxHealth;
        this.superMeter = 0;
        this.isPlayer = isPlayer;
        
        // Animation and state
        this.currentAnimation = 'idle';
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.attackCooldown = 0;
        this.isAttacking = false;
        this.comboCount = 0;
        this.comboTimer = 0;
        
        // Ground level
        this.groundY = GAME_CONFIG.canvas.height - 100;
    }

    // Update fighter each frame
    update() {
        this.updatePhysics();
        this.updateAnimation();
        this.updateCooldowns();
        this.updateCombo();
        
        // AI behavior for non-player
        if (!this.isPlayer && gameState.current === 'playing') {
            this.updateAI();
        }
    }

    // Physics system - handles movement and gravity
    updatePhysics() {
        // Apply gravity
        if (!this.onGround) {
            this.velocityY += GAME_CONFIG.physics.gravity;
        }

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Apply friction
        this.velocityX *= GAME_CONFIG.physics.friction;

        // Ground collision
        if (this.y + this.height >= this.groundY) {
            this.y = this.groundY - this.height;
            this.velocityY = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Screen boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > GAME_CONFIG.canvas.width) {
            this.x = GAME_CONFIG.canvas.width - this.width;
        }
    }

    // Animation system
    updateAnimation() {
        this.animationTimer++;
        if (this.animationTimer > 10) {
            this.animationFrame++;
            this.animationTimer = 0;
        }
        
        // Determine current animation
        if (this.isAttacking) {
            this.currentAnimation = 'attack';
        } else if (!this.onGround) {
            this.currentAnimation = 'jump';
        } else if (Math.abs(this.velocityX) > 0.5) {
            this.currentAnimation = 'walk';
        } else {
            this.currentAnimation = 'idle';
        }
    }

    // Update cooldowns and timers
    updateCooldowns() {
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
            if (this.attackCooldown === 0) {
                this.isAttacking = false;
            }
        }
    }

    // Combo system
    updateCombo() {
        if (this.comboTimer > 0) {
            this.comboTimer--;
        } else {
            this.comboCount = 0;
        }
    }

    // Movement controls
    move(direction) {
        if (direction === 'left') {
            this.velocityX = -GAME_CONFIG.physics.moveSpeed;
            this.facingRight = false;
        } else if (direction === 'right') {
            this.velocityX = GAME_CONFIG.physics.moveSpeed;
            this.facingRight = true;
        }
    }

    jump() {
        if (this.onGround) {
            this.velocityY = -GAME_CONFIG.physics.jumpPower;
            this.onGround = false;
        }
    }

    // Attack system
    attack(type, opponent) {
        if (this.attackCooldown > 0) return false;

        let damage = 0;
        let cooldown = 20;

        switch(type) {
            case 'light':
                damage = GAME_CONFIG.combat.damage.light;
                cooldown = 15;
                break;
            case 'heavy':
                damage = GAME_CONFIG.combat.damage.heavy;
                cooldown = 30;
                break;
            case 'combo':
                damage = GAME_CONFIG.combat.damage.combo;
                cooldown = 40;
                this.comboCount = Math.min(this.comboCount + 1, 5);
                this.comboTimer = 60;
                break;
            case 'super':
                if (this.superMeter >= GAME_CONFIG.combat.maxSuperMeter) {
                    // Super move leaves opponent with exactly 10% HP (or defeats them if health < 10%)
                    const targetHealth = GAME_CONFIG.combat.maxHealth * 0.1;
                    damage = Math.max(opponent.health - targetHealth, opponent.health);
                    this.superMeter = 0;
                    cooldown = 60;
                } else {
                    return false;
                }
                break;
        }

        // Check if attack hits
        if (this.checkHit(opponent)) {
            opponent.takeDamage(damage);
            this.gainSuperMeter(damage * 0.5);
            this.attackCooldown = cooldown;
            this.isAttacking = true;
            
            // Create attack effect
            this.createAttackEffect(type);
            return true;
        }

        this.attackCooldown = cooldown / 2;
        this.isAttacking = true;
        return false;
    }

    // Hit detection
    checkHit(opponent) {
        const distance = Math.abs(this.x - opponent.x);
        const attackRange = 60;
        
        // Must be close enough and facing opponent
        if (distance > attackRange) return false;
        
        const facingOpponent = (this.facingRight && this.x < opponent.x) || 
                              (!this.facingRight && this.x > opponent.x);
        
        return facingOpponent;
    }

    // Damage system
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        this.gainSuperMeter(amount * 0.3);
        
        // Add screen shake effect
        if (this.isPlayer) {
            this.screenShake();
        }
        
        console.log(`${this.name} took ${amount} damage. Health: ${this.health}`);
    }

    // Super meter system
    gainSuperMeter(amount) {
        this.superMeter = Math.min(GAME_CONFIG.combat.maxSuperMeter, this.superMeter + amount);
    }

    // Visual effects
    createAttackEffect(type) {
        console.log(`${this.name} used ${type} attack!`);
    }

    screenShake() {
        const canvas = document.getElementById('gameCanvas');
        canvas.style.transform = 'translateX(2px)';
        setTimeout(() => {
            canvas.style.transform = 'translateX(-2px)';
            setTimeout(() => {
                canvas.style.transform = 'translateX(0)';
            }, 50);
        }, 50);
    }

    // Simple AI system
    updateAI() {
        const player = game.player;
        const distance = Math.abs(this.x - player.x);
        
        // Random behavior every 60 frames
        if (Math.random() < 0.03) { // Slightly more aggressive AI
            const action = Math.random();
            
            if (distance > 100) {
                // Move towards player
                if (this.x < player.x) {
                    this.move('right');
                } else {
                    this.move('left');
                }
            } else if (distance < 80 && this.attackCooldown === 0) {
                // Attack if close
                if (action < 0.4) {
                    this.attack('light', player);
                } else if (action < 0.7) {
                    this.attack('heavy', player);
                } else if (action < 0.9) {
                    this.attack('combo', player);
                } else if (this.superMeter >= GAME_CONFIG.combat.maxSuperMeter) {
                    this.attack('super', player);
                }
            } else if (action < 0.1 && this.onGround) {
                // Random jump
                this.jump();
            }
        }
    }

    // Drawing the stickman fighter
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y);
        
        // Flip if facing left
        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }

        // Set color
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = 3;

        // Draw based on animation
        this.drawStickman(ctx);
        
        ctx.restore();
        
        // Draw name and health bar above character
        this.drawNameAndHealth(ctx);
    }

    drawStickman(ctx) {
        const headRadius = 8;
        const bodyHeight = 30;
        const limbLength = 15;
        
        // Animation offsets
        let armAngle = 0;
        let legAngle = 0;
        
        if (this.currentAnimation === 'walk') {
            armAngle = Math.sin(this.animationFrame * 0.3) * 0.5;
            legAngle = Math.sin(this.animationFrame * 0.3) * 0.8;
        } else if (this.currentAnimation === 'attack') {
            armAngle = -1.2;
        } else if (this.currentAnimation === 'jump') {
            armAngle = -0.5;
            legAngle = 0.5;
        }

        // Head
        ctx.beginPath();
        ctx.arc(0, headRadius, headRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add hair/dress indicator for female characters
        if (this.character.type === 'female') {
            // Simple dress shape
            ctx.beginPath();
            ctx.moveTo(-8, bodyHeight + 10);
            ctx.lineTo(8, bodyHeight + 10);
            ctx.lineTo(6, bodyHeight + 20);
            ctx.lineTo(-6, bodyHeight + 20);
            ctx.closePath();
            ctx.stroke();
        }

        // Body
        ctx.beginPath();
        ctx.moveTo(0, headRadius * 2);
        ctx.lineTo(0, bodyHeight);
        ctx.stroke();

        // Arms
        const armStartY = headRadius * 2 + 8;
        
        // Left arm
        ctx.beginPath();
        ctx.moveTo(0, armStartY);
        ctx.lineTo(-limbLength * Math.cos(armAngle), armStartY + limbLength * Math.sin(armAngle));
        ctx.stroke();
        
        // Right arm
        ctx.beginPath();
        ctx.moveTo(0, armStartY);
        ctx.lineTo(limbLength * Math.cos(armAngle), armStartY + limbLength * Math.sin(armAngle));
        ctx.stroke();

        // Legs
        const legStartY = bodyHeight;
        
        // Left leg
        ctx.beginPath();
        ctx.moveTo(0, legStartY);
        ctx.lineTo(-limbLength * Math.cos(legAngle), legStartY + limbLength);
        ctx.stroke();
        
        // Right leg
        ctx.beginPath();
        ctx.moveTo(0, legStartY);
        ctx.lineTo(limbLength * Math.cos(legAngle), legStartY + limbLength);
        ctx.stroke();

        // Attack effect
        if (this.isAttacking && this.attackCooldown > 15) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 5;
            ctx.beginPath();
            if (this.specialty === 'punches') {
                // Punch effect
                ctx.arc(15, armStartY, 5, 0, Math.PI * 2);
            } else {
                // Kick effect
                ctx.arc(15, legStartY + 10, 5, 0, Math.PI * 2);
            }
            ctx.stroke();
        }
    }

    drawNameAndHealth(ctx) {
        // Name
        ctx.fillStyle = this.color;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.width/2, this.y - 10);
        
        // Mini health bar above character
        const barWidth = 40;
        const barHeight = 4;
        const healthPercent = this.health / GAME_CONFIG.combat.maxHealth;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x + this.width/2 - barWidth/2, this.y - 25, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.3 ? '#4AE290' : '#FF4444';
        ctx.fillRect(this.x + this.width/2 - barWidth/2, this.y - 25, barWidth * healthPercent, barHeight);
    }
}

// Main Game Class
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = null;
        this.enemy = null;
        this.keys = {};
        this.gameLoop = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Character selection
        document.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectCharacter(card.dataset.character);
            });
        });

        // Game over buttons
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            gameState.setState('character-select');
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    selectCharacter(characterKey) {
        // Remove previous selection
        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Add selection to clicked card
        document.querySelector(`[data-character="${characterKey}"]`).classList.add('selected');
        
        gameState.selectedCharacter = CHARACTERS[characterKey];
        
        // Show start game message
        const selectedCard = document.querySelector(`[data-character="${characterKey}"]`);
        if (!selectedCard.querySelector('.start-message')) {
            const startMessage = document.createElement('div');
            startMessage.className = 'start-message';
            startMessage.innerHTML = '<strong>Click again to START GAME!</strong>';
            startMessage.style.cssText = 'margin-top: 10px; color: #4AE290; font-weight: bold; animation: pulse 1s infinite;';
            selectedCard.appendChild(startMessage);
        }
        
        // If already selected, start game
        if (selectedCard.classList.contains('ready-to-start')) {
            this.startGame();
        } else {
            selectedCard.classList.add('ready-to-start');
        }
    }

    startGame() {
        if (!gameState.selectedCharacter) {
            // Auto-select first character if none selected
            gameState.selectedCharacter = CHARACTERS.yukito;
        }

        // Random enemy selection (different from player)
        const characterKeys = Object.keys(CHARACTERS);
        let enemyKey;
        do {
            enemyKey = characterKeys[Math.floor(Math.random() * characterKeys.length)];
        } while (CHARACTERS[enemyKey] === gameState.selectedCharacter);
        
        gameState.enemyCharacter = CHARACTERS[enemyKey];

        // Create fighters
        this.player = new Fighter(gameState.selectedCharacter, 150, 0, true);
        this.enemy = new Fighter(gameState.enemyCharacter, 750, 0, false);

        // Update UI
        document.querySelector('.player-name').textContent = this.player.name;
        document.querySelector('.enemy-name').textContent = this.enemy.name;

        gameState.setState('playing');
        this.startGameLoop();
    }

    startGameLoop() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }

        const loop = () => {
            this.update();
            this.draw();
            this.gameLoop = requestAnimationFrame(loop);
        };

        loop();
    }

    update() {
        if (gameState.current !== 'playing') return;

        // Handle input
        this.handleInput();

        // Update fighters
        this.player.update();
        this.enemy.update();

        // Update UI
        this.updateUI();

        // Check game over
        this.checkGameOver();
    }

    handleInput() {
        // Movement
        if (this.keys['a']) {
            this.player.move('left');
        }
        if (this.keys['d']) {
            this.player.move('right');
        }
        if (this.keys['w']) {
            this.player.jump();
        }

        // Attacks
        if (this.keys['j']) {
            this.player.attack('light', this.enemy);
            this.keys['j'] = false; // Prevent spam
        }
        if (this.keys['k']) {
            this.player.attack('heavy', this.enemy);
            this.keys['k'] = false;
        }
        if (this.keys['l']) {
            this.player.attack('combo', this.enemy);
            this.keys['l'] = false;
        }
        if (this.keys['u']) {
            this.player.attack('super', this.enemy);
            this.keys['u'] = false;
        }
    }

    updateUI() {
        // Health bars
        const playerHealthPercent = Math.max(0, (this.player.health / GAME_CONFIG.combat.maxHealth) * 100);
        const enemyHealthPercent = Math.max(0, (this.enemy.health / GAME_CONFIG.combat.maxHealth) * 100);
        
        const playerHealthBar = document.getElementById('player-health');
        const enemyHealthBar = document.getElementById('enemy-health');
        
        playerHealthBar.style.width = playerHealthPercent + '%';
        enemyHealthBar.style.width = enemyHealthPercent + '%';
        
        // Super meters
        const playerSuperPercent = (this.player.superMeter / GAME_CONFIG.combat.maxSuperMeter) * 100;
        const enemySuperPercent = (this.enemy.superMeter / GAME_CONFIG.combat.maxSuperMeter) * 100;
        
        const playerSuperBar = document.getElementById('player-super');
        const enemySuperBar = document.getElementById('enemy-super');
        
        playerSuperBar.style.width = playerSuperPercent + '%';
        enemySuperBar.style.width = enemySuperPercent + '%';
        
        // Add visual effects for low health
        if (playerHealthPercent < 30) {
            playerHealthBar.classList.add('low');
        } else {
            playerHealthBar.classList.remove('low');
        }
        
        if (enemyHealthPercent < 30) {
            enemyHealthBar.classList.add('low');
        } else {
            enemyHealthBar.classList.remove('low');
        }
        
        // Super meter full effect
        if (playerSuperPercent >= 100) {
            playerSuperBar.parentElement.classList.add('full');
        } else {
            playerSuperBar.parentElement.classList.remove('full');
        }
        
        if (enemySuperPercent >= 100) {
            enemySuperBar.parentElement.classList.add('full');
        } else {
            enemySuperBar.parentElement.classList.remove('full');
        }
    }

    checkGameOver() {
        if (this.player.health <= 0) {
            console.log('Player defeated!');
            this.gameOver(false);
        } else if (this.enemy.health <= 0) {
            console.log('Enemy defeated!');
            this.gameOver(true);
        }
    }

    gameOver(playerWon) {
        cancelAnimationFrame(this.gameLoop);
        
        const resultElement = document.getElementById('game-result');
        const messageElement = document.getElementById('game-message');
        
        if (playerWon) {
            resultElement.textContent = 'VICTORY!';
            resultElement.style.color = '#4AE290';
            messageElement.textContent = `${this.player.name} defeats ${this.enemy.name}!`;
        } else {
            resultElement.textContent = 'DEFEAT!';
            resultElement.style.color = '#FF4444';
            messageElement.textContent = `${this.enemy.name} defeats ${this.player.name}!`;
        }
        
        setTimeout(() => {
            gameState.setState('game-over');
        }, 1000); // Small delay to see the final hit
    }

    draw() {
        if (gameState.current !== 'playing') return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        this.drawBackground();

        // Draw fighters
        this.player.draw(this.ctx);
        this.enemy.draw(this.ctx);

        // Draw combo counter
        if (this.player.comboCount > 0) {
            this.drawComboCounter();
        }
        
        // Draw super move ready indicator
        if (this.player.superMeter >= GAME_CONFIG.combat.maxSuperMeter) {
            this.drawSuperReady();
        }
    }

    drawBackground() {
        // Sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.7, '#87CEEB');
        gradient.addColorStop(0.7, '#228B22');
        gradient.addColorStop(1, '#228B22');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Ground line
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height - 100);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - 100);
        this.ctx.stroke();
    }

    drawComboCounter() {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.player.comboCount} HIT COMBO!`, this.canvas.width / 2, 100);
    }
    
    drawSuperReady() {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SUPER READY! Press U', this.canvas.width / 2, 130);
    }
}

// Initialize the game
const gameState = new GameState();
const game = new Game();

// Start with character selection screen
gameState.setState('character-select');

console.log('🥊 Stickman Fighter Game Loaded! 🥊');
console.log('Choose your character and start fighting!');