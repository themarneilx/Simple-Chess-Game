'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CrownIcon, BotIcon, SwordsIcon, SeedlingIcon, TrophyIcon,
  PawnIcon,
} from '@/components/Icons';

type Screen = 'menu' | 'ai-setup';

export default function Home() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('menu');
  const [difficulty, setDifficulty] = useState(2);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const difficulties = [
    { level: 1, name: 'Beginner', desc: 'Perfect for learning', icon: <SeedlingIcon size={28} color="#c9a96e" /> },
    { level: 2, name: 'Intermediate', desc: 'A balanced challenge', icon: <SwordsIcon size={28} color="#c9a96e" /> },
    { level: 3, name: 'Expert', desc: 'For serious players', icon: <TrophyIcon size={28} color="#c9a96e" /> },
  ];

  if (screen === 'ai-setup') {
    return (
      <div className="landing-container">
        <div className="landing-bg-glow" />
        <div className="landing-particles" />

        <div className="landing-content panel-fade-in">
          <button className="back-button" onClick={() => setScreen('menu')}>
            ← Back
          </button>

          <div className="landing-title-section">
            <div className="landing-icon"><BotIcon size={42} color="#c9a96e" /></div>
            <h1 className="landing-title">Play vs AI</h1>
            <p className="landing-subtitle">Choose your difficulty level</p>
          </div>

          <div className="difficulty-grid">
            {difficulties.map((d) => (
              <button
                key={d.level}
                className={`difficulty-card ${difficulty === d.level ? 'difficulty-active' : ''}`}
                onClick={() => setDifficulty(d.level)}
              >
                <div className="difficulty-icon">{d.icon}</div>
                <div className="difficulty-name">{d.name}</div>
                <div className="difficulty-desc">{d.desc}</div>
                {difficulty === d.level && <div className="difficulty-check">&bull;</div>}
              </button>
            ))}
          </div>

          <button
            className="btn-primary btn-large"
            onClick={() => router.push(`/game?mode=ai&difficulty=${difficulty}`)}
          >
            <span className="btn-icon-text"><PawnIcon size={18} /> Start Game</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-container">
      <div className="landing-bg-glow" />
      <div className="landing-particles" />

      <div className="landing-content panel-fade-in">
        <div className="landing-title-section">
          <div className="landing-crown"><CrownIcon size={52} color="rgba(201,169,110,0.8)" /></div>
          <h1 className="landing-title">CHESS</h1>
          <div className="landing-edition">3D Premium Edition</div>
          <p className="landing-subtitle">Choose your game mode</p>
        </div>

        <div className="mode-grid">
          <button
            className={`mode-card ${hoveredCard === 'ai' ? 'mode-card-hover' : ''}`}
            onMouseEnter={() => setHoveredCard('ai')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setScreen('ai-setup')}
          >
            <div className="mode-icon-wrapper">
              <div className="mode-icon"><BotIcon size={36} color="#c9a96e" /></div>
              <div className="mode-icon-glow" />
            </div>
            <div className="mode-name">Play vs AI</div>
            <div className="mode-desc">Challenge the computer at three difficulty levels</div>
            <div className="mode-badge">Single Player</div>
          </button>

          <button
            className={`mode-card ${hoveredCard === 'online' ? 'mode-card-hover' : ''}`}
            onMouseEnter={() => setHoveredCard('online')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => router.push('/lobby')}
          >
            <div className="mode-icon-wrapper">
              <div className="mode-icon"><SwordsIcon size={36} color="#94a3b8" /></div>
              <div className="mode-icon-glow" />
            </div>
            <div className="mode-name">Play Online</div>
            <div className="mode-desc">Challenge other players in real-time across the web</div>
            <div className="mode-badge mode-badge-online">Multiplayer</div>
          </button>
        </div>
      </div>
    </div>
  );
}
