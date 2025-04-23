let socket;
let otherPlayers = new Map();

function initializeSocket() {
    socket = io();

    // Handle connection
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    // Handle initial game state
    socket.on('gameState', (state) => {
        // Initialize other players
        state.players.forEach(playerData => {
            if (playerData.id !== socket.id) {
                createOtherPlayer(playerData);
            }
        });

        // Initialize husks
        state.husks.forEach(huskData => {
            createHusk(huskData);
        });

        // Initialize orbs
        state.orbs.forEach(orbData => {
            createOrb(scene, orbData);
        });
    });

    // Handle new player joining
    socket.on('playerJoined', (playerData) => {
        createOtherPlayer(playerData);
    });

    // Handle player movement
    socket.on('playerMoved', (moveData) => {
        const otherPlayer = otherPlayers.get(moveData.id);
        if (otherPlayer) {
            scene.tweens.add({
                targets: otherPlayer,
                x: moveData.x,
                y: moveData.y,
                duration: 100,
                ease: 'Linear'
            });
        }
    });

    // Handle moult creation
    socket.on('moultCreated', (huskData) => {
        createHusk(huskData);
    });

    // Handle orb collection
    socket.on('orbCollected', (data) => {
        const orb = orbs.find(o => o.id === data.oldOrbId);
        if (orb) {
            orb.destroy();
            orbs = orbs.filter(o => o.id !== data.oldOrbId);
            createOrb(scene, data.newOrb);
        }
    });

    // Handle player death
    socket.on('playerKilled', (data) => {
        if (data.killedId === socket.id) {
            handlePlayerDeath();
        } else {
            const killedPlayer = otherPlayers.get(data.killedId);
            if (killedPlayer) {
                handleOtherPlayerDeath(killedPlayer);
            }
        }
    });

    // Handle player disconnection
    socket.on('playerLeft', (playerId) => {
        const player = otherPlayers.get(playerId);
        if (player) {
            player.destroy();
            otherPlayers.delete(playerId);
        }
    });
}

function createOtherPlayer(playerData) {
    const otherPlayer = createBlob(scene, playerData.x, playerData.y, playerData.color);
    otherPlayer.playerId = playerData.id;
    otherPlayer.playerName = playerData.username;
    otherPlayers.set(playerData.id, otherPlayer);
    
    // Add name tag above player
    const nameTag = scene.add.text(0, -50, playerData.username, {
        fontSize: '16px',
        fill: '#ffffff',
        fontFamily: 'Verdana, sans-serif'
    }).setOrigin(0.5);
    otherPlayer.add(nameTag);
    
    return otherPlayer;
}

function handleOtherPlayerDeath(player) {
    if (!player) return;
    
    // Create explosion effect
    const numParticles = 12;
    for (let i = 0; i < numParticles; i++) {
        const angle = (i / numParticles) * Math.PI * 2;
        const speed = 200;
        const particle = scene.add.circle(player.x, player.y, 8, player.color);
        
        scene.tweens.add({
            targets: particle,
            x: particle.x + Math.cos(angle) * speed,
            y: particle.y + Math.sin(angle) * speed,
            alpha: 0,
            scale: 0.1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => particle.destroy()
        });
    }
    
    // Fade out player
    scene.tweens.add({
        targets: player,
        alpha: 0,
        scale: 1.5,
        duration: 200,
        ease: 'Power2',
        onComplete: () => player.destroy()
    });
} 