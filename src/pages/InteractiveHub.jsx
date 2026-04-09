import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { CHARACTERS, SKIN_COSMETICS } from '../game/Constants';
import { SoundManager } from '../game/SoundManager';
import { Rocket, Hammer, Crosshair, Trophy, Users, Book, Shield, Menu } from 'lucide-react';
import VirtualJoystick from '../components/game/VirtualJoystick';
import CurrencyHeader from '../components/game/CurrencyHeader';

const TERMINALS = [
    { id: 'launch', name: 'Mission Control', color: '#0CA7B8', icon: Rocket, x: 0, y: -250, route: '/hub', desc: 'Select Operative & Launch' },
    { id: 'upgrades', name: 'The Forge', color: '#F59E0B', icon: Hammer, x: -250, y: -100, route: '/upgrades', desc: 'Permanent Upgrades' },
    { id: 'dailys', name: 'Mission Board', color: '#10B981', icon: Crosshair, x: 250, y: -100, route: '/dailys', desc: 'Bounties & Dailys' },
    { id: 'leaderboard', name: 'Hall of Fame', color: '#8B5CF6', icon: Trophy, x: -180, y: 150, route: '/leaderboard', desc: 'Global Rankings' },
    { id: 'squads', name: 'Squads', color: '#EC4899', icon: Users, x: 180, y: 150, route: '/squads', desc: 'Join a Squad' },
    { id: 'codex', name: 'Database', color: '#3B82F6', icon: Book, x: -350, y: 50, route: '/bestiary', desc: 'Bestiary & Synergies' },
    { id: 'mastery', name: 'Mastery', color: '#D946EF', icon: Shield, x: 350, y: 50, route: '/mastery', desc: 'Character Mastery' }
];

export default function InteractiveHub() {
    const canvasRef = useRef(null);
    const navigate = useNavigate();
    const [save] = useState(SaveManager.load());
    const [activeTerminal, setActiveTerminal] = useState(null);
    const [joystick, setJoystick] = useState({ x: 0, y: 0 });
    
    const engineRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        let animationId;
        let lastTime = performance.now();
        
        const charId = save.lastSelectedChar || 'neobyte';
        const baseChar = CHARACTERS.find(c => c.id === charId) || CHARACTERS[0];
        const skinId = save.cosmetics?.skins?.[charId] || `${charId}_default`;
        const skinColor = SKIN_COSMETICS.find(s => s.id === skinId)?.color;
        const color = skinColor || baseChar.color;

        let charImage = null;
        if (baseChar.idleSprite) {
            charImage = new Image();
            charImage.crossOrigin = "Anonymous";
            charImage.src = baseChar.idleSprite;
        } else if (baseChar.image) {
            charImage = new Image();
            charImage.crossOrigin = "Anonymous";
            charImage.src = baseChar.image;
        }

        const floorImage = new Image();
        floorImage.crossOrigin = "Anonymous";
        floorImage.src = 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/b7bfbd6fe_Map19.png';

        const engine = {
            player: { x: 0, y: 0, radius: 20, speed: 300, color, image: charImage, frameTimer: 0, currentFrame: 0, facingLeft: false, isMoving: false },
            camera: { x: 0, y: 0 },
            keys: {},
            terminals: TERMINALS
        };
        engineRef.current = engine;

        const handleKeyDown = (e) => { engine.keys[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { engine.keys[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const loop = (time) => {
            const dt = Math.min((time - lastTime) / 1000, 0.1);
            lastTime = time;

            let dx = 0, dy = 0;
            if (engine.keys['w'] || engine.keys['arrowup']) dy -= 1;
            if (engine.keys['s'] || engine.keys['arrowdown']) dy += 1;
            if (engine.keys['a'] || engine.keys['arrowleft']) dx -= 1;
            if (engine.keys['d'] || engine.keys['arrowright']) dx += 1;

            let usingGamepad = false;
            if (typeof navigator !== 'undefined' && navigator.getGamepads) {
                const gamepads = navigator.getGamepads();
                for (let i = 0; i < gamepads.length; i++) {
                    const gp = gamepads[i];
                    if (gp && gp.connected) {
                        const axeX = gp.axes[0] || 0;
                        const axeY = gp.axes[1] || 0;
                        const deadzone = 0.15;
                        if (Math.abs(axeX) > deadzone || Math.abs(axeY) > deadzone) {
                            dx = axeX;
                            dy = axeY;
                            usingGamepad = true;
                        }
                        if (gp.buttons[12]?.pressed) { dy = -1; usingGamepad = true; }
                        if (gp.buttons[13]?.pressed) { dy = 1; usingGamepad = true; }
                        if (gp.buttons[14]?.pressed) { dx = -1; usingGamepad = true; }
                        if (gp.buttons[15]?.pressed) { dx = 1; usingGamepad = true; }
                        if (usingGamepad) break;
                    }
                }
            }

            if (joystick.x !== 0 || joystick.y !== 0) {
                dx = joystick.x;
                dy = joystick.y;
            } else if (!usingGamepad && (dx !== 0 || dy !== 0)) {
                const len = Math.hypot(dx, dy);
                dx /= len; dy /= len;
            }

            engine.player.x += dx * engine.player.speed * dt;
            engine.player.y += dy * engine.player.speed * dt;
            
            const boundsX = 500;
            const boundsY = 350;
            engine.player.x = Math.max(-boundsX, Math.min(boundsX, engine.player.x));
            engine.player.y = Math.max(-boundsY, Math.min(boundsY, engine.player.y));

            engine.player.isMoving = dx !== 0 || dy !== 0;
            if (dx < 0) engine.player.facingLeft = true;
            else if (dx > 0) engine.player.facingLeft = false;

            engine.camera.x = engine.player.x - canvas.width / 2;
            engine.camera.y = engine.player.y - canvas.height / 2;

            let nearest = null;
            let minDist = 100;
            engine.terminals.forEach(t => {
                const dist = Math.hypot(engine.player.x - t.x, engine.player.y - t.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = t;
                }
            });
            setActiveTerminal(nearest);

            if (engine.keys['e'] && nearest) {
                engine.keys['e'] = false;
                SoundManager.playUIClick();
                navigate(nearest.route);
            }

            ctx.fillStyle = '#05020a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(-engine.camera.x, -engine.camera.y);

            if (floorImage.complete && floorImage.naturalWidth > 0) {
                ctx.globalAlpha = 0.3;
                ctx.drawImage(floorImage, -boundsX - 200, -boundsY - 200, boundsX*2 + 400, boundsY*2 + 400);
                ctx.globalAlpha = 1.0;
            }

            ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
            ctx.lineWidth = 2;
            const gridSize = 100;
            const startX = Math.floor((-boundsX) / gridSize) * gridSize;
            const startY = Math.floor((-boundsY) / gridSize) * gridSize;
            for (let x = startX; x <= boundsX; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, -boundsY); ctx.lineTo(x, boundsY); ctx.stroke();
            }
            for (let y = startY; y <= boundsY; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(-boundsX, y); ctx.lineTo(boundsX, y); ctx.stroke();
            }
            
            ctx.strokeStyle = '#0CA7B8';
            ctx.lineWidth = 6;
            ctx.strokeRect(-boundsX, -boundsY, boundsX*2, boundsY*2);

            engine.terminals.forEach(t => {
                ctx.fillStyle = t.color;
                ctx.globalAlpha = nearest === t ? 1.0 : 0.5;
                
                if (nearest === t) {
                    ctx.beginPath();
                    ctx.arc(t.x, t.y, 45 + Math.sin(time / 150) * 10, 0, Math.PI*2);
                    ctx.fillStyle = t.color;
                    ctx.globalAlpha = 0.2;
                    ctx.fill();
                }

                ctx.globalAlpha = nearest === t ? 1.0 : 0.8;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 35, 0, Math.PI*2);
                ctx.fillStyle = '#0b0416';
                ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = t.color;
                ctx.stroke();
                
                ctx.fillStyle = t.color;
                ctx.textAlign = 'center';
                ctx.font = 'bold 18px "Courier New", monospace';
                ctx.fillText(t.name, t.x, t.y - 50);
            });

            ctx.globalAlpha = 1.0;

            const p = engine.player;
            if (p.image && p.image.complete) {
                if (p.image.src.includes('Idle') || p.image.src.includes('Walk') || p.image.src.includes('Sheet')) {
                    p.frameTimer += dt;
                    if (p.frameTimer > (p.isMoving ? 0.08 : 0.12)) {
                        p.frameTimer = 0;
                        p.currentFrame = (p.currentFrame + 1) % 25;
                    }
                    const col = p.currentFrame % 5;
                    const row = Math.floor(p.currentFrame / 5);
                    const fw = p.image.width / 5;
                    const fh = p.image.height / 5;
                    
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    if (!p.facingLeft) ctx.scale(-1, 1);
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 20;
                    ctx.drawImage(p.image, col*fw, row*fh, fw, fh, -p.radius*3, -p.radius*3, p.radius*6, p.radius*6);
                    ctx.restore();
                } else {
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    if (p.facingLeft) ctx.scale(-1, 1);
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 20;
                    ctx.drawImage(p.image, -p.radius*2, -p.radius*2, p.radius*4, p.radius*4);
                    ctx.restore();
                }
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
                ctx.fill();
            }

            ctx.restore();
            animationId = requestAnimationFrame(loop);
        };

        animationId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', resize);
        };
    }, [save.lastSelectedChar, joystick, navigate]);

    return (
        <div className="h-[100dvh] w-full bg-[#05020a] relative overflow-hidden font-sans select-none">
            <canvas ref={canvasRef} className="absolute inset-0" />
            
            <div className="absolute top-4 left-4 z-10">
                <button 
                    onClick={() => { SoundManager.playUIClick(); navigate('/menu'); }}
                    className="flex items-center gap-2 bg-[#0b0416]/80 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-900/40 px-4 py-2.5 rounded-xl border border-cyan-500/50 font-bold backdrop-blur-md transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                >
                    <Menu className="w-5 h-5" /> SYSTEM MENU
                </button>
            </div>

            <div className="absolute top-4 right-4 z-10 pointer-events-none">
                <div className="pointer-events-auto">
                    <CurrencyHeader />
                </div>
            </div>

            {activeTerminal && (
                <div className="absolute bottom-32 md:bottom-16 left-1/2 -translate-x-1/2 bg-[#0b0416]/95 border-2 rounded-2xl p-4 md:p-6 backdrop-blur-xl text-center shadow-[0_0_40px_rgba(0,0,0,0.8)] transition-all min-w-[280px] md:min-w-[320px] z-10" style={{ borderColor: activeTerminal.color, boxShadow: `0 0 30px ${activeTerminal.color}40` }}>
                    <activeTerminal.icon className="w-10 h-10 mx-auto mb-3" style={{ color: activeTerminal.color }} />
                    <h2 className="text-xl md:text-2xl font-black text-white mb-1 tracking-widest uppercase">{activeTerminal.name}</h2>
                    <p className="text-slate-400 text-xs md:text-sm mb-5 font-medium tracking-wide">{activeTerminal.desc}</p>
                    <button 
                        onClick={() => { SoundManager.playUIClick(); navigate(activeTerminal.route); }}
                        className="px-6 py-3 rounded-xl font-black text-white w-full uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all"
                        style={{ backgroundColor: activeTerminal.color, boxShadow: `0 0 20px ${activeTerminal.color}60` }}
                    >
                        Access Terminal (E)
                    </button>
                </div>
            )}

            <div className="md:hidden">
                <VirtualJoystick onChange={(data) => setJoystick({ x: data.x, y: data.y })} />
            </div>
            
            <div className="absolute bottom-4 text-center w-full text-slate-500/50 font-mono text-[10px] pointer-events-none hidden md:block">
                WASD / Arrows to move. Walk to a terminal to interact.
            </div>
        </div>
    );
}