const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files from public directory
app.use(express.static('public'));

// Game state
const gameState = {
    players: new Map(),
    husks: new Map(),
    orbs: new Map()
};

// Constants
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1800;
const TOTAL_ORBS = 40;

// Initialize orbs
function initializeOrbs() {
    for (let i = 0; i < TOTAL_ORBS; i++) {
        const orb = {
            id: `orb_${i}`,
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT,
            color: Math.floor(Math.random() * 6) // Index for ORB_COLORS
        };
        gameState.orbs.set(orb.id, orb);
    }
}

// Socket connection handling
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Handle player join
    socket.on('playerJoin', (playerData) => {
        const player = {
            id: socket.id,
            x: WORLD_WIDTH / 2,
            y: WORLD_HEIGHT / 2,
            username: playerData.username,
            color: playerData.color,
            score: 0,
            kills: 0,
            husksCreated: 0
        };
        
        gameState.players.set(socket.id, player);
        
        // Send initial game state to player
        socket.emit('gameState', {
            players: Array.from(gameState.players.values()),
            husks: Array.from(gameState.husks.values()),
            orbs: Array.from(gameState.orbs.values())
        });
        
        // Broadcast new player to others
        socket.broadcast.emit('playerJoined', player);
    });

    // Handle player movement
    socket.on('playerMove', (position) => {
        const player = gameState.players.get(socket.id);
        if (player) {
            player.x = position.x;
            player.y = position.y;
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: position.x,
                y: position.y
            });
        }
    });

    // Handle moult creation
    socket.on('createMoult', (moultData) => {
        const player = gameState.players.get(socket.id);
        if (player && player.moultMeter >= 15) { // BASE_MOULT_THRESHOLD
            const huskId = `husk_${socket.id}_${Date.now()}`;
            const husk = {
                id: huskId,
                x: moultData.x,
                y: moultData.y,
                color: player.color,
                playerId: socket.id
            };
            
            gameState.husks.set(huskId, husk);
            player.husksCreated++;
            player.moultMeter = 0;
            
            io.emit('moultCreated', husk);
        }
    });

    // Handle orb collection
    socket.on('collectOrb', (orbId) => {
        if (gameState.orbs.has(orbId)) {
            const player = gameState.players.get(socket.id);
            if (player) {
                player.moultMeter = (player.moultMeter || 0) + 1;
                
                // Create new orb at random position
                const newOrb = {
                    id: orbId,
                    x: Math.random() * WORLD_WIDTH,
                    y: Math.random() * WORLD_HEIGHT,
                    color: Math.floor(Math.random() * 6)
                };
                
                gameState.orbs.set(orbId, newOrb);
                io.emit('orbCollected', {
                    oldOrbId: orbId,
                    newOrb: newOrb,
                    playerId: socket.id
                });
            }
        }
    });

    // Handle player death
    socket.on('playerDeath', (data) => {
        const player = gameState.players.get(socket.id);
        const killer = gameState.players.get(data.killerId);
        
        if (player && killer) {
            killer.kills++;
            killer.score += 3;
            io.emit('playerKilled', {
                killedId: socket.id,
                killerId: data.killerId
            });
        }
    });

    // Handle player collision
    socket.on('playerCollision', (data) => {
        const player = gameState.players.get(socket.id);
        const otherPlayer = gameState.players.get(data.otherId);
        
        if (player && otherPlayer) {
            // Calculate push direction
            const dx = otherPlayer.x - player.x;
            const dy = otherPlayer.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Normalize and apply push force
            const pushForce = 400;
            const nx = dx / dist;
            const ny = dy / dist;
            
            io.to(socket.id).emit('pushed', {
                vx: -nx * pushForce,
                vy: -ny * pushForce
            });
            
            io.to(data.otherId).emit('pushed', {
                vx: nx * pushForce,
                vy: ny * pushForce
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const player = gameState.players.get(socket.id);
        if (player) {
            // Remove player's husks
            for (const [huskId, husk] of gameState.husks) {
                if (husk.playerId === socket.id) {
                    gameState.husks.delete(huskId);
                }
            }
            
            gameState.players.delete(socket.id);
            io.emit('playerLeft', socket.id);
        }
        console.log('Player disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initializeOrbs();
}); 