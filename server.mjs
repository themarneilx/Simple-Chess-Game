import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import crypto from 'crypto';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory room storage
const rooms = new Map();

function generateRoomId() {
  return crypto.randomBytes(8).toString('hex');
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded ambiguous chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getPublicRooms() {
  const publicRooms = [];
  for (const [id, room] of rooms) {
    if (!room.isPrivate && (room.status === 'waiting' || room.status === 'ready')) {
      const creator = room.players.find((p) => p.socketId === room.creatorSocketId);
      publicRooms.push({
        id,
        playerCount: room.players.length,
        isPrivate: room.isPrivate,
        status: room.status,
        createdAt: room.createdAt,
        creatorName: creator?.name || 'Unknown',
      });
    }
  }
  return publicRooms;
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Create a new room
    socket.on('create-room', ({ isPrivate, playerName }, callback) => {
      const roomId = generateRoomId();
      const code = isPrivate ? generateRoomCode() : null;
      const playerColor = Math.random() < 0.5 ? 'w' : 'b';

      const room = {
        id: roomId,
        players: [
          { socketId: socket.id, color: playerColor, connected: true, name: playerName || 'Player 1' },
        ],
        isPrivate,
        code,
        status: 'waiting',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        createdAt: Date.now(),
        creatorSocketId: socket.id,
        chatHistory: [],
      };

      rooms.set(roomId, room);
      socket.join(roomId);

      console.log(
        `[Room] Created ${isPrivate ? 'private' : 'public'} room ${roomId}${code ? ` (code: ${code})` : ''} by ${playerName}`
      );

      callback({
        success: true,
        roomId,
        code,
        color: playerColor,
      });

      // Broadcast updated room list to all clients
      io.emit('rooms-updated', getPublicRooms());
    });

    // Join a room (by ID or code)
    socket.on('join-room', ({ roomId, code, playerName }, callback) => {
      let targetRoom = null;
      let targetRoomId = roomId;

      if (code) {
        // Find room by code
        for (const [id, room] of rooms) {
          if (room.code === code.toUpperCase() && room.status === 'waiting') {
            targetRoom = room;
            targetRoomId = id;
            break;
          }
        }
      } else if (roomId) {
        targetRoom = rooms.get(roomId);
      }

      if (!targetRoom) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      if (targetRoom.status !== 'waiting') {
        callback({ success: false, error: 'Game already in progress' });
        return;
      }

      if (targetRoom.players.length >= 2) {
        callback({ success: false, error: 'Room is full' });
        return;
      }

      // Check if player already in room
      if (targetRoom.players.some((p) => p.socketId === socket.id)) {
        callback({ success: false, error: 'Already in this room' });
        return;
      }

      const existingColor = targetRoom.players[0].color;
      const newColor = existingColor === 'w' ? 'b' : 'w';
      const joinerName = playerName || 'Player 2';

      targetRoom.players.push({
        socketId: socket.id,
        color: newColor,
        connected: true,
        name: joinerName,
      });
      // Don't auto-start — set to 'ready', wait for creator to press "Start Game"
      targetRoom.status = 'ready';

      socket.join(targetRoomId);

      const creatorPlayer = targetRoom.players.find((p) => p.socketId === targetRoom.creatorSocketId);

      console.log(`[Room] ${joinerName} joined room ${targetRoomId}, waiting for creator to start.`);

      callback({
        success: true,
        roomId: targetRoomId,
        color: newColor,
        opponentName: creatorPlayer?.name || 'Opponent',
        isCreator: false,
      });

      // Notify the room creator that someone joined
      socket.to(targetRoomId).emit('player-joined', {
        playerName: joinerName,
        playerColor: newColor,
      });

      // Send existing chat history to the joiner
      if (targetRoom.chatHistory && targetRoom.chatHistory.length > 0) {
        socket.emit('chat-history', targetRoom.chatHistory);
      }

      // Broadcast updated room list
      io.emit('rooms-updated', getPublicRooms());
    });

    // Start game (creator only)
    socket.on('start-game', ({ roomId }, callback) => {
      const room = rooms.get(roomId);
      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      if (room.creatorSocketId !== socket.id) {
        callback?.({ success: false, error: 'Only the room creator can start the game' });
        return;
      }

      if (room.players.length < 2) {
        callback?.({ success: false, error: 'Need 2 players to start' });
        return;
      }

      room.status = 'playing';

      console.log(`[Room] Game started in room ${roomId}!`);

      // Notify both players the game is starting, including opponent names
      room.players.forEach((player) => {
        const opponent = room.players.find((p) => p.socketId !== player.socketId);
        io.to(player.socketId).emit('game-start', {
          roomId,
          fen: room.fen,
          opponentName: opponent?.name || 'Opponent',
        });
      });

      callback?.({ success: true });

      // Broadcast updated room list
      io.emit('rooms-updated', getPublicRooms());
    });

    // List public rooms
    socket.on('list-rooms', (callback) => {
      callback(getPublicRooms());
    });

    // Check room status (used by game page to verify if game already started)
    socket.on('check-room', ({ roomId }, callback) => {
      const room = rooms.get(roomId);
      if (room) {
        const player = room.players.find((p) => p.socketId === socket.id);
        const opponent = room.players.find((p) => p.socketId !== socket.id);
        callback({
          playing: room.status === 'playing',
          playerCount: room.players.length,
          opponentName: opponent?.name || null,
        });
      } else {
        callback({ playing: false, playerCount: 0, opponentName: null });
      }
    });

    // Leave room (manually triggered from Lobby "Cancel" button)
    socket.on('leave-room', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const playerIndex = room.players.findIndex((p) => p.socketId === socket.id);
      if (playerIndex !== -1) {
        if (room.status === 'waiting' || room.status === 'ready') {
          // If creator leaves, delete the entire room
          if (room.creatorSocketId === socket.id) {
            socket.to(roomId).emit('room-closed');
            rooms.delete(roomId);
            console.log(`[Room] Creator canceled room ${roomId}`);
          } else {
            // If joiner leaves, put room back to 'waiting'
            room.players.splice(playerIndex, 1);
            room.status = 'waiting';
            socket.to(roomId).emit('player-left', { playerName: room.players[playerIndex]?.name });
            console.log(`[Room] Player left room ${roomId}, back to waiting`);
          }
        }
        socket.leave(roomId);
        // Immediately broadcast updated rooms
        io.emit('rooms-updated', getPublicRooms());
      }
    });

    // Chat message (in-game and lobby)
    socket.on('chat-message', ({ roomId, text, sender, color }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const message = {
        sender: sender || 'Anonymous',
        text,
        timestamp: Date.now(),
        color: color || null,
      };

      // Store in room chat history
      if (!room.chatHistory) room.chatHistory = [];
      room.chatHistory.push(message);
      // Keep only last 100 messages
      if (room.chatHistory.length > 100) room.chatHistory.shift();

      // Broadcast to everyone in room (including sender)
      io.to(roomId).emit('chat-message', message);

      console.log(`[Chat] Room ${roomId}: ${sender}: ${text}`);
    });

    // Make a move
    socket.on('make-move', ({ roomId, from, to, promotion }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      // Broadcast the move to the other player
      socket.to(roomId).emit('opponent-move', { from, to, promotion });

      console.log(`[Move] Room ${roomId}: ${from} -> ${to}`);
    });

    // Update FEN (keep server in sync)
    socket.on('update-fen', ({ roomId, fen }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.fen = fen;
      }
    });

    // Game over
    socket.on('game-over', ({ roomId, result }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.status = 'finished';
        io.to(roomId).emit('game-ended', { result });
        console.log(`[Game] Room ${roomId} ended: ${result}`);
      }
    });

    // Resign
    socket.on('resign', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) {
        room.status = 'finished';
        const winner = player.color === 'w' ? 'black' : 'white';
        io.to(roomId).emit('opponent-resigned', { winner });
        console.log(`[Game] Player resigned in room ${roomId}`);
      }
    });

    // Reconnect to a room after disconnect
    socket.on('reconnect-room', ({ roomId, playerName }, callback) => {
      const room = rooms.get(roomId);
      if (!room) {
        callback?.({ success: false, error: 'Room no longer exists' });
        return;
      }

      // Find the disconnected player by name and color
      const player = room.players.find(
        (p) => !p.connected && p.name === playerName
      );

      if (!player) {
        callback?.({ success: false, error: 'No matching disconnected player found' });
        return;
      }

      // Update socket ID and mark as connected
      const oldSocketId = player.socketId;
      player.socketId = socket.id;
      player.connected = true;

      // If this player was the creator, update creator reference
      if (room.creatorSocketId === oldSocketId) {
        room.creatorSocketId = socket.id;
      }

      socket.join(roomId);

      // Clear any pending timers
      if (room.cleanupTimer) {
        clearTimeout(room.cleanupTimer);
        room.cleanupTimer = null;
      }
      if (room.disconnectTimer) {
        clearTimeout(room.disconnectTimer);
        room.disconnectTimer = null;
      }

      const opponent = room.players.find((p) => p.socketId !== socket.id);

      console.log(`[Room] ${playerName} reconnected to room ${roomId}`);

      // Notify opponent that player is back
      socket.to(roomId).emit('opponent-reconnected');

      // Send game state back to the reconnecting player
      callback?.({
        success: true,
        fen: room.fen,
        color: player.color,
        opponentName: opponent?.name || 'Opponent',
        chatHistory: room.chatHistory || [],
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);

      // Find and handle rooms the player was in
      for (const [roomId, room] of rooms) {
        const playerIndex = room.players.findIndex(
          (p) => p.socketId === socket.id
        );
        if (playerIndex !== -1) {
          if (room.status === 'waiting' || room.status === 'ready') {
            // If creator disconnects, delete the room
            if (room.creatorSocketId === socket.id) {
              // Notify any joined player
              socket.to(roomId).emit('room-closed');
              rooms.delete(roomId);
              console.log(`[Room] Deleted room ${roomId} (creator left)`);
            } else {
              // Non-creator left from ready room, go back to waiting
              room.players.splice(playerIndex, 1);
              room.status = 'waiting';
              socket.to(roomId).emit('player-left', { playerName: room.players[playerIndex]?.name });
              console.log(`[Room] Player left waiting room ${roomId}`);
            }
          } else if (room.status === 'playing') {
            // Mark player as disconnected
            room.players[playerIndex].connected = false;

            // Notify opponent after a short grace period (3 seconds)
            // so brief network blips don't trigger the overlay
            room.disconnectTimer = setTimeout(() => {
              const currentRoom = rooms.get(roomId);
              if (currentRoom) {
                const p = currentRoom.players[playerIndex];
                if (p && !p.connected) {
                  socket.to(roomId).emit('opponent-disconnected');
                }
              }
            }, 3000);

            console.log(`[Room] Player disconnected from room ${roomId}`);

            // Auto-cleanup after 120 seconds if still disconnected
            room.cleanupTimer = setTimeout(() => {
              const currentRoom = rooms.get(roomId);
              if (
                currentRoom &&
                currentRoom.players.some((p) => !p.connected)
              ) {
                // Notify remaining connected players
                currentRoom.players.forEach((p) => {
                  if (p.connected) {
                    io.to(p.socketId).emit('opponent-abandoned');
                  }
                });
                rooms.delete(roomId);
                console.log(`[Room] Cleaned up abandoned room ${roomId}`);
              }
            }, 120000);
          }

          io.emit('rooms-updated', getPublicRooms());
        }
      }
    });
  });

  server.listen(port, hostname, () => {
    console.log(`\n  ♔ Chess Server ready on http://${hostname}:${port}\n`);
  });
});
