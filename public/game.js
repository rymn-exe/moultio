// First, declare all variables and constants
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
const BOT_MOULT_CHANCE = 1;
let pointer;
const PLAYER_SPEED = 400;
const LERP_FACTOR = 0.1;
let husksCreated = 0;
const BASE_MOULT_THRESHOLD = 40;
const STANDARD_SPEED = 200;
let kills = 0;
let score = 0;
const TOTAL_ORBS = 40;
const TOTAL_BOTS = 15;
let botRespawnTimer = null;
let playerUsername = '';
let leaderboard = [];
const MAX_LEADERBOARD_ENTRIES = 5;
let killNotification = null;

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

const GAME_VERSION = '1.2.0';

const BOT_NAMES = [
    'xXDarkLordXx', 'ProGamer123', 'NoobMaster69', 'CoolKid2024', 
    'GamerGirl', 'EpicPlayer', 'SweatyTryhard', 'CasualGamer',
    'BlobMaster', 'MoultKing', 'SlitherPro', 'AgarioVet',
    'IoMaster', 'BlobLegend', 'MoultMe', 'OrbCollector'
];

// Define Scene classes first
class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    create() {
        // Clean up any existing particles
        if (scene && scene.backgroundParticles) {
            scene.backgroundParticles.forEach(({ particle, tween }) => {
                tween.stop();
                particle.destroy();
            });
            scene.backgroundParticles = [];
        }

        // Create title container for positioning
        const titleContainer = this.add.container(this.cameras.main.centerX, 200);

        // Create the glowing O (husk)
        const huskO = this.add.container(0, 0);
        const huskColor = 0xFFD700; // Golden yellow

        // Create multiple layers for the husk with increasing size and decreasing opacity
        const huskLayers = [
            { radius: 35, alpha: 1 },    // Core
            { radius: 40, alpha: 0.8 },
            { radius: 45, alpha: 0.6 },
            { radius: 50, alpha: 0.4 },
            { radius: 55, alpha: 0.2 },
            { radius: 60, alpha: 0.1 }   // Outermost glow
        ];

        huskLayers.forEach(layer => {
            const circle = this.add.circle(0, 0, layer.radius, huskColor, layer.alpha);
            huskO.add(circle);
        });

        // Create the title text parts
        const titleConfig = {
            fontSize: '96px',
            fill: '#FFD700',
            fontFamily: 'Verdana, sans-serif',
            fontWeight: 'bold'
        };

        const m = this.add.text(-200, 0, 'M', titleConfig).setOrigin(0.5);
        const ult = this.add.text(40, 0, 'ULT', titleConfig).setOrigin(0.5);
        const io = this.add.text(230, 0, '.IO', titleConfig).setOrigin(0.5);

        // Add glow effect to text
        [m, ult, io].forEach(text => {
            text.setStroke('#FFD700', 4);
            text.setShadow(0, 0, '#FFD700', 16, true, true);
        });

        // Position the husk
        huskO.setPosition(-100, 0);

        // Add everything to the container
        titleContainer.add([m, huskO, ult, io]);

        // Add floating animation to the entire title
        this.tweens.add({
            targets: titleContainer,
            y: 205,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Add pulsing animation to husk
        this.tweens.add({
            targets: huskO,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Create input box with rounded corners
        const inputBox = this.add.graphics();
        inputBox.lineStyle(2, 0x444444);
        inputBox.fillStyle(0x333333);
        inputBox.fillRoundedRect(this.cameras.main.centerX - 150, 280, 300, 40, 20);
        inputBox.strokeRoundedRect(this.cameras.main.centerX - 150, 280, 300, 40, 20);

        // Make the input box interactive
        const inputBoxHitArea = new Phaser.Geom.Rectangle(this.cameras.main.centerX - 150, 280, 300, 40);
        inputBox.setInteractive(inputBoxHitArea, Phaser.Geom.Rectangle.Contains);

        // Create start button with rounded corners
        const startButton = this.add.graphics();
        startButton.lineStyle(2, 0x444444);
        startButton.fillStyle(0x666666);
        startButton.fillRoundedRect(this.cameras.main.centerX - 100, 375, 200, 50, 25);
        startButton.strokeRoundedRect(this.cameras.main.centerX - 100, 375, 200, 50, 25);

        // Make the start button interactive
        const startButtonHitArea = new Phaser.Geom.Rectangle(this.cameras.main.centerX - 100, 375, 200, 50);
        startButton.setInteractive(startButtonHitArea, Phaser.Geom.Rectangle.Contains);

        // Create input text
        const inputText = this.add.text(this.cameras.main.centerX - 140, 300, '', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Verdana, sans-serif'
        }).setOrigin(0, 0.5);

        // Create placeholder text
        const placeholderText = this.add.text(this.cameras.main.centerX - 140, 300, 'Username', {
            fontSize: '20px',
            fill: '#888888',
            fontFamily: 'Verdana, sans-serif'
        }).setOrigin(0, 0.5);

        // Create start text
        const startText = this.add.text(this.cameras.main.centerX, 400, 'Start Game', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Verdana, sans-serif'
        }).setOrigin(0.5);

        // Handle keyboard input including Enter key
        let isTyping = false;
        this.input.keyboard.on('keydown', (event) => {
            if (!isTyping && event.keyCode === 13) {
                // Allow Enter to start focusing the input
                isTyping = true;
                placeholderText.setVisible(false);
                return;
            }
            
            if (!isTyping) return;

            if (event.keyCode === 8 && inputText.text.length > 0) {
                // Handle backspace
                inputText.setText(inputText.text.slice(0, -1));
            } else if (event.keyCode === 13) {
                // Handle enter/return
                if (inputText.text.length >= 3) {
                    playerUsername = inputText.text;
                    this.scene.start('GameScene');
                }
            } else if (event.keyCode === 32 || (event.keyCode >= 48 && event.keyCode <= 90)) {
                // Handle letters, numbers, and space
                if (inputText.text.length < 15) {
                    inputText.setText(inputText.text + event.key);
                }
            }

            // Update button state
            if (inputText.text.length >= 3) {
                startButton.clear();
                startButton.lineStyle(2, 0x444444);
                startButton.fillStyle(0x00cc00);
                startButton.fillRoundedRect(this.cameras.main.centerX - 100, 375, 200, 50, 25);
                startButton.strokeRoundedRect(this.cameras.main.centerX - 100, 375, 200, 50, 25);
                startText.setScale(1.05);
            } else {
                startButton.clear();
                startButton.lineStyle(2, 0x444444);
                startButton.fillStyle(0x00ff00);
                startButton.fillRoundedRect(this.cameras.main.centerX - 100, 375, 200, 50, 25);
                startButton.strokeRoundedRect(this.cameras.main.centerX - 100, 375, 200, 50, 25);
                startText.setScale(1.0);
            }
        });

        // Update input box interaction
        inputBox.on('pointerdown', () => {
            isTyping = true;
            placeholderText.setVisible(false);
            
            // Update stroke color to yellow when selected
            inputBox.clear();
            inputBox.lineStyle(2, 0xFFD700);
            inputBox.fillStyle(0x333333);
            inputBox.fillRoundedRect(this.cameras.main.centerX - 150, 280, 300, 40, 20);
            inputBox.strokeRoundedRect(this.cameras.main.centerX - 150, 280, 300, 40, 20);
            
            if (!this.cursorEffect) {
                this.cursorEffect = this.time.addEvent({
                    delay: 500,
                    callback: () => {
                        inputText.setText(inputText.text + (inputText.text.endsWith('|') ? '' : '|'));
                    },
                    loop: true
                });
            }
        });

        // Update outside click handler
        this.input.on('pointerdown', (pointer) => {
            if (pointer.y < 280 || pointer.y > 320 || pointer.x < this.cameras.main.centerX - 150 || pointer.x > this.cameras.main.centerX + 150) {
                isTyping = false;
                inputBox.clear();
                inputBox.lineStyle(2, 0x444444);
                inputBox.fillStyle(0x333333);
                inputBox.fillRoundedRect(this.cameras.main.centerX - 150, 280, 300, 40, 20);
                inputBox.strokeRoundedRect(this.cameras.main.centerX - 150, 280, 300, 40, 20);
                if (this.cursorEffect) {
                    this.cursorEffect.destroy();
                    this.cursorEffect = null;
                    inputText.setText(inputText.text.replace('|', ''));
                }
                placeholderText.setVisible(!inputText.text);
            }
        });

        // Handle start button click
        startButton.on('pointerdown', () => {
            if (inputText.text.length >= 3) {
                playerUsername = inputText.text.replace('|', '');
                this.scene.start('GameScene');
            }
        });

        // Update hover effects for start button
        startButton.on('pointerover', () => {
            if (inputText.text.length >= 3) {
                startButton.clear();
                startButton.lineStyle(2, 0x444444);
                startButton.fillStyle(0x00cc00);
                startButton.fillRoundedRect(this.cameras.main.centerX - 100, 375, 200, 50, 25);
                startButton.strokeRoundedRect(this.cameras.main.centerX - 100, 375, 200, 50, 25);
                startText.setScale(1.05);
            }
        });

        startButton.on('pointerout', () => {
            if (inputText.text.length >= 3) {
                startButton.clear();
                startButton.lineStyle(2, 0x444444);
                startButton.fillStyle(0x00ff00);
                startButton.fillRoundedRect(this.cameras.main.centerX - 100, 375, 200, 50, 25);
                startButton.strokeRoundedRect(this.cameras.main.centerX - 100, 375, 200, 50, 25);
                startText.setScale(1.0);
            }
        });
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load glow effect shader
        this.load.glsl('glow', 'void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 0.5); }');
    }

    create() {
        scene = this;
        
        // Move background creation to be first in create()
        this.createBackground();  // Move this to be the first line after scene = this;
        
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
        const cornerRadius = 15; // For rounded corners

        // Create meter background with rounded corners
        this.meterBg = this.add.graphics()
            .setScrollFactor(0);
        this.meterBg.fillStyle(0x222222, 1);
        this.meterBg.lineStyle(2, 0x444444);
        this.meterBg.fillRoundedRect(meterX, meterY, meterWidth, meterHeight, cornerRadius);
        this.meterBg.strokeRoundedRect(meterX, meterY, meterWidth, meterHeight, cornerRadius);

        // Create fill meter with rounded corners
        this.meterFill = this.add.graphics()
            .setScrollFactor(0);

        // Store reference for updates
        this.meterConfig = {
            x: meterX + 2,
            y: meterY + 2,
            width: meterWidth - 4,
            height: meterHeight - 4,
            cornerRadius: cornerRadius - 2
        };

        // Add "MOULT" label above meter
        this.moultLabel = this.add.text(meterX + meterWidth/2, meterY - 10, 'MOULT', {
            fontSize: '14px',
            fill: '#ffffff',
            fontFamily: 'Verdana, sans-serif'
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
            fontFamily: 'Verdana, sans-serif'
        }).setScrollFactor(0);

        // Create leaderboard after other UI elements
        this.leaderboard = new Leaderboard(this);
    }

    createBackground() {
        // Create a container for the background that will be behind everything
        const backgroundContainer = this.add.container(0, 0);
        backgroundContainer.setDepth(-1); // Set depth to be behind everything
        
        const graphics = this.add.graphics();
        
        // Create octagonal grid pattern with lighter color
        const gridSize = 100;
        const lineColor = 0x666666; // Lighter grey color
        const lineWidth = 1;
        const octagonPoints = [];
        
        // Calculate octagon points
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const x = Math.cos(angle) * gridSize * 0.5;
            const y = Math.sin(angle) * gridSize * 0.5;
            octagonPoints.push({ x, y });
        }
        
        // Draw octagonal grid
        for (let x = 0; x < WORLD_WIDTH + gridSize; x += gridSize) {
            for (let y = 0; y < WORLD_HEIGHT + gridSize; y += gridSize) {
                graphics.lineStyle(lineWidth, lineColor, 0.3);
                graphics.beginPath();
                graphics.moveTo(x + octagonPoints[0].x, y + octagonPoints[0].y);
                
                for (let i = 1; i < octagonPoints.length; i++) {
                    graphics.lineTo(x + octagonPoints[i].x, y + octagonPoints[i].y);
                }
                
                graphics.lineTo(x + octagonPoints[0].x, y + octagonPoints[0].y);
                graphics.strokePath();
            }
        }
        
        backgroundContainer.add(graphics);
        
        // Limit the number of particles and store them for cleanup
        this.backgroundParticles = [];
        const maxParticles = 30; // Reduced from 50
        
        for (let i = 0; i < maxParticles; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(0, WORLD_WIDTH),
                Phaser.Math.Between(0, WORLD_HEIGHT),
                Phaser.Math.Between(2, 4),
                0x666666,
                0.3
            );
            
            particle.setDepth(-1); // Ensure particles are behind everything
            
            const tween = this.tweens.add({
                targets: particle,
                x: '+=50',
                y: '+=50',
                alpha: 0.1,
                duration: Phaser.Math.Between(3000, 6000),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 1000)
            });
            
            this.backgroundParticles.push({ particle, tween });
        }
    }

    update() {
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

        // Update leaderboard
        this.leaderboard.update();
    }
}

// Then create the config using the defined scenes
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
    scene: [StartScene, GameScene]
};

// Then define all other functions
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

    bot.husksCreated++;
    bot.score = bot.kills + bot.husksCreated;
}

function gameOverScreen() {
    if (!gameOver) {
        gameOver = true;
        
        // Clean up background particles
        if (scene.backgroundParticles) {
            scene.backgroundParticles.forEach(({ particle, tween }) => {
                tween.stop();
                particle.destroy();
            });
            scene.backgroundParticles = [];
        }
        
        // Clear all respawn timers
        botRespawnTimers.forEach(timer => {
            if (timer) timer.remove();
        });
        botRespawnTimers = [];
        
        // Get final position using new scoring
        const finalScore = husksCreated + (kills * 3);
        const allScores = [...bots.map(bot => bot.husksCreated + (bot.kills * 3)), finalScore];
        allScores.sort((a, b) => b - a);
        const position = allScores.indexOf(finalScore) + 1;
        
        // Create semi-transparent background
        const bgOverlay = scene.add.rectangle(
            scene.cameras.main.centerX,
            scene.cameras.main.centerY,
            400,
            400,
            0x000000,
            0.8
        ).setScrollFactor(0);
        
        // Add blur and border
        bgOverlay.setStrokeStyle(2, 0x444444);
        
        const gameOverText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY - 100, 'GAME OVER', {
            fontSize: '64px',
            fill: '#ff0000',
            fontFamily: 'Verdana, sans-serif',
            fontWeight: 'bold'
        }).setScrollFactor(0).setOrigin(0.5);
        
        const scoreText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, 
            `Score: ${finalScore}\n` +
            `Highest Rank: ${position}/${allScores.length}\n` +
            `Kills: ${kills}\n` +
            `Moults: ${husksCreated}`, {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Verdana, sans-serif',
            align: 'center'
        }).setScrollFactor(0).setOrigin(0.5);
        
        const restartText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY + 100, 
            'Press SPACE to restart', {
            fontSize: '24px',
            fill: '#888888',
            fontFamily: 'Verdana, sans-serif'
        }).setScrollFactor(0).setOrigin(0.5);
        
        // Add pulsing animation to restart text
        scene.tweens.add({
            targets: restartText,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
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
            
            // Return to start scene
            scene.scene.start('StartScene');
        });
    }
}

function createOrb(scene) {
    const x = Phaser.Math.Between(50, WORLD_WIDTH - 50);
    const y = Phaser.Math.Between(50, WORLD_HEIGHT - 50);
    
    const container = scene.add.container(x, y);
    
    // Create multiple glowing layers with increasing size and decreasing opacity
    const glow4 = scene.add.circle(0, 0, 14, 0xffff00, 0.05); // Outermost glow
    const glow3 = scene.add.circle(0, 0, 11, 0xffff00, 0.1);
    const glow2 = scene.add.circle(0, 0, 8, 0xffff00, 0.2);
    const glow1 = scene.add.circle(0, 0, 6, 0xffff00, 0.3);
    const dot = scene.add.circle(0, 0, 4, 0xffffff); // Main bright dot
    
    // Add pulsing animation with slightly different timing for each layer
    scene.tweens.add({
        targets: [dot, glow1],
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    scene.tweens.add({
        targets: [glow2, glow3, glow4],
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 100 // Slight delay for more interesting effect
    });
    
    container.add([glow4, glow3, glow2, glow1, dot]);
    
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
    bot.score = 0; // Initialize bot score
    bot.kills = 0; // Track bot kills
    bot.husksCreated = 0; // Track bot husks
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
    const isReady = moultMeter >= currentThreshold;
    
    // Update fill meter
    scene.meterFill.clear();
    
    // Only draw if there's actual progress
    if (moultMeter > 0) {
        const fillWidth = Math.max(4, fillPercentage * scene.meterConfig.width);
        scene.meterFill.fillStyle(player.color, 1);
        
        // Always use rounded corners
        scene.meterFill.fillRoundedRect(
            scene.meterConfig.x,
            scene.meterConfig.y,
            fillWidth,
            scene.meterConfig.height,
            scene.meterConfig.cornerRadius
        );
        
        if (isReady) {
            // Add glow effect when ready
            scene.meterFill.lineStyle(4, 0xffffff, 0.5);
            scene.meterFill.strokeRoundedRect(
                scene.meterConfig.x,
                scene.meterConfig.y,
                fillWidth,
                scene.meterConfig.height,
                scene.meterConfig.cornerRadius
            );
        }
    }

    // Handle flashing effect
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

    if (scene.moultLabel) {
        scene.moultLabel.setAlpha(isReady ? 1 : 0.5);
    }
}

// Update score display when kills happen
function updateScoreDisplay() {
    if (scene.scoreText) {
        scene.scoreText.setStyle({
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Verdana, sans-serif'
        });
        scene.scoreText.setText(`Kills: ${kills}`);
    }
}

// Update botHitHusk to be the only kill handler
function botHitHusk(bot, husk) {
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
            fontFamily: 'Verdana, sans-serif',
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

        // Update bot score with new scoring system
        bot.kills++;
        bot.score = bot.husksCreated + (bot.kills * 3);

        showKillNotification(bot.playerName);
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

// Add this new class after the other classes
class Leaderboard {
    constructor(scene) {
        this.scene = scene;
        this.entries = [];
        this.container = this.scene.add.container(scene.cameras.main.width - 200, 10)
            .setScrollFactor(0)
            .setDepth(1000);

        // Background
        const bg = this.scene.add.rectangle(0, 0, 190, 150, 0x000000, 0.5)
            .setOrigin(0, 0);
        this.container.add(bg);

        // Title
        const title = this.scene.add.text(95, 10, 'LEADERBOARD', {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Verdana, sans-serif',
            fontWeight: 'bold'
        }).setOrigin(0.5, 0);
        this.container.add(title);

        // Create text objects for entries
        this.entryTexts = [];
        for (let i = 0; i < MAX_LEADERBOARD_ENTRIES; i++) {
            const entryText = this.scene.add.text(10, 40 + (i * 22), '', {
                fontSize: '14px',
                fill: '#ffffff',
                fontFamily: 'Verdana, sans-serif'
            });
            this.container.add(entryText);
            this.entryTexts.push(entryText);
        }
    }

    update() {
        // Gather all active players (bots and human)
        let entries = [...bots.map(bot => ({
            name: bot.playerName,
            score: bot.husksCreated + (bot.kills * 3), // Updated scoring
            isPlayer: false,
            color: bot.color
        }))];

        // Add human player if alive
        if (!gameOver) {
            entries.push({
                name: playerUsername,
                score: husksCreated + (kills * 3), // Updated scoring
                isPlayer: true,
                color: player.color
            });
        }

        // Sort by score
        entries.sort((a, b) => b.score - a.score);
        entries = entries.slice(0, MAX_LEADERBOARD_ENTRIES);

        // Update display
        this.entryTexts.forEach((text, i) => {
            if (i < entries.length) {
                const entry = entries[i];
                const color = entry.isPlayer ? '#ffff00' : '#ffffff';
                text.setText(`${i + 1}. ${entry.name}: ${entry.score}`);
                text.setColor(color);
            } else {
                text.setText('');
            }
        });
    }
}

function showKillNotification(killedName) {
    // Remove existing notification if present
    if (killNotification) {
        killNotification.destroy();
    }
    
    // Create container for notification
    killNotification = scene.add.container(scene.cameras.main.centerX, 50)
        .setScrollFactor(0);
    
    // Create background
    const bg = scene.add.rectangle(0, 0, 300, 40, 0x000000, 0.7)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xff0000);
    
    // Create text
    const text = scene.add.text(0, 0, `Killed ${killedName}!`, {
        fontSize: '20px',
        fill: '#ffffff',
        fontFamily: 'Verdana, sans-serif',
        fontWeight: 'bold'
    }).setOrigin(0.5);
    
    killNotification.add([bg, text]);
    
    // Animate in
    killNotification.setAlpha(0);
    killNotification.y = 0;
    
    scene.tweens.add({
        targets: killNotification,
        y: 50,
        alpha: 1,
        duration: 300,
        ease: 'Back.easeOut',
        onComplete: () => {
            // Remove after 3 seconds
            scene.time.delayedCall(3000, () => {
                scene.tweens.add({
                    targets: killNotification,
                    y: 0,
                    alpha: 0,
                    duration: 300,
                    ease: 'Back.easeIn',
                    onComplete: () => {
                        killNotification.destroy();
                        killNotification = null;
                    }
                });
            });
        }
    });
}

// Finally, initialize the game
window.onload = function() {
    console.log('Starting game initialization');
    try {
        const game = new Phaser.Game(config);
        console.log('Game initialized');
    } catch (error) {
        console.error('Error initializing game:', error);
    }
} 