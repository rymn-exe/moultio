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
const PLAYER_SPEED = 480;
const LERP_FACTOR = 0.1;
let husksCreated = 0;
const BASE_MOULT_THRESHOLD = 15;
const STANDARD_SPEED = 240;
let kills = 0;
let score = 0;
const TOTAL_ORBS = 40;
const TOTAL_BOTS = 15;
let botRespawnTimer = null;
let playerUsername = '';
let leaderboard = [];
const MAX_LEADERBOARD_ENTRIES = 5;
let killNotification = null;
let botRespawnTimers = [];
let unnamedPlayerCount = 0;

const COLORS = [
    0xFF6B6B, // Coral Red
    0x4ECDC4, // Turquoise
    0xFFBE0B, // Amber
    0x7400B8, // Royal Purple
    0x80ED99, // Mint Green
    0xFF006E, // Hot Pink
    0x48CAE4, // Sky Blue
    0xFB5607, // Orange
    0x3A86FF, // Blue
    0x8338EC  // Purple
];

const GAME_VERSION = '1.3.1';

const BOT_NAMES = [
    'xXDarkLordXx', 'ProGamer123', 'NoobMaster69', 'CoolKid2024', 
    'GamerGirl', 'EpicPlayer', 'SweatyTryhard', 'CasualGamer',
    'BlobMaster', 'MoultKing', 'SlitherPro', 'AgarioVet',
    'IoMaster', 'BlobLegend', 'MoultMe', 'OrbCollector'
];

// Add these constants at the top
const BOT_VISION_RANGE = 300; // How far bots can "see"
const BOT_AGGRESSIVE_SPEED = 300; // Speed when chasing player
const BOT_TACTICAL_DISTANCE = 150; // Distance they try to maintain when setting up traps

// First, add these new color palettes near the top of the file with other constants
const ORB_COLORS = [
    { core: 0xffd700, glow: 0xffeb7f }, // Gold
    { core: 0xff7f7f, glow: 0xff9999 }, // Soft Red
    { core: 0x7fff7f, glow: 0x99ff99 }, // Soft Green
    { core: 0x7f7fff, glow: 0x9999ff }, // Soft Blue
    { core: 0xff7fff, glow: 0xff99ff }, // Soft Purple
    { core: 0xffbf7f, glow: 0xffcc99 }  // Soft Orange
];

// Define Scene classes first
class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    create(data) {
        // Add this at the start of the create method
        this.createBackground();
        
        // Near the start of create(), after scene cleanup but before creating UI elements:
        const savedUsername = data.lastUsername || '';
        
        // Clean up any existing particles
        if (scene && scene.backgroundParticles) {
            scene.backgroundParticles.forEach(({ particle, tween }) => {
                tween.stop();
                particle.destroy();
            });
            scene.backgroundParticles = [];
        }

        // First, define colors for each letter
        const letterColors = [
            0xFF6B6B, // M - Coral Red
            0x4ECDC4, // O - Turquoise
            0xFFBE0B, // U - Amber
            0x7400B8, // L - Royal Purple
            0x80ED99, // T - Mint Green
            0xFF006E, // . - Hot Pink
            0x48CAE4, // I - Sky Blue
            0x3A86FF  // O - Blue
        ];

        // Create title container and position it lower
        const titleContainer = this.add.container(this.cameras.main.centerX, 250);

        // Create each letter
        const letters = ['M', 'O', 'U', 'L', 'T', '.', 'I', 'O'];
        const spacing = 70; // Space between letters
        const totalWidth = (letters.length - 1) * spacing;
        const startX = -totalWidth / 2;

        // Array to store all letter objects for animation
        const letterObjects = [];

        letters.forEach((char, i) => {
            if (char === 'O' && i === 1) {
                // Special O (husk)
                const huskO = this.add.container(startX + (i * spacing), 0);
                const huskColor = letterColors[1];
                const huskSize = 48;

                const outerGlow = this.add.circle(0, 0, huskSize, huskColor, 0.3);
                const body = this.add.circle(0, 0, huskSize * 0.8, huskColor);
                const innerGlow = this.add.circle(0, 0, huskSize * 0.6, huskColor, 0.6);
                
                huskO.add([outerGlow, body, innerGlow]);
                titleContainer.add(huskO);
                letterObjects[i] = huskO;

                // Add pulsing animation
                this.tweens.add({
                    targets: [body, innerGlow],
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            } else {
                // Regular letter
                const letter = this.add.text(startX + (i * spacing), 0, char, {
                    fontSize: '96px',
                    fontFamily: 'Verdana, sans-serif',
                    fontWeight: 'bold',
                    fill: `#${letterColors[i].toString(16).padStart(6, '0')}`,
                }).setOrigin(0.5);

                // Add glow effect
                const color = letterColors[i];
                const colorHex = `#${color.toString(16).padStart(6, '0')}`;
                letter.setStroke(colorHex, 8);
                letter.setShadow(0, 0, colorHex, 16, true, true);

                titleContainer.add(letter);
                letterObjects[i] = letter;
            }
        });

        // Create wave animation
        const waveDelay = 100; // 0.1 seconds between each letter
        const waveDuration = 1000; // 1 second for each up/down motion
        const waveHeight = 20; // Maximum height of the wave

        // Function to animate a single letter
        const animateLetter = (letter, index, reverse = false) => {
            const delay = reverse ? 
                (letterObjects.length - 1 - index) * waveDelay : 
                index * waveDelay;
            
            this.tweens.add({
                targets: letter,
                y: waveHeight,
                duration: waveDuration,
                ease: 'Sine.easeInOut',
                yoyo: true,
                delay: delay,
                onComplete: () => {
                    // When the last letter completes, start the reverse wave
                    if (!reverse && index === letterObjects.length - 1) {
                        letterObjects.forEach((l, i) => animateLetter(l, i, true));
                    } else if (reverse && index === letterObjects.length - 1) {
                        // When reverse wave completes, start the forward wave again
                        letterObjects.forEach((l, i) => animateLetter(l, i, false));
                    }
                }
            });
        };

        // Start the wave animation
        letterObjects.forEach((letter, index) => animateLetter(letter, index, false));

        // Position the input box and start text lower
        const inputBoxY = 450;
        const startTextY = 550;

        // Update input box position
        const inputBox = this.add.graphics();
        inputBox.lineStyle(2, 0x444444);
        inputBox.fillStyle(0x333333);
        inputBox.fillRoundedRect(this.cameras.main.centerX - 150, inputBoxY, 300, 40, 20);
        inputBox.strokeRoundedRect(this.cameras.main.centerX - 150, inputBoxY, 300, 40, 20);

        // Make input box interactive
        const inputBoxHitArea = new Phaser.Geom.Rectangle(this.cameras.main.centerX - 150, inputBoxY, 300, 40);
        inputBox.setInteractive(inputBoxHitArea, Phaser.Geom.Rectangle.Contains);

        // Create input text
        const inputText = this.add.text(this.cameras.main.centerX - 140, inputBoxY + 20, savedUsername, {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Verdana, sans-serif'
        }).setOrigin(0, 0.5);

        // Create placeholder text centered in the input box
        const placeholderText = this.add.text(this.cameras.main.centerX - 140, inputBoxY + 20, 'Username', {
            fontSize: '20px',
            fill: '#888888',
            fontFamily: 'Verdana, sans-serif'
        }).setOrigin(0, 0.5);
        placeholderText.setVisible(!savedUsername);

        // Update press space text position
        const pressSpaceText = this.add.text(
            this.cameras.main.centerX,
            startTextY,
            'Press SPACE to Start',
            {
                fontSize: '24px',
                fill: '#ffffff',
                fontFamily: 'Verdana, sans-serif'
            }
        ).setOrigin(0.5);

        // Add pulsing animation to the text
        this.tweens.add({
            targets: pressSpaceText,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Create cursor effect (initially hidden)
        const cursor = this.add.text(inputText.x + inputText.width, inputBoxY, '|', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Verdana, sans-serif'
        }).setOrigin(0, 0.5)
          .setVisible(false);  // Hide cursor initially
        
        // Update cursor position calculation
        const updateCursor = () => {
            const textWidth = inputText.text ? inputText.width : 0;
            cursor.setPosition(inputText.x + textWidth + 2, inputBoxY + 20);
            cursor.setOrigin(0, 0.5);
            cursor.setVisible(isTyping && inputText.text.length < 15);
        };

        // Improved keyboard input handling
        let isTyping = false;
        this.input.keyboard.on('keydown', (event) => {
            if (!isTyping && event.keyCode === Phaser.Input.Keyboard.KeyCodes.ENTER) {
                isTyping = true;
                placeholderText.setVisible(false);
                updateCursor();
                return;
            }

            if (!isTyping) return;

            if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.BACKSPACE) {
                if (inputText.text.length > 0) {
                    inputText.setText(inputText.text.slice(0, -1));
                    updateCursor();
                }
            } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.ENTER) {
                if (inputText.text.length >= 3) {
                    playerUsername = inputText.text;
                    this.scene.start('GameScene');
                }
            } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.SPACE ||
                     (event.keyCode >= Phaser.Input.Keyboard.KeyCodes.ZERO && 
                      event.keyCode <= Phaser.Input.Keyboard.KeyCodes.Z)) {
                if (inputText.text.length < 15) {
                    const char = event.key.length === 1 ? event.key : '';
                    inputText.setText(inputText.text + char);
                    updateCursor();
                }
            }

            // Update start button state
            if (inputText.text.length >= 3) {
                pressSpaceText.setScale(1.05);
            } else {
                pressSpaceText.setScale(1.0);
            }
        });

        // Update input box click handling
        inputBox.on('pointerdown', () => {
            isTyping = true;
            placeholderText.setVisible(false);
            updateCursor(); // Update cursor visibility
            
            // Update input box appearance
            inputBox.clear();
            inputBox.lineStyle(2, 0xFFD700);
            inputBox.fillStyle(0x333333);
            inputBox.fillRoundedRect(this.cameras.main.centerX - 150, inputBoxY, 300, 40, 20);
            inputBox.strokeRoundedRect(this.cameras.main.centerX - 150, inputBoxY, 300, 40, 20);
        });

        // Update outside click handling
        this.input.on('pointerdown', (pointer) => {
            if (pointer.y < inputBoxY || pointer.y > inputBoxY + 40 || 
                pointer.x < this.cameras.main.centerX - 150 || 
                pointer.x > this.cameras.main.centerX + 150) {
                isTyping = false;
                cursor.setVisible(false);
                inputBox.clear();
                inputBox.lineStyle(2, 0x444444);
                inputBox.fillStyle(0x333333);
                inputBox.fillRoundedRect(this.cameras.main.centerX - 150, inputBoxY, 300, 40, 20);
                inputBox.strokeRoundedRect(this.cameras.main.centerX - 150, inputBoxY, 300, 40, 20);
                placeholderText.setVisible(!inputText.text);
            }
        });

        // Add space key handler for the whole scene
        const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        spaceKey.on('down', () => {
            // If there's text in the input, use it
            if (inputText.text.length > 0) {
                playerUsername = inputText.text.replace('|', '');
            } else {
                // Generate unique 3-digit number for unnamed players
                const playerNumber = String(Math.floor(Math.random() * 900) + 100);
                playerUsername = `Player${playerNumber}`;
            }
            this.scene.start('GameScene');
        });

        // Add version text
        const versionText = this.add.text(
            this.cameras.main.width - 10,
            this.cameras.main.height - 10,
            `v${GAME_VERSION}`,
            {
                fontSize: '14px',
                fill: '#666666',
                fontFamily: 'Verdana, sans-serif'
            }
        ).setOrigin(1, 1)
         .setDepth(1000);
    }

    createBackground() {
        // Create background container
        const backgroundContainer = this.add.container(0, 0);
        backgroundContainer.setDepth(-1);
        
        // Fill background with base color
        const bg = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x111827)
            .setOrigin(0, 0);
        backgroundContainer.add(bg);
        
        // Create floating hexagons
        const numHexagons = 15; // Fewer hexagons for title screen
        
        for (let i = 0; i < numHexagons; i++) {
            const size = Phaser.Math.Between(40, 100);
            const x = Phaser.Math.Between(0, this.cameras.main.width);
            const y = Phaser.Math.Between(0, this.cameras.main.height);
            
            // Create hexagon container for easier animation
            const hexContainer = this.add.container(x, y);
            
            // Create hexagon shape
            const hexagon = this.add.graphics();
            hexagon.lineStyle(2, 0x2a3548, 0.2);
            
            // Draw hexagon
            const points = [];
            for (let j = 0; j < 6; j++) {
                const angle = (j * Math.PI) / 3;
                points.push({
                    x: size * Math.cos(angle),
                    y: size * Math.sin(angle)
                });
            }
            
            hexagon.beginPath();
            hexagon.moveTo(points[0].x, points[0].y);
            for (let j = 1; j < points.length; j++) {
                hexagon.lineTo(points[j].x, points[j].y);
            }
            hexagon.lineTo(points[0].x, points[0].y);
            hexagon.closePath();
            hexagon.strokePath();
            
            hexContainer.add(hexagon);
            backgroundContainer.add(hexContainer);
            
            // Add floating animation
            this.tweens.add({
                targets: hexContainer,
                x: x + Phaser.Math.Between(-50, 50),
                y: y + Phaser.Math.Between(-50, 50),
                duration: Phaser.Math.Between(8000, 12000),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000)
            });
            
            // Add very slow rotation
            this.tweens.add({
                targets: hexContainer,
                rotation: 0.1,
                duration: Phaser.Math.Between(12000, 15000),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000)
            });
        }
        
        // Add some particles for additional depth
        const numParticles = 20;
        for (let i = 0; i < numParticles; i++) {
            const size = Phaser.Math.Between(2, 4);
            const x = Phaser.Math.Between(0, this.cameras.main.width);
            const y = Phaser.Math.Between(0, this.cameras.main.height);
            
            const particle = this.add.container(x, y);
            
            const glow = this.add.circle(0, 0, size + 2, 0x4a5568, 0.2);
            const core = this.add.circle(0, 0, size, 0x4a5568, 0.4);
            particle.add([glow, core]);
            
            backgroundContainer.add(particle);
            
            // Add floating animation
            this.tweens.add({
                targets: particle,
                y: y + 30,
                duration: Phaser.Math.Between(3000, 6000),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 1000)
            });
        }
        
        return backgroundContainer;
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
        
        // Initialize socket first
        initializeSocket();
        
        this.createBackground();
        
        // Set world bounds
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        
        // Create player with random color
        const playerColor = COLORS[Phaser.Math.Between(0, COLORS.length - 1)];
        player = createBlob(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, playerColor, true);
        player.isPlayer = true;
        
        // Update player name tag style
        const nameTag = this.add.text(0, -50, playerUsername, {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Verdana, sans-serif',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        player.add(nameTag);
        
        // Emit player join after creating player
        socket.emit('playerJoin', {
            username: playerUsername,
            color: playerColor
        });

        // Setup camera
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.cameras.main.startFollow(player, true, 0.1, 0.1);
        this.cameras.main.setZoom(0.8);

        // Setup controls
        cursors = this.input.keyboard.createCursorKeys();
        
        // Create UI elements
        this.createUI();
        
        // Set up movement update interval
        this.time.addEvent({
            delay: 50,
            callback: () => {
                if (!gameOver && player && player.body) {
                    socket.emit('playerMove', {
                        x: player.x,
                        y: player.y
                    });
                }
            },
            loop: true
        });

        // Setup moulting with space key
        const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        spaceKey.on('down', () => {
            const currentThreshold = Math.floor(BASE_MOULT_THRESHOLD * (1 + (husksCreated * 0.1)));
            if (!gameOver && moultMeter >= currentThreshold) {
                // Create husk at player's current position
                const husk = scene.add.container(player.x, player.y);
                
                // Make the husk color lighter than the player's color
                const color = player.color;
                const lighterColor = Phaser.Display.Color.ValueToColor(color).lighten(50).color;
                
                // Main body with multiple layers for better effect
                const outerGlow = scene.add.circle(0, 0, 42, lighterColor, 0.3);
                const body = scene.add.circle(0, 0, 34, lighterColor);
                const innerGlow = scene.add.circle(0, 0, 30, lighterColor, 0.6);
                
                husk.add([outerGlow, body, innerGlow]);
                scene.physics.add.existing(husk, true);
                husk.body.setCircle(34);
                husk.body.offset.x = -34;
                husk.body.offset.y = -34;
                
                // Enhanced pulsing animation for player husks
                scene.tweens.add({
                    targets: [body, innerGlow],
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                // Enhanced glow animation
                scene.tweens.add({
                    targets: outerGlow,
                    scaleX: 1.4,
                    scaleY: 1.4,
                    alpha: 0.1,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                // Add a highlight ring that pulses independently
                const highlightRing = scene.add.circle(0, 0, 36, 0xffffff, 0.3);
                husk.add(highlightRing);
                
                scene.tweens.add({
                    targets: highlightRing,
                    scaleX: 1.3,
                    scaleY: 1.3,
                    alpha: 0,
                    duration: 1200,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                husk.isPlayerHusk = true;
                husk.playerId = 'player';
                husks.push(husk);

                // Add collision with bots
                bots.forEach(bot => {
                    scene.physics.add.overlap(bot, husk, botHitHusk, null, scene);
                });

                // Reset moult meter
                moultMeter = 0;
                husksCreated++;
                updateMoultMeterText();
            }
        });
    }

    createBackground() {
        const backgroundContainer = this.add.container(0, 0);
        backgroundContainer.setDepth(-1);
        
        // Create base gradient that covers the entire world
        const graphics = this.add.graphics();
        graphics.fillStyle(0x111827);
        graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        
        // Create floating hexagons spread across the world
        const numHexagons = 30; // Increased number for better coverage
        const hexagons = [];
        
        for (let i = 0; i < numHexagons; i++) {
            const size = Phaser.Math.Between(60, 120);
            const x = Phaser.Math.Between(0, WORLD_WIDTH);
            const y = Phaser.Math.Between(0, WORLD_HEIGHT);
            
            // Create hexagon shape
            const hexagon = this.add.graphics();
            hexagon.lineStyle(2, 0x2a3548, 0.2);
            
            // Draw hexagon
            const points = [];
            for (let j = 0; j < 6; j++) {
                const angle = (j * Math.PI) / 3;
                points.push({
                    x: x + size * Math.cos(angle),
                    y: y + size * Math.sin(angle)
                });
            }
            
            hexagon.beginPath();
            hexagon.moveTo(points[0].x, points[0].y);
            for (let j = 1; j < points.length; j++) {
                hexagon.lineTo(points[j].x, points[j].y);
            }
            hexagon.lineTo(points[0].x, points[0].y);
            hexagon.closePath();
            hexagon.strokePath();
            
            // Add floating animation
            this.tweens.add({
                targets: hexagon,
                x: '+=50',
                y: '+=50',
                duration: Phaser.Math.Between(8000, 12000),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000)
            });
            
            // Add very slow rotation
            this.tweens.add({
                targets: hexagon,
                rotation: 0.1,
                duration: Phaser.Math.Between(12000, 15000),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000)
            });
            
            hexagons.push(hexagon);
        }
        
        // Add particles spread across the world
        const particles = [];
        const numParticles = 50;
        
        for (let i = 0; i < numParticles; i++) {
            const size = Phaser.Math.Between(2, 6);
            const x = Phaser.Math.Between(0, WORLD_WIDTH);
            const y = Phaser.Math.Between(0, WORLD_HEIGHT);
            
            const particle = this.add.container(x, y);
            
            const glow = this.add.circle(0, 0, size + 2, 0x4a5568, 0.2);
            const core = this.add.circle(0, 0, size, 0x4a5568, 0.4);
            particle.add([glow, core]);
            
            this.tweens.add({
                targets: particle,
                y: '+=30',
                duration: Phaser.Math.Between(3000, 6000),
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 1000)
            });
            
            particles.push(particle);
        }
        
        backgroundContainer.add([graphics, ...hexagons, ...particles]);
        return backgroundContainer;
    }

    createUI() {
        // Create moult meter
        const meterWidth = 200;
        const meterHeight = 30;
        const meterX = 16;
        const meterY = 16;
        const cornerRadius = 15;

        this.meterBg = this.add.graphics()
            .setScrollFactor(0)
            .setDepth(1000);
        this.meterBg.fillStyle(0x1a1a1a, 0.8);
        this.meterBg.lineStyle(2, 0x333333);
        this.meterBg.fillRoundedRect(meterX - 2, meterY - 2, meterWidth + 4, meterHeight + 4, cornerRadius);
        this.meterBg.strokeRoundedRect(meterX - 2, meterY - 2, meterWidth + 4, meterHeight + 4, cornerRadius);

        // Create fill meter with rounded corners
        this.meterFill = this.add.graphics()
            .setScrollFactor(0)
            .setDepth(1000);

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
        }).setScrollFactor(0)
          .setOrigin(0.5, 1)
          .setDepth(1000);

        // Create orbs
        for (let i = 0; i < 50; i++) {
            createOrb(this);
        }

        // Create initial bots
        for (let i = 0; i < TOTAL_BOTS; i++) {
            createBot(this);
        }

        // Add collision between player and all husks
        this.physics.add.overlap(player, husks, (player, husk) => {
            // Trigger death for both bot husks and player husks
            if (husk.isBotHusk || husk.isPlayerHusk) {
                checkPlayerDeath(player, husk);
            }
        }, null, this);

        // Update score display font
        this.scoreText = this.add.text(16, meterY + meterHeight + 10, 'Kills: 0', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Verdana, sans-serif'
        }).setScrollFactor(0);

        // Create leaderboard after other UI elements
        this.leaderboard = new Leaderboard(this);
    }

    update() {
        if (gameOver) return;

        const currentThreshold = Math.floor(BASE_MOULT_THRESHOLD * (1 + (husksCreated * 0.1)));
        const isReadyToMoult = moultMeter >= currentThreshold;
        const currentMaxSpeed = isReadyToMoult ? 150 : STANDARD_SPEED;
        
        // Get current direction or maintain last direction
        if (!player.lastDirection) {
            player.lastDirection = { x: 1, y: 0 }; // Default direction (right)
        }

        // Update direction based on input
        if (cursors.left.isDown) {
            player.lastDirection.x = -1;
        } else if (cursors.right.isDown) {
            player.lastDirection.x = 1;
        } else {
            player.lastDirection.x *= 0.95; // Gradual direction decay
        }

        if (cursors.up.isDown) {
            player.lastDirection.y = -1;
        } else if (cursors.down.isDown) {
            player.lastDirection.y = 1;
        } else {
            player.lastDirection.y *= 0.95; // Gradual direction decay
        }

        // Normalize the direction vector
        const magnitude = Math.sqrt(
            player.lastDirection.x * player.lastDirection.x + 
            player.lastDirection.y * player.lastDirection.y
        );

        if (magnitude > 0) {
            player.lastDirection.x /= magnitude;
            player.lastDirection.y /= magnitude;
        }

        // Apply velocity
        player.body.setVelocity(
            player.lastDirection.x * currentMaxSpeed,
            player.lastDirection.y * currentMaxSpeed
        );

        // Update bots
        updateBots();

        // Update leaderboard
        this.leaderboard.update();

        // Periodically check bot count (every ~5 seconds)
        if (this.time.now % 5000 < 16) {
            manageBotCount();
        }
    }
}

// Then create the config using the defined scenes
const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: 800,
    height: 600,
    backgroundColor: '#111827', // Darker, more modern blue-gray
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
    
    if (!color) {
        color = COLORS[Phaser.Math.Between(0, COLORS.length - 1)];
    }
    
    // Enhanced blob appearance
    const outerGlow = scene.add.circle(0, 0, 40, color, 0.2);
    const outerBody = scene.add.circle(0, 0, 36, color, 0.4);
    const mainBody = scene.add.circle(0, 0, 32, color);
    const innerGlow = scene.add.circle(0, 0, 28, color, 0.6);
    const core = scene.add.circle(0, 0, 24, color, 0.8);
    
    // Multiple highlights for more depth
    const highlight1 = scene.add.circle(-10, -10, 8, 0xffffff, 0.6);
    const highlight2 = scene.add.circle(-8, -8, 4, 0xffffff, 0.8);
    
    // Smoother pulsing animation
    scene.tweens.add({
        targets: [mainBody, innerGlow, core],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    // Subtle glow animation
    scene.tweens.add({
        targets: [outerGlow, outerBody],
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 2500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    blob.add([outerGlow, outerBody, mainBody, innerGlow, core, highlight1, highlight2]);
    scene.physics.add.existing(blob);
    blob.body.setCircle(32);
    blob.body.offset.x = -32;
    blob.body.offset.y = -32;
    
    blob.body.setCollideWorldBounds(true);
    blob.color = color;
    return blob;
}

function createPlayerHusk(x, y) {
    // Emit moult creation to server
    socket.emit('createMoult', { x, y });
}

function createBotHusk(x, y, bot) {
    const husk = scene.add.container(x, y);
    
    // Make bot husks lighter than their original color
    const color = bot.color;
    const lighterColor = Phaser.Display.Color.ValueToColor(color).lighten(30).color;
    
    // Simpler, non-animated layers for bot husks
    const outerGlow = scene.add.circle(0, 0, 40, lighterColor, 0.15);
    const body = scene.add.circle(0, 0, 32, lighterColor, 0.8);
    const innerGlow = scene.add.circle(0, 0, 28, lighterColor, 0.4);
    
    husk.add([outerGlow, body, innerGlow]);
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
        if (otherBot !== bot) {
            scene.physics.add.overlap(otherBot, husk, botHitHusk, null, scene);
        }
    });

    bot.husksCreated++;
    bot.score = bot.kills + bot.husksCreated;
}

function checkPlayerDeath(player, husk) {
    if (!gameOver && (husk.isBotHusk || husk.isPlayerHusk)) {
        gameOver = true;
        
        // Emit death event to server
        socket.emit('playerDeath', {
            killerId: husk.playerId
        });
        
        // Immediately disable everything
        scene.physics.world.disable(player);
        scene.input.keyboard.enabled = false;

        // Create explosion particles
        const numParticles = 12;
        const particles = [];
        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2;
            const speed = 200;
            const particle = scene.add.circle(player.x, player.y, 8, player.color);
            particle.setDepth(1000);
            
            // Set particle velocity
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            // Animate particle
            scene.tweens.add({
                targets: particle,
                x: particle.x + vx,
                y: particle.y + vy,
                alpha: 0,
                scale: 0.1,
                duration: 500,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
            particles.push(particle);
        }

        // Create shockwave effect
        const shockwave = scene.add.circle(player.x, player.y, 10, player.color, 0.5);
        shockwave.setDepth(999);
        scene.tweens.add({
            targets: shockwave,
            scale: 3,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => shockwave.destroy()
        });

        // Scale up and fade out player
        scene.tweens.add({
            targets: player,
            scale: 1.5,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                // Create a dark overlay with fade in
                const overlay = scene.add.rectangle(
                    0, 0, 
                    scene.cameras.main.width,
                    scene.cameras.main.height,
                    0x000000, 0
                ).setScrollFactor(0)
                 .setDepth(1999);

                scene.tweens.add({
                    targets: overlay,
                    alpha: 0.7,
                    duration: 500,
                    ease: 'Power2'
                });

                // Create centered container for game over content
                const container = scene.add.container(
                    scene.cameras.main.centerX,
                    scene.cameras.main.centerY - 50
                ).setScrollFactor(0)
                 .setDepth(2000)
                 .setAlpha(0);

                // Create stylish background panel
                const panel = scene.add.graphics();
                panel.fillStyle(0x111827, 0.95);
                panel.fillRoundedRect(-200, -150, 400, 300, 20);
                panel.lineStyle(2, 0x2a3548);
                panel.strokeRoundedRect(-200, -150, 400, 300, 20);

                // Add inner glow effect
                const innerGlow = scene.add.graphics();
                innerGlow.lineStyle(4, 0x2a3548, 0.3);
                innerGlow.strokeRoundedRect(-196, -146, 392, 292, 18);

                // Create game over text with glow effect
                const gameOverText = scene.add.text(0, -100, 'GAME OVER', {
                    fontSize: '64px',
                    fontFamily: 'Verdana, sans-serif',
                    fontWeight: 'bold',
                    fill: '#ff3333'
                }).setOrigin(0.5)
                  .setShadow(0, 0, '#ff3333', 8, true, true);

                // Create score display with icons
                const scoreText = scene.add.text(0, -20,
                    `Score: ${husksCreated + (kills * 3)}`, {
                    fontSize: '36px',
                    fontFamily: 'Verdana, sans-serif',
                    fill: '#ffffff',
                    align: 'center'
                }).setOrigin(0.5);

                // Create stats with icons
                const killsText = scene.add.text(-80, 30,
                    `Kills: ${kills}`, {
                    fontSize: '24px',
                    fontFamily: 'Verdana, sans-serif',
                    fill: '#ff6b6b'
                }).setOrigin(0.5);

                const moultsText = scene.add.text(80, 30,
                    `Moults: ${husksCreated}`, {
                    fontSize: '24px',
                    fontFamily: 'Verdana, sans-serif',
                    fill: '#4ecdc4'
                }).setOrigin(0.5);

                // Create restart button
                const button = scene.add.container(0, 90);
                const buttonBg = scene.add.graphics();
                buttonBg.fillStyle(0x2a3548, 1);
                buttonBg.fillRoundedRect(-120, -20, 240, 40, 10);
                buttonBg.lineStyle(2, 0x3a4558);
                buttonBg.strokeRoundedRect(-120, -20, 240, 40, 10);

                const buttonText = scene.add.text(0, 0, 'Press SPACE to restart', {
                    fontSize: '20px',
                    fontFamily: 'Verdana, sans-serif',
                    fill: '#ffffff'
                }).setOrigin(0.5);

                button.add([buttonBg, buttonText]);

                // Add pulsing animation to button
                scene.tweens.add({
                    targets: button,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                // Add all elements to container
                container.add([panel, innerGlow, gameOverText, scoreText, killsText, moultsText, button]);

                // Fade in animation
                scene.tweens.add({
                    targets: container,
                    alpha: 1,
                    y: scene.cameras.main.centerY,
                    duration: 600,
                    ease: 'Back.easeOut'
                });

                // Re-enable keyboard input
                scene.input.keyboard.enabled = true;

                // Create a new space key for the game over screen
                const spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
                spaceKey.once('down', () => {
                    // Fade out animation
                    scene.tweens.add({
                        targets: [container, overlay],
                        alpha: 0,
                        duration: 300,
                        ease: 'Power2',
                        onComplete: () => {
                            // Stop any ongoing tweens or animations
                            scene.tweens.killAll();
                            
                            // Clean up game objects
                            orbs.forEach(orb => orb && orb.destroy());
                            bots.forEach(bot => bot && bot.destroy());
                            husks.forEach(husk => husk && husk.destroy());
                            
                            // Reset arrays
                            orbs = [];
                            bots = [];
                            husks = [];
                            botRespawnTimers = [];
                            
                            // Reset game state
                            moultMeter = 0;
                            gameOver = false;
                            husksCreated = 0;
                            kills = 0;
                            score = 0;
                            
                            // Switch to start scene
                            scene.scene.stop('GameScene');
                            scene.scene.start('StartScene', { lastUsername: playerUsername });
                        }
                    });
                });
            }
        });

        // Add camera shake
        scene.cameras.main.shake(200, 0.01);
    }
}

function createOrb(scene) {
    const x = Phaser.Math.Between(50, WORLD_WIDTH - 50);
    const y = Phaser.Math.Between(50, WORLD_HEIGHT - 50);
    
    const container = scene.add.container(x, y);
    container.setAlpha(0); // Start invisible
    
    const colorSet = ORB_COLORS[Phaser.Math.Between(0, ORB_COLORS.length - 1)];
    
    // Create layers with improved visual hierarchy
    const layers = [
        { radius: 20, color: colorSet.glow, alpha: 0.1 },  // Outer glow
        { radius: 16, color: colorSet.glow, alpha: 0.2 },  // Middle glow
        { radius: 12, color: colorSet.glow, alpha: 0.4 },  // Inner glow
        { radius: 8, color: colorSet.core, alpha: 1.0 },   // Core
        { radius: 6, color: 0xffffff, alpha: 0.8 },        // Inner highlight
        { radius: 3, color: 0xffffff, alpha: 1.0 }         // Center highlight
    ];
    
    const circles = layers.map(layer => {
        return scene.add.circle(0, 0, layer.radius, layer.color, layer.alpha);
    });
    
    const highlight = scene.add.circle(-3, -3, 2, 0xffffff, 0.9);
    circles.push(highlight);
    
    container.add(circles);
    
    // Fade in with slight scale up
    scene.tweens.add({
        targets: container,
        alpha: 1,
        scale: { from: 0.8, to: 1 },
        duration: 300,
        ease: 'Back.easeOut'
    });
    
    // Add floating animation after fade-in
    scene.tweens.add({
        targets: container,
        y: y + 5,
        duration: 1500 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    // Add pulsing animation
    scene.tweens.add({
        targets: circles,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 1000 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    scene.physics.add.existing(container);
    container.body.setCircle(32);
    container.body.offset.x = -32;
    container.body.offset.y = -32;
    
    container.id = `orb_${Date.now()}_${Math.random()}`;
    
    scene.physics.add.overlap(player, container, collectOrb, null, scene);
    
    orbs.push(container);
    return container;
}

function collectOrb(collector, orb) {
    if (!orb.isCollected) {
        orb.isCollected = true;
        moultMeter++;
        updateMoultMeterText();
        
        // Create new orb
        const newOrb = createOrb(scene);
        
        // Remove old orb
        const index = orbs.indexOf(orb);
        if (index > -1) {
            orbs.splice(index, 1);
        }
        orb.destroy();
    }
}

function createBot(scene) {
    // Clean up any dead bots and invalid entries
    bots = bots.filter(bot => bot && !bot.isDestroyed && bot.body);
    
    // Don't create new bot if we're at or over the limit
    if (bots.length >= TOTAL_BOTS) return null;
    
    try {
        const x = Phaser.Math.Between(50, WORLD_WIDTH - 50);
        const y = Phaser.Math.Between(50, WORLD_HEIGHT - 50);
        
        const bot = createBlob(scene, x, y);
        if (!bot || !bot.body) return null;
        
        bot.playerName = BOT_NAMES[Phaser.Math.Between(0, BOT_NAMES.length - 1)];
        bot.direction = Phaser.Math.Between(0, 360);
        bot.moultTimer = 0;
        bot.score = 0;
        bot.kills = 0;
        bot.husksCreated = 0;
        
        // Add name tag above bot
        const nameTag = scene.add.text(0, -50, bot.playerName, {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Verdana, sans-serif',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        bot.add(nameTag);
        
        // Add simple push collisions
        scene.physics.add.collider(bot, bots, (bot1, bot2) => {
            // Calculate push direction
            const dx = bot2.x - bot1.x;
            const dy = bot2.y - bot1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Normalize direction
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Push force
            const pushForce = 400;
            
            // Push apart
            bot1.body.setVelocity(-nx * pushForce, -ny * pushForce);
            bot2.body.setVelocity(nx * pushForce, ny * pushForce);
        });
        
        // Add simple push collision with player
        scene.physics.add.collider(bot, player, (bot, player) => {
            // Calculate push direction
            const dx = player.x - bot.x;
            const dy = player.y - bot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Normalize direction
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Push force
            const pushForce = 400;
            
            // Push apart
            bot.body.setVelocity(-nx * pushForce, -ny * pushForce);
            player.body.setVelocity(nx * pushForce, ny * pushForce);
        });
         
        // Add collision with existing husks
        husks.forEach(husk => {
            if (!husk || husk.isDestroyed) return;
            if (husk.isBotHusk && husk.originalBot !== bot) {
                scene.physics.add.overlap(bot, husk, botHitHusk, null, scene);
            }
            if (husk.isPlayerHusk) {
                scene.physics.add.overlap(bot, husk, botHitHusk, null, scene);
            }
        });
        
        if (bot && bot.body) {
            bot.moultMeter = 0; // Add moult meter to bots
        }
        
        bots.push(bot);
        return bot;
    } catch (error) {
        console.error('Error creating bot:', error);
        return null;
    }
}

function updateBots() {
    // Clean up invalid bots
    bots = bots.filter(bot => bot && !bot.isDestroyed && bot.body);
    
    bots.forEach(bot => {
        try {
            if (!bot || bot.isDestroyed || !bot.body) return;
            
            // Random direction change (2% chance per update)
            if (Phaser.Math.Between(0, 100) < 2) {
                bot.direction = Phaser.Math.Between(0, 360);
            }
            
            // Calculate current speed based on moult meter
            const isReadyToMoult = bot.moultMeter >= BASE_MOULT_THRESHOLD;
            const currentSpeed = isReadyToMoult ? 180 : STANDARD_SPEED;
            
            // Move in current direction
            bot.body.setVelocity(
                Math.cos(bot.direction * Math.PI / 180) * currentSpeed,
                Math.sin(bot.direction * Math.PI / 180) * currentSpeed
            );
            
            // Increment bot's moult meter over time
            if (bot.moultMeter < BASE_MOULT_THRESHOLD) {
                bot.moultMeter += 0.1;
            }
            
            // Create husk when moult meter is full (5% chance per update when ready)
            if (bot.moultMeter >= BASE_MOULT_THRESHOLD && Phaser.Math.Between(0, 100) < 5) {
                createBotHusk(bot.x, bot.y, bot);
                bot.moultMeter = 0;
                
                // Change direction after creating husk
                bot.direction = Phaser.Math.Between(0, 360);
            }
            
            // Avoid world boundaries
            const margin = 100;
            if (bot.x < margin || bot.x > WORLD_WIDTH - margin || 
                bot.y < margin || bot.y > WORLD_HEIGHT - margin) {
                // Turn towards center
                const angleToCenter = Phaser.Math.Angle.Between(
                    bot.x, bot.y,
                    WORLD_WIDTH / 2, WORLD_HEIGHT / 2
                );
                bot.direction = angleToCenter * (180 / Math.PI);
            }
            
        } catch (error) {
            console.error('Error updating bot:', error);
            if (bot && !bot.isDestroyed) {
                bot.isDestroyed = true;
                bot.destroy();
            }
        }
    });
}

// Update the moult meter display function to be more stable
function updateMoultMeterText() {
    const currentThreshold = Math.floor(BASE_MOULT_THRESHOLD * (1 + (husksCreated * 0.1)));
    const fillPercentage = Math.min(moultMeter / currentThreshold, 1);
    const isReady = moultMeter >= currentThreshold;
    
    // Update background
    scene.meterBg.clear();
    scene.meterBg.fillStyle(0x1a1a1a, 0.8);
    scene.meterBg.lineStyle(2, 0x333333);
    scene.meterBg.fillRoundedRect(
        scene.meterConfig.x - 2, 
        scene.meterConfig.y - 2, 
        scene.meterConfig.width + 4, 
        scene.meterConfig.height + 4, 
        scene.meterConfig.cornerRadius
    );
    
    // Update fill
    if (moultMeter > 0) {
        const fillWidth = Math.max(4, fillPercentage * scene.meterConfig.width);
        
        scene.meterFill.clear();
        scene.meterFill.fillStyle(player.color, 1);
        scene.meterFill.fillRoundedRect(
            scene.meterConfig.x,
            scene.meterConfig.y,
            fillWidth,
            scene.meterConfig.height,
            scene.meterConfig.cornerRadius
        );
        
        if (isReady) {
            scene.meterFill.lineStyle(3, 0xffffff, 0.7);
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

// Update botHitHusk to include fade-out animation for husks
function botHitHusk(bot, husk) {
    try {
        if (!bot || !bot.body || !husk || !husk.body || 
            bot.isBeingDestroyed || bot.isDestroyed || 
            husk.isDestroyed) return;
            
        bot.isBeingDestroyed = true;

        if (husk.isPlayerHusk || (husk.isBotHusk && husk.originalBot !== bot)) {
            // Disable physics first
            if (bot.body) scene.physics.world.disable(bot);
            
            // Create explosion particles
            const numParticles = 12;
            const particles = [];
            for (let i = 0; i < numParticles; i++) {
                const angle = (i / numParticles) * Math.PI * 2;
                const speed = 200;
                const particle = scene.add.circle(bot.x, bot.y, 8, bot.color);
                particle.setDepth(1000);
                
                // Set particle velocity
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                
                // Animate particle
                scene.tweens.add({
                    targets: particle,
                    x: particle.x + vx,
                    y: particle.y + vy,
                    alpha: 0,
                    scale: 0.1,
                    duration: 500,
                    ease: 'Power2',
                    onComplete: () => particle.destroy()
                });
                particles.push(particle);
            }

            // Create shockwave effect
            const shockwave = scene.add.circle(bot.x, bot.y, 10, bot.color, 0.5);
            shockwave.setDepth(999);
            scene.tweens.add({
                targets: shockwave,
                scale: 3,
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => shockwave.destroy()
            });
            
            // Fade out bot's husks with explosion effect
            const botHusks = husks.filter(h => h && !h.isDestroyed && h.isBotHusk && h.originalBot === bot);
            botHusks.forEach(h => {
                if (h && h.body) {
                    scene.physics.world.disable(h);
                    // Add explosion effect for each husk
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        const speed = 150;
                        const particle = scene.add.circle(h.x, h.y, 6, bot.color, 0.7);
                        
                        scene.tweens.add({
                            targets: particle,
                            x: h.x + Math.cos(angle) * speed,
                            y: h.y + Math.sin(angle) * speed,
                            alpha: 0,
                            scale: 0.1,
                            duration: 400,
                            ease: 'Power2',
                            onComplete: () => particle.destroy()
                        });
                    }
                    
                    // Fade out husk
                    scene.tweens.add({
                        targets: h,
                        alpha: 0,
                        scale: 0.5,
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => {
                            if (h && !h.isDestroyed) h.destroy();
                        }
                    });
                }
            });
            
            // Update husks array after animation completes
            setTimeout(() => {
                husks = husks.filter(h => h && !h.isDestroyed);
            }, 600);

            // Show kill indicator
            if (bot && bot.x && bot.y) {
                const killText = scene.add.text(bot.x, bot.y, '+3', {
                    fontSize: '24px',
                    fill: '#ff0000',
                    fontFamily: 'Verdana, sans-serif',
                    fontWeight: 'bold'
                }).setOrigin(0.5).setDepth(1000);
                
                scene.tweens.add({
                    targets: killText,
                    y: bot.y - 50,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => killText.destroy()
                });
            }
            
            if (husk.isPlayerHusk) {
                kills++;
                updateScoreDisplay();
                showKillNotification(bot.playerName);
            }

            // Scale up and fade out bot with explosion
            scene.tweens.add({
                targets: bot,
                scale: 1.5,
                alpha: 0,
                duration: 200,
                ease: 'Power2',
                onComplete: () => {
                    if (bot && !bot.isDestroyed) {
                        bot.removeAll(true);
                        bot.destroy();
                        bots = bots.filter(b => b && !b.isDestroyed);
                        
                        // Call manageBotCount instead of direct respawn
                        manageBotCount();
                    }
                }
            });

            // Add camera shake if the bot is close to the player
            const distToPlayer = Phaser.Math.Distance.Between(bot.x, bot.y, player.x, player.y);
            if (distToPlayer < 400) {
                const intensity = 0.01 * (1 - (distToPlayer / 400));
                scene.cameras.main.shake(200, intensity);
            }
        }
    } catch (error) {
        console.error('Error in botHitHusk:', error);
        if (bot && !bot.isDestroyed) {
            bot.isDestroyed = true;
            bot.destroy();
            // Also manage bot count if there's an error
            manageBotCount();
        }
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

        // Update background style
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.lineStyle(2, 0x333333);
        bg.fillRoundedRect(0, 0, 190, 150, 10);
        bg.strokeRoundedRect(0, 0, 190, 150, 10);
        this.container.add(bg);
        
        // Add subtle header background
        const headerBg = this.scene.add.graphics();
        headerBg.fillStyle(0x000000, 0.5);
        headerBg.fillRoundedRect(0, 0, 190, 30, { tl: 10, tr: 10, bl: 0, br: 0 });
        this.container.add(headerBg);
        
        // Update title style
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

// Add new bounce handling function
function handleBounce(obj1, obj2) {
    // Calculate vector between objects
    const dx = obj2.x - obj1.x;
    const dy = obj2.y - obj1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Push objects apart with a strong force
    const pushForce = 400;
    
    // Apply opposite forces to each object
    obj1.body.setVelocity(
        -nx * pushForce,
        -ny * pushForce
    );
    
    obj2.body.setVelocity(
        nx * pushForce,
        ny * pushForce
    );
    
    // Quick visual feedback
    scene.tweens.add({
        targets: [obj1, obj2],
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 50,
        yoyo: true,
        ease: 'Quad.easeOut'
    });
}

// Add this new function to manage bot spawning
function manageBotCount() {
    // Clean up invalid bots first
    bots = bots.filter(bot => bot && !bot.isDestroyed && bot.body);
    
    // If we're below the target count and no respawn timer is active
    if (bots.length < TOTAL_BOTS && !botRespawnTimer) {
        botRespawnTimer = scene.time.delayedCall(3000, () => {
            if (bots.length < TOTAL_BOTS) {
                createBot(scene);
            }
            botRespawnTimer = null;
            // Check again after spawning
            manageBotCount();
        });
    }
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