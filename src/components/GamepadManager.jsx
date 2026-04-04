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

        const handleUserInteraction = (e) => {
            if (e.type === 'mousemove') {
                // Ignore tiny sub-pixel mouse movements which can be caused by controller stick drift mapping to mouse
                if (Math.abs(e.movementX) < 3 && Math.abs(e.movementY) < 3) return;
            }
            if (isGamepadActive) {
                isGamepadActive = false;
                document.body.classList.remove('gamepad-active');
            }
        };
        window.addEventListener('mousemove', handleUserInteraction);
        window.addEventListener('mousedown', handleUserInteraction);
        window.addEventListener('keydown', handleUserInteraction);
        window.addEventListener('touchstart', handleUserInteraction);

        const getFocusableElements = () => {
            let container = document;
            // Only trap focus in actual full-screen modals, not arbitrary z-50 relative containers
            const modal = document.querySelector('.z-50.inset-0');
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
                const first = focusable[0];
                first.focus({ preventScroll: true });
                
                const scrollContainer = first.closest('.overflow-y-auto, .overflow-auto, [style*="overflow-y: auto"]');
                if (scrollContainer) {
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const elRect = first.getBoundingClientRect();
                    const targetTop = scrollContainer.scrollTop + (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);
                    scrollContainer.scrollTo({ top: targetTop, behavior: 'auto' });
                } else {
                    const elRect = first.getBoundingClientRect();
                    const targetTop = window.scrollY + elRect.top - (window.innerHeight / 2) + (elRect.height / 2);
                    window.scrollTo({ top: targetTop, behavior: 'auto' });
                }
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
                if (!active || !focusable.includes(active)) {
                    focusable[0].focus({ preventScroll: true });
                }
            }
        };

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
                    
                    // Fallback for some Linux/Mac gamepads
                    const altAxeX = gp.axes[4] || gp.axes[6] || 0;
                    const altAxeY = gp.axes[5] || gp.axes[7] || 0;
                    
                    const isUp = axeY < -0.5 || dpadUp || altAxeY < -0.5;
                    const isDown = axeY > 0.5 || dpadDown || altAxeY > 0.5;
                    const isLeft = axeX < -0.5 || dpadLeft || altAxeX < -0.5;
                    const isRight = axeX > 0.5 || dpadRight || altAxeX > 0.5;
                    
                    const buttonA = gp.buttons[0]?.pressed;
                    const buttonB = gp.buttons[1]?.pressed;
                    const buttonStart = gp.buttons[9]?.pressed || gp.buttons[8]?.pressed;
                    
                    const buttonLB = gp.buttons[4]?.pressed;
                    const buttonRB = gp.buttons[5]?.pressed;

                    if (isUp || isDown || isLeft || isRight || buttonA || buttonB || buttonStart || buttonLB || buttonRB || Math.abs(axeRightY) > 0.15) {
                        if (!isGamepadActive) {
                            document.body.classList.add('gamepad-active');
                        }
                        isGamepadActive = true;
                    }

                    if (uiActive && Math.abs(axeRightY) > 0.15) {
                        try {
                            const scrollAmount = axeRightY * 60;
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
                            // Add a generous buffer so elements near the edge don't get stolen from focus
                            if (rect.bottom >= -50 && rect.top <= (window.innerHeight || document.documentElement.clientHeight) + 50) {
                                isActiveVisible = true;
                            }
                        }

                        if (!isActiveVisible && focusable.length > 0) {
                            let bestCenterEl = null;
                            let minCenterDist = Infinity;
                            const centerY = (window.innerHeight || document.documentElement.clientHeight) / 2;
                            
                            focusable.forEach(el => {
                                const rect = el.getBoundingClientRect();
                                const dist = Math.abs((rect.top + rect.height / 2) - centerY);
                                if (dist < minCenterDist) {
                                    minCenterDist = dist;
                                    bestCenterEl = el;
                                }
                            });
                            
                            if (bestCenterEl) {
                                bestCenterEl.focus({ preventScroll: true });
                                active = bestCenterEl;
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
            window.removeEventListener('keydown', handleUserInteraction);
            window.removeEventListener('touchstart', handleUserInteraction);
        };
    }, []);

    return null;
}