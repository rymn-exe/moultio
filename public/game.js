// Game configuration
const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Game variables
let player;
let orbs = [];
let husks = [];
let bots = [];
let moultMeter = 0;
let cursors;
const MOULT_THRESHOLD = 5;
let moultMeterText;
let scene;
let camera;
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1800;
let gameOver = false;
let restartText;
const BOT_MOULT_CHANCE = 1; // 1% chance per update to moult
let pointer;
const PLAYER_SPEED = 400; // Base speed for lerping
const LERP_FACTOR = 0.1; // How smoothly to follow the mouse (0-1)
let husksCreated = 0; // Track number of husks created
const BASE_MOULT_THRESHOLD = 20; // Change from 5 to 20
const STANDARD_SPEED = 200; // New constant for standardized speed
let kills = 0;
let score = 0;
const TOTAL_ORBS = 50; // Constant number of orbs to maintain
const TOTAL_BOTS = 15; // Constant number of bots to maintain
let botRespawnTimer = null; // Timer for bot respawn cooldown

const COLORS = [
    0xFF69B4, // Hot Pink
    0x4169E1, // Royal Blue
    0xFFA500, // Orange
    0x9370DB, // Medium Purple
    0x20B2AA, // Light Sea Green
    0xFF6347, // Tomato Red
    0x32CD32, // Lime Green
    0xFFD700, // Gold
    0x8A2BE2, // Blue Violet
    0x00CED1  // Dark Turquoise
];

const GAME_VERSION = '1.1.0';

const BOT_NAMES = [
    'xXDarkLordXx', 'ProGamer123', 'NoobMaster69', 'CoolKid2024', 
    'GamerGirl', 'EpicPlayer', 'SweatyTryhard', 'CasualGamer',
    'BlobMaster', 'MoultKing', 'SlitherPro', 'AgarioVet',
    'IoMaster', 'BlobLegend', 'MoultMe', 'OrbCollector'
];

// Initialize game
window.onload = function() {
    console.log('Starting game initialization');
    try {
        const game = new Phaser.Game(config);
        console.log('Game initialized');
    } catch (error) {
        console.error('Error initializing game:', error);
    }
}

function preload() {
    // Load glow effect shader
    this.load.glsl('glow', 'void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 0.5); }');
}

function create() {
    scene = this;
    
    // Set world bounds
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    // Give player a random color too
    player = createBlob(this, 400, 300, COLORS[Phaser.Math.Between(0, COLORS.length - 1)], true);
    player.isPlayer = true;

    // Setup camera
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(player, true, 0.1, 0.1);
    this.cameras.main.setZoom(0.8);

    // Setup controls - Add this back
    cursors = this.input.keyboard.createCursorKeys();
    
    // Setup mouse/pointer tracking
    pointer = this.input.activePointer;
    
    // Moulting mechanic with proper key handling
    const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    spaceKey.on('down', () => {
        const currentThreshold = Math.floor(BASE_MOULT_THRESHOLD * (1 + (husksCreated * 0.1)));
        if (!gameOver && moultMeter >= currentThreshold) {
            createPlayerHusk.call(this, player.x, player.y);
            moultMeter = 0;
            updateMoultMeterText();
        }
    });

    // Replace meter code with visual fill meter
    const meterWidth = 200;
    const meterHeight = 30;
    const meterX = 16;
    const meterY = 16;

    // Create meter background (darker)
    this.meterBg = this.add.rectangle(meterX, meterY, meterWidth, meterHeight, 0x222222)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setStrokeStyle(2, 0x444444);

    // Create fill meter with player's color
    this.meterFill = this.add.rectangle(meterX + 2, meterY + 2, 0, meterHeight - 4, player.color)
        .setOrigin(0, 0)
        .setScrollFactor(0);

    // Store reference to width for calculations
    this.meterWidth = meterWidth;

    // Add "MOULT" label above meter
    this.moultLabel = this.add.text(meterX + meterWidth/2, meterY - 10, 'MOULT', {
        fontSize: '14px',
        fill: '#ffffff',
        fontFamily: 'sans-serif'
    }).setScrollFactor(0).setOrigin(0.5, 1);

    // Create orbs
    for (let i = 0; i < 50; i++) {
        createOrb(this);
    }

    // Create initial bots
    for (let i = 0; i < TOTAL_BOTS; i++) {
        createBot(this);
    }

    // Add collision between player and bot husks
    this.physics.add.overlap(player, husks, (player, husk) => {
        if (husk.isBotHusk) {
            gameOverScreen();
        }
    });

    // Update score display font
    this.scoreText = this.add.text(16, meterY + meterHeight + 10, 'Kills: 0', {
        fontSize: '24px',
        fill: '#ffffff',
        fontFamily: 'sans-serif'
    }).setScrollFactor(0);
}

function createBlob(scene, x, y, color = null, isPlayer = false) {
    const blob = scene.add.container(x, y);
    
    // Random color if none provided
    if (!color) {
        color = COLORS[Phaser.Math.Between(0, COLORS.length - 1)];
    }
    
    // Main circle with gradient effect
    const body = scene.add.circle(0, 0, 32, color);
    
    // Inner glow
    const innerGlow = scene.add.circle(0, 0, 28, color, 0.3);
    
    // Shiny highlight
    const highlight = scene.add.circle(-12, -12, 8, 0xffffff, 0.5);
    
    // Add subtle pulsing animation
    scene.tweens.add({
        targets: [body, innerGlow],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    blob.add([body, innerGlow, highlight]);
    scene.physics.add.existing(blob);
    blob.body.setCircle(32);
    blob.body.offset.x = -32;
    blob.body.offset.y = -32;
    
    blob.body.setCollideWorldBounds(true);
    blob.color = color; // Store color for moults
    return blob;
}

function createPlayerHusk(x, y) {
    const husk = this.add.container(x, y);
    const color = player.color;
    
    // Main body
    const body = this.add.circle(0, 0, 32, color);
    
    // Multiple glowing layers with stronger glow
    const glow1 = this.add.circle(0, 0, 36, color, 0.4);
    const glow2 = this.add.circle(0, 0, 40, color, 0.3);
    const glow3 = this.add.circle(0, 0, 44, color, 0.2);
    
    // Pulsing animation only for player moults
    this.tweens.add({
        targets: [body, glow1, glow2, glow3],
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    husk.add([glow3, glow2, glow1, body]);
    this.physics.add.existing(husk, true);
    husk.body.setCircle(32);
    husk.body.offset.x = -32;
    husk.body.offset.y = -32;
    
    husk.isPlayerHusk = true;
    husks.push(husk);
    husksCreated++;

    // Only add botHitHusk overlap
    bots.forEach(bot => {
        this.physics.add.overlap(bot, husk, botHitHusk, null, this);
    });
}

function createBotHusk(x, y, bot) {
    const husk = scene.add.container(x, y);
    const color = bot.color;
    
    // Main body
    const body = scene.add.circle(0, 0, 32, color);
    const glow = scene.add.circle(0, 0, 36, color, 0.2);
    
    husk.add([glow, body]);
    scene.physics.add.existing(husk, true);
    husk.body.setCircle(32);
    husk.body.offset.x = -32;
    husk.body.offset.y = -32;
    
    husk.isBotHusk = true;
    husk.originalBot = bot;
    husks.push(husk);

    // Add collision with player
    scene.physics.add.overlap(player, husk, checkPlayerDeath, null, scene);
    
    // Add collision with other bots
    bots.forEach(otherBot => {
        if (otherBot !== bot) { // Don't collide with creating bot
            scene.physics.add.overlap(otherBot, husk, botHitHusk, null, scene);
        }
    });
}

function gameOverScreen() {
    if (!gameOver) {
        gameOver = true;
        
        // Remove all player husks
        const playerHusks = husks.filter(h => h.isPlayerHusk);
        playerHusks.forEach(h => {
            h.destroy();
            husks = husks.filter(husk => husk !== h);
        });

        // Calculate final score
        score = husksCreated + kills;
        
        // Stop all bot movement
        bots.forEach(bot => {
            if (bot && bot.body) {
                bot.body.setVelocity(0, 0);
            }
        });

        // Update fonts for all text
        const gameOverText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY - 100, 'GAME OVER', {
            fontSize: '64px',
            fill: '#ff0000',
            fontFamily: 'sans-serif',
            fontWeight: 'bold'
        }).setScrollFactor(0).setOrigin(0.5);
        
        const scoreText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, 
            `Final Score: ${score}\n` +
            `Moults: ${husksCreated}\n` +
            `Kills: ${kills}`, {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'sans-serif',
            align: 'center'
        }).setScrollFactor(0).setOrigin(0.5);
        
        restartText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY + 100, 'Press SPACE to restart', {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'sans-serif'
        }).setScrollFactor(0).setOrigin(0.5);
        
        // Create a new keyboard listener for restart
        const spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        spaceKey.once('down', () => {
            // Clean up existing objects
            orbs.forEach(orb => {
                if (orb && orb.glow) orb.glow.destroy();
                if (orb) orb.destroy();
            });
            bots.forEach(bot => {
                if (bot) bot.destroy();
            });
            husks.forEach(husk => {
                if (husk) husk.destroy();
            });
            if (player) player.destroy();
            
            // Clear arrays
            orbs = [];
            bots = [];
            husks = [];
            
            // Reset variables
            moultMeter = 0;
            gameOver = false;
            husksCreated = 0;
            kills = 0;
            score = 0;
            
            // Start a new scene
            scene.scene.start(scene.scene.key);
        });
    }
}

function update() {
    if (gameOver) return;

    // Player movement with inertia using standardized speed
    const acceleration = 20;
    
    // Apply acceleration based on key press
    if (cursors.left.isDown) {
        player.body.velocity.x -= acceleration;
    }
    if (cursors.right.isDown) {
        player.body.velocity.x += acceleration;
    }
    if (cursors.up.isDown) {
        player.body.velocity.y -= acceleration;
    }
    if (cursors.down.isDown) {
        player.body.velocity.y += acceleration;
    }

    // Cap maximum speed at STANDARD_SPEED
    const currentSpeed = Math.sqrt(
        player.body.velocity.x * player.body.velocity.x + 
        player.body.velocity.y * player.body.velocity.y
    );
    
    if (currentSpeed > STANDARD_SPEED) {
        const scale = STANDARD_SPEED / currentSpeed;
        player.body.velocity.x *= scale;
        player.body.velocity.y *= scale;
    }

    // Add very slight drag to prevent infinite drift
    player.body.velocity.x *= 0.995;
    player.body.velocity.y *= 0.995;

    // Update bots
    updateBots();
}

function createOrb(scene) {
    const x = Phaser.Math.Between(50, WORLD_WIDTH - 50);
    const y = Phaser.Math.Between(50, WORLD_HEIGHT - 50);
    
    const container = scene.add.container(x, y);
    
    // Create the main bright dot
    const dot = scene.add.circle(0, 0, 4, 0xffffff);
    
    // Create multiple glowing layers
    const glow1 = scene.add.circle(0, 0, 6, 0xffff00, 0.3);
    const glow2 = scene.add.circle(0, 0, 8, 0xffff00, 0.2);
    const glow3 = scene.add.circle(0, 0, 10, 0xffff00, 0.1);
    
    // Add pulsing animation
    scene.tweens.add({
        targets: [dot, glow1, glow2, glow3],
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    container.add([glow3, glow2, glow1, dot]);
    
    scene.physics.add.existing(container);
    container.body.setCircle(4);
    container.body.offset.x = -4;
    container.body.offset.y = -4;
    
    scene.physics.add.overlap(player, container, collectOrb, null, scene);
    orbs.push(container);
    return container;
}

function createBot(scene) {
    const x = Phaser.Math.Between(50, WORLD_WIDTH - 50);
    const y = Phaser.Math.Between(50, WORLD_HEIGHT - 50);
    
    // Get a random color that's not currently in use
    let availableColors = [...COLORS];
    bots.forEach(existingBot => {
        availableColors = availableColors.filter(color => color !== existingBot.color);
    });
    
    // If all colors are used, just pick a random one
    const color = availableColors.length > 0 ? 
        availableColors[Phaser.Math.Between(0, availableColors.length - 1)] : 
        COLORS[Phaser.Math.Between(0, COLORS.length - 1)];
    
    const bot = createBlob(scene, x, y, color);
    
    bot.playerName = BOT_NAMES[Phaser.Math.Between(0, BOT_NAMES.length - 1)];
    
    scene.physics.add.collider(bot, bots);
    scene.physics.add.collider(bot, player);
    
    // Add collision with existing husks
    husks.forEach(husk => {
        if (husk.isBotHusk && husk.originalBot !== bot) {
            scene.physics.add.overlap(bot, husk, botHitHusk, null, scene);
        }
        if (husk.isPlayerHusk) {
            scene.physics.add.overlap(bot, husk, botHitHusk, null, scene);
        }
    });
    
    bot.direction = Phaser.Math.Between(0, 360);
    bot.moultTimer = 0;
    bots.push(bot);
    return bot;
}

function collectOrb(player, orb) {
    scene.tweens.add({
        targets: orb,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 150,
        onComplete: () => {
            orb.destroy();
            // Remove from array first
            orbs = orbs.filter(o => o !== orb);
            // Then create new orb to maintain count
            createOrb(scene);
        }
    });
    
    moultMeter++;
    updateMoultMeterText();
}

function checkPlayerDeath(player, husk) {
    if (husk.isBotHusk) {
        gameOverScreen();
    }
}

function updateBots() {
    bots.forEach(bot => {
        if (Phaser.Math.Between(0, 100) < 2) {
            bot.direction = Phaser.Math.Between(0, 360);
        }
        
        if (Phaser.Math.Between(0, 1000) < BOT_MOULT_CHANCE * 10) {
            createBotHusk(bot.x, bot.y, bot);
        }
        
        // Use standardized speed for bots
        bot.body.setVelocity(
            Math.cos(bot.direction * Math.PI / 180) * STANDARD_SPEED,
            Math.sin(bot.direction * Math.PI / 180) * STANDARD_SPEED
        );
    });
}

// Update the moult meter display function
function updateMoultMeterText() {
    const currentThreshold = Math.floor(BASE_MOULT_THRESHOLD * (1 + (husksCreated * 0.1)));
    const fillPercentage = Math.min(moultMeter / currentThreshold, 1);
    const fillWidth = fillPercentage * (scene.meterWidth - 4);
    const isReady = moultMeter >= currentThreshold;
    
    // Ensure we're updating the correct meter fill
    if (scene.meterFill) {
        // Set the width directly instead of tweening
        scene.meterFill.width = fillWidth;
        scene.meterFill.setFillStyle(player.color);
        
        // Pulse effect when ready
        if (isReady && !scene.meterFill.isFlashing) {
            scene.meterFill.isFlashing = true;
            scene.tweens.add({
                targets: scene.meterFill,
                alpha: 0.7,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else if (!isReady && scene.meterFill.isFlashing) {
            scene.meterFill.isFlashing = false;
            scene.meterFill.alpha = 1;
            scene.tweens.killTweensOf(scene.meterFill);
        }
    }

    if (scene.moultLabel) {
        scene.moultLabel.setAlpha(isReady ? 1 : 0.5);
    }
}

// Update score display when kills happen
function updateScoreDisplay() {
    if (scene.scoreText) {
        scene.scoreText.setText(`Kills: ${kills}`);
    }
}

// Update botHitHusk to be the only kill handler
function botHitHusk(bot, husk) {
    // Only process if this hasn't been handled already
    if (bot.isBeingDestroyed) return;
    bot.isBeingDestroyed = true;

    if (husk.isPlayerHusk) {
        // Remove all husks created by this bot
        const botHusks = husks.filter(h => h.isBotHusk && h.originalBot === bot);
        botHusks.forEach(h => {
            h.destroy();
            husks = husks.filter(husk => husk !== h);
        });

        // Visual effect for death
        scene.tweens.add({
            targets: bot,
            alpha: 0,
            scale: 0,
            duration: 200,
            onComplete: () => {
                bot.destroy();
                bots = bots.filter(b => b !== bot);
                
                // Schedule new bot spawn after 3 seconds
                if (!botRespawnTimer) {
                    botRespawnTimer = scene.time.delayedCall(3000, () => {
                        if (bots.length < TOTAL_BOTS) {
                            createBot(scene);
                        }
                        botRespawnTimer = null;
                    });
                }
            }
        });

        // Increment kills and show kill indicator
        kills++;
        
        const killText = scene.add.text(bot.x, bot.y, '+1', {
            fontSize: '24px',
            fill: '#ff0000',
            fontFamily: 'sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        scene.tweens.add({
            targets: killText,
            y: bot.y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => killText.destroy()
        });
        
        updateScoreDisplay();
    }
    // Handle bot hitting another bot's husk
    else if (husk.isBotHusk && husk.originalBot !== bot) {
        // Same death effect for bot-bot collisions...
        const botHusks = husks.filter(h => h.isBotHusk && h.originalBot === bot);
        botHusks.forEach(h => {
            h.destroy();
            husks = husks.filter(husk => husk !== h);
        });

        scene.tweens.add({
            targets: bot,
            alpha: 0,
            scale: 0,
            duration: 200,
            onComplete: () => {
                bot.destroy();
                bots = bots.filter(b => b !== bot);
                
                if (!botRespawnTimer) {
                    botRespawnTimer = scene.time.delayedCall(3000, () => {
                        if (bots.length < TOTAL_BOTS) {
                            createBot(scene);
                        }
                        botRespawnTimer = null;
                    });
                }
            }
        });
    }
} 