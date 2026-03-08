# ♔ 3D Chess — Premium Edition

A fully interactive 3D chess game built with **Three.js** and **Next.js**. Features hand-crafted Staunton-style piece models, smooth move animations, and a polished dark UI.

## Features

- **3D Staunton Pieces** — All 6 piece types modeled with detailed geometry:
  - Pawns, Bishops, Queen & King use high-detail `LatheGeometry` profiles
  - Knights use `ExtrudeGeometry` from a 2D horse-head silhouette with notched mane
  - Rooks feature rounded merlons and a hollow-top tower
- **Full Chess Logic** — Powered by [chess.js](https://github.com/jhlywa/chess.js) with legal move validation, check/checkmate/draw detection, and auto-promotion
- **Interactive Board** — Click to select pieces, see valid moves highlighted, and move with smooth arc animations
- **Orbit Controls** — Rotate, pan, and zoom the camera around the board
- **Atmospheric Scene** — Dramatic 4-light setup, ambient particles, fog, and shadow-casting ground plane
- **Coordinate Labels** — A–H and 1–8 displayed around the board edges
- **Captured Pieces** — Track captured pieces for both sides
- **Move History** — See notation for all played moves

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| 3D Engine | Three.js |
| Game Logic | chess.js |
| Animations | @tweenjs/tween.js |
| Styling | Vanilla CSS (glassmorphism UI) |
| Language | TypeScript |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Controls

| Action | Input |
|--------|-------|
| Select / Move piece | Left-click |
| Orbit camera | Right-click + drag |
| Zoom | Scroll wheel |
| New game | Click "New Game" button |

## Project Structure

```
src/
├── app/
│   ├── globals.css      # Design system & UI styles
│   ├── layout.tsx        # Root layout with metadata
│   └── page.tsx          # Main page (renders ChessGame)
└── components/
    └── ChessGame.tsx     # All 3D rendering, piece models, and game logic
```

## License

MIT
