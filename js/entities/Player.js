class Player extends Tank {
    constructor(x, y, playerIndex = 0) {
        super(x, y);
        
        this.playerIndex = playerIndex;
        this.lives = 4; // Increased to 4 lives
        this.score = 0;
        this.respawning = false;
        this.respawnTime = 0;
        this.respawnDuration = 3000; // 3 seconds
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        this.invulnerabilityDuration = 2000; // 2 seconds after respawn
        
        // Single bullet system
        this.activeBullet = null;
        
        // Store spawn point
        this.spawnPoint = { x: x, y: y };
        
        // Player-specific stats
        this.maxHealth = 1;
        this.health = this.maxHealth;
        this.speed = 90;
        this.fireRate = 400;
        
        // Visual
        this.playerColors = ['#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#ff8800', '#00ffff', '#8800ff', '#ff0088'];
        this.tankColor = this.playerColors[playerIndex % this.playerColors.length];
        
        // Controls
        this.controls = {
            up: false,
            down: false,
            left: false,
            right: false,
            fire: false
        };
        
        // Collision - players can move through base area
        this.collisionLayer = 'player';
        this.collisionMask = ['wall', 'enemy', 'enemyBullet', 'powerup'];
        
        // Set sprite based on player index
        this.spriteNames = ['player1', 'player2', 'player3'];
        this.spriteName = this.spriteNames[playerIndex % this.spriteNames.length];
        
        // Spawn effect
        this.spawnEffect = {
            active: true,
            duration: 1000,
            startTime: Date.now()
        };
    }

    update(deltaTime) {
        // Handle respawning
        if (this.respawning) {
            this.updateRespawn(deltaTime);
            return;
        }
        
        // Handle invulnerability
        if (this.invulnerable) {
            this.invulnerabilityTime -= deltaTime * 1000;
            if (this.invulnerabilityTime <= 0) {
                this.invulnerable = false;
            }
        }
        
        // Update spawn effect
        if (this.spawnEffect.active) {
            if (Date.now() - this.spawnEffect.startTime > this.spawnEffect.duration) {
                this.spawnEffect.active = false;
            }
        }
        
        // Process input and update movement
        this.processInput();
        
        super.update(deltaTime);
    }

    processInput() {
        let moveDir = new Vector2D(0, 0);
        
        // 4-directional movement only - prioritize the first pressed direction
        if (this.controls.up && !this.controls.down && !this.controls.left && !this.controls.right) {
            moveDir.y -= 1;
        } else if (this.controls.down && !this.controls.up && !this.controls.left && !this.controls.right) {
            moveDir.y += 1;
        } else if (this.controls.left && !this.controls.up && !this.controls.down && !this.controls.right) {
            moveDir.x -= 1;
        } else if (this.controls.right && !this.controls.up && !this.controls.down && !this.controls.left) {
            moveDir.x += 1;
        } else if (this.controls.up || this.controls.down || this.controls.left || this.controls.right) {
            // If multiple keys are pressed, prioritize vertical movement first
            if (this.controls.up) {
                moveDir.y -= 1;
            } else if (this.controls.down) {
                moveDir.y += 1;
            } else if (this.controls.left) {
                moveDir.x -= 1;
            } else if (this.controls.right) {
                moveDir.x += 1;
            }
        }
        
        this.setMoveDirection(moveDir);
    }

    updateRespawn(deltaTime) {
        this.respawnTime -= deltaTime * 1000;
        if (this.respawnTime <= 0) {
            this.completeRespawn();
        }
    }

    setControls(controls) {
        this.controls = { ...this.controls, ...controls };
    }

    attemptFire() {
        if (this.respawning || !this.controls.fire) return null;
        return this.fire();
    }

    takeDamage(amount) {
        if (this.invulnerable || this.respawning) return;
        
        // Debug infinite health check
        if (this.infiniteHealth) {
            console.log('Damage blocked by infinite health');
            return;
        }
        
        // Don't call super.takeDamage() to avoid automatic destroy()
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            // Don't destroy - start respawn instead
            this.startRespawn();
        } else {
            // Brief invulnerability after taking damage
            this.invulnerable = true;
            this.invulnerabilityTime = 500;
        }
        
        this.onTakeDamage(amount);
    }

    startRespawn() {
        this.lives--;
        console.log(`Player ${this.playerIndex} died. Lives remaining: ${this.lives}`);
        this.respawning = true;
        this.respawnTime = this.respawnDuration;
        this.visible = false;
        this.solid = false;
        
        // Reset position to spawn point
        this.resetToSpawnPoint();
    }

    completeRespawn() {
        if (this.lives <= 0) {
            // Game over for this player
            console.log(`Player ${this.playerIndex} game over - no lives left`);
            this.alive = false;
            return;
        }
        
        // Successfully respawned
        console.log(`Player ${this.playerIndex} respawned with ${this.lives} lives remaining`);
        this.alive = true;
        this.respawning = false;
        this.visible = true;
        this.solid = true;
        this.health = this.maxHealth;
        this.invulnerable = true;
        this.invulnerabilityTime = this.invulnerabilityDuration;
        
        // Restart spawn effect
        this.spawnEffect.active = true;
        this.spawnEffect.startTime = Date.now();
    }

    resetToSpawnPoint() {
        // Reset to original spawn position
        this.setPosition(this.spawnPoint.x, this.spawnPoint.y);
        this.direction = 0; // Face up
        this.facing = 0;
        this.rotation = 0;
        this.velocity = new Vector2D(0, 0);
    }

    addScore(points) {
        this.score += points;
    }

    collectPowerUp(powerUpType) {
        switch (powerUpType) {
            case 'rapidFire':
                this.activatePowerUp('rapidFire', 15000);
                this.addScore(100);
                break;
            case 'shield':
                this.activatePowerUp('shield', 10000);
                this.addScore(150);
                break;
            case 'speed':
                this.activatePowerUp('speed', 12000);
                this.addScore(100);
                break;
            case 'extraLife':
                this.lives++;
                this.addScore(500);
                break;
        }
    }

    render(ctx, camera = { x: 0, y: 0 }) {
        if (!this.visible && !this.respawning) return;
        
        // Handle invulnerability flashing
        if (this.invulnerable) {
            const flashRate = 200;
            const flashVisible = Math.floor(Date.now() / flashRate) % 2 === 0;
            if (!flashVisible) return;
        }
        
        // Respawn countdown
        if (this.respawning) {
            this.renderRespawnCountdown(ctx, camera);
            return;
        }
        
        // Spawn effect
        if (this.spawnEffect.active) {
            this.renderSpawnEffect(ctx, camera);
        }
        
        super.render(ctx, camera);
        
        // Render player indicator
        this.renderPlayerIndicator(ctx, camera);
    }

    renderRespawnCountdown(ctx, camera) {
        const gameWidth = 800;
        const gameHeight = 600;
        const centerX = gameWidth / 2;
        const centerY = gameHeight - 150;
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = this.tankColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        const countdown = Math.ceil(this.respawnTime / 1000);
        const text = `Player ${this.playerIndex + 1} respawning in ${countdown}`;
        
        ctx.strokeText(text, centerX, centerY);
        ctx.fillText(text, centerX, centerY);
        ctx.restore();
    }

    renderSpawnEffect(ctx, camera) {
        const progress = (Date.now() - this.spawnEffect.startTime) / this.spawnEffect.duration;
        const screenX = this.position.x - camera.x;
        const screenY = this.position.y - camera.y;
        
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = this.tankColor;
        ctx.lineWidth = 3;
        
        // Expanding circle effect
        const radius = progress * 50;
        ctx.beginPath();
        ctx.arc(
            screenX + this.size.x / 2,
            screenY + this.size.y / 2,
            radius,
            0, Math.PI * 2
        );
        ctx.stroke();
        
        // Sparkle effects
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + progress * Math.PI * 2;
            const sparkleX = screenX + this.size.x / 2 + Math.cos(angle) * radius * 0.7;
            const sparkleY = screenY + this.size.y / 2 + Math.sin(angle) * radius * 0.7;
            
            ctx.fillStyle = this.tankColor;
            ctx.fillRect(sparkleX - 2, sparkleY - 2, 4, 4);
        }
        
        ctx.restore();
    }

    renderPlayerIndicator(ctx, camera) {
        const screenX = this.position.x - camera.x;
        const screenY = this.position.y - camera.y;
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = this.tankColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        const text = `P${this.playerIndex + 1}`;
        const textX = screenX + this.size.x / 2;
        const textY = screenY - 5;
        
        ctx.strokeText(text, textX, textY);
        ctx.fillText(text, textX, textY);
        ctx.restore();
    }

    isGameOver() {
        return !this.alive && this.lives <= 0;
    }

    resetForNewGame() {
        this.lives = 4; // Updated to 4 lives
        this.score = 0;
        this.health = this.maxHealth;
        this.alive = true;
        this.respawning = false;
        this.invulnerable = false;
        this.visible = true;
        this.solid = true;
        this.resetToSpawnPoint();
        
        // Reset power-ups
        this.powerUps = {
            rapidFire: false,
            piercing: false,
            shield: false,
            speed: false
        };
        this.powerUpTimers = {};
        this.fireRate = 400;
        this.speed = 90;
        
        // Reset spawn effect
        this.spawnEffect.active = true;
        this.spawnEffect.startTime = Date.now();
    }
}
