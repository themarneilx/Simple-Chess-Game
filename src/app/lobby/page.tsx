'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { RoomInfo } from '@/types/game';
import {
  SwordsIcon, GlobeIcon, LockIcon, CopyIcon, CastleIcon,
  UserIcon, WarningIcon, CloseIcon,
} from '@/components/Icons';

export default function LobbyPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState<{ roomId: string; code: string | null; color: string } | null>(null);

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

    socket.on('game-start', ({ roomId }: { roomId: string }) => {
      sessionStorage.setItem(`chess-ready-${roomId}`, 'true');
      router.push(`/game?mode=online&room=${roomId}`);
    });

    // Initial fetch
    if (socket.connected) {
      fetchRooms();
    }

    return () => {
      socket.off('rooms-updated');
      socket.off('game-start');
      socket.off('connect');
    };
  }, [fetchRooms, router]);

  const createRoom = (isPrivate: boolean) => {
    setCreating(true);
    setError('');
    const socket = getSocket();

    socket.emit(
      'create-room',
      { isPrivate },
      (response: { success: boolean; roomId: string; code: string | null; color: string }) => {
        setCreating(false);
        if (response.success) {
          setWaitingRoom({
            roomId: response.roomId,
            code: response.code,
            color: response.color,
          });
        }
      }
    );
  };

  const joinRoom = (roomId?: string, code?: string) => {
    setJoining(true);
    setError('');
    const socket = getSocket();

    socket.emit(
      'join-room',
      { roomId, code },
      (response: { success: boolean; roomId?: string; color?: string; error?: string }) => {
        setJoining(false);
        if (response.success && response.roomId) {
          sessionStorage.setItem(`chess-color-${response.roomId}`, response.color || 'b');
        } else {
          setError(response.error || 'Failed to join room');
        }
      }
    );
  };

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

  // Waiting room overlay
  if (waitingRoom) {
    sessionStorage.setItem(`chess-color-${waitingRoom.roomId}`, waitingRoom.color);

    return (
      <div className="landing-container">
        <div className="landing-bg-glow" />

        <div className="landing-content panel-fade-in">
          <div className="waiting-room">
            <div className="waiting-spinner" />
            <h2 className="waiting-title">Waiting for Opponent...</h2>
            <p className="waiting-subtitle">
              You are playing as <strong>{waitingRoom.color === 'w' ? 'White' : 'Black'}</strong>
            </p>

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

            {!waitingRoom.code && (
              <p className="waiting-hint">Your public room is visible in the lobby. Anyone can join!</p>
            )}

            <button
              className="btn-secondary"
              onClick={() => {
                setWaitingRoom(null);
                fetchRooms();
              }}
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

        {/* Create Room Section */}
        <div className="lobby-section">
          <h3 className="lobby-section-title">Create a Room</h3>
          <div className="create-buttons">
            <button
              className="btn-primary"
              onClick={() => createRoom(false)}
              disabled={creating}
            >
              <span className="btn-icon-text"><GlobeIcon size={16} /> Public Room</span>
            </button>
            <button
              className="btn-primary btn-private"
              onClick={() => createRoom(true)}
              disabled={creating}
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
              disabled={joining || joinCode.length !== 4}
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
                    <div className="room-name">Room #{room.id.slice(0, 6)}</div>
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
                    disabled={joining}
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
