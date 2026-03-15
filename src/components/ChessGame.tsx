'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { Chess, Move } from 'chess.js';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { getBestMove } from '@/lib/ai';
import type { GameMode, Difficulty, PlayerColor } from '@/types/game';
import { GearIcon, RefreshIcon, PawnIcon, CrownIcon, KingIcon, CloseIcon, ChatIcon, FlagIcon } from '@/components/Icons';

interface ChatMessage {
    sender: string;
    text: string;
    timestamp: number;
    color?: string;
}

const SQUARE_SIZE = 3;

interface ChessGameProps {
    mode?: GameMode;
    difficulty?: Difficulty;
    roomId?: string;
    playerColor?: PlayerColor;
    playerName?: string;
    opponentName?: string;
    onExit?: () => void;
}

/* ───────────── PIECE GEOMETRY GENERATORS ───────────── */

function createPawn(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const profile = [
        new THREE.Vector2(0, 0), new THREE.Vector2(1.05, 0), new THREE.Vector2(1.1, 0.05),
        new THREE.Vector2(1.1, 0.25), new THREE.Vector2(1.05, 0.35), new THREE.Vector2(0.95, 0.45),
        new THREE.Vector2(0.55, 0.8), new THREE.Vector2(0.45, 1.2), new THREE.Vector2(0.40, 1.6),
        new THREE.Vector2(0.42, 1.8), new THREE.Vector2(0.65, 1.9), new THREE.Vector2(0.70, 1.95),
        new THREE.Vector2(0.70, 2.05), new THREE.Vector2(0.65, 2.1), new THREE.Vector2(0.42, 2.2),
        new THREE.Vector2(0.38, 2.4), new THREE.Vector2(0.35, 2.6),
        new THREE.Vector2(0.40, 2.8), new THREE.Vector2(0.55, 3.0), new THREE.Vector2(0.65, 3.2),
        new THREE.Vector2(0.70, 3.5), new THREE.Vector2(0.68, 3.8), new THREE.Vector2(0.60, 4.0),
        new THREE.Vector2(0.45, 4.15), new THREE.Vector2(0.25, 4.25), new THREE.Vector2(0, 4.3),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), mat);
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    return g;
}

function createRook(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const profile = [
        new THREE.Vector2(0, 0), new THREE.Vector2(1.15, 0), new THREE.Vector2(1.2, 0.06),
        new THREE.Vector2(1.2, 0.28), new THREE.Vector2(1.15, 0.38), new THREE.Vector2(1.0, 0.48),
        new THREE.Vector2(0.82, 0.75), new THREE.Vector2(0.76, 1.3), new THREE.Vector2(0.74, 2.0),
        new THREE.Vector2(0.75, 2.7), new THREE.Vector2(0.77, 3.1),
        new THREE.Vector2(0.80, 3.3), new THREE.Vector2(0.92, 3.4), new THREE.Vector2(0.95, 3.45),
        new THREE.Vector2(0.95, 3.55), new THREE.Vector2(0.92, 3.6), new THREE.Vector2(0.80, 3.7),
        new THREE.Vector2(0.82, 3.85), new THREE.Vector2(0.85, 4.0), new THREE.Vector2(0.90, 4.15),
        new THREE.Vector2(0.95, 4.25), new THREE.Vector2(1.02, 4.32), new THREE.Vector2(1.08, 4.38),
        new THREE.Vector2(1.08, 4.55), new THREE.Vector2(1.05, 4.58),
        new THREE.Vector2(0.85, 4.58), new THREE.Vector2(0.82, 4.45), new THREE.Vector2(0.80, 4.35),
        new THREE.Vector2(0, 4.35),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), mat);
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    const merlonCount = 5;
    for (let i = 0; i < merlonCount; i++) {
        const angle = (i / merlonCount) * Math.PI * 2;
        const merlon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.65, 16), mat);
        merlon.position.set(Math.cos(angle) * 0.92, 4.9, Math.sin(angle) * 0.92);
        merlon.castShadow = true;
        g.add(merlon);
    }
    return g;
}

function createKnight(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const baseProfile = [
        new THREE.Vector2(0, 0), new THREE.Vector2(1.15, 0), new THREE.Vector2(1.2, 0.06),
        new THREE.Vector2(1.2, 0.22), new THREE.Vector2(1.15, 0.28),
        new THREE.Vector2(1.0, 0.35), new THREE.Vector2(1.05, 0.42), new THREE.Vector2(1.1, 0.48),
        new THREE.Vector2(1.1, 0.60), new THREE.Vector2(1.05, 0.66),
        new THREE.Vector2(0.88, 0.80), new THREE.Vector2(0.72, 1.05), new THREE.Vector2(0.60, 1.35),
        new THREE.Vector2(0, 1.5),
    ];
    const base = new THREE.Mesh(new THREE.LatheGeometry(baseProfile, 64), mat);
    base.castShadow = base.receiveShadow = true;
    g.add(base);
    const shape = new THREE.Shape();
    shape.moveTo(0.5, 1.2);
    shape.bezierCurveTo(0.55, 1.8, 0.6, 2.4, 0.45, 3.0);
    shape.bezierCurveTo(0.35, 3.3, 0.5, 3.4, 0.75, 3.5);
    shape.bezierCurveTo(0.95, 3.55, 1.1, 3.6, 1.15, 3.7);
    shape.bezierCurveTo(1.18, 3.78, 1.15, 3.88, 1.05, 3.95);
    shape.bezierCurveTo(0.85, 4.05, 0.65, 4.15, 0.55, 4.35);
    shape.bezierCurveTo(0.45, 4.55, 0.35, 4.7, 0.2, 4.8);
    shape.lineTo(0.05, 5.15); shape.lineTo(-0.1, 4.75);
    shape.bezierCurveTo(-0.2, 4.55, -0.3, 4.35, -0.35, 4.1);
    shape.lineTo(-0.45, 3.85); shape.lineTo(-0.30, 3.70); shape.lineTo(-0.50, 3.50);
    shape.lineTo(-0.35, 3.35); shape.lineTo(-0.55, 3.15); shape.lineTo(-0.40, 3.00);
    shape.lineTo(-0.60, 2.80); shape.lineTo(-0.45, 2.60); shape.lineTo(-0.60, 2.40);
    shape.lineTo(-0.48, 2.20); shape.lineTo(-0.58, 2.00); shape.lineTo(-0.45, 1.80);
    shape.bezierCurveTo(-0.50, 1.50, -0.50, 1.30, -0.45, 1.2);
    shape.lineTo(0.5, 1.2);
    const headGeo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: 0.9, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelOffset: 0, bevelSegments: 4 });
    headGeo.translate(0, 0, -0.45); headGeo.computeVertexNormals();
    const headMesh = new THREE.Mesh(headGeo, mat);
    headMesh.rotation.y = -Math.PI / 2;
    headMesh.castShadow = headMesh.receiveShadow = true;
    g.add(headMesh);
    return g;
}

function createBishop(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const profile = [
        new THREE.Vector2(0, 0), new THREE.Vector2(1.1, 0), new THREE.Vector2(1.15, 0.05),
        new THREE.Vector2(1.15, 0.25), new THREE.Vector2(1.1, 0.35), new THREE.Vector2(0.95, 0.45),
        new THREE.Vector2(0.55, 0.8), new THREE.Vector2(0.45, 1.3), new THREE.Vector2(0.42, 1.8),
        new THREE.Vector2(0.44, 2.0), new THREE.Vector2(0.70, 2.1), new THREE.Vector2(0.75, 2.15),
        new THREE.Vector2(0.75, 2.25), new THREE.Vector2(0.70, 2.3), new THREE.Vector2(0.44, 2.4),
        new THREE.Vector2(0.38, 2.6), new THREE.Vector2(0.35, 2.8),
        new THREE.Vector2(0.42, 3.0), new THREE.Vector2(0.55, 3.3), new THREE.Vector2(0.65, 3.7),
        new THREE.Vector2(0.68, 4.0), new THREE.Vector2(0.65, 4.3), new THREE.Vector2(0.58, 4.6),
        new THREE.Vector2(0.45, 4.9), new THREE.Vector2(0.30, 5.15), new THREE.Vector2(0.15, 5.35),
        new THREE.Vector2(0.05, 5.5), new THREE.Vector2(0, 5.55),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), mat);
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat);
    tip.position.set(0, 5.72, 0); tip.castShadow = true; g.add(tip);
    const slitGeo = new THREE.BoxGeometry(0.04, 1.3, 0.75);
    const slitMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 });
    const slit = new THREE.Mesh(slitGeo, slitMat);
    slit.position.set(0, 4.3, 0.3); slit.rotation.x = -0.15; g.add(slit);
    return g;
}

function createQueen(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const profile = [
        new THREE.Vector2(0, 0), new THREE.Vector2(1.25, 0), new THREE.Vector2(1.3, 0.05),
        new THREE.Vector2(1.3, 0.3), new THREE.Vector2(1.25, 0.4), new THREE.Vector2(1.1, 0.5),
        new THREE.Vector2(0.65, 0.9), new THREE.Vector2(0.50, 1.5), new THREE.Vector2(0.45, 2.2),
        new THREE.Vector2(0.42, 3.0),
        new THREE.Vector2(0.44, 3.2), new THREE.Vector2(0.75, 3.3), new THREE.Vector2(0.80, 3.35),
        new THREE.Vector2(0.80, 3.45), new THREE.Vector2(0.75, 3.5), new THREE.Vector2(0.44, 3.6),
        new THREE.Vector2(0.40, 3.8), new THREE.Vector2(0.38, 4.0),
        new THREE.Vector2(0.50, 4.3), new THREE.Vector2(0.70, 4.6), new THREE.Vector2(0.82, 4.9),
        new THREE.Vector2(0.88, 5.2),
        new THREE.Vector2(0.95, 5.5), new THREE.Vector2(1.05, 5.7), new THREE.Vector2(1.10, 5.85),
        new THREE.Vector2(1.08, 5.95), new THREE.Vector2(0.95, 6.0), new THREE.Vector2(0.80, 5.9),
        new THREE.Vector2(0, 5.6),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), mat);
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 8), mat);
        spire.position.set(Math.cos(angle) * 0.9, 6.2, Math.sin(angle) * 0.9);
        spire.castShadow = true; g.add(spire);
    }
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat);
    orb.position.set(0, 6.5, 0); orb.castShadow = true; g.add(orb);
    const cv = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), mat);
    cv.position.set(0, 6.9, 0); cv.castShadow = true; g.add(cv);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.08), mat);
    ch.position.set(0, 6.95, 0); ch.castShadow = true; g.add(ch);
    return g;
}

function createKing(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const profile = [
        new THREE.Vector2(0, 0), new THREE.Vector2(1.3, 0), new THREE.Vector2(1.35, 0.05),
        new THREE.Vector2(1.35, 0.35), new THREE.Vector2(1.3, 0.45), new THREE.Vector2(1.15, 0.55),
        new THREE.Vector2(0.70, 0.9), new THREE.Vector2(0.55, 1.5), new THREE.Vector2(0.50, 2.2),
        new THREE.Vector2(0.48, 3.0),
        new THREE.Vector2(0.50, 3.2), new THREE.Vector2(0.80, 3.3), new THREE.Vector2(0.85, 3.35),
        new THREE.Vector2(0.85, 3.45), new THREE.Vector2(0.80, 3.5), new THREE.Vector2(0.50, 3.6),
        new THREE.Vector2(0.48, 3.8), new THREE.Vector2(0.50, 4.2), new THREE.Vector2(0.55, 4.5),
        new THREE.Vector2(0.58, 4.7), new THREE.Vector2(0.82, 4.8), new THREE.Vector2(0.88, 4.85),
        new THREE.Vector2(0.88, 5.0), new THREE.Vector2(0.82, 5.05), new THREE.Vector2(0.58, 5.15),
        new THREE.Vector2(0.60, 5.4), new THREE.Vector2(0.75, 5.7), new THREE.Vector2(0.85, 6.0),
        new THREE.Vector2(0.90, 6.3), new THREE.Vector2(0.92, 6.5),
        new THREE.Vector2(0.88, 6.7), new THREE.Vector2(0.80, 6.85), new THREE.Vector2(0.65, 6.95),
        new THREE.Vector2(0.45, 7.0), new THREE.Vector2(0.25, 7.02), new THREE.Vector2(0, 7.03),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), mat);
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.22), mat);
    vBar.position.set(0, 7.73, 0); vBar.castShadow = true; g.add(vBar);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 0.22), mat);
    hBar.position.set(0, 8.05, 0); hBar.castShadow = true; g.add(hBar);
    const crossOrb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), mat);
    crossOrb.position.set(0, 7.08, 0); crossOrb.castShadow = true; g.add(crossOrb);
    return g;
}

/* ───────────── MAIN COMPONENT ───────────── */

const ChessGame: React.FC<ChessGameProps> = ({
    mode = 'ai',
    difficulty = 2,
    roomId,
    playerColor = 'w',
    playerName = 'You',
    opponentName: initialOpponentName = 'Opponent',
    onExit,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [game] = useState(new Chess());
    const [turn, setTurn] = useState<'white' | 'black'>('white');
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [capturedByWhite, setCapturedByWhite] = useState<string[]>([]);
    const [capturedByBlack, setCapturedByBlack] = useState<string[]>([]);
    const [moveHistory, setMoveHistory] = useState<string[]>([]);
    const [aiThinking, setAiThinking] = useState(false);
    const [waitingForOpponent, setWaitingForOpponent] = useState(mode === 'online');
    const [opponentDisconnected, setOpponentDisconnected] = useState(false);
    const [gameResult, setGameResult] = useState<string | null>(null);
    const [opponentName, setOpponentName] = useState(initialOpponentName);

    // Chat state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Mobile specific state
    const [showControls, setShowControls] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const [showMoveHistory, setShowMoveHistory] = useState(false);
    const [moveHistoryPage, setMoveHistoryPage] = useState(0);

    // Refs for values that need to be read inside the useEffect closure
    const waitingRef = useRef(mode === 'online');
    const aiThinkingRef = useRef(false);
    const modeRef = useRef(mode);
    const playerColorRef = useRef(playerColor);
    const difficultyRef = useRef(difficulty);
    const roomIdRef = useRef(roomId);

    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const piecesGroupRef = useRef<THREE.Group | null>(null);
    const tweenGroup = useRef(new TWEEN.Group());
    const selectedPieceRef = useRef<THREE.Group | null>(null);
    const validMovesRef = useRef<Move[]>([]);
    const highlightMeshesRef = useRef<THREE.Mesh[]>([]);
    const hoverMeshRef = useRef<THREE.Mesh | null>(null);
    const particlesRef = useRef<THREE.Points | null>(null);
    const orbitControlsRef = useRef<any>(null); // To toggle controls during interaction
    const gameRef = useRef(game);

    const materials = useRef({
        whitePiece: new THREE.MeshPhysicalMaterial({ color: 0xfaf8f5, metalness: 0.02, roughness: 0.08, clearcoat: 1.0, clearcoatRoughness: 0.05, reflectivity: 0.6, envMapIntensity: 0.8 }),
        blackPiece: new THREE.MeshPhysicalMaterial({ color: 0x1a1a2e, metalness: 0.25, roughness: 0.15, clearcoat: 0.9, clearcoatRoughness: 0.1, reflectivity: 0.5, envMapIntensity: 0.6 }),
        boardWhite: new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.25, metalness: 0.05 }),
        boardBlack: new THREE.MeshStandardMaterial({ color: 0x2d3142, roughness: 0.25, metalness: 0.1 }),
        boardEdge: new THREE.MeshStandardMaterial({ color: 0x1a0f0a, roughness: 0.4, metalness: 0.15 }),
        boardFrame: new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.35, metalness: 0.1 }),
        highlight: new THREE.MeshBasicMaterial({ color: 0x00E5FF, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
        danger: new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }),
        hover: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, depthWrite: false }),
    });

    const pieceSymbols: { [key: string]: string } = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const squareToCoords = (square: string) => ({
        x: files.indexOf(square[0]),
        z: 7 - (parseInt(square[1]) - 1),
    });
    const coordsToSquare = (x: number, z: number) =>
        x < 0 || x > 7 || z < 0 || z > 7 ? null : files[x] + ranks[7 - z];

    const generators: { [key: string]: (mat: THREE.Material) => THREE.Group } = {
        p: createPawn, r: createRook, n: createKnight, b: createBishop, q: createQueen, k: createKing,
    };

    const spawnPieces = useCallback(() => {
        if (!sceneRef.current || !piecesGroupRef.current) return;
        const group = piecesGroupRef.current;
        group.clear();
        const board = game.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const cell = board[r][c];
                if (cell) {
                    const mat = cell.color === 'w' ? materials.current.whitePiece : materials.current.blackPiece;
                    const mesh = generators[cell.type](mat);
                    mesh.position.set((c - 3.5) * SQUARE_SIZE, 0, (r - 3.5) * SQUARE_SIZE);
                    if (cell.type === 'n') mesh.rotation.y = cell.color === 'w' ? Math.PI : 0;
                    mesh.userData = { isPiece: true, type: cell.type, color: cell.color, gridX: c, gridZ: r };
                    mesh.scale.setScalar(0.52);
                    group.add(mesh);
                }
            }
        }
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game]);

    const updateCapturedPieces = useCallback(() => {
        const board = game.board();
        const whiteOnBoard: string[] = [];
        const blackOnBoard: string[] = [];
        board.forEach((row) => row.forEach((cell) => {
            if (cell) {
                if (cell.color === 'w') whiteOnBoard.push(cell.type);
                else blackOnBoard.push(cell.type);
            }
        }));
        const initial = ['p','p','p','p','p','p','p','p','r','r','n','n','b','b','q'];
        const getCaptured = (init: string[], current: string[]) => {
            const captured = [...init];
            current.forEach((p) => { const idx = captured.indexOf(p); if (idx !== -1) captured.splice(idx, 1); });
            return captured;
        };
        setCapturedByWhite(getCaptured(initial, blackOnBoard));
        setCapturedByBlack(getCaptured(initial, whiteOnBoard));
    }, [game]);

    const clearHighlights = useCallback(() => {
        highlightMeshesRef.current.forEach((m) => sceneRef.current?.remove(m));
        highlightMeshesRef.current = [];
        piecesGroupRef.current?.children.forEach((p) =>
            p.traverse((c) => {
                if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshPhysicalMaterial)
                    c.material.emissive?.setHex(0);
            })
        );
    }, []);

    const highlightSquare = useCallback((x: number, z: number, type: 'move' | 'capture' = 'move') => {
        let mesh: THREE.Mesh;
        if (type === 'capture') {
            mesh = new THREE.Mesh(new THREE.RingGeometry(SQUARE_SIZE * 0.35, SQUARE_SIZE * 0.48, 32), materials.current.danger);
        } else {
            mesh = new THREE.Mesh(new THREE.CircleGeometry(SQUARE_SIZE * 0.22, 32), materials.current.highlight);
        }
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set((x - 3.5) * SQUARE_SIZE, 0.03, (z - 3.5) * SQUARE_SIZE);
        sceneRef.current?.add(mesh);
        highlightMeshesRef.current.push(mesh);
    }, []);

    const updateStatus = useCallback(() => {
        setTurn(game.turn() === 'w' ? 'white' : 'black');
        if (game.isCheckmate()) setStatus('CHECKMATE!');
        else if (game.isDraw()) setStatus('DRAW!');
        else if (game.isCheck()) setStatus('CHECK!');
        else setStatus('');
        updateCapturedPieces();
        setMoveHistory(game.history());
    }, [game, updateCapturedPieces]);

    // AI move handler
    const doAiMove = useCallback(() => {
        if (game.isGameOver()) return;
        setAiThinking(true);
        setTimeout(() => {
            const bestMove = getBestMove(game.fen(), difficulty);
            if (bestMove) {
                try {
                    game.move({ from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion });
                    spawnPieces();
                    updateStatus();
                } catch (e) { console.error('AI move error', e); }
            }
            setAiThinking(false);
        }, 300);
    }, [game, difficulty, spawnPieces, updateStatus]);

    // Apply opponent's move (online)
    const applyOpponentMove = useCallback((moveData: { from: string; to: string; promotion?: string }) => {
        try {
            game.move({ from: moveData.from, to: moveData.to, promotion: moveData.promotion });
            spawnPieces();
            updateStatus();
        } catch (e) { console.error('Opponent move error', e); }
    }, [game, spawnPieces, updateStatus]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Auto-advance move history to latest page
    useEffect(() => {
        if (moveHistory.length > 0) {
            const MOVES_PER_PAGE = 10;
            setMoveHistoryPage(Math.max(0, Math.ceil(moveHistory.length / MOVES_PER_PAGE) - 1));
        }
    }, [moveHistory]);

    // Send chat message
    const handleSendChat = useCallback(() => {
        if (!chatInput.trim() || !roomId) return;
        const socket = getSocket();
        socket.emit('chat-message', {
            roomId,
            text: chatInput.trim(),
            sender: playerName,
            color: playerColor,
        });
        setChatInput('');
    }, [chatInput, roomId, playerName, playerColor]);

    // Socket setup for online mode
    useEffect(() => {
        if (mode !== 'online' || !roomId) return;
        const socket = getSocket();

        // Check if game was already started (flag set by lobby before navigation)
        const readyFlag = sessionStorage.getItem(`chess-ready-${roomId}`);
        if (readyFlag === 'true') {
            setWaitingForOpponent(false);
            waitingRef.current = false;
            sessionStorage.removeItem(`chess-ready-${roomId}`);
        }

        // Read opponent name from session if available
        const storedOpponent = sessionStorage.getItem(`chess-opponent-${roomId}`);
        if (storedOpponent) {
            setOpponentName(storedOpponent);
        }

        // Also listen for game-start in case it arrives after mount
        socket.on('game-start', ({ opponentName: oppName }: { opponentName?: string }) => {
            setWaitingForOpponent(false);
            waitingRef.current = false;
            if (oppName) setOpponentName(oppName);
        });

        socket.on('opponent-move', (moveData: { from: string; to: string; promotion?: string }) => {
            applyOpponentMove(moveData);
        });

        socket.on('opponent-disconnected', () => {
            setOpponentDisconnected(true);
        });

        // Opponent came back after disconnect
        socket.on('opponent-reconnected', () => {
            setOpponentDisconnected(false);
        });

        // Opponent timed out (120s) — game is over
        socket.on('opponent-abandoned', () => {
            setOpponentDisconnected(false);
            setGameResult('Opponent left the game. You win!');
        });

        socket.on('opponent-resigned', ({ winner }: { winner: string }) => {
            setGameResult(`${winner.charAt(0).toUpperCase() + winner.slice(1)} wins by resignation!`);
        });

        socket.on('game-ended', ({ result }: { result: string }) => {
            setGameResult(result);
        });

        // Chat messages
        socket.on('chat-message', (msg: ChatMessage) => {
            setChatMessages((prev) => [...prev, msg]);
        });

        socket.on('chat-history', (history: ChatMessage[]) => {
            setChatMessages(history);
        });

        // Auto-reconnect: when socket reconnects after a drop, re-register with the room
        // Track whether this is the first connect or a reconnection
        let hasConnectedOnce = socket.connected;
        const handleReconnect = () => {
            if (!hasConnectedOnce) {
                hasConnectedOnce = true;
                return; // Skip the initial connect
            }
            socket.emit('reconnect-room', {
                roomId: roomIdRef.current,
                playerName,
            }, (response: { success: boolean; fen?: string; color?: string; opponentName?: string; chatHistory?: ChatMessage[]; error?: string }) => {
                if (response?.success) {
                    // Restore game state from server
                    if (response.fen) {
                        const currentGame = gameRef.current;
                        currentGame.load(response.fen);
                        spawnPieces();
                        updateStatus();
                    }
                    if (response.opponentName) {
                        setOpponentName(response.opponentName);
                    }
                    if (response.chatHistory) {
                        setChatMessages(response.chatHistory);
                    }
                    // Clear any disconnect overlay from our side
                    setOpponentDisconnected(false);
                    setWaitingForOpponent(false);
                    waitingRef.current = false;
                    console.log('[Reconnect] Successfully rejoined room');
                } else {
                    console.error('[Reconnect] Failed:', response?.error);
                    setGameResult('Connection lost. Room no longer exists.');
                }
            });
        };

        socket.on('connect', handleReconnect);

        // Ask the server to check room status (in case both players already joined)
        socket.emit('check-room', { roomId }, (response: { playing: boolean; opponentName?: string | null }) => {
            if (response && response.playing) {
                setWaitingForOpponent(false);
                waitingRef.current = false;
            }
            if (response?.opponentName) {
                setOpponentName(response.opponentName);
            }
        });

        return () => {
            socket.off('game-start');
            socket.off('opponent-move');
            socket.off('opponent-disconnected');
            socket.off('opponent-reconnected');
            socket.off('opponent-abandoned');
            socket.off('opponent-resigned');
            socket.off('game-ended');
            socket.off('chat-message');
            socket.off('chat-history');
            socket.off('connect', handleReconnect);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, roomId, applyOpponentMove]);

    /* ───────────── SCENE SETUP ───────────── */
    useEffect(() => {
        if (!containerRef.current) return;

        // Clean up any leftover children from previous mounts (React StrictMode / HMR)
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0e1a);
        scene.fog = new THREE.FogExp2(0x0a0e1a, 0.008);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
        // Camera position based on player color
        if (playerColor === 'b') {
            camera.position.set(0, 28, -38);
        } else {
            camera.position.set(0, 28, 38);
        }
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.maxPolarAngle = Math.PI / 2 - 0.08;
        controls.minDistance = 15;
        controls.maxDistance = 70;
        // Make panning two-finger only on mobile so one finger can move pieces if we refine that, 
        // but default is fine. We will disable controls completely when dragging a piece.
        orbitControlsRef.current = controls;

        scene.add(new THREE.AmbientLight(0xccd5e0, 0.6));
        const keyLight = new THREE.DirectionalLight(0xfff0d4, 1.8);
        keyLight.position.set(18, 40, 18);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(4096, 4096);
        keyLight.shadow.camera.left = -20; keyLight.shadow.camera.right = 20;
        keyLight.shadow.camera.top = 20; keyLight.shadow.camera.bottom = -20;
        keyLight.shadow.bias = -0.0003; keyLight.shadow.normalBias = 0.04;
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0x8ecae6, 0.6);
        fillLight.position.set(-15, 20, -15); scene.add(fillLight);
        const rimLight = new THREE.SpotLight(0x7b68ee, 800);
        rimLight.position.set(-20, 30, -25); rimLight.angle = Math.PI / 4; rimLight.penumbra = 0.6;
        scene.add(rimLight);
        const accentLight = new THREE.PointLight(0xffd700, 200);
        accentLight.position.set(15, 15, 25); scene.add(accentLight);

        const piecesGroup = new THREE.Group();
        scene.add(piecesGroup);
        piecesGroupRef.current = piecesGroup;

        // Build board
        const board = new THREE.Group();
        scene.add(board);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(SQUARE_SIZE * 8 + 3.5, 1.5, SQUARE_SIZE * 8 + 3.5), materials.current.boardFrame);
        frame.position.y = -1.25; frame.receiveShadow = true; board.add(frame);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(SQUARE_SIZE * 8 + 0.6, 1.0, SQUARE_SIZE * 8 + 0.6), materials.current.boardEdge);
        edge.position.y = -0.7; edge.receiveShadow = true; board.add(edge);

        for (let x = 0; x < 8; x++) {
            for (let z = 0; z < 8; z++) {
                const sq = new THREE.Mesh(
                    new THREE.BoxGeometry(SQUARE_SIZE, 0.2, SQUARE_SIZE),
                    (x + z) % 2 === 0 ? materials.current.boardWhite : materials.current.boardBlack
                );
                sq.position.set((x - 3.5) * SQUARE_SIZE, -0.1, (z - 3.5) * SQUARE_SIZE);
                sq.receiveShadow = true;
                sq.userData = { isSquare: true, gridX: x, gridZ: z };
                board.add(sq);
            }
        }

        // Labels
        const labelColor = 0x8891a5;
        const createLabel = (text: string, x: number, y: number, z: number) => {
            const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = 'transparent'; ctx.fillRect(0, 0, 64, 64);
            ctx.font = 'bold 40px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = `#${labelColor.toString(16).padStart(6, '0')}`;
            ctx.fillText(text, 32, 32);
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.7 });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(x, y, z); sprite.scale.set(1.2, 1.2, 1);
            board.add(sprite);
        };
        for (let i = 0; i < 8; i++) {
            createLabel(files[i].toUpperCase(), (i - 3.5) * SQUARE_SIZE, -0.2, 4.5 * SQUARE_SIZE);
            createLabel(files[i].toUpperCase(), (i - 3.5) * SQUARE_SIZE, -0.2, -4.5 * SQUARE_SIZE);
        }
        for (let i = 0; i < 8; i++) {
            createLabel(ranks[7 - i], -4.5 * SQUARE_SIZE, -0.2, (i - 3.5) * SQUARE_SIZE);
            createLabel(ranks[7 - i], 4.5 * SQUARE_SIZE, -0.2, (i - 3.5) * SQUARE_SIZE);
        }

        // Ground
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x080c15, roughness: 0.95 }));
        ground.rotation.x = -Math.PI / 2; ground.position.y = -2.1; ground.receiveShadow = true; scene.add(ground);

        // Particles
        const particleCount = 300;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 60;
            positions[i * 3 + 1] = Math.random() * 25 + 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
            sizes[i] = Math.random() * 0.08 + 0.02;
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0x6c7baa, size: 0.08, transparent: true, opacity: 0.5, sizeAttenuation: true, depthWrite: false }));
        scene.add(particles); particlesRef.current = particles;

        // Hover
        const hoverMesh = new THREE.Mesh(new THREE.PlaneGeometry(SQUARE_SIZE * 0.95, SQUARE_SIZE * 0.95), materials.current.hover);
        hoverMesh.rotation.x = -Math.PI / 2; hoverMesh.visible = false; scene.add(hoverMesh); hoverMeshRef.current = hoverMesh;

        spawnPieces();
        updateCapturedPieces();

        // Raycaster & Interaction
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const findObjectUnderMouse = (e: PointerEvent | MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects([...piecesGroup.children, ...board.children], true);
            if (intersects.length > 0) {
                let obj = intersects[0].object as THREE.Object3D;
                while (obj && !obj.userData.isPiece && !obj.userData.isSquare) {
                    if (!obj.parent) break;
                    obj = obj.parent;
                }
                return obj;
            }
            return null;
        };

        const handlePointerMove = (e: PointerEvent) => {
            const obj = findObjectUnderMouse(e);
            if (obj && (obj.userData.isSquare || obj.userData.isPiece)) {
                hoverMesh.position.set((obj.userData.gridX - 3.5) * SQUARE_SIZE, 0.015, (obj.userData.gridZ - 3.5) * SQUARE_SIZE);
                hoverMesh.visible = true;
            } else { hoverMesh.visible = false; }
        };

        const handlePointerDown = (e: PointerEvent) => {
            const currentGame = gameRef.current;
            // Block interaction if waiting, AI thinking, or game over
            if (currentGame.isGameOver()) return;
            if (waitingRef.current) return;
            if (aiThinkingRef.current) return;

            const obj = findObjectUnderMouse(e);

            // Check if it's player's turn (use refs for current values)
            const currentMode = modeRef.current;
            const currentPlayerColor = playerColorRef.current;
            const canMove = (() => {
                if (currentMode === 'ai') return currentGame.turn() === 'w';
                if (currentMode === 'online') return currentGame.turn() === currentPlayerColor;
                return true; // local mode
            })();

            if (obj && obj.userData.isPiece && obj.userData.color === currentGame.turn() && canMove) {
                // Disable orbit controls while dragging
                if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;

                if (selectedPieceRef.current)
                    new TWEEN.Tween(selectedPieceRef.current.position, tweenGroup.current).to({ y: 0 }, 120).easing(TWEEN.Easing.Back.Out).start();
                clearHighlights();
                selectedPieceRef.current = obj as THREE.Group;
                new TWEEN.Tween(obj.position, tweenGroup.current).to({ y: 0.6 }, 150).easing(TWEEN.Easing.Back.Out).start();
                obj.traverse((c) => {
                    if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshPhysicalMaterial) c.material.emissive?.setHex(0x222244);
                });
                const sq = coordsToSquare(obj.userData.gridX, obj.userData.gridZ);
                if (sq) {
                    validMovesRef.current = currentGame.moves({ square: sq as any, verbose: true });
                    validMovesRef.current.forEach((m) => {
                        const { x, z } = squareToCoords(m.to);
                        highlightSquare(x, z, m.flags.includes('c') ? 'capture' : 'move');
                    });
                }
            } else if (selectedPieceRef.current && canMove) {
                if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
                const targetX = obj?.userData.gridX;
                const targetZ = obj?.userData.gridZ;
                const move = validMovesRef.current.find((m) => {
                    const { x, z } = squareToCoords(m.to);
                    return x === targetX && z === targetZ;
                });
                const piece = selectedPieceRef.current;
                if (move) {
                    const targetCoords = squareToCoords(move.to);
                    const moveParams: any = { from: move.from, to: move.to };
                    if (move.flags.includes('p')) moveParams.promotion = 'q';
                    try {
                        currentGame.move(moveParams);
                        clearHighlights();
                        selectedPieceRef.current = null;
                        const endPos = new THREE.Vector3((targetCoords.x - 3.5) * SQUARE_SIZE, 0, (targetCoords.z - 3.5) * SQUARE_SIZE);
                        const mid = piece.position.clone().lerp(endPos, 0.5);
                        mid.y = 2.0;
                        new TWEEN.Tween(piece.position, tweenGroup.current)
                            .to({ x: mid.x, y: mid.y, z: mid.z }, 300).easing(TWEEN.Easing.Sinusoidal.InOut)
                            .chain(
                                new TWEEN.Tween(piece.position, tweenGroup.current)
                                    .to({ x: endPos.x, y: 0, z: endPos.z }, 300).easing(TWEEN.Easing.Sinusoidal.InOut)
                                    .onComplete(() => {
                                        spawnPieces();
                                        updateStatus();

                                        // Online: emit move
                                        if (modeRef.current === 'online' && roomIdRef.current) {
                                            const socket = getSocket();
                                            socket.emit('make-move', { roomId: roomIdRef.current, from: move.from, to: move.to, promotion: moveParams.promotion });
                                            socket.emit('update-fen', { roomId: roomIdRef.current, fen: currentGame.fen() });
                                        }

                                        // AI: trigger bot move
                                        if (modeRef.current === 'ai' && !currentGame.isGameOver()) {
                                            setTimeout(() => {
                                                setAiThinking(true);
                                                aiThinkingRef.current = true;
                                                setTimeout(() => {
                                                    const bestMove = getBestMove(currentGame.fen(), difficultyRef.current);
                                                    if (bestMove) {
                                                        try {
                                                            currentGame.move({ from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion });
                                                            spawnPieces();
                                                            updateStatus();
                                                        } catch (err) { console.error('AI move error', err); }
                                                    }
                                                    setAiThinking(false);
                                                    aiThinkingRef.current = false;
                                                }, 400);
                                            }, 200);
                                        }
                                    })
                            ).start();
                    } catch {
                        new TWEEN.Tween(piece.position, tweenGroup.current).to({ y: 0 }, 120).start();
                        clearHighlights(); selectedPieceRef.current = null;
                    }
                } else {
                    new TWEEN.Tween(piece.position, tweenGroup.current).to({ y: 0 }, 120).start();
                    clearHighlights(); selectedPieceRef.current = null;
                }
            } else {
                // If clicking empty space or invalid, re-enable controls
                if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
            }
        };

        renderer.domElement.addEventListener('pointerdown', handlePointerDown);
        renderer.domElement.addEventListener('pointermove', handlePointerMove);

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        const clock = new THREE.Clock();
        let animationFrameId: number;
        const animate = (time: number) => {
            animationFrameId = requestAnimationFrame(animate);
            tweenGroup.current.update(time);
            controls.update();
            const elapsed = clock.getElapsedTime();
            if (particles.geometry.attributes.position) {
                const pos = particles.geometry.attributes.position as THREE.BufferAttribute;
                for (let i = 0; i < particleCount; i++) {
                    pos.setY(i, pos.getY(i) + Math.sin(elapsed + i * 0.5) * 0.003);
                }
                pos.needsUpdate = true;
            }
            renderer.render(scene, camera);
        };
        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
            renderer.domElement.removeEventListener('pointermove', handlePointerMove);
            if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
                containerRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleReset = () => {
        game.reset();
        spawnPieces();
        updateStatus();
        setMoveHistory([]);
        setGameResult(null);
    };

    const handleResign = () => {
        if (mode === 'online' && roomId) {
            const socket = getSocket();
            socket.emit('resign', { roomId });
        }
        const winner = game.turn() === 'w' ? 'Black' : 'White';
        setGameResult(`${winner} wins by resignation!`);
    };

    const colorLabel = playerColor === 'w' ? 'White' : 'Black';
    const modeLabel = mode === 'ai' ? `vs AI (${['', 'Easy', 'Medium', 'Hard'][difficulty]})` : mode === 'online' ? 'Online 1v1' : 'Local';

    // Determine white/black player names
    const whitePlayerName = playerColor === 'w' ? playerName : opponentName;
    const blackPlayerName = playerColor === 'b' ? playerName : opponentName;

    return (
        <>
            <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />

            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                    <div className="loading-text">Setting Up the Board...</div>
                </div>
            )}

            {/* Waiting for opponent overlay */}
            {waitingForOpponent && mode === 'online' && (
                <div className="loading-overlay" style={{ background: 'rgba(10,14,26,0.92)' }}>
                    <div className="loading-spinner" />
                    <div className="loading-text">Waiting for opponent to join...</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                        Playing as {colorLabel}
                    </div>
                </div>
            )}

            {/* Opponent disconnected overlay */}
            {opponentDisconnected && !gameResult && (
                <div className="game-overlay">
                    <div className="glass-panel" style={{ textAlign: 'center', maxWidth: 360, padding: 32 }}>
                        <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
                        <h3 style={{ marginBottom: 8 }}>Opponent Disconnected</h3>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                            Waiting for them to reconnect...
                        </p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 20 }}>
                            The game will be preserved for 2 minutes
                        </p>
                        <button className="btn-secondary" onClick={onExit}>Leave Game</button>
                    </div>
                </div>
            )}

            {/* Game result overlay */}
            {gameResult && (
                <div className="game-overlay">
                    <div className="glass-panel" style={{ textAlign: 'center', maxWidth: 360, padding: 32 }}>
                        <div style={{ marginBottom: 12 }}><CrownIcon size={48} color="#c9a96e" /></div>
                        <h3 style={{ fontSize: 18, marginBottom: 8 }}>{gameResult}</h3>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
                            {mode !== 'online' && <button className="btn-primary" onClick={handleReset}><span className="btn-icon-text"><RefreshIcon size={14} /> Play Again</span></button>}
                            <button className="btn-secondary" onClick={onExit}>← Menu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI thinking indicator */}
            {aiThinking && (
                <div className="ai-thinking panel-fade-in">
                    <div className="loading-spinner" style={{ width: 16, height: 16 }} />
                    <span>AI is thinking...</span>
                </div>
            )}

            {/* Mobile Controls Toggle Button */}
            {!showControls && (
                <button 
                    className="mobile-menu-btn" 
                    onClick={() => setShowControls(true)}
                    aria-label="Toggle Controls"
                >
                    <GearIcon size={18} />
                </button>
            )}

            {/* Top Left: Controls Panel */}
            <div className={`glass-panel panel-fade-in mobile-controls ${showControls ? 'visible' : ''}`} style={{ position: 'fixed', top: 20, left: 20, width: 230, animationDelay: '0.1s' }}>
                <div className="panel-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="panel-icon"><GearIcon size={14} color="#c9a96e" /></span>
                        Controls
                    </div>
                    {/* Close button inside mobile menu */}
                    <button 
                        className="mobile-menu-btn" 
                        style={{ position: 'relative', top: 0, left: 0, padding: 4, display: 'none' }}
                        onClick={() => setShowControls(false)}
                    >
                        <CloseIcon size={12} />
                    </button>
                </div>
                <div className="control-row"><span>Select / Move</span><kbd>Tap / Click</kbd></div>
                <div className="control-row"><span>Orbit</span><kbd>1-Finger / R-Click</kbd></div>
                <div className="control-row" style={{ marginBottom: 16 }}><span>Zoom</span><kbd>Pinch / Scroll</kbd></div>
                <div className="control-row" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{modeLabel}</span>
                    {mode === 'online' && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{colorLabel}</span>}
                </div>
                {mode !== 'online' && <button className="btn-reset" onClick={handleReset}><span className="btn-icon-text"><RefreshIcon size={14} /> New Game</span></button>}
                {mode === 'online' && !gameResult && (
                    <button className="btn-reset" style={{ color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.1)' }} onClick={handleResign}>
                        <span className="btn-icon-text"><FlagIcon size={14} color="#f43f5e" /> Resign</span>
                    </button>
                )}
                <button className="btn-reset" style={{ marginTop: 8 }} onClick={onExit}>← Menu</button>
                {/* Mobile specific close button at bottom just in case */}
                <button className="btn-reset" style={{ marginTop: 8, display: 'var(--mobile-only, none)' }} onClick={() => setShowControls(false)}>Close Menu</button>
            </div>

            {/* Top Right: Turn Indicator + Player Names + Chat */}
            <div className="glass-panel panel-fade-in mobile-top-right" style={{ position: 'fixed', top: 20, right: 20, minWidth: 220, textAlign: 'center', animationDelay: '0.2s', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Player names */}
                <div className="player-names-row">
                    <div className="player-name-badge player-name-white">
                        <span className="player-name-dot player-name-dot-white" />
                        {whitePlayerName}
                    </div>
                    <div className="player-name-badge player-name-black">
                        <span className="player-name-dot player-name-dot-black" />
                        {blackPlayerName}
                    </div>
                </div>

                <div className="panel-label">Current Turn</div>
                <div className="turn-indicator">
                    <div className={`turn-dot ${turn === 'white' ? 'turn-dot-white' : 'turn-dot-black'}`} />
                    <span className="turn-text" style={{ color: turn === 'white' ? '#fff' : '#94a3b8' }}>
                        {turn.charAt(0).toUpperCase() + turn.slice(1)}
                    </span>
                </div>
                {status && (
                    <div className={`status-badge ${status === 'CHECKMATE!' ? 'status-checkmate' : status === 'CHECK!' ? 'status-check' : 'status-draw'}`}>
                        {status}
                    </div>
                )}

                {/* In-game chat (online only) */}
                {mode === 'online' && (
                    <div className="chat-panel" style={{ flex: 1, minHeight: 0 }}>
                        <div className="chat-header"><ChatIcon size={12} /> Chat</div>
                        <div className="chat-messages">
                            {chatMessages.length === 0 && (
                                <div className="chat-empty">No messages yet...</div>
                            )}
                            {chatMessages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`chat-bubble ${msg.sender === playerName ? 'chat-bubble-self' : 'chat-bubble-other'}`}
                                >
                                    <div className={`chat-sender ${msg.color === 'w' ? 'chat-sender-white' : 'chat-sender-black'}`}>
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
                                placeholder="Type..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                maxLength={200}
                            />
                            <button className="chat-send" onClick={handleSendChat} disabled={!chatInput.trim()}>
                                ↑
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Left: White's Captures */}
            <div className="glass-panel panel-fade-in mobile-bottom-left" style={{ position: 'fixed', bottom: 20, left: 20, animationDelay: '0.3s' }}>
                <div className="panel-label" style={{ color: '#c9a96e' }}>
                    <span className="capture-dot" style={{ background: '#fff' }} />
                    White&apos;s Captures
                </div>
                <div className="captured-pieces">
                    {capturedByWhite.map((p, i) => (<span key={i} className="captured-piece captured-dark">{pieceSymbols[p]}</span>))}
                    {capturedByWhite.length === 0 && <span className="empty-captures">No captures yet</span>}
                </div>
            </div>

            {/* Bottom Right: Black's Captures */}
            <div className="glass-panel panel-fade-in mobile-bottom-right" style={{ position: 'fixed', bottom: 20, right: 20, textAlign: 'right', animationDelay: '0.4s' }}>
                <div className="panel-label" style={{ color: '#94a3b8' }}>
                    Black&apos;s Captures
                    <span className="capture-dot" style={{ background: '#1a1a2e', marginLeft: 8 }} />
                </div>
                <div className="captured-pieces" style={{ justifyContent: 'flex-end' }}>
                    {capturedByBlack.map((p, i) => (<span key={i} className="captured-piece captured-light">{pieceSymbols[p]}</span>))}
                    {capturedByBlack.length === 0 && <span className="empty-captures">No captures yet</span>}
                </div>
            </div>

            {/* Top Right: Move History (below turn panel) */}
            {moveHistory.length > 0 && showMoveHistory && (() => {
                const MOVES_PER_PAGE = 10;
                const totalPages = Math.ceil(moveHistory.length / MOVES_PER_PAGE);
                const currentPage = Math.min(moveHistoryPage, totalPages - 1);
                const start = currentPage * MOVES_PER_PAGE;
                const pageMoves = moveHistory.slice(start, start + MOVES_PER_PAGE);
                return (
                    <div className="glass-panel panel-fade-in move-history-panel">
                        <div className="move-history-header">
                            <span className="panel-label" style={{ color: 'rgba(255,255,255,0.35)', margin: 0 }}>Moves</span>
                            <div className="move-history-controls">
                                {totalPages > 1 && (
                                    <>
                                        <button
                                            className="move-page-btn"
                                            onClick={() => setMoveHistoryPage(Math.max(0, currentPage - 1))}
                                            disabled={currentPage === 0}
                                        >
                                            &lsaquo;
                                        </button>
                                        <span className="move-page-info">{currentPage + 1}/{totalPages}</span>
                                        <button
                                            className="move-page-btn"
                                            onClick={() => setMoveHistoryPage(Math.min(totalPages - 1, currentPage + 1))}
                                            disabled={currentPage >= totalPages - 1}
                                        >
                                            &rsaquo;
                                        </button>
                                    </>
                                )}
                                <button
                                    className="move-page-btn move-hide-btn"
                                    onClick={() => setShowMoveHistory(false)}
                                    title="Hide"
                                >
                                    <CloseIcon size={10} />
                                </button>
                            </div>
                        </div>
                        <div className="move-history">
                            {pageMoves.map((m, i) => {
                                const absIdx = start + i;
                                return (
                                    <span key={absIdx} className={`move-entry ${absIdx % 2 === 0 ? 'move-white' : 'move-black'}`}>
                                        {absIdx % 2 === 0 && <span className="move-number">{Math.floor(absIdx / 2) + 1}.</span>}{m}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
            {/* Show move history toggle when hidden */}
            {moveHistory.length > 0 && !showMoveHistory && (
                <button
                    className="move-history-show-btn"
                    onClick={() => setShowMoveHistory(true)}
                >
                    Moves ({moveHistory.length})
                </button>
            )}

            {/* TOP CENTER: Title */}
            <div className="panel-fade-in game-title-wrapper">
                <div className="game-title"><KingIcon size={20} color="#c9a96e" /> CHESS <KingIcon size={20} color="#94a3b8" /></div>
                <div className="game-subtitle">3D Edition</div>
            </div>

            {/* Mobile Chat Toggle Button (online only) */}
            {mode === 'online' && (
                <button
                    className="mobile-chat-toggle"
                    onClick={() => setShowMobileChat(!showMobileChat)}
                    aria-label="Toggle Chat"
                >
                    <ChatIcon size={18} />
                </button>
            )}

            {/* Mobile Chat Bottom Sheet (online only) */}
            {mode === 'online' && (
                <div className={`mobile-chat-sheet ${showMobileChat ? 'active' : ''}`}>
                    <div className="mobile-chat-sheet-header">
                        <span>Chat</span>
                        <button className="mobile-chat-close" onClick={() => setShowMobileChat(false)}><CloseIcon size={14} /></button>
                    </div>
                    <div className="chat-messages">
                        {chatMessages.length === 0 && (
                            <div className="chat-empty">No messages yet...</div>
                        )}
                        {chatMessages.map((msg, i) => (
                            <div
                                key={i}
                                className={`chat-bubble ${msg.sender === playerName ? 'chat-bubble-self' : 'chat-bubble-other'}`}
                            >
                                <div className={`chat-sender ${msg.color === 'w' ? 'chat-sender-white' : 'chat-sender-black'}`}>
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
                            ↑
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChessGame;
