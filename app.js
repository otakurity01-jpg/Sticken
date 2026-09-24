// ===== STICKMAN FIGHTER: PHASE 1 (GAME FEEL & IMPACT) =====

const GAME_CONFIG = {
    canvas: {
        width: 1000,
        height: 600
    },
    physics: {
        gravity: 0.8,
        jumpPower: 15,
        moveSpeed: 5,
        friction: 0.82
    },
    combat: {
        maxHealth: 100,
        maxSuperMeter: 100,
        attacks: {
            light: {
                damage: 8,
                cooldown: 14,
                hitstop: 5,
                shake: 3,
                pushback: 4,
                hitstun: 14
            },
            heavy: {
                damage: 16,
                cooldown: 28,
                hitstop: 9,
                shake: 8,
                pushback: 9,
                hitstun: 24
            },
            combo: {
                damage: 24,
                cooldown: 36,
                hitstop: 12,
                shake: 12,
                pushback: 14,
                hitstun: 30
            },
            super: {
                damage: 85,
                cooldown: 55,
                hitstop: 20,
                shake: 20,
                pushback: 22,
                hitstun: 45
            }
        }
    }
};

const CHARACTERS = {
    yukito: {
        name: "Yukito",
        type: "male",
        specialty: "punches",
        color: "#4A90E2",
        sparkColor: "#70B4FF",
        superMove: "One Punch Smash"
    },
    yuka: {
        name: "Yuka",
        type: "female",
        specialty: "punches",
        color: "#E24A90",
        sparkColor: "#FF70B4",
        superMove: "One Punch Smash"
    },
    chao: {
        name: "Chao",
        type: "male",
        specialty: "kicks",
        color: "#4AE290",
        sparkColor: "#70FFB4",
        superMove: "Dragon Kick Barrage"
    },
    chaoli: {
        name: "Chaoli",
        type: "female",
        specialty: "kicks",
        color: "#9A4AE2",
        sparkColor: "#C070FF",
        superMove: "Dragon Kick Barrage"
    }
};

// Particle Engine for Sparks & Shockwaves
class Particle {
    constructor(x, y, vx, vy, color, size, life, shape = 'spark') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life;
        this.shape = shape; // 'spark', 'ring', 'circle'
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.91;
        this.vy *= 0.91;
        this.life--;
    }

    draw(ctx) {
        const progress = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = progress;

        if (this.shape === 'spark') {
            const angle = Math.atan2(this.vy, this.vx);
            const speed = Math.hypot(this.vx, this.vy);
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size * progress;
            ctx.beginPath();
            ctx.moveTo(-speed * 1.5, 0);
            ctx.lineTo(speed * 1.5, 0);
            ctx.stroke();
        } else if (this.shape === 'ring') {
            const currentRadius = (1 - progress) * this.size;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3 * progress;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.shape === 'circle') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * progress, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class GameState {
    constructor() {
        this.current = 'character-select';
        this.selectedCharacter = null;
        this.enemyCharacter = null;
    }

    setState(newState) {
        this.current = newState;
        this.updateUI();
    }

    updateUI() {
        document.getElementById('character-select').classList.add('hidden');
        document.getElementById('game-container').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');

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

class Fighter {
    constructor(character, x, y, isPlayer = true) {
        this.character = character;
        this.name = character.name;
        this.color = character.color;
        this.sparkColor = character.sparkColor;
        this.specialty = character.specialty;

        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 80;
        this.velocityX = 0;
        this.velocityY = 0;
        this.onGround = false;
        this.facingRight = isPlayer;

        this.health = GAME_CONFIG.combat.maxHealth;
        this.superMeter = 0;
        this.isPlayer = isPlayer;

        this.currentAnimation = 'idle';
        this.animationFrame = 0;
        this.animationTimer = 0;

        this.attackCooldown = 0;
        this.isAttacking = false;
        this.currentAttackType = null;
        this.hitstun = 0; // Frames disabled after taking damage

        this.comboCount = 0;
        this.comboTimer = 0;
        this.groundY = GAME_CONFIG.canvas.height - 100;
    }

    update() {
        this.updatePhysics();
        this.updateAnimation();
        this.updateTimers();

        if (!this.isPlayer && gameState.current === 'playing') {
            this.updateAI();
        }
    }

    updatePhysics() {
        if (!this.onGround) {
            this.velocityY += GAME_CONFIG.physics.gravity;
        }

        this.x += this.velocityX;
        this.y += this.velocityY;
        this.velocityX *= GAME_CONFIG.physics.friction;

        if (this.y + this.height >= this.groundY) {
            this.y = this.groundY - this.height;
            this.velocityY = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > GAME_CONFIG.canvas.width) {
            this.x = GAME_CONFIG.canvas.width - this.width;
        }
    }

    updateAnimation() {
        this.animationTimer++;
        if (this.animationTimer > 8) {
            this.animationFrame++;
            this.animationTimer = 0;
        }

        // Priority 1: Hitstun / Flinch pose
        if (this.hitstun > 0) {
            this.currentAnimation = 'hurt';
        } else if (this.isAttacking) {
            this.currentAnimation = 'attack';
        } else if (!this.onGround) {
            this.currentAnimation = 'jump';
        } else if (Math.abs(this.velocityX) > 0.4) {
            this.currentAnimation = 'walk';
        } else {
            this.currentAnimation = 'idle';
        }
    }

    updateTimers() {
        if (this.hitstun > 0) {
            this.hitstun--;
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
            if (this.attackCooldown === 0) {
                this.isAttacking = false;
                this.currentAttackType = null;
            }
        }

        if (this.comboTimer > 0) {
            this.comboTimer--;
        } else {
            this.comboCount = 0;
        }
    }

    move(direction) {
        if (this.hitstun > 0 || this.isAttacking) return;

        if (direction === 'left') {
            this.velocityX = -GAME_CONFIG.physics.moveSpeed;
            this.facingRight = false;
        } else if (direction === 'right') {
            this.velocityX = GAME_CONFIG.physics.moveSpeed;
            this.facingRight = true;
        }
    }

    jump() {
        if (this.hitstun > 0 || this.isAttacking) return;

        if (this.onGround) {
            this.velocityY = -GAME_CONFIG.physics.jumpPower;
            this.onGround = false;
        }
    }

    attack(type, opponent) {
        if (this.attackCooldown > 0 || this.hitstun > 0) return false;

        const spec = GAME_CONFIG.combat.attacks[type];
        if (!spec) return false;

        if (type === 'super') {
            if (this.superMeter < GAME_CONFIG.combat.maxSuperMeter) return false;
            this.superMeter = 0;
        }

        this.attackCooldown = spec.cooldown;
        this.isAttacking = true;
        this.currentAttackType = type;

        // Check if attack connects
        if (this.checkHit(opponent)) {
            // Hit point coordinates between the characters
            const contactX = this.facingRight
                ? this.x + this.width + 15
                : this.x - 15;
            const contactY = this.y + (this.specialty === 'punches' ? 24 : 48);

            opponent.takeHit(spec, this, contactX, contactY);
            this.gainSuperMeter(spec.damage * 0.4);

            if (this.isPlayer) {
                this.comboCount = Math.min(this.comboCount + 1, 99);
                this.comboTimer = 75;
            }

            return true;
        }

        return false;
    }

    checkHit(opponent) {
        const distance = Math.abs(this.x - opponent.x);
        const attackRange = 75;

        if (distance > attackRange) return false;

        const facingOpponent = (this.facingRight && this.x < opponent.x) ||
                              (!this.facingRight && this.x > opponent.x);

        return facingOpponent;
    }

    takeHit(attackSpec, attacker, contactX, contactY) {
        this.health = Math.max(0, this.health - attackSpec.damage);
        this.hitstun = attackSpec.hitstun;
        this.isAttacking = false; // Interrupted

        // Directional pushback away from attacker
        const pushDirection = attacker.facingRight ? 1 : -1;
        this.velocityX = attackSpec.pushback * pushDirection;

        // Slight lift on combo or super
        if (attackSpec.damage >= 24) {
            this.velocityY = -4;
            this.onGround = false;
        }

        this.gainSuperMeter(attackSpec.damage * 0.25);

        // Trigger Phase 1 impact feel in Game engine
        const isKO = this.health <= 0;
        game.onHitConfirmed(attackSpec, contactX, contactY, attacker.sparkColor, isKO);
    }

    gainSuperMeter(amount) {
        this.superMeter = Math.min(GAME_CONFIG.combat.maxSuperMeter, this.superMeter + amount);
    }

    updateAI() {
        if (this.hitstun > 0) return;

        const player = game.player;
        const distance = Math.abs(this.x - player.x);

        // Turn towards player
        this.facingRight = (this.x < player.x);

        if (Math.random() < 0.04) {
            const roll = Math.random();

            if (distance > 110) {
                this.move(this.x < player.x ? 'right' : 'left');
            } else if (distance <= 80 && this.attackCooldown === 0) {
                if (this.superMeter >= GAME_CONFIG.combat.maxSuperMeter && roll < 0.25) {
                    this.attack('super', player);
                } else if (roll < 0.5) {
                    this.attack('light', player);
                } else if (roll < 0.8) {
                    this.attack('heavy', player);
                } else {
                    this.attack('combo', player);
                }
            } else if (roll < 0.1 && this.onGround) {
                this.jump();
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y);

        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }

        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        this.drawStickman(ctx);

        ctx.restore();
        this.drawNameAndHealth(ctx);
    }

    drawStickman(ctx) {
        const headRadius = 8;
        const bodyHeight = 32;
        const limbLength = 16;

        let armAngle = 0;
        let legAngle = 0;
        let torsoAngle = 0;

        // Pose handling based on state
        if (this.currentAnimation === 'hurt') {
            torsoAngle = -0.35; // Knocked back
            armAngle = -1.4;
            legAngle = 0.4;
        } else if (this.currentAnimation === 'walk') {
            armAngle = Math.sin(this.animationFrame * 0.4) * 0.6;
            legAngle = Math.sin(this.animationFrame * 0.4) * 0.8;
        } else if (this.currentAnimation === 'attack') {
            armAngle = this.specialty === 'punches' ? -1.5 : -0.6;
            legAngle = this.specialty === 'kicks' ? 1.3 : 0.2;
            torsoAngle = 0.15; // Lean into strike
        } else if (this.currentAnimation === 'jump') {
            armAngle = -0.8;
            legAngle = 0.5;
        }

        ctx.rotate(torsoAngle);

        // Head
        ctx.beginPath();
        ctx.arc(0, headRadius, headRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Female hair/dress visual identifier
        if (this.character.type === 'female') {
            ctx.beginPath();
            ctx.moveTo(-7, bodyHeight + 8);
            ctx.lineTo(7, bodyHeight + 8);
            ctx.lineTo(5, bodyHeight + 18);
            ctx.lineTo(-5, bodyHeight + 18);
            ctx.closePath();
            ctx.stroke();
        }

        // Spine/Torso
        ctx.beginPath();
        ctx.moveTo(0, headRadius * 2);
        ctx.lineTo(0, bodyHeight);
        ctx.stroke();

        // Arms
        const shoulderY = headRadius * 2 + 6;

        // Back Arm
        ctx.beginPath();
        ctx.moveTo(0, shoulderY);
        ctx.lineTo(-limbLength * Math.cos(armAngle), shoulderY + limbLength * Math.sin(armAngle));
        ctx.stroke();

        // Lead Arm (Thrust forward on punch)
        ctx.beginPath();
        ctx.moveTo(0, shoulderY);
        if (this.isAttacking && this.specialty === 'punches') {
            ctx.lineTo(limbLength * 1.8, shoulderY); // Straight jab
        } else {
            ctx.lineTo(limbLength * Math.cos(armAngle), shoulderY + limbLength * Math.sin(armAngle));
        }
        ctx.stroke();

        // Legs
        const hipY = bodyHeight;

        // Back Leg
        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.lineTo(-limbLength * Math.cos(legAngle), hipY + limbLength);
        ctx.stroke();

        // Lead Leg (Extended on kick)
        ctx.beginPath();
        ctx.moveTo(0, hipY);
        if (this.isAttacking && this.specialty === 'kicks') {
            ctx.lineTo(limbLength * 2, hipY - 6); // High thrust kick
        } else {
            ctx.lineTo(limbLength * Math.cos(legAngle), hipY + limbLength);
        }
        ctx.stroke();
    }

    drawNameAndHealth(ctx) {
        ctx.fillStyle = this.color;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.width / 2, this.y - 14);

        // Mini health bar over head
        const barW = 44;
        const barH = 4;
        const healthPercent = this.health / GAME_CONFIG.combat.maxHealth;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x + this.width / 2 - barW / 2, this.y - 28, barW, barH);

        ctx.fillStyle = healthPercent > 0.3 ? '#4AE290' : '#FF4444';
        ctx.fillRect(this.x + this.width / 2 - barW / 2, this.y - 28, barW * healthPercent, barH);
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = null;
        this.enemy = null;
        this.keys = {};
        this.gameLoop = null;

        // Phase 1 Game Feel Properties
        this.hitstopFrames = 0;
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.screenFlashAlpha = 0;
        this.timeScale = 1.0;
        this.slowMoFrames = 0;
        this.particles = [];

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.querySelectorAll('.character-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectCharacter(card.dataset.character);
            });
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            gameState.setState('character-select');
        });

        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    selectCharacter(characterKey) {
        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.remove('selected', 'ready-to-start');
            const msg = card.querySelector('.start-message');
            if (msg) msg.remove();
        });

        const selectedCard = document.querySelector(`[data-character="${characterKey}"]`);
        selectedCard.classList.add('selected');
        gameState.selectedCharacter = CHARACTERS[characterKey];

        const startMessage = document.createElement('div');
        startMessage.className = 'start-message';
        startMessage.innerHTML = '<strong>Click again to FIGHT!</strong>';
        startMessage.style.cssText = 'margin-top: 10px; color: #4AE290; font-weight: bold; animation: pulse 1s infinite;';
        selectedCard.appendChild(startMessage);

        selectedCard.onclick = () => {
            this.startGame();
        };
    }

    startGame() {
        if (!gameState.selectedCharacter) {
            gameState.selectedCharacter = CHARACTERS.yukito;
        }

        const characterKeys = Object.keys(CHARACTERS);
        let enemyKey;
        do {
            enemyKey = characterKeys[Math.floor(Math.random() * characterKeys.length)];
        } while (CHARACTERS[enemyKey] === gameState.selectedCharacter);

        gameState.enemyCharacter = CHARACTERS[enemyKey];

        this.player = new Fighter(gameState.selectedCharacter, 200, 0, true);
        this.enemy = new Fighter(gameState.enemyCharacter, 720, 0, false);

        this.particles = [];
        this.hitstopFrames = 0;
        this.shakeDuration = 0;
        this.slowMoFrames = 0;
        this.timeScale = 1.0;

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

    // Called on every hit connection
    onHitConfirmed(attackSpec, x, y, sparkColor, isKO) {
        // 1. Trigger Hitstop (Freeze frames)
        this.hitstopFrames = attackSpec.hitstop;

        // 2. Trigger Screen Shake
        this.shakeIntensity = attackSpec.shake;
        this.shakeDuration = attackSpec.hitstop + 6;

        // 3. Screen Flash for high damage / supers
        if (attackSpec.damage >= 24) {
            this.screenFlashAlpha = 0.45;
        }

        // 4. Spawn Burst of Sparks & Shockwave Rings
        this.spawnImpactParticles(x, y, sparkColor, attackSpec.damage);

        // 5. Trigger Slow-Mo if this hit defeats the fighter
        if (isKO) {
            this.triggerSlowMo(50, 0.15); // Dramatic 0.15x speed finish
        }
    }

    spawnImpactParticles(x, y, color, damage) {
        const count = Math.min(30, 8 + Math.floor(damage * 0.7));

        // Expanding shockwave ring
        this.particles.push(new Particle(x, y, 0, 0, '#FFFFFF', damage * 2.2, 16, 'ring'));

        // High-velocity sparks
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * (damage * 0.5);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const life = 10 + Math.random() * 15;
            const size = 2 + Math.random() * 3;

            // Mix primary character spark color with bright white/gold core sparks
            const pColor = Math.random() > 0.4 ? color : '#FFF';
            this.particles.push(new Particle(x, y, vx, vy, pColor, size, life, 'spark'));
        }
    }

    triggerSlowMo(frames = 45, scale = 0.2) {
        this.slowMoFrames = frames;
        this.timeScale = scale;
    }

    update() {
        if (gameState.current !== 'playing') return;

        // Handle Slow-Mo recovery
        if (this.slowMoFrames > 0) {
            this.slowMoFrames--;
            if (this.slowMoFrames === 0) {
                this.timeScale = 1.0;
            }
        }

        // Particles always update, even in hitstop, for crisp impact animation
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // HITSTOP: Freeze character physics while impact resonates
        if (this.hitstopFrames > 0) {
            this.hitstopFrames--;
            return;
        }

        this.handleInput();

        this.player.update();
        this.enemy.update();

        this.updateUI();
        this.checkGameOver();
    }

    handleInput() {
        if (this.player.hitstun > 0) return;

        if (this.keys['a']) {
            this.player.move('left');
        }
        if (this.keys['d']) {
            this.player.move('right');
        }
        if (this.keys['w']) {
            this.player.jump();
        }

        if (this.keys['j']) {
            this.player.attack('light', this.enemy);
            this.keys['j'] = false;
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
        const playerHealthPercent = Math.max(0, (this.player.health / GAME_CONFIG.combat.maxHealth) * 100);
        const enemyHealthPercent = Math.max(0, (this.enemy.health / GAME_CONFIG.combat.maxHealth) * 100);

        const playerHealthBar = document.getElementById('player-health');
        const enemyHealthBar = document.getElementById('enemy-health');

        playerHealthBar.style.width = playerHealthPercent + '%';
        enemyHealthBar.style.width = enemyHealthPercent + '%';

        const playerSuperPercent = (this.player.superMeter / GAME_CONFIG.combat.maxSuperMeter) * 100;
        const enemySuperPercent = (this.enemy.superMeter / GAME_CONFIG.combat.maxSuperMeter) * 100;

        const playerSuperBar = document.getElementById('player-super');
        const enemySuperBar = document.getElementById('enemy-super');

        playerSuperBar.style.width = playerSuperPercent + '%';
        enemySuperBar.style.width = enemySuperPercent + '%';

        playerHealthBar.classList.toggle('low', playerHealthPercent < 30);
        enemyHealthBar.classList.toggle('low', enemyHealthPercent < 30);
        playerSuperBar.parentElement.classList.toggle('full', playerSuperPercent >= 100);
        enemySuperBar.parentElement.classList.toggle('full', enemySuperPercent >= 100);
    }

    checkGameOver() {
        if (this.player.health <= 0 && this.hitstopFrames === 0) {
            this.gameOver(false);
        } else if (this.enemy.health <= 0 && this.hitstopFrames === 0) {
            this.gameOver(true);
        }
    }

    gameOver(playerWon) {
        cancelAnimationFrame(this.gameLoop);

        const resultElement = document.getElementById('game-result');
        const messageElement = document.getElementById('game-message');

        if (playerWon) {
            resultElement.textContent = 'K.O. - VICTORY!';
            resultElement.style.color = '#4AE290';
            messageElement.textContent = `${this.player.name} wins by Knockout!`;
        } else {
            resultElement.textContent = 'K.O. - DEFEAT!';
            resultElement.style.color = '#FF4444';
            messageElement.textContent = `${this.enemy.name} knocked you out!`;
        }

        setTimeout(() => {
            gameState.setState('game-over');
        }, 1200);
    }

    draw() {
        if (gameState.current !== 'playing') return;

        // Calculate Canvas-Native Screen Shake
        let shakeX = 0;
        let shakeY = 0;
        if (this.shakeDuration > 0) {
            this.shakeDuration--;
            shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= 0.88;
        }

        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.translate(shakeX, shakeY);

        // 1. Draw World & Background
        this.drawBackground();

        // 2. Draw Fighters
        this.player.draw(this.ctx);
        this.enemy.draw(this.ctx);

        // 3. Draw Impact Sparks & Shockwaves
        for (const particle of this.particles) {
            particle.draw(this.ctx);
        }

        // 4. UI Indicators on Canvas
        if (this.player.comboCount > 1) {
            this.drawComboCounter();
        }
        if (this.player.superMeter >= GAME_CONFIG.combat.maxSuperMeter) {
            this.drawSuperReady();
        }

        // 5. White Screen Flash on Heavy/Super Hits
        if (this.screenFlashAlpha > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.screenFlashAlpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.screenFlashAlpha = Math.max(0, this.screenFlashAlpha - 0.05);
        }

        this.ctx.restore();
    }

    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.7, '#87CEEB');
        gradient.addColorStop(0.7, '#228B22');
        gradient.addColorStop(1, '#228B22');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Ground line
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height - 100);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - 100);
        this.ctx.stroke();
    }

    drawComboCounter() {
        this.ctx.save();
        this.ctx.fillStyle = '#FFD700';
        this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
        this.ctx.shadowBlur = 6;
        this.ctx.font = '900 28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.player.comboCount} HIT COMBO!`, this.canvas.width / 2, 90);
        this.ctx.restore();
    }

    drawSuperReady() {
        this.ctx.save();
        this.ctx.fillStyle = '#FF4444';
        this.ctx.shadowColor = '#FFD700';
        this.ctx.shadowBlur = 8;
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SUPER READY! [U]', this.canvas.width / 2, 125);
        this.ctx.restore();
    }
}

// Initialize the game
const gameState = new GameState();
const game = new Game();

gameState.setState('character-select');
