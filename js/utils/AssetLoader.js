class AssetLoader {
    constructor() {
        this.images = {};
        this.sounds = {};
        this.loadedAssets = 0;
        this.totalAssets = 0;
        this.onProgress = null;
        this.onComplete = null;
    }

    loadImage(name, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images[name] = img;
                this.loadedAssets++;
                if (this.onProgress) {
                    this.onProgress(this.loadedAssets, this.totalAssets);
                }
                resolve(img);
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${path}`);
                // Create a placeholder colored rectangle
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 32;
                canvas.height = 32;
                
                // Different colors for different asset types
                let color = '#ff0000'; // Default red
                if (name.includes('player')) color = '#00ff00';
                else if (name.includes('enemy')) color = '#ff0000';
                else if (name.includes('base')) color = '#0000ff';
                else if (name.includes('stage')) color = '#666666';
                else if (name === 'car') color = '#ffff00'; // Yellow for cars
                
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, 32, 32);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(1, 1, 30, 30);
                
                // Add text label
                ctx.fillStyle = '#ffffff';
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(name.slice(0, 4), 16, 20);
                
                this.images[name] = canvas;
                this.loadedAssets++;
                if (this.onProgress) {
                    this.onProgress(this.loadedAssets, this.totalAssets);
                }
                resolve(canvas);
            };
            img.src = path;
        });
    }

    loadSound(name, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => {
                this.sounds[name] = audio;
                this.loadedAssets++;
                if (this.onProgress) {
                    this.onProgress(this.loadedAssets, this.totalAssets);
                }
                resolve(audio);
            };
            audio.onerror = () => {
                console.error(`Failed to load sound: ${path}`);
                // Create a silent audio placeholder
                this.sounds[name] = null;
                this.loadedAssets++;
                if (this.onProgress) {
                    this.onProgress(this.loadedAssets, this.totalAssets);
                }
                resolve(null);
            };
            audio.src = path;
        });
    }

    async loadAssets() {
        const assetsToLoad = [
            // Images
            { type: 'image', name: 'stage_city', path: 'data/stages/city.png' },
            { type: 'image', name: 'player1', path: 'data/sprits/tankp1.png' },
            { type: 'image', name: 'player2', path: 'data/sprits/tankp2.png' },
            { type: 'image', name: 'player3', path: 'data/sprits/tankp3.png' },
            { type: 'image', name: 'enemy1', path: 'data/sprits/ai1.png' },
            { type: 'image', name: 'enemy2', path: 'data/sprits/ai2.png' },
            { type: 'image', name: 'enemy3', path: 'data/sprits/ai3.png' },
            { type: 'image', name: 'enemy4', path: 'data/sprits/ai4.png' },
            { type: 'image', name: 'base', path: 'data/collisions/base.png' },
            { type: 'image', name: 'base_destroyed', path: 'data/collisions/base-x.png' },
            { type: 'image', name: 'wall_brick', path: 'data/collisions/brick.png' },
            { type: 'image', name: 'wall_water', path: 'data/collisions/water.png' },
            { type: 'image', name: 'wall_barrel', path: 'data/collisions/barrel.png' },
            { type: 'image', name: 'wall_box', path: 'data/collisions/box.png' },
            { type: 'image', name: 'wall_fish', path: 'data/collisions/fish.png' },
            { type: 'image', name: 'car', path: 'data/collisions/car.png' },
            
            // Stages
            { type: 'image', name: 'stage_city', path: 'data/stages/city.png' },
            { type: 'image', name: 'stage_island', path: 'data/stages/island.png' },
            
            // Menu and UI
            { type: 'image', name: 'gamename', path: 'data/collisions/gamename.png' },
            
            // Power-ups
            { type: 'image', name: 'power_flame', path: 'data/powers/flame.png' },
            { type: 'image', name: 'power_freeze', path: 'data/powers/freeze.png' },
            { type: 'image', name: 'power_missile', path: 'data/powers/missile.png' },
            { type: 'image', name: 'power_star', path: 'data/powers/star.png' },
            { type: 'image', name: 'seek_missile', path: 'data/powers/seek-missile.png' },
            { type: 'image', name: 'flame_explosion', path: 'data/powers/flam6.png' },
            { type: 'image', name: 'flame1', path: 'data/powers/flam1.png' },
            { type: 'image', name: 'flame2', path: 'data/powers/flam2.png' },
            { type: 'image', name: 'flame3', path: 'data/powers/flam3.png' },
            { type: 'image', name: 'flame4', path: 'data/powers/flam4.png' },
            { type: 'image', name: 'flame5', path: 'data/powers/flam5.png' },
            { type: 'image', name: 'flame6', path: 'data/powers/flam6.png' },
            { type: 'image', name: 'flame7', path: 'data/powers/flam7.png' },
            { type: 'image', name: 'flame8', path: 'data/powers/flam8.png' },
            
            // Effects
            { type: 'image', name: 'effect_explode', path: 'data/sfx/destroy2-x.png' },
            { type: 'image', name: 'effect_destroy', path: 'data/sfx/destroy.png' },
            { type: 'image', name: 'effect_burning1', path: 'data/sfx/burning1.png' },
            { type: 'image', name: 'effect_burning2', path: 'data/sfx/burning2.png' },
            
            // Sounds
            { type: 'sound', name: 'shoot', path: 'data/sfx/canon.mp3' },
            { type: 'sound', name: 'explode', path: 'data/sfx/explode.mp3' },
            { type: 'sound', name: 'rocket_sound', path: 'data/sfx/rocket-sound.mp3' },
            { type: 'sound', name: 'flamethrower', path: 'data/sfx/flamethrower.mp3' },
            { type: 'sound', name: 'freezethrower', path: 'data/sfx/freezethrower.mp3' },
            { type: 'sound', name: 'music_stage', path: 'data/sfx/music1.mp3' },
            { type: 'sound', name: 'music_stage2', path: 'data/sfx/music2.mp3' },
            { type: 'sound', name: 'bossfight', path: 'data/sfx/bossfight1.mp3' },
            { type: 'sound', name: 'game_start', path: 'data/sfx/game-start.mp3' },
            { type: 'sound', name: 'game_intro', path: 'data/sfx/game-intro.mp3' }
        ];

        this.totalAssets = assetsToLoad.length;
        this.loadedAssets = 0;

        const loadPromises = assetsToLoad.map(asset => {
            if (asset.type === 'image') {
                return this.loadImage(asset.name, asset.path);
            } else if (asset.type === 'sound') {
                return this.loadSound(asset.name, asset.path);
            }
        });

        try {
            await Promise.all(loadPromises);
            if (this.onComplete) {
                this.onComplete();
            }
            console.log('All assets loaded successfully');
        } catch (error) {
            console.error('Error loading assets:', error);
            if (this.onComplete) {
                this.onComplete();
            }
        }
    }

    getImage(name) {
        return this.images[name] || null;
    }

    getSound(name) {
        return this.sounds[name] || null;
    }

    playSound(name, volume = 1.0) {
        const sound = this.getSound(name);
        if (sound) {
            sound.volume = volume;
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Sound play failed:', e));
        }
    }

    setLoadingCallbacks(onProgress, onComplete) {
        this.onProgress = onProgress;
        this.onComplete = onComplete;
    }

    getLoadingProgress() {
        return this.totalAssets > 0 ? this.loadedAssets / this.totalAssets : 0;
    }
}
