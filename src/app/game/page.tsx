'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import ChessGame from '@/components/ChessGame';
import type { GameMode, Difficulty, PlayerColor } from '@/types/game';

function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [playerName, setPlayerName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [ready, setReady] = useState(false);

  const mode = (searchParams.get('mode') || 'ai') as GameMode;
  const difficulty = parseInt(searchParams.get('difficulty') || '2') as Difficulty;
  const roomId = searchParams.get('room') || undefined;

  useEffect(() => {
    if (mode === 'online' && roomId) {
      // Read assigned color from sessionStorage
      const storedColor = sessionStorage.getItem(`chess-color-${roomId}`);
      if (storedColor === 'w' || storedColor === 'b') {
        setPlayerColor(storedColor);
      }
      // Read names
      const storedName = sessionStorage.getItem('chess-player-name') || 'Player';
      setPlayerName(storedName);
      const storedOpponent = sessionStorage.getItem(`chess-opponent-${roomId}`) || 'Opponent';
      setOpponentName(storedOpponent);
    } else {
      setPlayerName('You');
      setOpponentName(mode === 'ai' ? 'AI' : 'Player 2');
    }
    setReady(true);
  }, [mode, roomId]);

  if (!ready) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <div className="loading-text">Loading Game...</div>
      </div>
    );
  }

  return (
    <main>
      <ChessGame
        mode={mode}
        difficulty={difficulty}
        roomId={roomId}
        playerColor={playerColor}
        playerName={playerName}
        opponentName={opponentName}
        onExit={() => router.push('/')}
      />
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">Loading Game...</div>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
