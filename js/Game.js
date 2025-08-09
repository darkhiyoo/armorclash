// Add hashCode method to String prototype for consistent player sprite assignment
String.prototype.hashCode = function() {
    let hash = 0;
    if (this.length === 0) return hash;
    for (let i = 0; i < this.length; i++) {
        const char = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameState = 'loading'; // loading, menu, playing, paused, gameOver, options
        this.stage = 1;
        this.isRunning = false;
        this.lastFrameTime = 0;
        this.deltaTime = 0;

        // Menu state
        this.selectedMenuItem = 0;
        this.menuItems = [
            { text: '🎮 Single Player', action: 'start1player' },
            { text: '🌐 Multiplayer Co-op', action: 'multiplayer' },
            { text: '⚙️ Options', action: 'options' }
        ];
        
        // Options menu state
        this.selectedOptionItem = 0;
        this.optionItems = [
            { text: 'BGM Volume', type: 'slider', value: 50, min: 0, max: 100, action: 'bgmVolume' },
            { text: 'SFX Volume', type: 'slider', value: 70, min: 0, max: 100, action: 'sfxVolume' },
            { text: 'Back to Menu', type: 'button', action: 'backtomenu' }
        ];        // Effects system
        this.explosionEffects = [];
        this.backgroundMusic = null;
        
        // Systems
        this.assetLoader = new AssetLoader();
        this.soundManager = new SoundManager();
        this.gamepadManager = new GamepadManager();
        this.inputSystem = new InputSystem(this.gamepadManager);
        this.collisionSystem = new CollisionSystem();
        this.renderSystem = new RenderSystem(this.canvas, this.assetLoader);
        this.debugSystem = new DebugSystem(this.canvas);
        this.networkManager = new NetworkManager(this); // Add multiplayer support
        
        // Game entities
        this.players = [];
        this.enemies = [];
        this.bullets = [];
        this.walls = [];
        this.cars = [];
        this.powerUps = [];
        
        // Multiplayer tracking
        this.remotePlayers = new Map(); // Track remote player data
        
        // Game settings
        this.maxPlayers = 8;
        this.activePlayerCount = 1;
        this.isMultiplayer = false; // Track if in multiplayer mode
        this.totalMultiplayerPlayers = 1; // Total players across all devices
        this.enemySpawnTimer = 0;
        this.enemySpawnDelay = 3000; // 3 seconds
        this.maxEnemies = 4; // Allow 4 enemies spawning at once
        this.totalEnemiesKilled = 0;
        this.enemiesNeededToWin = 20; // Need to kill 20 enemies to clear stage
        this.bossBattlePhase = false; // Track when we're in boss battle mode
        
        // Score and lives
        this.gameScore = 0;
        this.gameTime = 0;
        
        // Level data
        this.levelData = null;
        
        // Global reference
        window.game = this;
        
        this.init();
    }

    async init() {
        console.log('Initializing Wildfire Tank Battle...');
        
        // Set up loading callbacks
        this.assetLoader.setLoadingCallbacks(
            (loaded, total) => this.onLoadingProgress(loaded, total),
            () => this.onLoadingComplete()
        );
        
        // Load assets
        await this.assetLoader.loadAssets();
    }

    onLoadingProgress(loaded, total) {
        const progress = (loaded / total) * 100;
        
        // Only log and update if progress is reasonable (prevent infinite loading logs)
        if (progress <= 100) {
            console.log(`Loading assets: ${Math.round(progress)}%`);
            // Update loading display
            this.renderLoadingScreen(progress);
        }
    }

    onLoadingComplete() {
        console.log('Assets loaded successfully');
        
        // Set up sprites for entities
        this.setupSprites();
        
        // Don't start intro music immediately - wait for user interaction
        // Music will be started by main.js after first click/keypress
        
        // Go to menu
        this.gameState = 'menu';
        this.startMenu();
    }

    setupSprites() {
        // Player sprites will be set when players are created
        // Background - use the city.png from stages folder
        this.renderSystem.setBackground('stage_city');
        
        // Connect sounds to sound manager
        this.soundManager.addSound('shoot', this.assetLoader.getSound('shoot'));
        this.soundManager.addSound('explode', this.assetLoader.getSound('explode'));
        this.soundManager.addSound('flamethrower', this.assetLoader.getSound('flamethrower'));
        this.soundManager.addSound('music_stage', this.assetLoader.getSound('music_stage'));
        this.soundManager.addSound('game_start', this.assetLoader.getSound('game_start'));
        this.soundManager.addSound('game_intro', this.assetLoader.getSound('game_intro'));
    }

    startMenu() {
        console.log('Starting menu...');
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        // No longer start independent loop - will be called from main.js
    }

    startGame() {
        console.log('Starting single player game...');
        
        // Reset multiplayer state
        this.activePlayerCount = 1;
        this.isMultiplayer = false;
        this.totalMultiplayerPlayers = 1;
        
        // Stop intro music and start stage music
        this.soundManager.stopMusic();
        this.soundManager.playMusic('music_stage', 0.3, true);
        
        // Create initial game state
        this.resetGame();
        
        // Game loop is already running from menu
        this.gameState = 'playing';
        this.updateDebugControlsVisibility();
    }

    startMultiplayerGame(playerCount) {
        console.log(`Starting multiplayer game with ${playerCount} players total`);
        
        // In multiplayer, each device controls 1 player
        this.activePlayerCount = 1;
        this.totalMultiplayerPlayers = playerCount;
        this.isMultiplayer = true;
        
        // Stop intro music and start stage music
        this.soundManager.stopMusic();
        this.soundManager.playMusic('music_stage', 0.3, true);
        
        // Create initial game state
        this.resetGame();
        
        // Game loop is already running from menu
        this.gameState = 'playing';
        this.updateDebugControlsVisibility();
    }

    updateDebugControlsVisibility() {
        // Update debug controls visibility based on game state
        if (typeof updateDebugControlsVisibility === 'function') {
            updateDebugControlsVisibility();
        }
    }

    resetGame() {
        // Clear existing entities
        this.players = [];
        this.enemies = [];
        this.bullets = [];
        this.walls = [];
        this.cars = [];
        this.powerUps = [];
        this.explosionEffects = [];
        
        // Don't clear remote players in multiplayer - preserve connections
        if (!this.isMultiplayer) {
            this.remotePlayers.clear();
        }
        
        // Reset game state
        this.gameScore = 0;
        this.gameTime = 0;
        this.stage = 1;
        this.enemySpawnTimer = 0;
        this.totalEnemiesKilled = 0;
        
        // Create players
        this.createPlayers();
        
        // Create initial level (no base needed)
        this.createLevel();
        
        // Set up systems
        this.setupSystems();
        
        // Update UI
        this.updateUI();
        
        // Force full game state sync after reset (host only)
        if (this.isMultiplayer && this.networkManager && this.networkManager.isHost) {
            setTimeout(() => {
                this.networkManager.sendFullGameState();
            }, 500); // Wait for level to fully initialize
        }
    }

    createPlayers() {
        // Move players inside the safe zone defined by diagonal wall (640,130) to (135,475)
        // Safe spawn area: well within the diagonal boundary
        
        // Player positions - moved inside the safe zone
        const playerPositions = [
            { x: 200, y: 420 }, // Bottom left - safe inside diagonal
            { x: 350, y: 420 }, // Bottom center left - safe inside
            { x: 500, y: 420 }, // Bottom center right - safe inside  
            { x: 580, y: 420 }, // Bottom right - safe inside diagonal
            { x: 275, y: 350 }, // Second row left
            { x: 425, y: 350 }, // Second row center
            { x: 525, y: 350 }, // Second row right
            { x: 600, y: 350 }  // Second row far right
        ];
        
        for (let i = 0; i < this.activePlayerCount; i++) {
            const pos = playerPositions[i] || playerPositions[0];
            const player = new Player(pos.x, pos.y, i);
            
            // Set sprite
            player.spriteName = player.spriteName || 'player1';
            player.sprite = this.assetLoader.getImage(player.spriteName);
            
            this.players.push(player);
            this.inputSystem.registerPlayer(player);
            this.renderSystem.addEntity(player);
            this.collisionSystem.addEntity(player);
        }
    }

    createLevel() {
        // Create boundary walls (black borders from your markers)
        this.createWalls();
        
        // Create destructible cars (only for stage 1 - City stage)
        if (this.stage === 1) {
            this.createCars();
        }
        
        // Spawn enemies at green marker positions
        this.spawnEnemiesAtMarkers();
    }

    spawnEnemiesAtMarkers() {
        // Enemy spawn positions - now free to roam the full play area!
        const enemySpawns = [
            { x: 150, y: 150 },    // Top left area
            { x: 400, y: 150 },    // Top center  
            { x: 600, y: 150 },    // Top right area
            { x: 150, y: 300 },    // Mid left
            { x: 600, y: 300 },    // Mid right
        ];
        
        // Spawn initial enemies
        enemySpawns.slice(0, 3).forEach((spawn, index) => {
            setTimeout(() => {
                this.spawnEnemyAt(spawn.x, spawn.y);
            }, index * 500); // Stagger spawning
        });
        
        // Store remaining spawn points for later waves
        this.enemySpawnPoints = enemySpawns;
        this.currentSpawnIndex = 3;
    }

    spawnEnemyAt(x, y) {
        // Only host spawns enemies in multiplayer
        if (this.isMultiplayer && this.networkManager && !this.networkManager.isHost) {
            return;
        }
        
        // Reduce debug spam - only log occasionally
        if (this.enemies.length % 2 === 0) {
            console.log(`SPAWN: Stage ${this.stage}, Killed ${this.totalEnemiesKilled}/${this.enemiesNeededToWin}, Enemies: ${this.enemies.length}/${this.maxEnemies}`);
        }
        
        if (this.enemies.length >= this.maxEnemies) return;
        
        // Different enemy types based on stage
        let enemyTypes = ['basic', 'fast', 'heavy'];
        
        if (this.stage === 1) { // City stage - keep it simple
            const bossCount = this.enemies.filter(e => e.enemyType === 'boss').length;
            // Only spawn boss if we've killed at least 50% of enemies and few bosses exist
            if (bossCount < 2 && this.totalEnemiesKilled >= this.enemiesNeededToWin * 0.5) {
                if (Math.random() < 0.15) { // Much lower chance
                    enemyTypes = ['boss'];
                    console.log(`Spawning boss on stage 1 (Killed: ${this.totalEnemiesKilled}/${this.enemiesNeededToWin})`);
                } else {
                    enemyTypes = ['basic', 'fast', 'heavy'];
                }
            } else {
                enemyTypes = ['basic', 'fast', 'heavy']; // Only basic enemies
            }
        } else if (this.stage === 2) { // Island stage
            const flamethrowerCount = this.enemies.filter(e => e.enemyType === 'flamethrower').length;
            
            // Enter boss battle phase when 80% enemies killed
            if (this.totalEnemiesKilled >= this.enemiesNeededToWin * 0.8 && !this.bossBattlePhase && flamethrowerCount === 0) {
                this.bossBattlePhase = true;
                this.maxEnemies = 1; // Only boss during boss phase
                console.log(`BOSS BATTLE PHASE ACTIVATED! (Killed: ${this.totalEnemiesKilled}/${this.enemiesNeededToWin})`);
            }
            
            // Spawn flamethrower boss if in boss phase
            if (this.bossBattlePhase && flamethrowerCount < 1) {
                enemyTypes = ['flamethrower']; // Only flamethrower boss
                console.log(`Spawning flamethrower boss! (Boss Phase Active)`);
            } else if (!this.bossBattlePhase) {
                const flameCount = this.enemies.filter(e => e.enemyType === 'flame').length;
                // Regular enemies for island stage
                if (flameCount < 4) { // Reduced flame enemy limit
                    enemyTypes = ['flame', 'flame', 'basic']; // Mostly flame enemies
                } else {
                    enemyTypes = ['basic', 'fast']; // Basic enemies when flame limit reached
                }
            } else {
                // During boss phase, don't spawn anything if boss exists
                console.log(`Boss phase active, boss exists, not spawning`);
                return;
            }
        }
        
        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const enemy = new Enemy(x, y, randomType);
        
        // Set game reference for explosions
        enemy.game = this;
        
        // Set sprite based on enemy type
        if (enemy.enemyType === 'boss') {
            enemy.spriteName = 'enemy2'; // ai2.png
            enemy.sprite = this.assetLoader.getImage('enemy2');
        } else if (enemy.enemyType === 'flame') {
            enemy.spriteName = 'enemy3'; // ai3.png
            enemy.sprite = this.assetLoader.getImage('enemy3');
        } else if (enemy.enemyType === 'flamethrower') {
            enemy.spriteName = 'enemy4'; // ai4.png
            enemy.sprite = this.assetLoader.getImage('enemy4');
        } else {
            enemy.spriteName = 'enemy1'; // ai1.png
            enemy.sprite = this.assetLoader.getImage('enemy1');
        }
        
        this.enemies.push(enemy);
        this.renderSystem.addEntity(enemy);
        this.collisionSystem.addEntity(enemy);
        
        this.updateUI();
    }

    createWalls() {
        // Create custom invisible boundary walls based on user's coordinates
        // User traced: (110,102) -> (689,100) -> (690,500) -> (100,500) -> back to start
        
        const wallThickness = 8; // Thinner walls for precise boundary
        
        // Top wall: from (110,102) to (689,100)
        const topWall = new Entity(110, 102 - wallThickness/2, 579, wallThickness); // width = 689-110 = 579
        topWall.collisionLayer = 'wall';
        topWall.collisionMask = ['tank', 'bullet'];
        topWall.visible = false; // Make invisible
        topWall.destructible = false;
        this.walls.push(topWall);
        
        // Right wall: from (689,100) to (690,500) 
        const rightWall = new Entity(689 - wallThickness/2, 100, wallThickness, 400); // height = 500-100 = 400
        rightWall.collisionLayer = 'wall';
        rightWall.collisionMask = ['tank', 'bullet'];
        rightWall.visible = false; // Make invisible
        rightWall.destructible = false;
        this.walls.push(rightWall);
        
        // Bottom wall: from (690,500) to (100,500)
        const bottomWall = new Entity(100, 500 - wallThickness/2, 590, wallThickness); // width = 690-100 = 590
        bottomWall.collisionLayer = 'wall';
        bottomWall.collisionMask = ['tank', 'bullet'];
        bottomWall.visible = false; // Make invisible
        bottomWall.destructible = false;
        this.walls.push(bottomWall);
        
        // Left wall: from (100,500) to (110,102)
        const leftWall = new Entity(100 - wallThickness/2, 102, wallThickness, 398); // height = 500-102 = 398
        leftWall.collisionLayer = 'wall';
        leftWall.collisionMask = ['tank', 'bullet'];
        leftWall.visible = false; // Make invisible
        leftWall.destructible = false;
        this.walls.push(leftWall);
        
        // Add walls to collision system only (not render system since they're invisible)
        this.walls.forEach(wall => {
            this.collisionSystem.addEntity(wall);
            // Don't add to renderSystem since walls are invisible
        });
    }

    createCars() {
        // Car positions - 4 columns with 6 cars each at exact coordinates
        const carPositions = [
            // Column 1: x=226/225, y from 177 to 424 (6 cars)
            { x: 226, y: 177 },
            { x: 226, y: 226 },
            { x: 226, y: 275 },
            { x: 226, y: 324 },
            { x: 226, y: 375 },
            { x: 225, y: 424 },
            
            // Column 2: x=358, y from 177 to 424 (6 cars)
            { x: 358, y: 177 },
            { x: 358, y: 226 },
            { x: 358, y: 275 },
            { x: 358, y: 324 },
            { x: 358, y: 375 },
            { x: 358, y: 424 },
            
            // Column 3: x=494/490, y from 177 to 424 (6 cars)
            { x: 494, y: 177 },
            { x: 494, y: 226 },
            { x: 494, y: 275 },
            { x: 494, y: 324 },
            { x: 494, y: 375 },
            { x: 490, y: 424 },
            
            // Column 4: x=623, y from 177 to 424 (6 cars)
            { x: 623, y: 177 },
            { x: 623, y: 226 },
            { x: 623, y: 275 },
            { x: 623, y: 324 },
            { x: 623, y: 375 },
            { x: 623, y: 424 }
        ];
        
        // Create cars at each specified position
        carPositions.forEach((pos, index) => {
            // Make cars small to fit well (28x22 pixels)
            const car = new Car(pos.x - 14, pos.y - 11, 28, 22);
            
            // Set sprite
            car.sprite = this.assetLoader.getImage('car');
            
            this.cars.push(car);
            this.renderSystem.addEntity(car);
            this.collisionSystem.addEntity(car);
        });
        
        console.log(`Created ${this.cars.length} destructible cars in 4 columns of 6 cars each`);
    }

    spawnEnemy() {
        if (this.enemies.length >= this.maxEnemies) return;
        
        // Random spawn position at top of screen
        const gameWidth = this.canvas.width;
        const x = Math.random() * (gameWidth - 64) + 32;
        const y = 50;
        
        // Different enemy types based on stage
        let enemyTypes = ['basic', 'fast', 'heavy'];
        
        if (this.stage === 1) { // City stage - keep it simple
            const bossCount = this.enemies.filter(e => e.enemyType === 'boss').length;
            // Only spawn boss if we've killed at least 50% of enemies and few bosses exist
            if (bossCount < 2 && this.totalEnemiesKilled >= this.enemiesNeededToWin * 0.5) {
                if (Math.random() < 0.15) { // Much lower chance
                    enemyTypes = ['boss'];
                    console.log(`Spawning boss on stage 1 (Killed: ${this.totalEnemiesKilled}/${this.enemiesNeededToWin})`);
                } else {
                    enemyTypes = ['basic', 'fast', 'heavy'];
                }
            } else {
                enemyTypes = ['basic', 'fast', 'heavy']; // Only basic enemies
            }
        } else if (this.stage === 2) { // Island stage
            const flamethrowerCount = this.enemies.filter(e => e.enemyType === 'flamethrower').length;
            
            // Enter boss battle phase when 80% enemies killed
            if (this.totalEnemiesKilled >= this.enemiesNeededToWin * 0.8 && !this.bossBattlePhase && flamethrowerCount === 0) {
                this.bossBattlePhase = true;
                this.maxEnemies = 1; // Only boss during boss phase
                console.log(`BOSS BATTLE PHASE ACTIVATED! (Killed: ${this.totalEnemiesKilled}/${this.enemiesNeededToWin})`);
            }
            
            // Spawn flamethrower boss if in boss phase
            if (this.bossBattlePhase && flamethrowerCount < 1) {
                enemyTypes = ['flamethrower']; // Only flamethrower boss
                console.log(`Spawning flamethrower boss! (Boss Phase Active)`);
            } else if (!this.bossBattlePhase) {
                const flameCount = this.enemies.filter(e => e.enemyType === 'flame').length;
                // Regular enemies for island stage
                if (flameCount < 4) { // Reduced flame enemy limit
                    enemyTypes = ['flame', 'flame', 'basic']; // Mostly flame enemies
                } else {
                    enemyTypes = ['basic', 'fast']; // Basic enemies when flame limit reached
                }
            } else {
                // During boss phase, don't spawn anything if boss exists
                return;
            }
        }
        
        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const enemy = new Enemy(x, y, randomType);
        
        // Set game reference for explosions
        enemy.game = this;
        
        // Set sprite based on enemy type
        if (enemy.enemyType === 'boss') {
            enemy.spriteName = 'enemy2'; // ai2.png
            enemy.sprite = this.assetLoader.getImage('enemy2');
        } else if (enemy.enemyType === 'flame') {
            enemy.spriteName = 'enemy3'; // ai3.png
            enemy.sprite = this.assetLoader.getImage('enemy3');
        } else if (enemy.enemyType === 'flamethrower') {
            enemy.spriteName = 'enemy4'; // ai4.png
            enemy.sprite = this.assetLoader.getImage('enemy4');
        } else {
            enemy.spriteName = 'enemy1'; // ai1.png
            enemy.sprite = this.assetLoader.getImage('enemy1');
        }
        
        // Set target to nearest player
        if (this.players.length > 0) {
            const nearestPlayer = this.findNearestPlayer(enemy.getCenter());
            enemy.setTarget(nearestPlayer);
        }
        
        this.enemies.push(enemy);
        this.renderSystem.addEntity(enemy);
        this.collisionSystem.addEntity(enemy);
    }

    // Debug spawn function for specific enemy types
    debugSpawnEnemy(enemyType = 'basic') {
        // Random spawn position
        const gameWidth = this.canvas.width;
        const x = Math.random() * (gameWidth - 64) + 32;
        const y = 50;
        
        // Create enemy directly (same as regular spawnEnemy)
        const enemy = new Enemy(x, y, enemyType);
        
        // Set game reference for explosions
        enemy.game = this;
        
        // Set sprite based on enemy type
        if (enemy.enemyType === 'boss') {
            enemy.spriteName = 'enemy2'; // ai2.png
            enemy.sprite = this.assetLoader.getImage('enemy2');
        } else if (enemy.enemyType === 'flame') {
            enemy.spriteName = 'enemy3'; // ai3.png
            enemy.sprite = this.assetLoader.getImage('enemy3');
        } else if (enemy.enemyType === 'flamethrower') {
            enemy.spriteName = 'enemy4'; // ai4.png
            enemy.sprite = this.assetLoader.getImage('enemy4');
        } else {
            enemy.spriteName = 'enemy1'; // ai1.png
            enemy.sprite = this.assetLoader.getImage('enemy1');
        }
        
        // Set target to nearest player
        if (this.players.length > 0) {
            const nearestPlayer = this.findNearestPlayer(enemy.getCenter());
            enemy.setTarget(nearestPlayer);
        }
        
        this.enemies.push(enemy);
        this.renderSystem.addEntity(enemy);
        this.collisionSystem.addEntity(enemy);
        
        console.log(`Debug spawned ${enemyType} enemy`);
    }

    // Debug function to skip to next stage
    debugNextStage() {
        console.log('Debug: Skipping to next stage');
        this.nextStage();
    }

    // Debug function to toggle infinite health
    debugToggleInfiniteHealth() {
        if (this.players.length > 0) {
            const player = this.players[0];
            if (player.infiniteHealth) {
                player.infiniteHealth = false;
                console.log('Infinite health OFF');
            } else {
                player.infiniteHealth = true;
                player.health = player.maxHealth || 100;
                console.log('Infinite health ON');
            }
        }
    }

    findNearestPlayer(position) {
        let nearest = null;
        let minDistance = Infinity;
        
        this.players.forEach(player => {
            if (player.alive && !player.respawning) {
                const distance = position.distanceTo(player.getCenter());
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = player;
                }
            }
        });
        
        return nearest;
    }

    setupSystems() {
        // Clear collision system
        this.collisionSystem = new CollisionSystem();
        
        // Add all entities to systems
        [...this.players, ...this.enemies, ...this.walls, ...this.cars].forEach(entity => {
            if (entity) {
                this.collisionSystem.addEntity(entity);
            }
        });
    }

    updateGame() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        
        // Initialize frame timing
        if (!this.lastFrameTime) this.lastFrameTime = currentTime;
        
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;
        
        // Skip frame if delta is too small (prevent division issues)
        if (this.deltaTime < 0.001) {
            // Just return - main loop will call us again next frame
            return;
        }
        
        // Cap delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 1/15); // More conservative cap
        
        // Frame skip logic for performance
        this.frameCounter = (this.frameCounter || 0) + 1;
        
        // FPS monitoring (less frequent)
        if (this.frameCounter % 60 === 0) { // Check every 60 frames
            const fps = 1 / this.deltaTime;
            if (fps < 20) {
                console.warn(`Performance warning: ${fps.toFixed(1)} FPS`);
                // Enable frame skipping for very low FPS
                this.performanceMode = true;
            } else if (fps > 45) {
                this.performanceMode = false;
            }
        }
        
        try {
            // Update game with performance considerations
            this.update(this.deltaTime);
        } catch (error) {
            console.error('Game update error:', error);
            // Don't crash the game, just log the error
        }
        
        // Update input system's previous key states for next frame
        if (this.inputSystem && this.inputSystem.updatePreviousKeys) {
            this.inputSystem.updatePreviousKeys();
        }
        
        try {
            // Render game with performance considerations
            if (!this.performanceMode || this.frameCounter % 2 === 0) {
                this.render();
            }
        } catch (error) {
            console.error('Game render error:', error);
            // Don't crash the game, just log the error
        }
        
        // NO LONGER CREATE INDEPENDENT LOOP - will be called from main.js
        // requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        // Always update input system to check for pause
        this.inputSystem.update();
        
        // Handle menu input
        if (this.gameState === 'menu') {
            this.handleMenuInput();
            return;
        }
        
        // Handle options input
        if (this.gameState === 'options') {
            this.handleOptionsInput();
            return;
        }
        
        // Handle game over input
        if (this.gameState === 'gameOver') {
            this.handleGameOverInput();
            return;
        }
        
        // Handle pause input (works in any state)
        if (this.inputSystem.isPausePressed()) {
            this.togglePause();
            return;
        }
        
        // Handle debug toggle (works in any state)
        if (this.inputSystem.isDebugTogglePressed()) {
            this.debugSystem.toggle();
            return;
        }
        
        // Debug: Next stage (N key)
        if (this.inputSystem.isKeyJustPressed(['KeyN'])) {
            this.debugNextStage();
            return;
        }
        
        // Debug: Spawn flamethrower boss (B key)
        if (this.inputSystem.isKeyJustPressed(['KeyB'])) {
            this.debugSpawnEnemy('flamethrower');
            return;
        }
        
        // Debug: Reset to stage 1 (R key)
        if (this.inputSystem.isKeyJustPressed(['KeyR'])) {
            console.log('Resetting to stage 1...');
            this.stage = 1;
            this.totalEnemiesKilled = 0;
            this.maxEnemies = 4;
            this.bossBattlePhase = false;
            this.enemies = [];
            this.bullets = [];
            this.setupStage();
            return;
        }
        
        // Debug: Trigger boss phase (O key)
        if (this.inputSystem.isKeyJustPressed(['KeyO'])) {
            console.log('Triggering boss battle phase...');
            this.totalEnemiesKilled = Math.floor(this.enemiesNeededToWin * 0.8);
            this.bossBattlePhase = false; // Reset so it can be triggered
            return;
        }
        
        // Don't update game logic when paused or not playing
        if (this.gameState !== 'playing') return;
        
        // Performance throttling
        const shouldUpdateAI = this.frameCounter % 3 === 0; // Every 3rd frame for AI
        const shouldUpdatePhysics = this.frameCounter % 2 === 0; // Every 2nd frame for physics
        const shouldCleanup = this.frameCounter % 60 === 0; // Every 60th frame for cleanup
        const shouldUpdateNetwork = this.frameCounter % 6 === 0; // Every 6th frame for network
        
        // Update game time
        this.gameTime += deltaTime;
        
        // Update explosion effects (lightweight)
        this.updateExplosionEffects(deltaTime);
        
        // Always update players (most important)
        this.players.forEach(player => {
            if (player.alive) {
                player.update(deltaTime);
                player.clampToScreen(this.canvas.width, this.canvas.height);
            }
        });
        
        // Always update bullets (fast moving)
        this.bullets.forEach(bullet => {
            if (bullet.alive) {
                bullet.update(deltaTime);
                
                // Remove bullets that are off screen or have traveled too far
                if (bullet.isOffScreen(this.canvas.width, this.canvas.height) || 
                    !bullet.alive || bullet.traveledDistance >= bullet.maxDistance) {
                    
                    // Clear the active bullet reference from the owner
                    if (bullet.owner && bullet.owner.activeBullet === bullet) {
                        bullet.owner.activeBullet = null;
                    }
                    
                    bullet.destroy();
                }
            }
        });
        
        // Throttled updates for performance
        if (shouldUpdateAI) {
            // Update enemies (CPU intensive)
            this.enemies.forEach(enemy => {
                if (enemy.alive) {
                    enemy.update(deltaTime * 3); // Compensate for skipped frames
                    
                    // Update enemy target less frequently
                    if (this.frameCounter % 9 === 0) {
                        const nearestPlayer = this.findNearestPlayer(enemy.getCenter());
                        enemy.setTarget(nearestPlayer);
                    }
                    
                    enemy.clampToScreen(this.canvas.width, this.canvas.height);
                }
            });
        }
        
        if (shouldUpdatePhysics) {
            // Update cars and walls (less frequent)
            this.walls.forEach(wall => {
                if (wall.alive && wall.update) {
                    wall.update(deltaTime * 2);
                }
            });
            
            this.cars.forEach(car => {
                if (car.alive && car.update) {
                    car.update(deltaTime * 2);
                }
            });
        }
        
        // Handle firing (always - responsive)
        this.handleFiring();
        
        // Update collision system (throttled)
        if (shouldUpdatePhysics) {
            this.collisionSystem.update();
        }
        
        // Spawn enemies (throttled)
        if (shouldUpdateAI) {
            this.updateEnemySpawning(deltaTime * 3);
        }
        
        // Check win/lose conditions (less frequent)
        if (this.frameCounter % 30 === 0) {
            this.checkGameConditions();
        }
        
        // Network updates (heavily throttled)
        if (shouldUpdateNetwork && this.networkManager) {
            // Network updates are now handled by intervals in NetworkManager
            // No need to call update() or sendPlayerUpdate() here
            // This prevents the 1 FPS issue caused by duplicate network calls
        }
        
        // Update UI (less frequent)
        if (this.frameCounter % 10 === 0) {
            this.updateUI();
        }
        
        // Update debug system (less frequent)
        if (this.frameCounter % 30 === 0) {
            const allEntities = [...this.players, ...this.enemies, ...this.bullets, ...this.walls, ...this.cars, ...this.powerUps];
            this.debugSystem.update(allEntities, this.renderSystem.camera);
        }
        
        // Clean up dead entities (very infrequent)
        if (shouldCleanup) {
            this.cleanup();
        }
    }

    handleFiring() {
        // Player firing
        this.players.forEach(player => {
            if (player.alive && !player.respawning) {
                const bulletData = player.attemptFire();
                if (bulletData) {
                    this.createBullet(bulletData);
                }
            }
        });
        
        // Enemy firing
        this.enemies.forEach(enemy => {
            if (enemy.alive) {
                const bulletData = enemy.attemptFire();
                if (bulletData) {
                    this.createBullet(bulletData);
                }
            }
        });
    }

    createBullet(bulletData) {
        const bullet = new Bullet(
            bulletData.position.x,
            bulletData.position.y,
            bulletData.direction,
            bulletData.speed,
            bulletData.damage,
            bulletData.owner
        );
        
        // Assign unique ID for network sync
        bullet.id = `${Date.now()}_${Math.random()}`;
        
        // Set game reference for animation support
        bullet.game = this;
        
        // Apply special bullet properties
        if (bulletData.type === 'missile') {
            // Boss missile bullets
            bullet.spriteName = 'seek_missile';
            bullet.sprite = this.assetLoader.getImage('seek_missile'); // Load seek-missile.png
            bullet.explosive = true;
            bullet.explosionRadius = bulletData.explosionRadius || 80;
            bullet.explosionType = bulletData.explosionType || 'flame';
            bullet.size = new Vector2D(16, 16); // Bigger missile bullet
            bullet.color = '#ff8800'; // Orange missile
        } else if (bulletData.type === 'fireball') {
            // Flame enemy bullets - bigger fire balls
            bullet.size = new Vector2D(12, 12); // Bigger than normal
            bullet.color = '#ff4400'; // Bright orange-red
            bullet.explosive = false;
            bullet.damage = bulletData.damage || 1;
        }
        // Note: Flamethrower enemies no longer create bullets - they use flame streams
        
        // Set the active bullet reference for the owner
        if (bulletData.owner) {
            bulletData.owner.activeBullet = bullet;
        }
        
        this.bullets.push(bullet);
        this.renderSystem.addEntity(bullet);
        this.collisionSystem.addEntity(bullet);
        
        // Send bullet to network if in multiplayer
        if (this.isMultiplayer && this.networkManager && bulletData.owner === this.players[0]) {
            this.networkManager.sendBulletFired(bullet);
        }
        
        // Play appropriate shooting sound
        if (bulletData.type === 'flamethrower') {
            this.soundManager.playSound('flamethrower', 0.6);
        } else {
            this.soundManager.playSound('shoot', 0.3);
        }
    }

    createBulletFromNetwork(data) {
        // Don't create bullets from our own player
        if (data.playerId === this.networkManager.myPlayerId) return;
        
        const bullet = new Bullet(
            data.x,
            data.y,
            data.direction,
            data.speed,
            data.damage,
            null // No owner for network bullets to prevent collision with remote player
        );
        
        bullet.isNetworkBullet = true;
        bullet.networkPlayerId = data.playerId;
        bullet.collisionLayer = 'playerBullet'; // Same as player bullets
        bullet.game = this;
        
        this.bullets.push(bullet);
        this.renderSystem.addEntity(bullet);
        this.collisionSystem.addEntity(bullet);
        
        // Play sound effect
        this.soundManager.playSound('shoot', 0.3);
    }

    handleMenuInput() {
        // Handle menu navigation with keyboard
        if (this.inputSystem.isUpPressed()) {
            this.selectedMenuItem = Math.max(0, this.selectedMenuItem - 1);
        }
        if (this.inputSystem.isDownPressed()) {
            this.selectedMenuItem = Math.min(this.menuItems.length - 1, this.selectedMenuItem + 1);
        }
        
        // Handle menu selection with keyboard
        if (this.inputSystem.isFirePressed() || this.inputSystem.isEnterPressed()) {
            const selectedItem = this.menuItems[this.selectedMenuItem];
            this.handleMenuAction(selectedItem.action);
        }
        
        // Handle touch/mouse menu interaction
        this.handleMenuTouchInput();
    }
    
    handleMenuTouchInput() {
        // Check if there's a click/touch event on the canvas
        const canvas = this.canvas;
        
        // Add click event listener for menu (if not already added)
        if (!this.menuClickHandlerAdded) {
            this.menuClickHandlerAdded = true;
            
            const handleCanvasClick = (e) => {
                if (this.gameState !== 'menu') return;
                
                e.preventDefault();
                
                // Get click position relative to canvas
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                
                // Check which menu item was clicked
                this.menuItems.forEach((item, index) => {
                    const itemY = 300 + index * 60;
                    const itemHeight = 40;
                    
                    if (y >= itemY - itemHeight/2 && y <= itemY + itemHeight/2) {
                        this.selectedMenuItem = index;
                        this.handleMenuAction(item.action);
                    }
                });
            };
            
            // Add both click and touch events
            canvas.addEventListener('click', handleCanvasClick);
            canvas.addEventListener('touchend', (e) => {
                if (e.touches.length === 0 && e.changedTouches.length > 0) {
                    // Use the last touch position
                    const touch = e.changedTouches[0];
                    const fakeEvent = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        preventDefault: () => e.preventDefault()
                    };
                    handleCanvasClick(fakeEvent);
                }
            });
        }
    }

    handleMenuAction(action) {
        // Play selection sound
        this.soundManager.playSound('game_start', 0.5);
        
        switch (action) {
            case 'start1player':
                this.activePlayerCount = 1;
                this.startGame();
                break;
            case 'multiplayer':
                this.networkManager.showMultiplayerMenu();
                break;
            case 'options':
                this.gameState = 'options';
                this.selectedOptionItem = 0;
                break;
        }
    }

    handleOptionsInput() {
        // Handle options navigation with keyboard
        if (this.inputSystem.isUpPressed()) {
            this.selectedOptionItem = Math.max(0, this.selectedOptionItem - 1);
        }
        if (this.inputSystem.isDownPressed()) {
            this.selectedOptionItem = Math.min(this.optionItems.length - 1, this.selectedOptionItem + 1);
        }
        
        const selectedOption = this.optionItems[this.selectedOptionItem];
        
        // Handle volume slider adjustments
        if (selectedOption.type === 'slider') {
            if (this.inputSystem.isLeftPressed()) {
                selectedOption.value = Math.max(selectedOption.min, selectedOption.value - 5);
                this.applyOptionChange(selectedOption.action, selectedOption.value);
            }
            if (this.inputSystem.isRightPressed()) {
                selectedOption.value = Math.min(selectedOption.max, selectedOption.value + 5);
                this.applyOptionChange(selectedOption.action, selectedOption.value);
            }
        }
        
        // Handle button selection with keyboard
        if (this.inputSystem.isFirePressed() || this.inputSystem.isEnterPressed()) {
            this.handleOptionAction(selectedOption.action);
        }
        
        // ESC to go back to menu
        if (this.inputSystem.isEscapePressed()) {
            this.gameState = 'menu';
        }
        
        // Handle touch/mouse options interaction
        this.handleOptionsTouchInput();
    }
    
    handleOptionsTouchInput() {
        // Check if there's a click/touch event on the canvas for options
        const canvas = this.canvas;
        
        // Add click event listener for options (if not already added)
        if (!this.optionsClickHandlerAdded) {
            this.optionsClickHandlerAdded = true;
            
            const handleOptionsClick = (e) => {
                if (this.gameState !== 'options') return;
                
                e.preventDefault();
                
                // Get click position relative to canvas
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                
                // Check which option item was clicked
                this.optionItems.forEach((item, index) => {
                    const itemY = 220 + index * 80;
                    const itemHeight = 50;
                    
                    if (y >= itemY - itemHeight/2 && y <= itemY + itemHeight/2) {
                        this.selectedOptionItem = index;
                        
                        if (item.type === 'slider') {
                            // Handle slider clicks - adjust value based on X position
                            const sliderX = 280;
                            const sliderWidth = 300;
                            
                            if (x >= sliderX && x <= sliderX + sliderWidth) {
                                const percentage = (x - sliderX) / sliderWidth;
                                item.value = Math.round(percentage * item.max);
                                this.applyOptionChange(item.action, item.value);
                            }
                        } else {
                            // Handle button clicks
                            this.handleOptionAction(item.action);
                        }
                    }
                });
            };
            
            // Add touch event handlers to the existing click handler
            const existingClickHandler = canvas.onclick;
            canvas.addEventListener('click', handleOptionsClick);
            canvas.addEventListener('touchend', (e) => {
                if (e.touches.length === 0 && e.changedTouches.length > 0) {
                    const touch = e.changedTouches[0];
                    const fakeEvent = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        preventDefault: () => e.preventDefault()
                    };
                    handleOptionsClick(fakeEvent);
                }
            });
        }
    }

    applyOptionChange(action, value) {
        const volume = value / 100; // Convert percentage to 0-1 range
        
        switch (action) {
            case 'bgmVolume':
                this.soundManager.setMusicVolume(volume);
                console.log(`BGM Volume: ${value}% - Music volume updated`);
                break;
            case 'sfxVolume':
                this.soundManager.setSFXVolume(volume);
                // Play a test sound
                this.soundManager.playSound('shoot', volume);
                console.log(`SFX Volume: ${value}%`);
                break;
        }
    }

    handleOptionAction(action) {
        switch (action) {
            case 'backtomenu':
                this.gameState = 'menu';
                this.soundManager.playSound('game_start', 0.5);
                break;
        }
    }

    handleGameOverInput() {
        // Handle restart with keyboard
        if (this.inputSystem.isFirePressed()) {
            this.restartGame();
        }
        
        // Handle return to menu with keyboard
        if (this.inputSystem.isKeyJustPressed(['Escape'])) {
            this.returnToMenu();
        }
        
        // Handle touch/mouse game over interaction
        this.handleGameOverTouchInput();
    }
    
    handleGameOverTouchInput() {
        // Check if there's a click/touch event on the canvas for game over
        const canvas = this.canvas;
        
        // Add click event listener for game over (if not already added)
        if (!this.gameOverClickHandlerAdded) {
            this.gameOverClickHandlerAdded = true;
            
            const handleGameOverClick = (e) => {
                if (this.gameState !== 'gameOver') return;
                
                e.preventDefault();
                
                // Get click position relative to canvas
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                
                // Define clickable areas for game over screen
                const centerX = this.canvas.width / 2;
                const restartButtonY = this.canvas.height / 2 + 80;
                const menuButtonY = this.canvas.height / 2 + 130;
                const buttonWidth = 300;
                const buttonHeight = 40;
                
                // Check restart button click
                if (x >= centerX - buttonWidth/2 && x <= centerX + buttonWidth/2 &&
                    y >= restartButtonY - buttonHeight/2 && y <= restartButtonY + buttonHeight/2) {
                    this.restartGame();
                }
                
                // Check menu button click
                if (x >= centerX - buttonWidth/2 && x <= centerX + buttonWidth/2 &&
                    y >= menuButtonY - buttonHeight/2 && y <= menuButtonY + buttonHeight/2) {
                    this.returnToMenu();
                }
                
                // Also allow clicking anywhere to restart (for easier touch)
                if (y > this.canvas.height / 2 + 50) {
                    this.restartGame();
                }
            };
            
            // Add touch event handlers
            canvas.addEventListener('click', handleGameOverClick);
            canvas.addEventListener('touchend', (e) => {
                if (e.touches.length === 0 && e.changedTouches.length > 0) {
                    const touch = e.changedTouches[0];
                    const fakeEvent = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        preventDefault: () => e.preventDefault()
                    };
                    handleGameOverClick(fakeEvent);
                }
            });
        }
    }

    updateExplosionEffects(deltaTime) {
        // Update explosion effects
        this.explosionEffects = this.explosionEffects.filter(effect => {
            effect.lifetime -= deltaTime;
            effect.scale += deltaTime * 2; // Grow over time
            effect.alpha = Math.max(0, effect.lifetime / effect.maxLifetime);
            return effect.lifetime > 0;
        });
    }

    createExplosionEffect(x, y, type = 'destroy') {
        const effect = {
            x: x,
            y: y,
            type: type,
            lifetime: 0.5, // 0.5 seconds
            maxLifetime: 0.5,
            scale: 0.5,
            alpha: 1.0
        };
        this.explosionEffects.push(effect);
        
        // Play explosion sound
        this.soundManager.playSound('explode', 0.4);
    }

    createExplosion(x, y, type = 'effect_explode', scale = 1.0) {
        const effect = {
            x: x,
            y: y,
            type: type,
            lifetime: 0.6, // 0.6 seconds for bigger explosions
            maxLifetime: 0.6,
            scale: scale,
            alpha: 1.0
        };
        this.explosionEffects.push(effect);
        
        // Play explosion sound
        this.soundManager.playSound('explode', 0.5);
    }

    updateEnemySpawning(deltaTime) {
        this.enemySpawnTimer += deltaTime * 1000;
        
        // Don't spawn regular enemies during boss battle phase (boss will spawn via spawnEnemyAt logic)
        if (this.bossBattlePhase && this.enemies.length > 0) {
            return; // Boss is alive, don't spawn more
        }
        
        // Keep spawning enemies until we reach the kill limit
        if (this.enemySpawnTimer >= this.enemySpawnDelay && 
            this.enemies.length < this.maxEnemies &&
            this.totalEnemiesKilled < this.enemiesNeededToWin) {
            
            // Use predetermined spawn points first, then random
            if (this.enemySpawnPoints && this.currentSpawnIndex < this.enemySpawnPoints.length) {
                const spawnPoint = this.enemySpawnPoints[this.currentSpawnIndex];
                this.spawnEnemyAt(spawnPoint.x, spawnPoint.y);
                this.currentSpawnIndex++;
            } else {
                // Random spawn after initial points are used
                this.spawnRandomEnemy();
            }
            this.enemySpawnTimer = 0;
        }
    }

    spawnRandomEnemy() {
        // Random spawn position around the edges
        const spawnPositions = [
            { x: 150, y: 150 }, { x: 300, y: 150 }, { x: 450, y: 150 }, { x: 600, y: 150 }, // Top
            { x: 150, y: 450 }, { x: 600, y: 450 }, // Bottom corners
            { x: 150, y: 300 }, { x: 600, y: 300 }  // Sides
        ];
        
        const randomPos = spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
        this.spawnEnemyAt(randomPos.x, randomPos.y);
    }

    checkGameConditions() {
        // Check if all players are dead
        const alivePlayers = this.players.filter(player => !player.isGameOver());
        if (alivePlayers.length === 0) {
            this.gameOver('All Players Defeated');
            return;
        }
        
        // Check if we've killed enough enemies to win the stage
        if (this.totalEnemiesKilled >= this.enemiesNeededToWin) {
            this.nextStage();
        }
    }

    render() {
        // Fixed camera - no movement, show full stage
        this.renderSystem.camera.x = 0;
        this.renderSystem.camera.y = 0;
        
        if (this.gameState === 'menu') {
            this.renderMenu();
            return;
        }
        
        if (this.gameState === 'options') {
            this.renderOptions();
            return;
        }
        
        // Render everything
        this.renderSystem.render();
        
        // Render remote players
        this.renderRemotePlayers();
        
        // Render explosion effects
        this.renderExplosionEffects();
        
        // Render debug overlay
        const allEntities = [...this.players, ...this.enemies, ...this.bullets, ...this.walls, ...this.cars, ...this.powerUps];
        this.debugSystem.render(this.ctx, allEntities, this.renderSystem.camera);
        
        // Render game state specific overlays
        if (this.gameState === 'paused') {
            this.renderPauseScreen();
        } else if (this.gameState === 'gameOver') {
            this.renderGameOverScreen();
        }
    }

    renderRemotePlayers() {
        const now = Date.now();
        
        this.remotePlayers.forEach((player, playerId) => {
            // Skip if player is not alive or respawning
            if (!player.alive || player.respawning) return;
            
            // Skip if data is stale (no update for 1 second)
            if (now - player.lastUpdate > 1000) return;
            
            this.ctx.save();
            
            // Draw tank at position with proper rotation
            this.ctx.translate(player.x + 16, player.y + 16); // Center of 32x32 tank
            this.ctx.rotate(player.rotation);
            
            // Use different sprites for remote players
            const spriteNames = ['player2', 'player3'];
            const spriteIndex = Math.abs(this.hashCode(playerId)) % spriteNames.length;
            const sprite = this.assetLoader.getImage(spriteNames[spriteIndex]);
            
            if (sprite) {
                this.ctx.drawImage(sprite, -16, -16, 32, 32);
            } else {
                // Fallback colored square
                this.ctx.fillStyle = '#00ff88';
                this.ctx.fillRect(-16, -16, 32, 32);
            }
            
            this.ctx.restore();
            
            // Draw health bar
            const healthPercent = player.health / 100;
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(player.x + 6, player.y - 10, 20, 3);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(player.x + 6, player.y - 10, 20 * healthPercent, 3);
            
            // Draw player name
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`P${playerId.slice(-3)}`, player.x + 16, player.y - 15);
        });
    }

    // Helper function for consistent hashing
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    updateOrCreateRemotePlayer(playerId, data) {
        if (!this.remotePlayers.has(playerId)) {
            // Create a visual representation only (not a full Player entity)
            this.remotePlayers.set(playerId, {
                id: playerId,
                x: data.x,
                y: data.y,
                direction: data.direction || 0,
                facing: data.facing || 0,
                rotation: data.rotation || 0,
                health: data.health || 100,
                lives: data.lives || 4,
                alive: data.alive,
                respawning: data.respawning,
                lastUpdate: Date.now(),
                sprite: null // Will be set during rendering
            });
        } else {
            const player = this.remotePlayers.get(playerId);
            player.x = data.x;
            player.y = data.y;
            player.direction = data.direction || player.direction;
            player.facing = data.facing || player.facing;
            player.rotation = data.rotation || player.rotation;
            player.health = data.health || player.health;
            player.lives = data.lives || player.lives;
            player.alive = data.alive;
            player.respawning = data.respawning;
            player.lastUpdate = Date.now();
        }
    }

    renderMenu() {
        // Clear screen
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game name/logo
        const gameNameImg = this.assetLoader.getImage('gamename');
        if (gameNameImg) {
            const imgWidth = 400;
            const imgHeight = 100;
            const x = (this.canvas.width - imgWidth) / 2;
            const y = 100;
            this.ctx.drawImage(gameNameImg, x, y, imgWidth, imgHeight);
        }
        
        // Draw menu items
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        
        this.menuItems.forEach((item, index) => {
            const y = 300 + index * 60;
            
            if (index === this.selectedMenuItem) {
                this.ctx.fillStyle = '#ffff00'; // Yellow for selected
                this.ctx.fillRect(this.canvas.width / 2 - 200, y - 25, 400, 40);
                this.ctx.fillStyle = '#000000';
            } else {
                this.ctx.fillStyle = '#ffffff';
            }
            
            this.ctx.fillText(item.text, this.canvas.width / 2, y);
        });
        
        // Instructions
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillText('Use Arrow Keys to navigate, Enter or Space to select', this.canvas.width / 2, this.canvas.height - 50);
    }

    renderOptions() {
        // Clear screen
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw title
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('OPTIONS', this.canvas.width / 2, 120);
        
        // Draw option items
        this.ctx.font = '24px Arial';
        
        this.optionItems.forEach((item, index) => {
            const y = 220 + index * 80;
            const isSelected = index === this.selectedOptionItem;
            
            if (isSelected) {
                this.ctx.fillStyle = '#ffff00'; // Yellow background for selected
                this.ctx.fillRect(50, y - 30, this.canvas.width - 100, 50);
                this.ctx.fillStyle = '#000000';
            } else {
                this.ctx.fillStyle = '#ffffff';
            }
            
            if (item.type === 'slider') {
                // Draw slider label
                this.ctx.textAlign = 'left';
                this.ctx.fillText(item.text + ':', 80, y);
                
                // Draw slider bar
                const sliderX = 280;
                const sliderWidth = 300;
                const sliderHeight = 20;
                
                // Background bar
                this.ctx.fillStyle = isSelected ? '#666666' : '#333333';
                this.ctx.fillRect(sliderX, y - 10, sliderWidth, sliderHeight);
                
                // Fill bar
                const fillWidth = (item.value / item.max) * sliderWidth;
                this.ctx.fillStyle = isSelected ? '#00ff00' : '#0088ff';
                this.ctx.fillRect(sliderX, y - 10, fillWidth, sliderHeight);
                
                // Value text
                this.ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
                this.ctx.textAlign = 'right';
                this.ctx.fillText(item.value + '%', this.canvas.width - 80, y);
                
                if (isSelected) {
                    // Instructions for sliders
                    this.ctx.font = '14px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillStyle = '#666666';
                    this.ctx.fillText('← → to adjust', this.canvas.width / 2, y + 25);
                    this.ctx.font = '24px Arial';
                }
            } else {
                // Regular button
                this.ctx.textAlign = 'center';
                this.ctx.fillText(item.text, this.canvas.width / 2, y);
            }
        });
        
        // Instructions
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Arrow Keys: Navigate  |  Left/Right: Adjust Volume  |  Enter: Select  |  ESC: Back', this.canvas.width / 2, this.canvas.height - 30);
    }

    renderExplosionEffects() {
        this.explosionEffects.forEach(effect => {
            const img = this.assetLoader.getImage('effect_' + effect.type);
            if (img) {
                this.ctx.save();
                this.ctx.globalAlpha = effect.alpha;
                this.ctx.translate(effect.x, effect.y);
                this.ctx.scale(effect.scale, effect.scale);
                
                const size = 32;
                this.ctx.drawImage(img, -size/2, -size/2, size, size);
                
                this.ctx.restore();
            }
        });
    }

    renderLoadingScreen(progress) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // Progress bar
        const barWidth = 300;
        const barHeight = 20;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = this.canvas.height / 2;
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(barX, barY, (progress / 100) * barWidth, barHeight);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`${Math.round(progress)}%`, this.canvas.width / 2, barY + barHeight + 30);
    }

    renderPauseScreen() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Press P or Escape to resume', this.canvas.width / 2, this.canvas.height / 2 + 50);
        this.ctx.restore();
    }

    renderGameOverScreen() {
        // Dark overlay
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Game Over title
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = 'bold 64px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 100);
        
        // Stats
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '32px Arial';
        this.ctx.fillText(`Final Score: ${this.gameScore}`, this.canvas.width / 2, this.canvas.height / 2 - 20);
        this.ctx.fillText(`Stage Reached: ${this.stage}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.ctx.fillText(`Enemies Defeated: ${this.totalEnemiesKilled}`, this.canvas.width / 2, this.canvas.height / 2 + 60);
        
        // Instructions
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillText('Press SPACE to restart', this.canvas.width / 2, this.canvas.height / 2 + 120);
        this.ctx.fillText('Press ESC to return to menu', this.canvas.width / 2, this.canvas.height / 2 + 160);
        
        this.ctx.restore();
    }

    updateUI() {
        // Update lives display
        const livesElement = document.getElementById('lives');
        if (livesElement && this.players[0]) {
            livesElement.textContent = this.players[0].lives;
        }
        
        // Update score display
        const scoreElement = document.getElementById('score');
        if (scoreElement && this.players[0]) {
            scoreElement.textContent = this.players[0].score;
        }
        
        // Update stage display
        const stageElement = document.getElementById('stage');
        if (stageElement) {
            stageElement.textContent = this.stage;
        }
        
        // Update enemy count - show kills/needed and remaining
        const enemyCountElement = document.getElementById('enemyCount');
        if (enemyCountElement) {
            const remaining = this.enemiesNeededToWin - this.totalEnemiesKilled;
            enemyCountElement.textContent = `Defeated: ${this.totalEnemiesKilled}/${this.enemiesNeededToWin} | Remaining: ${remaining}`;
        }
    }

    cleanup() {
        // Remove dead entities and update systems
        const prevBulletCount = this.bullets.length;
        const prevEnemyCount = this.enemies.length;
        
        // Filter out dead entities
        // Don't remove players who are respawning - only remove if truly game over
        this.players = this.players.filter(player => {
            if (player.isGameOver()) {
                // Player is truly dead (no lives left)
                this.collisionSystem.removeEntity(player);
                this.renderSystem.removeEntity(player);
                return false;
            }
            return true;
        });
        
        this.enemies = this.enemies.filter(enemy => {
            if (!enemy.alive) {
                // Create explosion effect when enemy dies
                this.createExplosionEffect(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 'destroy');
                
                this.collisionSystem.removeEntity(enemy);
                this.renderSystem.removeEntity(enemy);
                this.totalEnemiesKilled++;
                
                // Send network event
                if (this.isMultiplayer && this.networkManager) {
                    this.networkManager.sendEnemyKilled(enemy.id);
                }
                
                return false;
            }
            return true;
        });
        
        this.bullets = this.bullets.filter(bullet => {
            if (!bullet.alive) {
                // Clear the active bullet reference from the owner
                if (bullet.owner && bullet.owner.activeBullet === bullet) {
                    bullet.owner.activeBullet = null;
                }
                
                this.collisionSystem.removeEntity(bullet);
                this.renderSystem.removeEntity(bullet);
                return false;
            }
            return true;
        });
        
        this.walls = this.walls.filter(wall => {
            if (!wall.alive) {
                this.collisionSystem.removeEntity(wall);
                this.renderSystem.removeEntity(wall);
                return false;
            }
            return true;
        });
        
        this.cars = this.cars.filter(car => {
            if (!car.alive) {
                // Create explosion effect when car is destroyed
                this.createExplosionEffect(car.x + car.width/2, car.y + car.height/2, 'destroy');
                
                this.collisionSystem.removeEntity(car);
                this.renderSystem.removeEntity(car);
                
                // Send network event
                if (this.isMultiplayer && this.networkManager) {
                    this.networkManager.sendDestructibleDestroyed(car.id, 'car');
                }
                
                return false;
            }
            return true;
        });
        
        this.powerUps = this.powerUps.filter(powerUp => {
            if (!powerUp.alive) {
                this.collisionSystem.removeEntity(powerUp);
                this.renderSystem.removeEntity(powerUp);
                return false;
            }
            return true;
        });
        
        // Debug: Log cleanup (much less frequent to improve performance)
        if (prevBulletCount !== this.bullets.length && this.bullets.length % 50 === 0) {
            console.log(`Cleaned up ${prevBulletCount - this.bullets.length} bullets, ${this.bullets.length} remaining`);
        }
        if (prevEnemyCount !== this.enemies.length) {
            console.log(`Enemies killed: ${prevEnemyCount - this.enemies.length}, Total killed: ${this.totalEnemiesKilled}/${this.enemiesNeededToWin}`);
        }
        
        // Clean up render system
        this.renderSystem.cleanup();
    }

    // Game state management
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            console.log('Game paused');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            console.log('Game resumed');
        }
        this.updateDebugControlsVisibility();
    }

    gameOver(reason = 'Game Over') {
        console.log('Game Over:', reason);
        this.gameState = 'gameOver';
        this.updateDebugControlsVisibility();
        
        // Calculate final score
        this.gameScore = this.players.reduce((total, player) => total + player.score, 0);
        
        // Update final score display
        const finalScoreElement = document.getElementById('finalScore');
        if (finalScoreElement) {
            finalScoreElement.textContent = this.gameScore;
        }
        
        // Show game over screen
        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen) {
            gameOverScreen.classList.remove('hidden');
        }
        
        // Set up restart button
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.onclick = () => this.restartGame();
        }
    }

    restartGame() {
        // Hide game over screen
        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen) {
            gameOverScreen.classList.add('hidden');
        }
        
        // Reset game state
        this.gameState = 'playing';
        this.resetGame();
    }

    returnToMenu() {
        // Stop stage music and start intro music
        this.soundManager.stopMusic();
        this.soundManager.playMusic('game_intro', 0.5, true);
        
        // Reset to menu state
        this.gameState = 'menu';
        this.selectedMenuItem = 0;
        
        // Clear game entities
        this.players = [];
        this.enemies = [];
        this.bullets = [];
        this.walls = [];
        this.cars = [];
        this.powerUps = [];
        this.explosionEffects = [];
        
        console.log('Returned to main menu');
    }

    nextStage() {
        this.stage++;
        console.log(`Advancing to stage ${this.stage}`);
        
        // Reset stage-specific variables
        this.totalEnemiesKilled = 0;
        this.bossBattlePhase = false; // Reset boss battle phase for new stage
        
        // Keep maxEnemies at 4 for multiple enemy spawning
        this.maxEnemies = 4;
        this.enemySpawnDelay = Math.max(2000, 5000 - (this.stage * 500));
        
        // Clear remaining enemies
        this.enemies.forEach(enemy => enemy.destroy());
        this.enemies = [];
        
        // Clear bullets
        this.bullets.forEach(bullet => bullet.destroy());
        this.bullets = [];
        
        // Clear current stage objects properly
        this.cars.forEach(car => {
            this.renderSystem.removeEntity(car);
            this.collisionSystem.removeEntity(car);
        });
        this.cars = [];
        
        this.walls.forEach(wall => {
            this.collisionSystem.removeEntity(wall);
        });
        this.walls = [];
        
        // Setup new stage with error handling
        try {
            this.setupStage(this.stage);
        } catch (error) {
            console.error(`Error setting up stage ${this.stage}:`, error);
            // Fallback to city stage if there's an error
            this.setupCityStage();
        }
        
        // Spawn new enemies
        this.enemySpawnTimer = 0;
        
        this.updateUI();
    }

    setupStage(stageNumber) {
        console.log(`Setting up stage ${stageNumber}`);
        
        try {
            switch (stageNumber) {
                case 1:
                    this.setupCityStage();
                    break;
                case 2:
                    this.setupIslandStage();
                    break;
                default:
                    // Future stages - fallback to city for now
                    console.log(`Stage ${stageNumber} not implemented, using city stage`);
                    this.setupCityStage();
                    break;
            }
        } catch (error) {
            console.error(`Error in stage ${stageNumber} setup:`, error);
            this.setupCityStage(); // Safe fallback
        }
    }

    setupCityStage() {
        // Original city stage setup
        console.log('Setting up City Stage');
        this.renderSystem.setBackground('stage_city');
        this.createWalls();
        this.createCars();
    }

    setupIslandStage() {
        console.log('Setting up Island Stage with Barrels');
        
        // Set island background (correct asset name)
        this.renderSystem.setBackground('stage_island');
        
        // Create boundary walls (invisible water collision) - ready for custom coordinates
        this.createIslandWalls();
        
        // Create barrels instead of cars using exact car positions
        this.createBarrels();
        
        console.log('Island stage set up with barrels and boundary walls');
    }

    createIslandWalls() {
        // Create invisible water boundaries - basic boundary walls
        const wallThickness = 8;
        
        // Top wall
        this.walls.push(new Entity(110, 94, 579, wallThickness));
        // Right wall  
        this.walls.push(new Entity(689, 100, wallThickness, 400));
        // Bottom wall
        this.walls.push(new Entity(100, 500, 589, wallThickness));
        // Left wall
        this.walls.push(new Entity(100, 102, wallThickness, 398));
        
        // Add walls to collision system
        this.walls.forEach(wall => {
            wall.collisionLayer = 'wall';
            wall.visible = false; // Invisible water collision
            this.collisionSystem.addEntity(wall);
        });
    }

    createFishDecoration() {
        // Create big fish in the middle - non-destructible decoration (doubled size)
        const fishX = 400 - 64; // Center x minus half width (doubled)
        const fishY = 300 - 64; // Center y minus half height (doubled)
        
        const fish = new Entity(fishX, fishY, 128, 128); // Doubled from 64x64 to 128x128
        fish.sprite = this.assetLoader.getImage('wall_fish');
        fish.collisionLayer = 'decoration';
        fish.destructible = false;
        fish.visible = true;
        
        this.cars.push(fish); // Add to cars array for rendering
        this.renderSystem.addEntity(fish);
        // Don't add to collision system - it's just decoration
    }

    createDestructibleBoxes() {
        // Create rows of destructible boxes
        const boxes = [];
        const boxSize = 32;
        const spacing = 40;
        
        // Create 4 rows of 5 boxes each
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                const x = 200 + (col * spacing);
                const y = 150 + (row * spacing);
                
                const box = new Entity(x, y, boxSize, boxSize);
                box.sprite = this.assetLoader.getImage('wall_box');
                box.health = 1;
                box.maxHealth = 1;
                box.destructible = true;
                box.collisionLayer = 'destructible';
                box.alive = true;
                
                boxes.push(box);
                this.renderSystem.addEntity(box);
                this.collisionSystem.addEntity(box);
            }
        }
        
        // Add boxes to cars array for destruction handling
        this.cars.push(...boxes);
        console.log(`Created ${boxes.length} destructible boxes`);
    }

    createBarrels() {
        // Use exact same positions as cars for perfect placement
        const barrelPositions = [
            // Column 1: x=226/225, y from 177 to 424 (6 barrels)
            { x: 226, y: 177 },
            { x: 226, y: 226 },
            { x: 226, y: 275 },
            { x: 226, y: 324 },
            { x: 226, y: 375 },
            { x: 225, y: 424 },
            
            // Column 2: x=358, y from 177 to 424 (6 barrels)
            { x: 358, y: 177 },
            { x: 358, y: 226 },
            { x: 358, y: 275 },
            { x: 358, y: 324 },
            { x: 358, y: 375 },
            { x: 358, y: 424 },
            
            // Column 3: x=494/490, y from 177 to 424 (6 barrels)
            { x: 494, y: 177 },
            { x: 494, y: 226 },
            { x: 494, y: 275 },
            { x: 494, y: 324 },
            { x: 494, y: 375 },
            { x: 490, y: 424 },
            
            // Column 4: x=623, y from 177 to 424 (6 barrels)
            { x: 623, y: 177 },
            { x: 623, y: 226 },
            { x: 623, y: 275 },
            { x: 623, y: 324 },
            { x: 623, y: 375 },
            { x: 623, y: 424 }
        ];
        
        // Create barrels at each specified position using same sizing as cars
        barrelPositions.forEach((pos, index) => {
            // Use same size as cars (28x22 pixels) for consistent gameplay
            const barrel = new Car(pos.x - 14, pos.y - 11, 28, 22);
            
            // Set barrel sprite
            barrel.sprite = this.assetLoader.getImage('wall_barrel');
            
            this.cars.push(barrel);
            this.renderSystem.addEntity(barrel);
            this.collisionSystem.addEntity(barrel);
        });
        
        console.log(`Created ${barrelPositions.length} barrels at exact car positions for island stage`);
    }

    // Effect system
    createEffect(type, position, options = {}) {
        return this.renderSystem.createEffect(type, position, options);
    }

    addScreenShake(intensity, duration) {
        this.renderSystem.addScreenShake(intensity, duration);
    }

    // Event handlers
    onBaseDestroyed(base) {
        console.log('Base destroyed!');
        // Game over will be handled in checkGameConditions
    }

    // Debug methods
    toggleDebug() {
        this.renderSystem.toggleDebug();
        window.DEBUG_MODE = this.renderSystem.showDebug;
    }
}
