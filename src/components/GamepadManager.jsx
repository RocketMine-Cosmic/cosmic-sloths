import { useEffect } from 'react';

export default function GamepadManager() {
    useEffect(() => {
        let animationFrameId;
        let lastActionTime = 0;
        let isGamepadActive = false;
        let cursorX = window.innerWidth / 2;
        let cursorY = window.innerHeight / 2;
        
        let cursorEl = document.getElementById('gamepad-virtual-cursor');
        if (!cursorEl) {
            cursorEl = document.createElement('div');
            cursorEl.id = 'gamepad-virtual-cursor';
            cursorEl.style.position = 'fixed';
            cursorEl.style.width = '24px';
            cursorEl.style.height = '24px';
            cursorEl.style.borderRadius = '50%';
            cursorEl.style.border = '3px solid #0CA7B8';
            cursorEl.style.backgroundColor = 'rgba(217, 70, 239, 0.5)';
            cursorEl.style.boxShadow = '0 0 15px #0CA7B8';
            cursorEl.style.transform = 'translate(-50%, -50%)';
            cursorEl.style.pointerEvents = 'none';
            cursorEl.style.zIndex = '999999';
            cursorEl.style.display = 'none';
            cursorEl.style.transition = 'opacity 0.2s';
            document.body.appendChild(cursorEl);
        }

        const state = {
            confirm: false, cancel: false, pause: false, lb: false, rb: false
        };

        const handleUserInteraction = (e) => {
            if (e.type === 'mousemove') {
                if (Math.abs(e.movementX) < 3 && Math.abs(e.movementY) < 3) return;
            }
            if (isGamepadActive) {
                isGamepadActive = false;
                document.body.classList.remove('gamepad-active');
                if (cursorEl) cursorEl.style.display = 'none';
            }
        };
        
        window.addEventListener('mousemove', handleUserInteraction);
        window.addEventListener('mousedown', handleUserInteraction);
        window.addEventListener('keydown', handleUserInteraction);
        window.addEventListener('touchstart', handleUserInteraction);

        const checkGamepad = () => {
            const inGame = window.location.pathname.includes('/game');
            const modalOpen = document.querySelector('.z-50.inset-0') !== null;
            const uiActive = !inGame || modalOpen;

            if (typeof navigator !== 'undefined' && navigator.getGamepads) {
                const gamepads = navigator.getGamepads();
                const gp = gamepads.find(g => g && g.connected);
                
                if (gp) {
                    const now = Date.now();
                    const throttle = 200;

                    const axeX = gp.axes[0] || 0;
                    const axeY = gp.axes[1] || 0;
                    const axeRightY = gp.axes[3] || 0;
                    const dpadUp = gp.buttons[12]?.pressed || gp.axes[9] === -1 || gp.axes[9] === -1.2857142686843872;
                    const dpadDown = gp.buttons[13]?.pressed || gp.axes[9] === 0.14285719394683838 || gp.axes[9] === 1;
                    const dpadLeft = gp.buttons[14]?.pressed || gp.axes[9] === 0.7142857313156128 || gp.axes[9] === -1;
                    const dpadRight = gp.buttons[15]?.pressed || gp.axes[9] === -0.4285714030265808 || gp.axes[9] === 1;
                    
                    const altAxeX = gp.axes[4] || gp.axes[6] || 0;
                    const altAxeY = gp.axes[5] || gp.axes[7] || 0;
                    
                    const buttonA = gp.buttons[0]?.pressed;
                    const buttonB = gp.buttons[1]?.pressed;
                    const buttonStart = gp.buttons[9]?.pressed || gp.buttons[8]?.pressed;
                    const buttonLB = gp.buttons[4]?.pressed;
                    const buttonRB = gp.buttons[5]?.pressed;

                    let cursorDx = 0;
                    let cursorDy = 0;

                    if (Math.abs(axeX) > 0.15) cursorDx += axeX;
                    if (Math.abs(axeY) > 0.15) cursorDy += axeY;
                    if (Math.abs(altAxeX) > 0.15) cursorDx += altAxeX;
                    if (Math.abs(altAxeY) > 0.15) cursorDy += altAxeY;
                    
                    if (dpadLeft) cursorDx -= 1;
                    if (dpadRight) cursorDx += 1;
                    if (dpadUp) cursorDy -= 1;
                    if (dpadDown) cursorDy += 1;

                    // Normalize so diagonals aren't faster
                    const len = Math.hypot(cursorDx, cursorDy);
                    if (len > 1) {
                        cursorDx /= len;
                        cursorDy /= len;
                    }

                    if (Math.abs(cursorDx) > 0 || Math.abs(cursorDy) > 0 || buttonA || buttonB || buttonStart || buttonLB || buttonRB || Math.abs(axeRightY) > 0.15) {
                        if (!isGamepadActive) {
                            document.body.classList.add('gamepad-active');
                        }
                        isGamepadActive = true;
                    }

                    if (uiActive && isGamepadActive) {
                        cursorEl.style.display = 'block';
                        
                        // Update cursor position
                        const speed = 18;
                        cursorX += cursorDx * speed;
                        cursorY += cursorDy * speed;
                        
                        cursorX = Math.max(0, Math.min(window.innerWidth, cursorX));
                        cursorY = Math.max(0, Math.min(window.innerHeight, cursorY));
                        
                        cursorEl.style.left = `${cursorX}px`;
                        cursorEl.style.top = `${cursorY}px`;

                        // Right Stick Scroll
                        if (Math.abs(axeRightY) > 0.15) {
                            const scrollAmount = axeRightY * 25;
                            cursorEl.style.display = 'none';
                            const elUnderCursor = document.elementFromPoint(cursorX, cursorY);
                            cursorEl.style.display = 'block';
                            
                            let scrolled = false;
                            if (elUnderCursor) {
                                const scrollContainer = elUnderCursor.closest('.overflow-y-auto, .overflow-auto, [style*="overflow-y: auto"]');
                                if (scrollContainer) {
                                    scrollContainer.scrollTop += scrollAmount;
                                    scrolled = true;
                                }
                            }
                            if (!scrolled) {
                                window.scrollBy(0, scrollAmount);
                            }
                        }

                        // Hover & Click logic
                        cursorEl.style.display = 'none';
                        const elUnderCursor = document.elementFromPoint(cursorX, cursorY);
                        cursorEl.style.display = 'block';

                        if (elUnderCursor) {
                            const focusable = elUnderCursor.closest('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
                            if (focusable && focusable !== document.activeElement) {
                                focusable.focus({ preventScroll: true });
                            } else if (!focusable && document.activeElement) {
                                document.activeElement.blur();
                            }
                        }

                        let actionTaken = false;

                        if (buttonA && !state.confirm) {
                            if (document.activeElement && typeof document.activeElement.click === 'function') {
                                document.activeElement.click();
                            }
                            actionTaken = true;
                        }

                        if (buttonB && !state.cancel) {
                            const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => 
                                b.textContent.match(/cancel|close|back|return|resume/i) && !b.disabled
                            );
                            if (cancelBtn) {
                                cancelBtn.click();
                            }
                            actionTaken = true;
                        }

                        if (buttonLB && (!state.lb || now - lastActionTime > throttle)) {
                            const leftBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('.lucide-chevron-left'));
                            if (leftBtn) { leftBtn.click(); actionTaken = true; }
                        }
                        
                        if (buttonRB && (!state.rb || now - lastActionTime > throttle)) {
                            const rightBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('.lucide-chevron-right'));
                            if (rightBtn) { rightBtn.click(); actionTaken = true; }
                        }

                        if (actionTaken) {
                            lastActionTime = now;
                        }
                    } else {
                        cursorEl.style.display = 'none';
                    }

                    if (buttonStart && !state.pause && now - lastActionTime > throttle) {
                        if (inGame && !modalOpen) {
                            const pauseBtn = document.getElementById('pause-game-btn');
                            if (pauseBtn) pauseBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                            lastActionTime = now;
                        } else if (modalOpen) {
                            const resumeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Resume'));
                            if (resumeBtn) resumeBtn.click();
                            lastActionTime = now;
                        }
                    }

                    state.confirm = buttonA;
                    state.cancel = buttonB;
                    state.pause = buttonStart;
                    state.lb = buttonLB;
                    state.rb = buttonRB;
                }
            }
            animationFrameId = requestAnimationFrame(checkGamepad);
        };

        animationFrameId = requestAnimationFrame(checkGamepad);
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', handleUserInteraction);
            window.removeEventListener('mousedown', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
            window.removeEventListener('touchstart', handleUserInteraction);
            if (cursorEl) cursorEl.remove();
        };
    }, []);

    return null;
}