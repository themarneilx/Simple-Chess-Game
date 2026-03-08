'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { RoomInfo } from '@/types/game';
import {
  SwordsIcon, GlobeIcon, LockIcon, CopyIcon, CastleIcon,
  UserIcon, WarningIcon, CloseIcon,
} from '@/components/Icons';

interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
}

export default function LobbyPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [waitingRoom, setWaitingRoom] = useState<{
    roomId: string;
    code: string | null;
    color: string;
    isCreator: boolean;
    opponentName: string | null;
  } | null>(null);

  // Lobby chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load saved name
  useEffect(() => {
    const saved = sessionStorage.getItem('chess-player-name');
    if (saved) setPlayerName(saved);
  }, []);

  // Save name on change
  useEffect(() => {
    if (playerName) sessionStorage.setItem('chess-player-name', playerName);
  }, [playerName]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchRooms = useCallback(() => {
    const socket = getSocket();
    socket.emit('list-rooms', (roomList: RoomInfo[]) => {
      setRooms(roomList);
    });
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      fetchRooms();
    });

    socket.on('rooms-updated', (roomList: RoomInfo[]) => {
      setRooms(roomList);
    });

    socket.on('game-start', ({ roomId, opponentName }: { roomId: string; opponentName?: string }) => {
      if (opponentName) {
        sessionStorage.setItem(`chess-opponent-${roomId}`, opponentName);
      }
      sessionStorage.setItem(`chess-ready-${roomId}`, 'true');
      router.push(`/game?mode=online&room=${roomId}`);
    });

    socket.on('player-joined', ({ playerName: joinerName }: { playerName: string }) => {
      setWaitingRoom((prev) => prev ? { ...prev, opponentName: joinerName } : prev);
    });

    socket.on('chat-message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('chat-history', (history: ChatMessage[]) => {
      setChatMessages(history);
    });

    socket.on('room-closed', () => {
      setWaitingRoom(null);
      setError('Room was closed by the host');
      fetchRooms();
    });

    socket.on('player-left', () => {
      setWaitingRoom((prev) => prev ? { ...prev, opponentName: null } : prev);
    });

    // Initial fetch
    if (socket.connected) {
      fetchRooms();
    }

    return () => {
      socket.off('rooms-updated');
      socket.off('game-start');
      socket.off('connect');
      socket.off('player-joined');
      socket.off('chat-message');
      socket.off('chat-history');
      socket.off('room-closed');
      socket.off('player-left');
    };
  }, [fetchRooms, router]);

  const createRoom = (isPrivate: boolean) => {
    if (!playerName.trim()) {
      setError('Please enter your name first');
      return;
    }
    setCreating(true);
    setError('');
    setChatMessages([]);
    const socket = getSocket();

    socket.emit(
      'create-room',
      { isPrivate, playerName: playerName.trim() },
      (response: { success: boolean; roomId: string; code: string | null; color: string }) => {
        setCreating(false);
        if (response.success) {
          setWaitingRoom({
            roomId: response.roomId,
            code: response.code,
            color: response.color,
            isCreator: true,
            opponentName: null,
          });
        }
      }
    );
  };

  const joinRoom = (roomId?: string, code?: string) => {
    if (!playerName.trim()) {
      setError('Please enter your name first');
      return;
    }
    setJoining(true);
    setError('');
    setChatMessages([]);
    const socket = getSocket();

    socket.emit(
      'join-room',
      { roomId, code, playerName: playerName.trim() },
      (response: { success: boolean; roomId?: string; color?: string; error?: string; opponentName?: string; isCreator?: boolean }) => {
        setJoining(false);
        if (response.success && response.roomId) {
          sessionStorage.setItem(`chess-color-${response.roomId}`, response.color || 'b');
          if (response.opponentName) {
            sessionStorage.setItem(`chess-opponent-${response.roomId}`, response.opponentName);
          }
          setWaitingRoom({
            roomId: response.roomId,
            code: null,
            color: response.color || 'b',
            isCreator: false,
            opponentName: response.opponentName || null,
          });
        } else {
          setError(response.error || 'Failed to join room');
        }
      }
    );
  };

  const handleStartGame = () => {
    if (!waitingRoom) return;
    const socket = getSocket();
    socket.emit('start-game', { roomId: waitingRoom.roomId }, (response: { success: boolean; error?: string }) => {
      if (!response.success) {
        setError(response.error || 'Failed to start game');
      }
    });
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || !waitingRoom) return;
    const socket = getSocket();
    socket.emit('chat-message', {
      roomId: waitingRoom.roomId,
      text: chatInput.trim(),
      sender: playerName.trim(),
    });
    setChatInput('');
  };

  const handleLeaveRoom = useCallback(() => {
    if (waitingRoom) {
      const socket = getSocket();
      socket.emit('leave-room', { roomId: waitingRoom.roomId });
    }
    setWaitingRoom(null);
    setChatMessages([]);
    fetchRooms();
  }, [waitingRoom, fetchRooms]);

  const handleJoinByCode = () => {
    if (joinCode.trim().length !== 4) {
      setError('Code must be 4 characters');
      return;
    }
    joinRoom(undefined, joinCode.trim().toUpperCase());
  };

  const handleCopyCode = () => {
    if (waitingRoom?.code) {
      navigator.clipboard.writeText(waitingRoom.code);
    }
  };

  // Waiting room view
  if (waitingRoom) {
    sessionStorage.setItem(`chess-color-${waitingRoom.roomId}`, waitingRoom.color);

    const myColorLabel = waitingRoom.color === 'w' ? 'White' : 'Black';
    const opponentColorLabel = waitingRoom.color === 'w' ? 'Black' : 'White';

    return (
      <div className="landing-container">
        <div className="landing-bg-glow" />

        <div className="landing-content panel-fade-in">
          <div className="waiting-room">
            <h2 className="waiting-title">
              {waitingRoom.opponentName ? 'Ready to Play!' : 'Waiting for Opponent...'}
            </h2>
            {!waitingRoom.opponentName && <div className="waiting-spinner" />}

            {/* Players display */}
            <div className="waiting-players">
              <div className="waiting-player-card active">
                <div className="waiting-player-icon">
                  <UserIcon size={24} color="#c9a96e" />
                </div>
                <div className="waiting-player-name">{playerName}</div>
                <div className="waiting-player-label">{myColorLabel} {waitingRoom.isCreator ? '(Host)' : ''}</div>
              </div>

              <div className="vs-divider">VS</div>

              <div className={`waiting-player-card ${waitingRoom.opponentName ? 'active' : ''}`}>
                <div className="waiting-player-icon">
                  <UserIcon size={24} color={waitingRoom.opponentName ? '#9b8ced' : 'rgba(255,255,255,0.15)'} />
                </div>
                <div className={`waiting-player-name ${!waitingRoom.opponentName ? 'waiting-player-empty' : ''}`}>
                  {waitingRoom.opponentName || 'Waiting...'}
                </div>
                <div className="waiting-player-label">
                  {waitingRoom.opponentName ? opponentColorLabel : '—'}
                </div>
              </div>
            </div>

            {/* Room code for private rooms */}
            {waitingRoom.code && (
              <div className="room-code-display">
                <div className="room-code-label">Room Code</div>
                <div className="room-code-value">
                  {waitingRoom.code.split('').map((char, i) => (
                    <span key={i} className="code-char">{char}</span>
                  ))}
                </div>
                <button className="btn-copy" onClick={handleCopyCode}>
                  <span className="btn-icon-text"><CopyIcon size={14} /> Copy Code</span>
                </button>
                <p className="room-code-hint">Share this code with your friend to join</p>
              </div>
            )}

            {!waitingRoom.code && !waitingRoom.opponentName && (
              <p className="waiting-hint">Your public room is visible in the lobby. Anyone can join!</p>
            )}

            {/* Start Game button (creator only) */}
            {waitingRoom.isCreator && (
              <button
                className="btn-start-game"
                onClick={handleStartGame}
                disabled={!waitingRoom.opponentName}
              >
                ▶ Start Game
              </button>
            )}

            {/* Joiner waiting for host */}
            {!waitingRoom.isCreator && waitingRoom.opponentName && (
              <div className="joiner-waiting-text">
                <div className="loading-spinner" />
                Waiting for host to start the game...
              </div>
            )}

            {/* Lobby Chat */}
            <div className="lobby-chat">
              <div className="chat-header">💬 Room Chat</div>
              <div className="chat-messages">
                {chatMessages.length === 0 && (
                  <div className="chat-empty">No messages yet...</div>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`chat-bubble ${msg.sender === playerName.trim() ? 'chat-bubble-self' : 'chat-bubble-other'}`}
                  >
                    <div className="chat-sender" style={{ color: msg.sender === playerName.trim() ? '#c9a96e' : '#9b8ced' }}>
                      {msg.sender}
                    </div>
                    <div className="chat-text">{msg.text}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="chat-input-row">
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  maxLength={200}
                />
                <button className="chat-send" onClick={handleSendChat} disabled={!chatInput.trim()}>
                  Send
                </button>
              </div>
            </div>

            <button
              className="btn-secondary"
              onClick={handleLeaveRoom}
            >
              ← Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-container">
      <div className="landing-bg-glow" />

      <div className="landing-content panel-fade-in">
        <button className="back-button" onClick={() => router.push('/')}>
          ← Back to Menu
        </button>

        <div className="landing-title-section">
          <div className="landing-icon"><SwordsIcon size={42} color="#c9a96e" /></div>
          <h1 className="landing-title">Online Lobby</h1>
          <p className="landing-subtitle">Create or join a game</p>
        </div>

        {error && (
          <div className="lobby-error">
            <span className="btn-icon-text"><WarningIcon size={16} /> {error}</span>
            <button className="error-dismiss" onClick={() => setError('')}><CloseIcon size={14} /></button>
          </div>
        )}

        {/* Player Name */}
        <div className="name-input-section">
          <div className="lobby-section-title">
            <UserIcon size={14} /> Your Name
          </div>
          <input
            type="text"
            className="name-input"
            placeholder="Enter your display name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
            maxLength={20}
          />
        </div>

        {/* Create Room Section */}
        <div className="lobby-section">
          <h3 className="lobby-section-title">Create a Room</h3>
          <div className="create-buttons">
            <button
              className="btn-primary"
              onClick={() => createRoom(false)}
              disabled={creating || !playerName.trim()}
            >
              <span className="btn-icon-text"><GlobeIcon size={16} /> Public Room</span>
            </button>
            <button
              className="btn-primary btn-private"
              onClick={() => createRoom(true)}
              disabled={creating || !playerName.trim()}
            >
              <span className="btn-icon-text"><LockIcon size={16} /> Private Room</span>
            </button>
          </div>
        </div>

        {/* Join Private Room */}
        <div className="lobby-section">
          <h3 className="lobby-section-title">Join Private Room</h3>
          <div className="join-code-row">
            <input
              type="text"
              className="code-input"
              placeholder="Enter 4-char code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
              maxLength={4}
            />
            <button
              className="btn-primary"
              onClick={handleJoinByCode}
              disabled={joining || joinCode.length !== 4 || !playerName.trim()}
            >
              Join
            </button>
          </div>
        </div>

        {/* Public Rooms */}
        <div className="lobby-section">
          <h3 className="lobby-section-title">
            Public Rooms
            <span className="room-count">{rooms.length}</span>
          </h3>
          <div className="room-list">
            {rooms.length === 0 ? (
              <div className="no-rooms">
                <div className="no-rooms-icon"><CastleIcon size={32} color="rgba(255,255,255,0.3)" /></div>
                <p>No public rooms available</p>
                <p className="no-rooms-hint">Create one to get started!</p>
              </div>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="room-card">
                  <div className="room-info">
                    <div className="room-name">
                      {room.creatorName ? `${room.creatorName}'s Room` : `Room #${room.id.slice(0, 6)}`}
                    </div>
                    <div className="room-meta">
                      <span className="room-players"><UserIcon size={14} /> {room.playerCount}/2</span>
                      <span className="room-time">
                        {Math.floor((Date.now() - room.createdAt) / 1000)}s ago
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-join"
                    onClick={() => joinRoom(room.id)}
                    disabled={joining || !playerName.trim()}
                  >
                    Join →
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
