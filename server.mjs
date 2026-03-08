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
    if (!room.isPrivate && room.status === 'waiting') {
      publicRooms.push({
        id,
        playerCount: room.players.length,
        isPrivate: room.isPrivate,
        status: room.status,
        createdAt: room.createdAt,
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
    socket.on('create-room', ({ isPrivate }, callback) => {
      const roomId = generateRoomId();
      const code = isPrivate ? generateRoomCode() : null;
      const playerColor = Math.random() < 0.5 ? 'w' : 'b';

      const room = {
        id: roomId,
        players: [
          { socketId: socket.id, color: playerColor, connected: true },
        ],
        isPrivate,
        code,
        status: 'waiting',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        createdAt: Date.now(),
      };

      rooms.set(roomId, room);
      socket.join(roomId);

      console.log(
        `[Room] Created ${isPrivate ? 'private' : 'public'} room ${roomId}${code ? ` (code: ${code})` : ''}`
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
    socket.on('join-room', ({ roomId, code }, callback) => {
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

      targetRoom.players.push({
        socketId: socket.id,
        color: newColor,
        connected: true,
      });
      targetRoom.status = 'playing';

      socket.join(targetRoomId);

      console.log(`[Room] Player joined room ${targetRoomId}, game starting!`);

      callback({
        success: true,
        roomId: targetRoomId,
        color: newColor,
      });

      // Notify both players the game is starting
      io.to(targetRoomId).emit('game-start', {
        roomId: targetRoomId,
        fen: targetRoom.fen,
      });

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
        callback({ playing: room.status === 'playing', playerCount: room.players.length });
      } else {
        callback({ playing: false, playerCount: 0 });
      }
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

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);

      // Find and handle rooms the player was in
      for (const [roomId, room] of rooms) {
        const playerIndex = room.players.findIndex(
          (p) => p.socketId === socket.id
        );
        if (playerIndex !== -1) {
          if (room.status === 'waiting') {
            // Room was waiting, just delete it
            rooms.delete(roomId);
            console.log(`[Room] Deleted empty room ${roomId}`);
          } else if (room.status === 'playing') {
            // Mark player as disconnected
            room.players[playerIndex].connected = false;
            socket.to(roomId).emit('opponent-disconnected');
            console.log(`[Room] Player disconnected from room ${roomId}`);

            // Auto-cleanup after 60 seconds
            setTimeout(() => {
              const currentRoom = rooms.get(roomId);
              if (
                currentRoom &&
                currentRoom.players.some((p) => !p.connected)
              ) {
                rooms.delete(roomId);
                console.log(`[Room] Cleaned up abandoned room ${roomId}`);
              }
            }, 60000);
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
