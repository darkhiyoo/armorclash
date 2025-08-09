// Main entry point for Wildfire Tank Battle
let game = null;

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Wildfire Tank Battle - Starting initialization...');
    
    // Create and start the game
    game = new Game();
    
    // Set up global event listeners
    setupGlobalEvents();
    
    // Set up debug buttons
    setupDebugButtons();
    
    // Handle window resize
    setupResponsiveCanvas();
    
    console.log('Game initialization complete');
});

function setupGlobalEvents() {
    // Enable audio on first user interaction (both click and touch)
    let audioEnabled = false;
    const enableAudio = () => {
        if (!audioEnabled && game && game.soundManager) {
            audioEnabled = true;
            console.log('Audio context enabled by user interaction');
            // Try to play intro music now
            game.soundManager.playMusic('game_intro', 0.5, true);
            
            // Remove the listeners after first interaction
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('touchstart', enableAudio);
            document.removeEventListener('keydown', enableAudio);
        }
    };
    
    // Support both mouse and touch events
    document.addEventListener('click', enableAudio);
    document.addEventListener('touchstart', enableAudio);
    document.addEventListener('keydown', enableAudio);
    
    // Add global touch support for all clickable elements
    setupUniversalTouchSupport();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'F1':
                e.preventDefault();
                if (game) game.toggleDebug();
                break;
            case 'KeyR':
                if (e.ctrlKey && game && game.gameState === 'gameOver') {
                    e.preventDefault();
                    game.restartGame();
                }
                break;
            case 'Space':
                if (game && game.gameState === 'gameOver') {
                    e.preventDefault();
                    game.restartGame();
                }
                break;
        }
    });
    
    // No auto-pause on visibility change - only manual pause with P/ESC
    document.addEventListener('visibilitychange', () => {
        // Let user manually pause if needed - no auto-pause
        if (document.hidden) {
            console.log('Tab hidden - press P or ESC to pause if needed');
        } else {
            console.log('Tab visible');
        }
    });
    
    // Handle window focus/blur - no auto-pause, only manual pause with P/ESC
    window.addEventListener('blur', () => {
        // No auto-pause - let user manually pause with P or ESC if needed
        console.log('Window lost focus - press P or ESC to pause if needed');
    });
    
    // Don't auto-resume on focus - user must manually resume with P
    window.addEventListener('focus', () => {
        // Manual resume only - user presses P to resume
        console.log('Window focused');
    });
    
    // Prevent context menu on the game canvas
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
}

function setupUniversalTouchSupport() {
    // Add touch support to all buttons and clickable elements
    const clickableSelectors = [
        'button',
        '.mp-btn',
        '.debug-btn',
        '.room-input',
        '.copy-btn',
        '.touch-toggle-btn',
        'input[type="button"]',
        '[onclick]',
        '.clickable'
    ];
    
    clickableSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            // Ensure touch events work properly
            element.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent ghost clicks
                element.classList.add('touching');
            });
            
            element.addEventListener('touchend', (e) => {
                e.preventDefault();
                element.classList.remove('touching');
                // Trigger click event for touch
                element.click();
            });
            
            element.addEventListener('touchcancel', (e) => {
                element.classList.remove('touching');
            });
        });
    });
    
    // Add touch feedback styles
    const style = document.createElement('style');
    style.textContent = `
        .touching {
            transform: scale(0.95) !important;
            filter: brightness(1.2) !important;
            transition: all 0.1s !important;
        }
        
        /* Make all buttons more touch-friendly */
        button, .mp-btn, .debug-btn {
            min-height: 44px !important;
            min-width: 44px !important;
            touch-action: manipulation;
            -webkit-tap-highlight-color: rgba(0, 255, 255, 0.3);
        }
    `;
    document.head.appendChild(style);
}

function setupDebugButtons() {
    // Set up debug button event listeners
    
    // Stage control buttons
    const nextStageBtn = document.getElementById('nextStageBtn');
    const infiniteHealthBtn = document.getElementById('infiniteHealthBtn');
    
    // Enemy spawn buttons
    const spawnBasicBtn = document.getElementById('spawnBasicBtn');
    const spawnBossBtn = document.getElementById('spawnBossBtn');
    const spawnFlameBtn = document.getElementById('spawnFlameBtn');
    const spawnFlamethrowerBtn = document.getElementById('spawnFlamethrowerBtn');
    
    if (nextStageBtn) {
        nextStageBtn.addEventListener('click', () => {
            if (game && game.debugNextStage) {
                game.debugNextStage();
            }
        });
    }
    
    if (infiniteHealthBtn) {
        infiniteHealthBtn.addEventListener('click', () => {
            if (game && game.debugToggleInfiniteHealth) {
                game.debugToggleInfiniteHealth();
                // Update button text to show status
                const player = game.players && game.players[0];
                if (player && player.infiniteHealth) {
                    infiniteHealthBtn.textContent = 'HP: ON';
                    infiniteHealthBtn.style.background = '#006600';
                } else {
                    infiniteHealthBtn.textContent = 'Infinite HP';
                    infiniteHealthBtn.style.background = '#003300';
                }
            }
        });
    }
    
    // Enemy spawn button handlers
    if (spawnBasicBtn) {
        spawnBasicBtn.addEventListener('click', () => {
            if (game && game.debugSpawnEnemy) {
                game.debugSpawnEnemy('basic');
            }
        });
    }
    
    if (spawnBossBtn) {
        spawnBossBtn.addEventListener('click', () => {
            if (game && game.debugSpawnEnemy) {
                game.debugSpawnEnemy('boss');
            }
        });
    }
    
    if (spawnFlameBtn) {
        spawnFlameBtn.addEventListener('click', () => {
            if (game && game.debugSpawnEnemy) {
                game.debugSpawnEnemy('flame');
            }
        });
    }
    
    if (spawnFlamethrowerBtn) {
        spawnFlamethrowerBtn.addEventListener('click', () => {
            if (game && game.debugSpawnEnemy) {
                game.debugSpawnEnemy('flamethrower');
            }
        });
    }
    
    // Show/hide debug controls based on game state
    updateDebugControlsVisibility();
}

function updateDebugControlsVisibility() {
    const debugControls = document.getElementById('debugControls');
    const gameContainer = document.getElementById('gameContainer');
    
    if (game && game.gameState === 'playing') {
        gameContainer.classList.add('game-playing');
    } else {
        gameContainer.classList.remove('game-playing');
    }
    
    // Update visibility every second during gameplay
    if (game && game.gameState === 'playing') {
        setTimeout(updateDebugControlsVisibility, 1000);
    }
}

function setupResponsiveCanvas() {
    const canvas = document.getElementById('gameCanvas');
    const container = document.getElementById('gameContainer');
    
    if (!canvas || !container) return;
    
    // Set initial canvas size
    resizeCanvas();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        resizeCanvas();
    });
    
    // Handle orientation change on mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            resizeCanvas();
        }, 100);
    });
}

function resizeCanvas() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    const container = document.getElementById('gameContainer');
    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.85;
    
    // Maintain aspect ratio (4:3)
    const aspectRatio = 4 / 3;
    let newWidth = maxWidth;
    let newHeight = newWidth / aspectRatio;
    
    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * aspectRatio;
    }
    
    // Update canvas display size
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
    
    // Keep internal resolution fixed for consistency
    // canvas.width and canvas.height are set in HTML and should remain fixed
}

// Global utility functions
window.getGame = () => game;

// Development helpers
window.debugInfo = () => {
    if (!game) {
        console.log('Game not initialized');
        return;
    }
    
    console.log('=== Game Debug Info ===');
    console.log('Game State:', game.gameState);
    console.log('Stage:', game.stage);
    console.log('Players:', game.players.length);
    console.log('Enemies:', game.enemies.length);
    console.log('Bullets:', game.bullets.length);
    console.log('Walls:', game.walls.length);
    console.log('Game Time:', Math.round(game.gameTime));
    
    if (game.players[0]) {
        console.log('Player 1 - Lives:', game.players[0].lives, 'Score:', game.players[0].score);
    }
    
    if (game.base) {
        console.log('Base - Health:', game.base.health, 'Destroyed:', game.base.isDestroyed());
    }
    
    console.log('Input Devices:', game.inputSystem.getConnectedInputDevices());
    console.log('FPS:', game.renderSystem.fps);
};

// Cheat codes for testing (only in development)
window.cheat = {
    godMode: () => {
        if (game && game.players[0]) {
            game.players[0].invulnerable = true;
            game.players[0].invulnerabilityTime = 999999;
            console.log('God mode activated');
        }
    },
    
    addLives: (count = 5) => {
        if (game && game.players[0]) {
            game.players[0].lives += count;
            console.log(`Added ${count} lives`);
        }
    },
    
    killAllEnemies: () => {
        if (game) {
            game.enemies.forEach(enemy => enemy.destroy());
            console.log('All enemies destroyed');
        }
    },
    
    nextStage: () => {
        if (game) {
            game.nextStage();
            console.log('Advanced to next stage');
        }
    },
    
    restoreBase: () => {
        if (game && game.base) {
            game.base.restoreBase();
            console.log('Base restored');
        }
    }
};

// Error handling
window.addEventListener('error', (e) => {
    console.error('Game Error:', e.error);
    
    // Try to gracefully handle errors
    if (game) {
        game.isRunning = false;
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled Promise Rejection:', e.reason);
});

// Performance monitoring
let performanceMonitor = {
    frameCount: 0,
    lastCheck: Date.now(),
    
    update() {
        this.frameCount++;
        const now = Date.now();
        
        if (now - this.lastCheck >= 5000) { // Every 5 seconds
            const fps = (this.frameCount * 1000) / (now - this.lastCheck);
            
            if (fps < 30) {
                console.warn(`Low FPS detected: ${fps.toFixed(1)}`);
            }
            
            this.frameCount = 0;
            this.lastCheck = now;
        }
    }
};

// Unified Animation Loop - Single loop for entire game
function animate() {
    requestAnimationFrame(animate);
    
    // Update performance monitoring
    performanceMonitor.update();
    
    // Update the game if it exists and is running
    if (game && game.isRunning) {
        game.updateGame();
    }
}

// Start the unified animation loop
animate();

console.log('Wildfire Tank Battle - Main script loaded');
console.log('Controls:');
console.log('  Arrow Keys / WASD - Move');
console.log('  Space - Fire');
console.log('  P / Escape - Pause');
console.log('  F1 - Toggle Debug');
console.log('  Type debugInfo() in console for debug information');
console.log('  Type cheat.godMode() for god mode (development only)');
