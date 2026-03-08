'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { Chess, Move } from 'chess.js';

const SQUARE_SIZE = 3;

/* ───────────── PIECE GEOMETRY GENERATORS ───────────── */
// High-detail Staunton-style chess pieces with smooth lathe profiles

function createPawn(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const profile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1.05, 0),
        new THREE.Vector2(1.1, 0.05),
        new THREE.Vector2(1.1, 0.25),
        new THREE.Vector2(1.05, 0.35),
        new THREE.Vector2(0.95, 0.45),
        // stem taper
        new THREE.Vector2(0.55, 0.8),
        new THREE.Vector2(0.45, 1.2),
        new THREE.Vector2(0.40, 1.6),
        // collar ring
        new THREE.Vector2(0.42, 1.8),
        new THREE.Vector2(0.65, 1.9),
        new THREE.Vector2(0.70, 1.95),
        new THREE.Vector2(0.70, 2.05),
        new THREE.Vector2(0.65, 2.1),
        new THREE.Vector2(0.42, 2.2),
        // neck
        new THREE.Vector2(0.38, 2.4),
        new THREE.Vector2(0.35, 2.6),
        // head sphere approach
        new THREE.Vector2(0.40, 2.8),
        new THREE.Vector2(0.55, 3.0),
        new THREE.Vector2(0.65, 3.2),
        new THREE.Vector2(0.70, 3.5),
        new THREE.Vector2(0.68, 3.8),
        new THREE.Vector2(0.60, 4.0),
        new THREE.Vector2(0.45, 4.15),
        new THREE.Vector2(0.25, 4.25),
        new THREE.Vector2(0, 4.3),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), mat);
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    return g;
}

function createRook(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const profile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1.15, 0),
        new THREE.Vector2(1.2, 0.06),
        new THREE.Vector2(1.2, 0.28),
        new THREE.Vector2(1.15, 0.38),
        new THREE.Vector2(1.0, 0.48),
        // stem - gentle taper
        new THREE.Vector2(0.82, 0.75),
        new THREE.Vector2(0.76, 1.3),
        new THREE.Vector2(0.74, 2.0),
        new THREE.Vector2(0.75, 2.7),
        new THREE.Vector2(0.77, 3.1),
        // collar ring
        new THREE.Vector2(0.80, 3.3),
        new THREE.Vector2(0.92, 3.4),
        new THREE.Vector2(0.95, 3.45),
        new THREE.Vector2(0.95, 3.55),
        new THREE.Vector2(0.92, 3.6),
        new THREE.Vector2(0.80, 3.7),
        // upper tower - slightly flared
        new THREE.Vector2(0.82, 3.85),
        new THREE.Vector2(0.85, 4.0),
        new THREE.Vector2(0.90, 4.15),
        new THREE.Vector2(0.95, 4.25),
        // parapet rim
        new THREE.Vector2(1.02, 4.32),
        new THREE.Vector2(1.08, 4.38),
        new THREE.Vector2(1.08, 4.55),
        new THREE.Vector2(1.05, 4.58),
        // inner wall (hollow top)
        new THREE.Vector2(0.85, 4.58),
        new THREE.Vector2(0.82, 4.45),
        new THREE.Vector2(0.80, 4.35),
        new THREE.Vector2(0, 4.35),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), mat);
    body.castShadow = body.receiveShadow = true;
    g.add(body);

    // Rounded merlons (cylinder-based for softer look)
    const merlonCount = 5;
    for (let i = 0; i < merlonCount; i++) {
        const angle = (i / merlonCount) * Math.PI * 2;
        const merlon = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.25, 0.65, 16),
            mat
        );
        merlon.position.set(
            Math.cos(angle) * 0.92,
            4.9,
            Math.sin(angle) * 0.92
        );
        merlon.castShadow = true;
        g.add(merlon);
    }
    return g;
}

function createKnight(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();

    // Staunton-style base (layered rings)
    const baseProfile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1.15, 0),
        new THREE.Vector2(1.2, 0.06),
        new THREE.Vector2(1.2, 0.22),
        new THREE.Vector2(1.15, 0.28),
        // ring groove
        new THREE.Vector2(1.0, 0.35),
        new THREE.Vector2(1.05, 0.42),
        new THREE.Vector2(1.1, 0.48),
        new THREE.Vector2(1.1, 0.60),
        new THREE.Vector2(1.05, 0.66),
        // taper to neck
        new THREE.Vector2(0.88, 0.80),
        new THREE.Vector2(0.72, 1.05),
        new THREE.Vector2(0.60, 1.35),
        new THREE.Vector2(0, 1.5),
    ];
    const base = new THREE.Mesh(new THREE.LatheGeometry(baseProfile, 64), mat);
    base.castShadow = base.receiveShadow = true;
    g.add(base);

    // Horse head silhouette — 2D shape extruded for depth
    // Profile drawn from front chest up through mane, over head, down face, under jaw
    const shape = new THREE.Shape();

    // Start at front chest (bottom of neck, front side)
    shape.moveTo(0.5, 1.2);

    // Front of neck going up (throat/chest)
    shape.bezierCurveTo(0.55, 1.8, 0.6, 2.4, 0.45, 3.0);

    // Under the jaw / chin area
    shape.bezierCurveTo(0.35, 3.3, 0.5, 3.4, 0.75, 3.5);

    // Snout / muzzle — extends forward
    shape.bezierCurveTo(0.95, 3.55, 1.1, 3.6, 1.15, 3.7);

    // Nose tip curves up
    shape.bezierCurveTo(1.18, 3.78, 1.15, 3.88, 1.05, 3.95);

    // Bridge of nose going up to forehead
    shape.bezierCurveTo(0.85, 4.05, 0.65, 4.15, 0.55, 4.35);

    // Forehead curves up to poll (top of head)
    shape.bezierCurveTo(0.45, 4.55, 0.35, 4.7, 0.2, 4.8);

    // Ear (right ear — triangular peak)
    shape.lineTo(0.05, 5.15);
    shape.lineTo(-0.1, 4.75);

    // Back of head
    shape.bezierCurveTo(-0.2, 4.55, -0.3, 4.35, -0.35, 4.1);

    // Mane — serrated/notched edge down the back of the neck
    shape.lineTo(-0.45, 3.85);
    shape.lineTo(-0.30, 3.70);
    shape.lineTo(-0.50, 3.50);
    shape.lineTo(-0.35, 3.35);
    shape.lineTo(-0.55, 3.15);
    shape.lineTo(-0.40, 3.00);
    shape.lineTo(-0.60, 2.80);
    shape.lineTo(-0.45, 2.60);
    shape.lineTo(-0.60, 2.40);
    shape.lineTo(-0.48, 2.20);
    shape.lineTo(-0.58, 2.00);
    shape.lineTo(-0.45, 1.80);

    // Back of neck curves down to base
    shape.bezierCurveTo(-0.50, 1.50, -0.50, 1.30, -0.45, 1.2);

    // Close the shape across the bottom
    shape.lineTo(0.5, 1.2);

    const extrudeSettings = {
        steps: 1,
        depth: 0.9,
        bevelEnabled: true,
        bevelThickness: 0.15,
        bevelSize: 0.12,
        bevelOffset: 0,
        bevelSegments: 4,
    };

    const headGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center the depth in the geometry itself so rotation stays aligned
    headGeo.translate(0, 0, -0.45);
    headGeo.computeVertexNormals();
    const headMesh = new THREE.Mesh(headGeo, mat);
    headMesh.rotation.y = -Math.PI / 2;
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    g.add(headMesh);

    return g;
}

function createBishop(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const profile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1.1, 0),
        new THREE.Vector2(1.15, 0.05),
        new THREE.Vector2(1.15, 0.25),
        new THREE.Vector2(1.1, 0.35),
        new THREE.Vector2(0.95, 0.45),
        // stem
        new THREE.Vector2(0.55, 0.8),
        new THREE.Vector2(0.45, 1.3),
        new THREE.Vector2(0.42, 1.8),
        // collar ring
        new THREE.Vector2(0.44, 2.0),
        new THREE.Vector2(0.70, 2.1),
        new THREE.Vector2(0.75, 2.15),
        new THREE.Vector2(0.75, 2.25),
        new THREE.Vector2(0.70, 2.3),
        new THREE.Vector2(0.44, 2.4),
        // narrow neck
        new THREE.Vector2(0.38, 2.6),
        new THREE.Vector2(0.35, 2.8),
        // mitre head - bulge
        new THREE.Vector2(0.42, 3.0),
        new THREE.Vector2(0.55, 3.3),
        new THREE.Vector2(0.65, 3.7),
        new THREE.Vector2(0.68, 4.0),
        new THREE.Vector2(0.65, 4.3),
        new THREE.Vector2(0.58, 4.6),
        new THREE.Vector2(0.45, 4.9),
        new THREE.Vector2(0.30, 5.15),
        new THREE.Vector2(0.15, 5.35),
        new THREE.Vector2(0.05, 5.5),
        new THREE.Vector2(0, 5.55),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), mat);
    body.castShadow = body.receiveShadow = true;
    g.add(body);

    // Tip sphere
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat);
    tip.position.set(0, 5.72, 0);
    tip.castShadow = true;
    g.add(tip);

    // Mitre slit (thin dark line) — decorative groove
    const slitGeo = new THREE.BoxGeometry(0.04, 1.3, 0.75);
    const slitMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 });
    const slit = new THREE.Mesh(slitGeo, slitMat);
    slit.position.set(0, 4.3, 0.3);
    slit.rotation.x = -0.15;
    g.add(slit);

    return g;
}

function createQueen(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const profile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1.25, 0),
        new THREE.Vector2(1.3, 0.05),
        new THREE.Vector2(1.3, 0.3),
        new THREE.Vector2(1.25, 0.4),
        new THREE.Vector2(1.1, 0.5),
        // elegant stem
        new THREE.Vector2(0.65, 0.9),
        new THREE.Vector2(0.50, 1.5),
        new THREE.Vector2(0.45, 2.2),
        new THREE.Vector2(0.42, 3.0),
        // collar
        new THREE.Vector2(0.44, 3.2),
        new THREE.Vector2(0.75, 3.3),
        new THREE.Vector2(0.80, 3.35),
        new THREE.Vector2(0.80, 3.45),
        new THREE.Vector2(0.75, 3.5),
        new THREE.Vector2(0.44, 3.6),
        // neck
        new THREE.Vector2(0.40, 3.8),
        new THREE.Vector2(0.38, 4.0),
        // crown body
        new THREE.Vector2(0.50, 4.3),
        new THREE.Vector2(0.70, 4.6),
        new THREE.Vector2(0.82, 4.9),
        new THREE.Vector2(0.88, 5.2),
        // crown rim (flared)
        new THREE.Vector2(0.95, 5.5),
        new THREE.Vector2(1.05, 5.7),
        new THREE.Vector2(1.10, 5.85),
        new THREE.Vector2(1.08, 5.95),
        new THREE.Vector2(0.95, 6.0),
        new THREE.Vector2(0.80, 5.9),
        new THREE.Vector2(0, 5.6),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), mat);
    body.castShadow = body.receiveShadow = true;
    g.add(body);

    // Crown points (8 pointed spires)
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spire = new THREE.Mesh(
            new THREE.ConeGeometry(0.12, 0.6, 8),
            mat
        );
        spire.position.set(Math.cos(angle) * 0.9, 6.2, Math.sin(angle) * 0.9);
        spire.castShadow = true;
        g.add(spire);
    }

    // Central orb on top
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat);
    orb.position.set(0, 6.5, 0);
    orb.castShadow = true;
    g.add(orb);

    // Tiny cross on top of orb
    const cv = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), mat);
    cv.position.set(0, 6.9, 0);
    cv.castShadow = true;
    g.add(cv);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.08), mat);
    ch.position.set(0, 6.95, 0);
    ch.castShadow = true;
    g.add(ch);

    return g;
}

function createKing(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const profile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1.3, 0),
        new THREE.Vector2(1.35, 0.05),
        new THREE.Vector2(1.35, 0.35),
        new THREE.Vector2(1.3, 0.45),
        new THREE.Vector2(1.15, 0.55),
        // stout stem
        new THREE.Vector2(0.70, 0.9),
        new THREE.Vector2(0.55, 1.5),
        new THREE.Vector2(0.50, 2.2),
        new THREE.Vector2(0.48, 3.0),
        // lower collar
        new THREE.Vector2(0.50, 3.2),
        new THREE.Vector2(0.80, 3.3),
        new THREE.Vector2(0.85, 3.35),
        new THREE.Vector2(0.85, 3.45),
        new THREE.Vector2(0.80, 3.5),
        new THREE.Vector2(0.50, 3.6),
        // mid body
        new THREE.Vector2(0.48, 3.8),
        new THREE.Vector2(0.50, 4.2),
        new THREE.Vector2(0.55, 4.5),
        // upper collar (velvet band)
        new THREE.Vector2(0.58, 4.7),
        new THREE.Vector2(0.82, 4.8),
        new THREE.Vector2(0.88, 4.85),
        new THREE.Vector2(0.88, 5.0),
        new THREE.Vector2(0.82, 5.05),
        new THREE.Vector2(0.58, 5.15),
        // crown
        new THREE.Vector2(0.60, 5.4),
        new THREE.Vector2(0.75, 5.7),
        new THREE.Vector2(0.85, 6.0),
        new THREE.Vector2(0.90, 6.3),
        new THREE.Vector2(0.92, 6.5),
        // arch top
        new THREE.Vector2(0.88, 6.7),
        new THREE.Vector2(0.80, 6.85),
        new THREE.Vector2(0.65, 6.95),
        new THREE.Vector2(0.45, 7.0),
        new THREE.Vector2(0.25, 7.02),
        new THREE.Vector2(0, 7.03),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), mat);
    body.castShadow = body.receiveShadow = true;
    g.add(body);

    // Grand cross on top
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.22), mat);
    vBar.position.set(0, 7.73, 0);
    vBar.castShadow = true;
    g.add(vBar);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 0.22), mat);
    hBar.position.set(0, 8.05, 0);
    hBar.castShadow = true;
    g.add(hBar);

    // Small orb at cross base
    const crossOrb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), mat);
    crossOrb.position.set(0, 7.08, 0);
    crossOrb.castShadow = true;
    g.add(crossOrb);

    return g;
}

/* ───────────── MAIN COMPONENT ───────────── */

const ChessGame: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [game] = useState(new Chess());
    const [turn, setTurn] = useState<'white' | 'black'>('white');
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [capturedByWhite, setCapturedByWhite] = useState<string[]>([]);
    const [capturedByBlack, setCapturedByBlack] = useState<string[]>([]);
    const [moveHistory, setMoveHistory] = useState<string[]>([]);

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

    const materials = useRef({
        whitePiece: new THREE.MeshPhysicalMaterial({
            color: 0xfaf8f5,
            metalness: 0.02,
            roughness: 0.08,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            reflectivity: 0.6,
            envMapIntensity: 0.8,
        }),
        blackPiece: new THREE.MeshPhysicalMaterial({
            color: 0x1a1a2e,
            metalness: 0.25,
            roughness: 0.15,
            clearcoat: 0.9,
            clearcoatRoughness: 0.1,
            reflectivity: 0.5,
            envMapIntensity: 0.6,
        }),
        boardWhite: new THREE.MeshStandardMaterial({
            color: 0xe8dcc8,
            roughness: 0.25,
            metalness: 0.05,
        }),
        boardBlack: new THREE.MeshStandardMaterial({
            color: 0x2d3142,
            roughness: 0.25,
            metalness: 0.1,
        }),
        boardEdge: new THREE.MeshStandardMaterial({
            color: 0x1a0f0a,
            roughness: 0.4,
            metalness: 0.15,
        }),
        boardFrame: new THREE.MeshStandardMaterial({
            color: 0x3d2b1f,
            roughness: 0.35,
            metalness: 0.1,
        }),
        highlight: new THREE.MeshBasicMaterial({
            color: 0xc9a96e,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
        }),
        danger: new THREE.MeshBasicMaterial({
            color: 0xf43f5e,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
        }),
        hover: new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15,
            depthWrite: false,
        }),
    });

    const pieceSymbols: { [key: string]: string } = {
        p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
    };
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const squareToCoords = (square: string) => ({
        x: files.indexOf(square[0]),
        z: 7 - (parseInt(square[1]) - 1),
    });
    const coordsToSquare = (x: number, z: number) =>
        x < 0 || x > 7 || z < 0 || z > 7 ? null : files[x] + ranks[7 - z];

    const generators: { [key: string]: (mat: THREE.Material) => THREE.Group } = {
        p: createPawn,
        r: createRook,
        n: createKnight,
        b: createBishop,
        q: createQueen,
        k: createKing,
    };

    const spawnPieces = () => {
        if (!sceneRef.current || !piecesGroupRef.current) return;
        const group = piecesGroupRef.current;
        group.clear();
        const board = game.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const cell = board[r][c];
                if (cell) {
                    const mat = cell.color === 'w'
                        ? materials.current.whitePiece
                        : materials.current.blackPiece;
                    const mesh = generators[cell.type](mat);
                    mesh.position.set(
                        (c - 3.5) * SQUARE_SIZE,
                        0,
                        (r - 3.5) * SQUARE_SIZE
                    );
                    if (cell.type === 'n')
                        mesh.rotation.y = cell.color === 'w' ? Math.PI : 0;
                    mesh.userData = {
                        isPiece: true,
                        type: cell.type,
                        color: cell.color,
                        gridX: c,
                        gridZ: r,
                    };
                    // Scale pieces down slightly to fit squares nicely
                    mesh.scale.setScalar(0.52);
                    group.add(mesh);
                }
            }
        }
        setLoading(false);
    };

    const updateCapturedPieces = () => {
        const board = game.board();
        const whiteOnBoard: string[] = [];
        const blackOnBoard: string[] = [];
        board.forEach((row) =>
            row.forEach((cell) => {
                if (cell) {
                    if (cell.color === 'w') whiteOnBoard.push(cell.type);
                    else blackOnBoard.push(cell.type);
                }
            })
        );
        const initial = ['p','p','p','p','p','p','p','p','r','r','n','n','b','b','q'];
        const getCaptured = (init: string[], current: string[]) => {
            const captured = [...init];
            current.forEach((p) => {
                const idx = captured.indexOf(p);
                if (idx !== -1) captured.splice(idx, 1);
            });
            return captured;
        };
        setCapturedByWhite(getCaptured(initial, blackOnBoard));
        setCapturedByBlack(getCaptured(initial, whiteOnBoard));
    };

    const clearHighlights = () => {
        highlightMeshesRef.current.forEach((m) => sceneRef.current?.remove(m));
        highlightMeshesRef.current = [];
        piecesGroupRef.current?.children.forEach((p) =>
            p.traverse((c) => {
                if (
                    c instanceof THREE.Mesh &&
                    c.material instanceof THREE.MeshPhysicalMaterial
                )
                    c.material.emissive?.setHex(0);
            })
        );
    };

    const highlightSquare = (x: number, z: number, type: 'move' | 'capture' = 'move') => {
        // Dot indicator for moves, ring for captures
        let mesh: THREE.Mesh;
        if (type === 'capture') {
            const ringGeo = new THREE.RingGeometry(SQUARE_SIZE * 0.38, SQUARE_SIZE * 0.47, 32);
            mesh = new THREE.Mesh(ringGeo, materials.current.danger);
        } else {
            const dotGeo = new THREE.CircleGeometry(SQUARE_SIZE * 0.15, 32);
            mesh = new THREE.Mesh(dotGeo, materials.current.highlight);
        }
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(
            (x - 3.5) * SQUARE_SIZE,
            0.03,
            (z - 3.5) * SQUARE_SIZE
        );
        sceneRef.current?.add(mesh);
        highlightMeshesRef.current.push(mesh);
    };

    const updateStatus = () => {
        setTurn(game.turn() === 'w' ? 'white' : 'black');
        if (game.isCheckmate()) setStatus('CHECKMATE!');
        else if (game.isDraw()) setStatus('DRAW!');
        else if (game.isCheck()) setStatus('CHECK!');
        else setStatus('');
        updateCapturedPieces();
        // Update move history
        setMoveHistory(game.history());
    };

    /* ───────────── SCENE SETUP ───────────── */
    useEffect(() => {
        if (!containerRef.current) return;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0e1a);
        scene.fog = new THREE.FogExp2(0x0a0e1a, 0.008);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(
            40,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 28, 38);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.maxPolarAngle = Math.PI / 2 - 0.08;
        controls.minDistance = 15;
        controls.maxDistance = 70;

        /* ── Lighting ── */
        // Soft ambient
        scene.add(new THREE.AmbientLight(0xccd5e0, 0.6));

        // Key light (warm directional)
        const keyLight = new THREE.DirectionalLight(0xfff0d4, 1.8);
        keyLight.position.set(18, 40, 18);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(4096, 4096);
        keyLight.shadow.camera.left = -20;
        keyLight.shadow.camera.right = 20;
        keyLight.shadow.camera.top = 20;
        keyLight.shadow.camera.bottom = -20;
        keyLight.shadow.bias = -0.0003;
        keyLight.shadow.normalBias = 0.04;
        scene.add(keyLight);

        // Fill light (cool blue from opposite side)
        const fillLight = new THREE.DirectionalLight(0x8ecae6, 0.6);
        fillLight.position.set(-15, 20, -15);
        scene.add(fillLight);

        // Rim light (dramatic back-light)
        const rimLight = new THREE.SpotLight(0x7b68ee, 800);
        rimLight.position.set(-20, 30, -25);
        rimLight.angle = Math.PI / 4;
        rimLight.penumbra = 0.6;
        scene.add(rimLight);

        // Accent light from front
        const accentLight = new THREE.PointLight(0xffd700, 200);
        accentLight.position.set(15, 15, 25);
        scene.add(accentLight);

        /* ── Pieces Group ── */
        const piecesGroup = new THREE.Group();
        scene.add(piecesGroup);
        piecesGroupRef.current = piecesGroup;

        /* ── Board ── */
        const board = new THREE.Group();
        scene.add(board);

        // Board frame (outer rim) — sits lowest
        const frameGeo = new THREE.BoxGeometry(
            SQUARE_SIZE * 8 + 3.5,
            1.5,
            SQUARE_SIZE * 8 + 3.5
        );
        const frame = new THREE.Mesh(frameGeo, materials.current.boardFrame);
        frame.position.y = -1.25;
        frame.receiveShadow = true;
        board.add(frame);

        // Inner dark edge — sits between frame and squares
        const edge = new THREE.Mesh(
            new THREE.BoxGeometry(SQUARE_SIZE * 8 + 0.6, 1.0, SQUARE_SIZE * 8 + 0.6),
            materials.current.boardEdge
        );
        edge.position.y = -0.7;
        edge.receiveShadow = true;
        board.add(edge);

        // Board squares — sit on top, using thin boxes with clear separation
        for (let x = 0; x < 8; x++) {
            for (let z = 0; z < 8; z++) {
                const sq = new THREE.Mesh(
                    new THREE.BoxGeometry(SQUARE_SIZE, 0.2, SQUARE_SIZE),
                    (x + z) % 2 === 0
                        ? materials.current.boardWhite
                        : materials.current.boardBlack
                );
                sq.position.set(
                    (x - 3.5) * SQUARE_SIZE,
                    -0.1,
                    (z - 3.5) * SQUARE_SIZE
                );
                sq.receiveShadow = true;
                sq.userData = { isSquare: true, gridX: x, gridZ: z };
                board.add(sq);
            }
        }

        // Coordinate labels
        const labelColor = 0x8891a5;
        const createLabel = (text: string, x: number, y: number, z: number) => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = 'transparent';
            ctx.fillRect(0, 0, 64, 64);
            ctx.font = 'bold 40px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `#${labelColor.toString(16).padStart(6, '0')}`;
            ctx.fillText(text, 32, 32);
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.7,
            });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(x, y, z);
            sprite.scale.set(1.2, 1.2, 1);
            board.add(sprite);
        };

        // File labels (a-h) along bottom
        for (let i = 0; i < 8; i++) {
            createLabel(
                files[i].toUpperCase(),
                (i - 3.5) * SQUARE_SIZE,
                -0.2,
                4.5 * SQUARE_SIZE
            );
            createLabel(
                files[i].toUpperCase(),
                (i - 3.5) * SQUARE_SIZE,
                -0.2,
                -4.5 * SQUARE_SIZE
            );
        }
        // Rank labels (1-8) along sides
        for (let i = 0; i < 8; i++) {
            createLabel(
                ranks[7 - i],
                -4.5 * SQUARE_SIZE,
                -0.2,
                (i - 3.5) * SQUARE_SIZE
            );
            createLabel(
                ranks[7 - i],
                4.5 * SQUARE_SIZE,
                -0.2,
                (i - 3.5) * SQUARE_SIZE
            );
        }

        /* ── Ground plane (shadow catcher) ── */
        const groundGeo = new THREE.PlaneGeometry(120, 120);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x080c15,
            roughness: 0.95,
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2.1;
        ground.receiveShadow = true;
        scene.add(ground);

        /* ── Ambient Particles ── */
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
        const particleMat = new THREE.PointsMaterial({
            color: 0x6c7baa,
            size: 0.08,
            transparent: true,
            opacity: 0.5,
            sizeAttenuation: true,
            depthWrite: false,
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);
        particlesRef.current = particles;

        /* ── Hover indicator ── */
        const hoverMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(SQUARE_SIZE * 0.95, SQUARE_SIZE * 0.95),
            materials.current.hover
        );
        hoverMesh.rotation.x = -Math.PI / 2;
        hoverMesh.visible = false;
        scene.add(hoverMesh);
        hoverMeshRef.current = hoverMesh;

        /* ── Spawn initial pieces ── */
        spawnPieces();
        updateCapturedPieces();

        /* ── Raycaster & Interaction ── */
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const findObjectUnderMouse = (e: PointerEvent | MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(
                [...piecesGroup.children, ...board.children],
                true
            );
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
                const { gridX, gridZ } = obj.userData;
                hoverMesh.position.set(
                    (gridX - 3.5) * SQUARE_SIZE,
                    0.015,
                    (gridZ - 3.5) * SQUARE_SIZE
                );
                hoverMesh.visible = true;
            } else {
                hoverMesh.visible = false;
            }
        };

        const handlePointerDown = (e: PointerEvent) => {
            const obj = findObjectUnderMouse(e);
            if (
                obj &&
                obj.userData.isPiece &&
                obj.userData.color === game.turn()
            ) {
                if (selectedPieceRef.current)
                    new TWEEN.Tween(selectedPieceRef.current.position, tweenGroup.current)
                        .to({ y: 0 }, 120)
                        .easing(TWEEN.Easing.Back.Out)
                        .start();
                clearHighlights();
                selectedPieceRef.current = obj as THREE.Group;
                new TWEEN.Tween(obj.position, tweenGroup.current)
                    .to({ y: 0.6 }, 150)
                    .easing(TWEEN.Easing.Back.Out)
                    .start();
                obj.traverse((c) => {
                    if (
                        c instanceof THREE.Mesh &&
                        c.material instanceof THREE.MeshPhysicalMaterial
                    )
                        c.material.emissive?.setHex(0x222244);
                });
                const sq = coordsToSquare(obj.userData.gridX, obj.userData.gridZ);
                if (sq) {
                    validMovesRef.current = game.moves({
                        square: sq as any,
                        verbose: true,
                    });
                    validMovesRef.current.forEach((m) => {
                        const { x, z } = squareToCoords(m.to);
                        highlightSquare(x, z, m.flags.includes('c') ? 'capture' : 'move');
                    });
                }
            } else if (selectedPieceRef.current) {
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
                        game.move(moveParams);
                        clearHighlights();
                        selectedPieceRef.current = null;
                        const endPos = new THREE.Vector3(
                            (targetCoords.x - 3.5) * SQUARE_SIZE,
                            0,
                            (targetCoords.z - 3.5) * SQUARE_SIZE
                        );
                        const mid = piece.position.clone().lerp(endPos, 0.5);
                        mid.y = 2.0;
                        new TWEEN.Tween(piece.position, tweenGroup.current)
                            .to({ x: mid.x, y: mid.y, z: mid.z }, 300)
                            .easing(TWEEN.Easing.Sinusoidal.InOut)
                            .chain(
                                new TWEEN.Tween(piece.position, tweenGroup.current)
                                    .to({ x: endPos.x, y: 0, z: endPos.z }, 300)
                                    .easing(TWEEN.Easing.Sinusoidal.InOut)
                                    .onComplete(() => {
                                        spawnPieces();
                                        updateStatus();
                                    })
                            )
                            .start();
                    } catch {
                        new TWEEN.Tween(piece.position, tweenGroup.current)
                            .to({ y: 0 }, 120)
                            .start();
                        clearHighlights();
                        selectedPieceRef.current = null;
                    }
                } else {
                    new TWEEN.Tween(piece.position, tweenGroup.current)
                        .to({ y: 0 }, 120)
                        .start();
                    clearHighlights();
                    selectedPieceRef.current = null;
                }
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

        /* ── Animation Loop ── */
        const clock = new THREE.Clock();
        const animate = (time: number) => {
            requestAnimationFrame(animate);
            tweenGroup.current.update(time);
            controls.update();

            // Animate particles (slow drift)
            const elapsed = clock.getElapsedTime();
            if (particles.geometry.attributes.position) {
                const pos = particles.geometry.attributes.position as THREE.BufferAttribute;
                for (let i = 0; i < particleCount; i++) {
                    pos.setY(
                        i,
                        pos.getY(i) + Math.sin(elapsed + i * 0.5) * 0.003
                    );
                }
                pos.needsUpdate = true;
            }

            renderer.render(scene, camera);
        };
        requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
            renderer.domElement.removeEventListener('pointermove', handlePointerMove);
            renderer.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleReset = () => {
        game.reset();
        spawnPieces();
        updateStatus();
        setMoveHistory([]);
    };

    /* ───────────── UI ───────────── */
    return (
        <>
            {/* Three.js canvas container */}
            <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />

            {/* Loading overlay */}
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                    <div className="loading-text">Setting Up the Board...</div>
                </div>
            )}

            {/* TOP LEFT: Controls Panel */}
            <div className="glass-panel panel-fade-in" style={{ position: 'fixed', top: '20px', left: '20px', width: '230px', animationDelay: '0.1s' }}>
                <div className="panel-header">
                    <span className="panel-icon">⚙</span>
                    Controls
                </div>
                <div className="control-row">
                    <span>Select / Move</span>
                    <kbd>L-Click</kbd>
                </div>
                <div className="control-row">
                    <span>Orbit Camera</span>
                    <kbd>R-Click + Drag</kbd>
                </div>
                <div className="control-row" style={{ marginBottom: '16px' }}>
                    <span>Zoom</span>
                    <kbd>Scroll</kbd>
                </div>
                <button className="btn-reset" onClick={handleReset}>
                    ↺ New Game
                </button>
            </div>

            {/* TOP RIGHT: Turn Indicator */}
            <div className="glass-panel panel-fade-in" style={{ position: 'fixed', top: '20px', right: '20px', minWidth: '180px', textAlign: 'center', animationDelay: '0.2s' }}>
                <div className="panel-label">Current Turn</div>
                <div className="turn-indicator">
                    <div
                        className={`turn-dot ${turn === 'white' ? 'turn-dot-white' : 'turn-dot-black'}`}
                    />
                    <span className="turn-text" style={{ color: turn === 'white' ? '#fff' : '#94a3b8' }}>
                        {turn.charAt(0).toUpperCase() + turn.slice(1)}
                    </span>
                </div>
                {status && (
                    <div className={`status-badge ${status === 'CHECKMATE!' ? 'status-checkmate' : status === 'CHECK!' ? 'status-check' : 'status-draw'}`}>
                        {status === 'CHECKMATE!' ? '👑 ' : status === 'CHECK!' ? '⚡ ' : '🤝 '}
                        {status}
                    </div>
                )}
            </div>

            {/* BOTTOM LEFT: White's Captures */}
            <div className="glass-panel panel-fade-in" style={{ position: 'fixed', bottom: '20px', left: '20px', minWidth: '210px', animationDelay: '0.3s' }}>
                <div className="panel-label" style={{ color: '#818cf8' }}>
                    <span className="capture-dot" style={{ background: '#fff' }} />
                    White&apos;s Captures
                </div>
                <div className="captured-pieces">
                    {capturedByWhite.map((p, i) => (
                        <span key={i} className="captured-piece captured-dark">
                            {pieceSymbols[p]}
                        </span>
                    ))}
                    {capturedByWhite.length === 0 && (
                        <span className="empty-captures">No captures yet</span>
                    )}
                </div>
            </div>

            {/* BOTTOM RIGHT: Black's Captures */}
            <div className="glass-panel panel-fade-in" style={{ position: 'fixed', bottom: '20px', right: '20px', minWidth: '210px', textAlign: 'right', animationDelay: '0.4s' }}>
                <div className="panel-label" style={{ color: '#94a3b8' }}>
                    Black&apos;s Captures
                    <span className="capture-dot" style={{ background: '#1a1a2e', marginLeft: '8px' }} />
                </div>
                <div className="captured-pieces" style={{ justifyContent: 'flex-end' }}>
                    {capturedByBlack.map((p, i) => (
                        <span key={i} className="captured-piece captured-light">
                            {pieceSymbols[p]}
                        </span>
                    ))}
                    {capturedByBlack.length === 0 && (
                        <span className="empty-captures">No captures yet</span>
                    )}
                </div>
            </div>

            {/* BOTTOM CENTER: Move History */}
            {moveHistory.length > 0 && (
                <div 
                    className="glass-panel panel-fade-in"
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        maxWidth: '400px',
                        minWidth: '200px',
                        animationDelay: '0s',
                    }}
                >
                    <div className="panel-label" style={{ color: '#64748b', textAlign: 'center' }}>
                        Move History
                    </div>
                    <div className="move-history">
                        {moveHistory.map((m, i) => (
                            <span key={i} className={`move-entry ${i % 2 === 0 ? 'move-white' : 'move-black'}`}>
                                {i % 2 === 0 && <span className="move-number">{Math.floor(i / 2) + 1}.</span>}
                                {m}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* TOP CENTER: Title */}
            <div className="panel-fade-in" style={{ position: 'fixed', top: '22px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 9999, animationDelay: '0s', pointerEvents: 'none' }}>
                <div className="game-title">♔ CHESS ♚</div>
                <div className="game-subtitle">3D Edition</div>
            </div>
        </>
    );
};

export default ChessGame;
