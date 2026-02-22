'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { Chess, Move } from 'chess.js';

const SQUARE_SIZE = 3;

const ChessGame: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [game] = useState(new Chess());
    const [turn, setTurn] = useState<'white' | 'black'>('white');
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [capturedByWhite, setCapturedByWhite] = useState<string[]>([]);
    const [capturedByBlack, setCapturedByBlack] = useState<string[]>([]);

    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const piecesGroupRef = useRef<THREE.Group | null>(null);
    const tweenGroup = useRef(new TWEEN.Group());
    const selectedPieceRef = useRef<THREE.Group | null>(null);
    const validMovesRef = useRef<Move[]>([]);
    const highlightMeshesRef = useRef<THREE.Mesh[]>([]);
    const hoverMeshRef = useRef<THREE.Mesh | null>(null);

    const materials = useRef({
        whitePiece: new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, metalness: 0.05, roughness: 0.1, clearcoat: 1.0, reflectivity: 0.5 }),
        blackPiece: new THREE.MeshPhysicalMaterial({ color: 0x1e293b, metalness: 0.2, roughness: 0.2, clearcoat: 0.8, reflectivity: 0.5 }),
        boardWhite: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 }),
        boardBlack: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 }),
        boardEdge: new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.7 }),
        highlight: new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4, depthWrite: false }),
        danger: new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.4, depthWrite: false }),
        hover: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false })
    });

    const pieceSymbols: { [key: string]: string } = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const squareToCoords = (square: string) => ({ x: files.indexOf(square[0]), z: 7 - (parseInt(square[1]) - 1) });
    const coordsToSquare = (x: number, z: number) => (x < 0 || x > 7 || z < 0 || z > 7) ? null : files[x] + ranks[7 - z];

    const generators: { [key: string]: (mat: THREE.Material) => THREE.Group | THREE.Mesh } = {
        p: (mat) => {
            const geo = new THREE.LatheGeometry([new THREE.Vector2(0,0), new THREE.Vector2(1.1,0), new THREE.Vector2(1.1,0.3), new THREE.Vector2(0.9,0.5), new THREE.Vector2(0.7,1.5), new THREE.Vector2(0.4,2.5), new THREE.Vector2(0.7,3.0), new THREE.Vector2(0.7,3.3), new THREE.Vector2(0.3,3.4), new THREE.Vector2(0.7,3.8), new THREE.Vector2(0.7,4.3), new THREE.Vector2(0,4.5)], 64);
            const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m;
        },
        r: (mat) => {
            const g = new THREE.Group();
            const base = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0,0), new THREE.Vector2(1.2,0), new THREE.Vector2(1.2,0.4), new THREE.Vector2(1.0,0.6), new THREE.Vector2(0.9,3.5), new THREE.Vector2(1.2,3.8), new THREE.Vector2(1.2,4.5), new THREE.Vector2(0,4.5)], 64), mat);
            base.castShadow = base.receiveShadow = true; g.add(base);
            for(let i=0; i<6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const cren = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), mat);
                cren.position.set(Math.cos(angle)*0.9, 4.8, Math.sin(angle)*0.9); cren.castShadow = true; g.add(cren);
            }
            return g;
        },
        n: (mat) => {
            const g = new THREE.Group();
            const base = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0,0), new THREE.Vector2(1.2,0), new THREE.Vector2(1.2,0.4), new THREE.Vector2(1.0,0.6), new THREE.Vector2(0.9,1.2), new THREE.Vector2(0,1.5)], 64), mat);
            const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 2.5, 32), mat);
            neck.position.set(0, 2.0, -0.2); neck.rotation.x = Math.PI * 0.15;
            const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 2.2), mat);
            head.position.set(0, 3.4, 0.4); head.rotation.x = -Math.PI * 0.2;
            const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.0, 32), mat);
            snout.position.set(0, 3.0, 1.2); snout.rotation.x = -Math.PI * 0.6;
            g.add(base, neck, head, snout);
            g.traverse(c => { if(c instanceof THREE.Mesh) c.castShadow = true; });
            return g;
        },
        b: (mat) => {
            const g = new THREE.Group();
            const base = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0,0), new THREE.Vector2(1.1,0), new THREE.Vector2(1.1,0.3), new THREE.Vector2(0.9,0.5), new THREE.Vector2(0.5,2.0), new THREE.Vector2(0.4,3.0), new THREE.Vector2(0.8,3.2), new THREE.Vector2(0.8,3.5), new THREE.Vector2(0.7,4.5), new THREE.Vector2(0.6,5.2), new THREE.Vector2(0.1,5.5), new THREE.Vector2(0,5.5)], 64), mat);
            const top = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), mat);
            top.position.set(0, 5.7, 0); g.add(base, top);
            g.traverse(c => { if(c instanceof THREE.Mesh) c.castShadow = true; });
            return g;
        },
        q: (mat) => {
            const g = new THREE.Group();
            const base = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0,0), new THREE.Vector2(1.3,0), new THREE.Vector2(1.3,0.3), new THREE.Vector2(1.1,0.5), new THREE.Vector2(0.6,3.0), new THREE.Vector2(0.5,4.0), new THREE.Vector2(0.9,4.2), new THREE.Vector2(1.2,5.8), new THREE.Vector2(1.3,6.2), new THREE.Vector2(0,5.5)], 64), mat);
            for(let i=0; i<10; i++) {
                const angle = (i/10) * Math.PI * 2;
                const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), mat);
                pearl.position.set(Math.cos(angle)*1.25, 6.2, Math.sin(angle)*1.25); g.add(pearl);
            }
            g.add(base); g.traverse(c => { if(c instanceof THREE.Mesh) c.castShadow = true; });
            return g;
        },
        k: (mat) => {
            const g = new THREE.Group();
            const base = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0,0), new THREE.Vector2(1.3,0), new THREE.Vector2(1.3,0.3), new THREE.Vector2(1.1,0.5), new THREE.Vector2(0.7,3.0), new THREE.Vector2(0.6,4.5), new THREE.Vector2(1.0,4.7), new THREE.Vector2(1.1,6.0), new THREE.Vector2(1.2,6.5), new THREE.Vector2(0,6.5)], 64), mat);
            const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), mat); vBar.position.set(0, 7.1, 0);
            const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.3), mat); hBar.position.set(0, 7.2, 0);
            g.add(base, vBar, hBar); g.traverse(c => { if(c instanceof THREE.Mesh) c.castShadow = true; });
            return g;
        }
    };

    const spawnPieces = () => {
        if (!sceneRef.current || !piecesGroupRef.current) return;
        const group = piecesGroupRef.current; group.clear();
        const board = game.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const cell = board[r][c];
                if (cell) {
                    const mat = cell.color === 'w' ? materials.current.whitePiece : materials.current.blackPiece;
                    const res = generators[cell.type](mat);
                    const mesh = res instanceof THREE.Group ? res : new THREE.Group().add(res);
                    mesh.position.set((c - 3.5) * SQUARE_SIZE, 0, (r - 3.5) * SQUARE_SIZE);
                    if (cell.type === 'n') mesh.rotation.y = cell.color === 'w' ? Math.PI : 0;
                    mesh.userData = { isPiece: true, type: cell.type, color: cell.color, gridX: c, gridZ: r };
                    group.add(mesh);
                }
            }
        }
        setLoading(false);
    };

    const updateCapturedPieces = () => {
        const board = game.board();
        const whiteOnBoard: string[] = [], blackOnBoard: string[] = [];
        board.forEach(row => row.forEach(cell => { if (cell) { if (cell.color === 'w') whiteOnBoard.push(cell.type); else blackOnBoard.push(cell.type); } }));
        const initial = ['p','p','p','p','p','p','p','p','r','r','n','n','b','b','q'];
        const getCaptured = (init: string[], current: string[]) => {
            const captured = [...init];
            current.forEach(p => { const idx = captured.indexOf(p); if (idx !== -1) captured.splice(idx, 1); });
            return captured;
        };
        setCapturedByWhite(getCaptured(initial, blackOnBoard));
        setCapturedByBlack(getCaptured(initial, whiteOnBoard));
    };

    const clearHighlights = () => {
        highlightMeshesRef.current.forEach(m => sceneRef.current?.remove(m));
        highlightMeshesRef.current = [];
        piecesGroupRef.current?.children.forEach(p => p.traverse(c => { if(c instanceof THREE.Mesh && c.material instanceof THREE.MeshPhysicalMaterial) c.material.emissive?.setHex(0); }));
    };

    const highlightSquare = (x: number, z: number, type: 'move' | 'capture' = 'move') => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SQUARE_SIZE * 0.95, SQUARE_SIZE * 0.95), type === 'capture' ? materials.current.danger : materials.current.highlight);
        mesh.rotation.x = -Math.PI / 2; mesh.position.set((x - 3.5) * SQUARE_SIZE, 0.02, (z - 3.5) * SQUARE_SIZE);
        sceneRef.current?.add(mesh); highlightMeshesRef.current.push(mesh);
    };

    const updateStatus = () => {
        setTurn(game.turn() === 'w' ? 'white' : 'black');
        if (game.isCheckmate()) setStatus('CHECKMATE!'); else if (game.isDraw()) setStatus('DRAW!'); else if (game.isCheck()) setStatus('CHECK!'); else setStatus('');
        updateCapturedPieces();
    };

    useEffect(() => {
        if (!containerRef.current) return;
        const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0f172a); scene.fog = new THREE.FogExp2(0x0f172a, 0.01); sceneRef.current = scene;
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); camera.position.set(0, 30, 40); cameraRef.current = camera;
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
        containerRef.current.appendChild(renderer.domElement); rendererRef.current = renderer;
        const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2 - 0.05;
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.5); dirLight.position.set(20, 40, 20); dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048); dirLight.shadow.bias = -0.0005; dirLight.shadow.normalBias = 0.05; scene.add(dirLight);
        const rimLight = new THREE.SpotLight(0xaabbff, 1000); rimLight.position.set(-20, 25, -20); scene.add(rimLight);
        const piecesGroup = new THREE.Group(); scene.add(piecesGroup); piecesGroupRef.current = piecesGroup;
        const board = new THREE.Group(); scene.add(board);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(SQUARE_SIZE*8+2, 1.5, SQUARE_SIZE*8+2), materials.current.boardEdge); edge.position.y = -0.76; edge.receiveShadow = true; board.add(edge);
        for(let x=0; x<8; x++) for(let z=0; z<8; z++) {
            const sq = new THREE.Mesh(new THREE.BoxGeometry(SQUARE_SIZE, 0.5, SQUARE_SIZE), (x+z)%2===0 ? materials.current.boardWhite : materials.current.boardBlack);
            sq.position.set((x-3.5)*SQUARE_SIZE, -0.25, (z-3.5)*SQUARE_SIZE); sq.receiveShadow = true; sq.userData = { isSquare: true, gridX: x, gridZ: z }; board.add(sq);
        }
        const hoverMesh = new THREE.Mesh(new THREE.PlaneGeometry(SQUARE_SIZE, SQUARE_SIZE), materials.current.hover); hoverMesh.rotation.x = -Math.PI / 2; hoverMesh.visible = false; scene.add(hoverMesh); hoverMeshRef.current = hoverMesh;
        spawnPieces(); updateCapturedPieces();
        const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();
        const findObjectUnderMouse = (e: PointerEvent | MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects([...piecesGroup.children, ...board.children], true);
            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj && !obj.userData.isPiece && !obj.userData.isSquare) { if (!obj.parent) break; obj = obj.parent; }
                return obj;
            }
            return null;
        };
        const handlePointerMove = (e: PointerEvent) => {
            const obj = findObjectUnderMouse(e);
            if (obj && (obj.userData.isSquare || obj.userData.isPiece)) {
                const { gridX, gridZ } = obj.userData; hoverMesh.position.set((gridX - 3.5) * SQUARE_SIZE, 0.01, (gridZ - 3.5) * SQUARE_SIZE); hoverMesh.visible = true;
            } else hoverMesh.visible = false;
        };
        const handlePointerDown = (e: PointerEvent) => {
            const obj = findObjectUnderMouse(e);
            if (obj && obj.userData.isPiece && obj.userData.color === game.turn()) {
                if (selectedPieceRef.current) new TWEEN.Tween(selectedPieceRef.current.position, tweenGroup.current).to({ y: 0 }, 100).start();
                clearHighlights(); selectedPieceRef.current = obj as THREE.Group;
                new TWEEN.Tween(obj.position, tweenGroup.current).to({ y: 0.5 }, 100).start();
                obj.traverse(c => { if(c instanceof THREE.Mesh && c.material instanceof THREE.MeshPhysicalMaterial) c.material.emissive?.setHex(0x333333); });
                const sq = coordsToSquare(obj.userData.gridX, obj.userData.gridZ);
                if (sq) {
                    validMovesRef.current = game.moves({ square: sq as any, verbose: true });
                    validMovesRef.current.forEach(m => { const { x, z } = squareToCoords(m.to); highlightSquare(x, z, m.flags.includes('c') ? 'capture' : 'move'); });
                }
            } else if (selectedPieceRef.current) {
                const targetX = obj?.userData.gridX, targetZ = obj?.userData.gridZ;
                const move = validMovesRef.current.find(m => { const { x, z } = squareToCoords(m.to); return x === targetX && z === targetZ; });
                const piece = selectedPieceRef.current;
                if (move) {
                    const targetCoords = squareToCoords(move.to);
                    const moveParams: any = { from: move.from, to: move.to }; if (move.flags.includes('p')) moveParams.promotion = 'q';
                    try {
                        game.move(moveParams); clearHighlights(); selectedPieceRef.current = null;
                        const endPos = new THREE.Vector3((targetCoords.x-3.5)*SQUARE_SIZE, 0, (targetCoords.z-3.5)*SQUARE_SIZE);
                        const mid = piece.position.clone().lerp(endPos, 0.5); mid.y = 3; 
                        new TWEEN.Tween(piece.position, tweenGroup.current).to({x:mid.x, y:mid.y, z:mid.z}, 250).easing(TWEEN.Easing.Quadratic.Out)
                            .chain(new TWEEN.Tween(piece.position, tweenGroup.current).to({x:endPos.x, y:0, z:endPos.z}, 250).easing(TWEEN.Easing.Quadratic.In)
                            .onComplete(() => { spawnPieces(); updateStatus(); })).start();
                    } catch (err) { new TWEEN.Tween(piece.position, tweenGroup.current).to({ y: 0 }, 100).start(); clearHighlights(); selectedPieceRef.current = null; }
                } else { new TWEEN.Tween(piece.position, tweenGroup.current).to({ y: 0 }, 100).start(); clearHighlights(); selectedPieceRef.current = null; }
            }
        };
        renderer.domElement.addEventListener('pointerdown', handlePointerDown);
        renderer.domElement.addEventListener('pointermove', handlePointerMove);
        const handleResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
        window.addEventListener('resize', handleResize);
        const animate = (time: number) => { requestAnimationFrame(animate); tweenGroup.current.update(time); controls.update(); renderer.render(scene, camera); };
        requestAnimationFrame(animate);
        return () => { window.removeEventListener('resize', handleResize); renderer.domElement.removeEventListener('pointerdown', handlePointerDown); renderer.domElement.removeEventListener('pointermove', handlePointerMove); renderer.dispose(); };
    }, []);

    const handleReset = () => { game.reset(); spawnPieces(); updateStatus(); };

    const panelStyle: React.CSSProperties = {
        position: 'fixed',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        color: 'white',
        zIndex: 9999,
        pointerEvents: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        fontFamily: 'sans-serif'
    };

    return (
        <>
            <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
            
            {loading && (
                <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', letterSpacing: '4px', zIndex: 10000, backgroundColor: '#0f172a' }}>
                    GENERATING PIECES...
                </div>
            )}

            {/* TOP LEFT: CONTROLS */}
            <div style={{ ...panelStyle, top: '20px', left: '20px', width: '220px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px', fontSize: '12px', textTransform: 'uppercase' }}>Controls</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                    <span>Move</span>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>L-Click</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                    <span>Rotate</span>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>R-Click</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '15px' }}>
                    <span>Zoom</span>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Scroll</span>
                </div>
                <button onClick={handleReset} style={{ width: '100%', background: '#4f46e5', border: 'none', color: 'white', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>Reset Match</button>
            </div>

            {/* TOP RIGHT: TURN */}
            <div style={{ ...panelStyle, top: '20px', right: '20px', minWidth: '160px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6, marginBottom: '5px' }}>Current Turn</div>
                <div style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', color: turn === 'white' ? '#fff' : '#94a3b8' }}>{turn}</div>
                {status && <div style={{ marginTop: '10px', color: '#f87171', fontWeight: 'bold', fontSize: '12px' }}>{status}</div>}
            </div>

            {/* BOTTOM LEFT: WHITE CAPTURES (Black pieces) */}
            <div style={{ ...panelStyle, bottom: '20px', left: '20px', minWidth: '200px' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#818cf8', fontWeight: 'bold', marginBottom: '8px' }}>Captured by White</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '24px', minHeight: '30px' }}>
                    {capturedByWhite.map((p, i) => (
                        <span key={i} style={{ color: '#000', textShadow: '0 0 3px rgba(255,255,255,0.3)' }}>{pieceSymbols[p]}</span>
                    ))}
                    {capturedByWhite.length === 0 && <span style={{ fontSize: '10px', opacity: 0.4 }}>None</span>}
                </div>
            </div>

            {/* BOTTOM RIGHT: BLACK CAPTURES (White pieces) */}
            <div style={{ ...panelStyle, bottom: '20px', right: '20px', minWidth: '200px', textAlign: 'right' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold', marginBottom: '8px' }}>Captured by Black</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '24px', minHeight: '30px', justifyContent: 'flex-end' }}>
                    {capturedByBlack.map((p, i) => (
                        <span key={i} style={{ color: '#fff', textShadow: '0 0 3px rgba(0,0,0,0.5)' }}>{pieceSymbols[p]}</span>
                    ))}
                    {capturedByBlack.length === 0 && <span style={{ fontSize: '10px', opacity: 0.4 }}>None</span>}
                </div>
            </div>
        </>
    );
};

export default ChessGame;
