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
            document.body.classList.remove('gamepad-active');
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
                // Ignore structural divs/spans with tabindex (like embla carousel viewport)
                const tag = el.tagName.toLowerCase();
                if (tag === 'div' || tag === 'span') {
                    const role = el.getAttribute('role');
                    // Only allow divs/spans if they are explicitly roles that act like buttons/links
                    if (role !== 'button' && role !== 'link' && role !== 'menuitem' && role !== 'tab') {
                        return false;
                    }
                }

                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || el.offsetWidth === 0 || el.offsetHeight === 0) return false;
                
                // Ensure the element's horizontal center is physically on screen to prevent 
                // focusing elements on off-screen carousel slides
                const rect = el.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                return (
                    centerX > 0 &&
                    centerX < (window.innerWidth || document.documentElement.clientWidth)
                );
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

                const score = primaryDist + perpDist * 5;

                if (score < minScore) {
                    minScore = score;
                    bestCandidate = el;
                }
            });

            if (bestCandidate) {
                bestCandidate.focus({ preventScroll: true });
                
                const scrollContainer = bestCandidate.closest('.overflow-y-auto, .overflow-auto, [style*="overflow-y: auto"]');
                if (scrollContainer) {
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const elRect = bestCandidate.getBoundingClientRect();
                    const targetTop = scrollContainer.scrollTop + (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);
                    scrollContainer.scrollTo({ top: targetTop, behavior: 'auto' });
                } else {
                    const elRect = bestCandidate.getBoundingClientRect();
                    const targetTop = window.scrollY + elRect.top - (window.innerHeight / 2) + (elRect.height / 2);
                    window.scrollTo({ top: targetTop, behavior: 'auto' });
                }
            } else {
                // If nothing was found in that direction, maybe change carousel slide
                if (dirX !== 0 && !document.querySelector('.z-50')) {
                    const leftBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('.lucide-chevron-left'));
                    const rightBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('.lucide-chevron-right'));
                    
                    if (dirX < 0 && leftBtn) leftBtn.click();
                    if (dirX > 0 && rightBtn) rightBtn.click();
                } else if (!active || !focusable.includes(active)) {
                    focusable[0].focus({ preventScroll: true });
                }
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
                    const axeRightY = gp.axes[3] || 0;
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

                    if (isUp || isDown || isLeft || isRight || buttonA || buttonB || buttonStart || Math.abs(axeRightY) > 0.15) {
                        if (!isGamepadActive) {
                            document.body.classList.add('gamepad-active');
                        }
                        isGamepadActive = true;
                    }

                    if (uiActive && Math.abs(axeRightY) > 0.15) {
                        try {
                            const scrollAmount = axeRightY * 25;
                            const active = document.activeElement;
                            let scrollContainer = null;
                            if (active && typeof active.closest === 'function') {
                                scrollContainer = active.closest('.overflow-y-auto, .overflow-auto, [style*="overflow-y: auto"]');
                            }
                            
                            if (!scrollContainer) {
                                const containers = Array.from(document.querySelectorAll('.overflow-y-auto, .overflow-auto, [style*="overflow-y: auto"]'));
                                scrollContainer = containers.find(c => {
                                    const rect = c.getBoundingClientRect();
                                    const centerX = rect.left + rect.width / 2;
                                    return centerX > 0 && centerX < (window.innerWidth || document.documentElement.clientWidth);
                                });
                            }
                            
                            if (scrollContainer) {
                                scrollContainer.scrollTop += scrollAmount;
                            } else {
                                window.scrollBy(0, scrollAmount);
                            }
                        } catch(e) {
                            console.error("Gamepad scroll error:", e);
                        }
                    }

                    if (uiActive && isGamepadActive) {
                        let active = document.activeElement;
                        const focusable = getFocusableElements();
                        
                        let isActiveVisible = false;
                        if (active && focusable.includes(active)) {
                            const rect = active.getBoundingClientRect();
                            if (rect.bottom > 0 && rect.top < (window.innerHeight || document.documentElement.clientHeight)) {
                                isActiveVisible = true;
                            }
                        }

                        if (!isActiveVisible && focusable.length > 0) {
                            let bestCenterEl = null;
                            let minCenterDist = Infinity;
                            const centerY = (window.innerHeight || document.documentElement.clientHeight) / 2;
                            
                            focusable.forEach(el => {
                                const rect = el.getBoundingClientRect();
                                if (rect.bottom >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight)) {
                                    const dist = Math.abs((rect.top + rect.height / 2) - centerY);
                                    if (dist < minCenterDist) {
                                        minCenterDist = dist;
                                        bestCenterEl = el;
                                    }
                                }
                            });
                            
                            if (bestCenterEl) {
                                bestCenterEl.focus({ preventScroll: true });
                                active = bestCenterEl;
                            } else {
                                focusable[0].focus({ preventScroll: true });
                                active = focusable[0];
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