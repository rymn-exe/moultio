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
const BASE_MOULT_THRESHOLD = 5;
let kills = 0;
let score = 0;

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

    // Replace meter code with simpler version
    const meterWidth = 200;
    const meterHeight = 30;
    const meterX = 16;
    const meterY = 16;

    // Create meter background
    this.meterBg = this.add.container(meterX, meterY).setScrollFactor(0);
    
    // Bug body (main rectangle)
    this.add.rectangle(0, 0, meterWidth - 20, meterHeight, 0x444444, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0);
    
    // Create fill meter
    this.meterFill = this.add.rectangle(meterX, meterY, 0, meterHeight, 0x666666, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0);

    // Store reference to width for calculations
    this.meterWidth = meterWidth;

    // Add text label
    moultMeterText = this.add.text(meterX + meterWidth/2, meterY + meterHeight/2, '', {
        fontSize: '16px',
        fill: '#ffffff',
        fontFamily: 'Arial Black'
    }).setScrollFactor(0).setOrigin(0.5);

    // Create orbs
    for (let i = 0; i < 50; i++) {
        createOrb(this);
    }

    // Create bots
    for (let i = 0; i < 5; i++) {
        createBot(this);
    }

    // Add collision between player and bot husks
    this.physics.add.overlap(player, husks, (player, husk) => {
        if (husk.isBotHusk) {
            gameOverScreen();
        }
    });

    // Add score display
    this.scoreText = this.add.text(16, 50, 'Kills: 0', {
        fontSize: '24px',
        fill: '#ffffff'
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

    bots.forEach(bot => {
        this.physics.add.overlap(bot, husk, killBot, null, this);
    });
}

function createBotHusk(x, y, bot) {
    const husk = scene.add.container(x, y);
    const color = bot.color;
    
    // Main body
    const body = scene.add.circle(0, 0, 32, color);
    
    // Single subtle glow layer for bot husks (no pulse)
    const glow = scene.add.circle(0, 0, 36, color, 0.2);
    
    husk.add([glow, body]);
    scene.physics.add.existing(husk, true);
    husk.body.setCircle(32);
    husk.body.offset.x = -32;
    husk.body.offset.y = -32;
    
    husk.isBotHusk = true;
    husks.push(husk);

    scene.physics.add.overlap(player, husk, checkPlayerDeath, null, scene);
}

function gameOverScreen() {
    if (!gameOver) {
        gameOver = true;
        
        // Calculate final score
        score = husksCreated + (3 * kills);
        
        // Stop all bot movement
        bots.forEach(bot => {
            if (bot && bot.body) {
                bot.body.setVelocity(0, 0);
            }
        });

        // Create game over text
        const gameOverText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY - 100, 'GAME OVER', {
            fontSize: '64px',
            fill: '#ff0000'
        }).setScrollFactor(0).setOrigin(0.5);
        
        // Add score breakdown
        const scoreText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, 
            `Final Score: ${score}\n` +
            `Moults: ${husksCreated}\n` +
            `Kills: ${kills} (x3)`, {
            fontSize: '32px',
            fill: '#ffffff',
            align: 'center'
        }).setScrollFactor(0).setOrigin(0.5);
        
        restartText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY + 100, 'Press SPACE to restart', {
            fontSize: '32px',
            fill: '#ffffff'
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

    // Player movement with inertia
    const speed = 200;
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

    // Cap maximum speed
    const currentSpeed = Math.sqrt(
        player.body.velocity.x * player.body.velocity.x + 
        player.body.velocity.y * player.body.velocity.y
    );
    
    if (currentSpeed > speed) {
        const scale = speed / currentSpeed;
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
    // Use random color instead of hardcoded red
    const bot = createBlob(scene, x, y);
    
    scene.physics.add.collider(bot, bots);
    scene.physics.add.collider(bot, player);
    
    husks.forEach(husk => {
        if (husk.isPlayerHusk) {
            scene.physics.add.overlap(bot, husk, killBot, null, scene);
        }
    });
    
    bot.direction = Phaser.Math.Between(0, 360);
    bot.moultTimer = 0;
    bots.push(bot);
    return bot;
}

function collectOrb(player, orb) {
    // Play collection animation
    scene.tweens.add({
        targets: orb,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 150,
        onComplete: () => {
            orb.destroy();
            createOrb(scene);
        }
    });
    
    moultMeter++;
    updateMoultMeterText();
    orbs = orbs.filter(o => o !== orb);
}

function killBot(bot, husk) {
    if (husk.isPlayerHusk) {
        // Visual effect for kill
        scene.tweens.add({
            targets: bot,
            alpha: 0,
            scale: 0,
            duration: 200,
            onComplete: () => {
                bot.destroy();
                bots = bots.filter(b => b !== bot);
                createBot(scene);
            }
        });
        
        // Increment kills
        kills++;
        
        // Optional: Add kill indicator
        const killText = scene.add.text(bot.x, bot.y, '+3', {
            fontSize: '24px',
            fill: '#ff0000'
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
        
        const speed = 100;
        bot.body.setVelocity(
            Math.cos(bot.direction * Math.PI / 180) * speed,
            Math.sin(bot.direction * Math.PI / 180) * speed
        );
    });
}

// Simplify the update meter function
function updateMoultMeterText() {
    const currentThreshold = Math.floor(BASE_MOULT_THRESHOLD * (1 + (husksCreated * 0.1)));
    const fillWidth = (moultMeter / currentThreshold) * (this.meterWidth - 20);
    const isReady = moultMeter >= currentThreshold;
    
    // Update fill color and width
    if (this.meterFill) {
        this.meterFill.setFillStyle(isReady ? player.color : 0x666666);
        this.meterFill.width = fillWidth;
    }

    // Update text
    if (moultMeterText) {
        moultMeterText.setText(`${moultMeter}/${currentThreshold}`);
        moultMeterText.setColor(isReady ? '#ffffff' : '#999999');
    }
}

// Update score display when kills happen
function updateScoreDisplay() {
    if (scene.scoreText) {
        scene.scoreText.setText(`Kills: ${kills}`);
    }
} 