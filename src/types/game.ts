export type GameMode = 'ai' | 'online' | 'local';
export type Difficulty = 1 | 2 | 3;
export type PlayerColor = 'w' | 'b';
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Player {
  socketId: string;
  color: PlayerColor;
  connected: boolean;
}

export interface Room {
  id: string;
  players: Player[];
  isPrivate: boolean;
  code: string | null;
  status: RoomStatus;
  fen: string;
  createdAt: number;
  creatorName?: string;
}

export interface RoomInfo {
  id: string;
  playerCount: number;
  isPrivate: boolean;
  status: RoomStatus;
  createdAt: number;
}

// Socket event payloads
export interface CreateRoomPayload {
  isPrivate: boolean;
}

export interface JoinRoomPayload {
  roomId?: string;
  code?: string;
}

export interface MakeMovePayload {
  roomId: string;
  from: string;
  to: string;
  promotion?: string;
}

export interface GameStartPayload {
  roomId: string;
  color: PlayerColor;
  opponentConnected: boolean;
}
