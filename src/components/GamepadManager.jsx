import { useEffect } from 'react';

export default function GamepadManager() {
    useEffect(() => {
        let animationFrameId;
        let lastActionTime = 0;
        let isGamepadActive = false;
        const state = {
            up: false, down: false, left: false, right: false,
            confirm: false, cancel: false, pause: false
        };

        const handleUserInteraction = () => {
            isGamepadActive = false;
        };
        window.addEventListener('mousemove', handleUserInteraction);
        window.addEventListener('keydown', handleUserInteraction);
        window.addEventListener('touchstart', handleUserInteraction);

        const getFocusableElements = () => {
            let container = document;
            const modal = document.querySelector('.z-50');
            if (modal) {
                container = modal;
            }

            return Array.from(container.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )).filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0;
            });
        };

        const moveFocus = (dirX, dirY) => {
            const focusable = getFocusableElements();
            if (focusable.length === 0) return;

            const active = document.activeElement;
            if (!active || !focusable.includes(active)) {
                focusable[0].focus();
                return;
            }

            if (active.tagName.toLowerCase() === 'input' && active.type === 'text') return;

            const activeRect = active.getBoundingClientRect();
            let bestCandidate = null;
            let minScore = Infinity;

            focusable.forEach(el => {
                if (el === active) return;
                const rect = el.getBoundingClientRect();
                
                const dx = (rect.left + rect.width / 2) - (activeRect.left + activeRect.width / 2);
                const dy = (rect.top + rect.height / 2) - (activeRect.top + activeRect.height / 2);

                if (dirX > 0 && dx <= 0) return;
                if (dirX < 0 && dx >= 0) return;
                if (dirY > 0 && dy <= 0) return;
                if (dirY < 0 && dy >= 0) return;

                const distance = Math.hypot(dx, dy);
                const perpDist = dirX !== 0 ? Math.abs(dy) : Math.abs(dx);
                const primaryDist = dirX !== 0 ? Math.abs(dx) : Math.abs(dy);

                if (perpDist > primaryDist * 2.5) return;

                const score = primaryDist + perpDist * 2;

                if (score < minScore) {
                    minScore = score;
                    bestCandidate = el;
                }
            });

            if (bestCandidate) {
                bestCandidate.focus();
            } else {
                let index = focusable.indexOf(active);
                if (index === -1) index = 0;
                if (dirX > 0 || dirY > 0) index = (index + 1) % focusable.length;
                if (dirX < 0 || dirY < 0) index = (index - 1 + focusable.length) % focusable.length;
                focusable[index].focus();
            }
        };

        const checkGamepad = () => {
            const inGame = window.location.pathname.includes('/game');
            const modalOpen = document.querySelector('.z-50') !== null;
            const uiActive = !inGame || modalOpen;

            if (typeof navigator !== 'undefined' && navigator.getGamepads) {
                const gamepads = navigator.getGamepads();
                const gp = gamepads.find(g => g && g.connected);
                
                if (gp) {
                    const now = Date.now();
                    const throttle = 200;

                    const axeX = gp.axes[0] || 0;
                    const axeY = gp.axes[1] || 0;
                    const dpadUp = gp.buttons[12]?.pressed;
                    const dpadDown = gp.buttons[13]?.pressed;
                    const dpadLeft = gp.buttons[14]?.pressed;
                    const dpadRight = gp.buttons[15]?.pressed;
                    
                    const isUp = axeY < -0.5 || dpadUp;
                    const isDown = axeY > 0.5 || dpadDown;
                    const isLeft = axeX < -0.5 || dpadLeft;
                    const isRight = axeX > 0.5 || dpadRight;
                    
                    const buttonA = gp.buttons[0]?.pressed;
                    const buttonB = gp.buttons[1]?.pressed;
                    const buttonStart = gp.buttons[9]?.pressed;

                    if (isUp || isDown || isLeft || isRight || buttonA || buttonB || buttonStart) {
                        isGamepadActive = true;
                    }

                    if (uiActive && isGamepadActive) {
                        const active = document.activeElement;
                        const focusable = getFocusableElements();
                        
                        if (!active || active === document.body || !focusable.includes(active)) {
                            if (focusable.length > 0) {
                                focusable[0].focus();
                            }
                        }

                        let actionTaken = false;

                        if (isUp && (!state.up || now - lastActionTime > throttle)) { moveFocus(0, -1); actionTaken = true; }
                        else if (isDown && (!state.down || now - lastActionTime > throttle)) { moveFocus(0, 1); actionTaken = true; }
                        else if (isLeft && (!state.left || now - lastActionTime > throttle)) { moveFocus(-1, 0); actionTaken = true; }
                        else if (isRight && (!state.right || now - lastActionTime > throttle)) { moveFocus(1, 0); actionTaken = true; }

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

                        if (actionTaken) {
                            lastActionTime = now;
                        }
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

                    state.up = isUp;
                    state.down = isDown;
                    state.left = isLeft;
                    state.right = isRight;
                    state.confirm = buttonA;
                    state.cancel = buttonB;
                    state.pause = buttonStart;
                }
            }
            animationFrameId = requestAnimationFrame(checkGamepad);
        };

        animationFrameId = requestAnimationFrame(checkGamepad);
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
            window.removeEventListener('touchstart', handleUserInteraction);
        };
    }, []);

    return null;
}