/**
 * Animated Header Architecture
 * Features:
 * - Single WebGL Canvas overlay to avoid context limits
 * - Orthographic projection for uniform composition
 * - Two-phase animation: Sequential Sweep & Synchronized Block
 */

const AnimatedHeader = (() => {
    // Text Configuration with standard space for splitting
    const TITLE_TEXT = "ALFABETO MODULAR";

    // Animation Timing Configuration
    const CONFIG = {
        SWEEP_DELAY: 200,      // ms between letters in sweep
        SWEEP_LIFETIME: 3000,  // ms a module stays visible in sweep
        WORD_PAUSE: 1000,      // ms pause between word sweeps
        BLOCK_HOLD: 6000,      // ms hold time for full block mode
        RESTART_DELAY: 2000    // ms before restarting cycle
    };

    // Word Indices based on TITLE_TEXT structure
    const WORDS = [
        { start: 0, end: 7, text: "ALFABETO" },
        { start: 8, end: 14, text: "MODULAR" }
    ];

    // State Management
    let letterData = [];
    let p5Instance = null;
    let canvasContainer = null;
    let isRunning = true;

    function init() {
        const titleElement = document.getElementById('animated-title');
        if (!titleElement) return;

        // 1. Prepare DOM Structure
        titleElement.innerHTML = '';

        // Text Layer (Visible characters)
        const textLayer = document.createElement('div');
        textLayer.className = 'text-layer';
        titleElement.appendChild(textLayer);

        // Canvas Container (WebGL Overlay)
        canvasContainer = document.createElement('div');
        canvasContainer.id = 'header-canvas-container';
        titleElement.appendChild(canvasContainer);

        // 2. Build Letter Elements (Grouped by Words)
        letterData = [];
        const words = TITLE_TEXT.split(' ');

        words.forEach((wordText, wordIndex) => {
            // Create Word Row Container
            const wordRow = document.createElement('div');
            wordRow.className = 'word-row';
            textLayer.appendChild(wordRow);

            wordText.split('').forEach((char, charIndex) => {
                // Calculate global index (approximate for ID) or just use logic
                const globalIndex = letterData.length;

                const wrapper = document.createElement('span');
                wrapper.className = 'letter-wrapper';
                wrapper.id = `letter-wrapper-${globalIndex}`;

                const charSpan = document.createElement('span');
                charSpan.className = 'letter-char';
                charSpan.textContent = char;

                // Color Logic: Apply Modular Color
                if (typeof getBranchStyle === 'function') {
                    const style = getBranchStyle(char);
                    // Standardized Conversion via shared helper logic
                    // Mapping p5 HSB to CSS HSL
                    const h = style.h;
                    const s = style.s;
                    const l = style.b / 1.5; // Adjusted for CSS Lightness (100 -> ~66%)

                    charSpan.style.color = `hsl(${h}, ${s}%, ${l}%)`;
                    // Clean look: Subtle shadow instead of neon glow
                    // Was: 0 0 12px ... 0.6
                    charSpan.style.textShadow = `0 2px 4px hsla(${h}, ${s}%, ${l}%, 0.3)`;
                }

                wrapper.appendChild(charSpan);
                wordRow.appendChild(wrapper);

                letterData.push({
                    index: globalIndex,
                    char,
                    wrapper,    // DOM element reference
                    charSpan,   // Reference to hide/show text
                    active: false,
                    opacity: 0, // For fade transition
                    scale: 0.5, // For scale transition
                    x: 0,
                    y: 0,
                    // Organic Rotation Physics (Randomized per module)
                    speedX: 0.1 + Math.random() * 0.15, // Slow var X
                    speedY: 0.8 + Math.random() * 0.4,  // Main Y rotation var
                    phaseX: Math.random() * Math.PI * 2,
                    phaseY: Math.random() * Math.PI * 2
                });
            });
        });

        // 3. Initialize Shared p5 Canvas
        initCanvas();

        // 4. Start Animation Loop
        runSequence();

        // 5. Handle Resize Events
        window.addEventListener('resize', updatePositions);
        setTimeout(updatePositions, 100);
    }

    function initCanvas() {
        const sketch = (p) => {
            let rotation = 0;
            let nodePositions;

            p.setup = function () {
                const rect = canvasContainer.getBoundingClientRect();
                p.createCanvas(rect.width, rect.height, p.WEBGL);
                p.pixelDensity(1);

                // Orthographic projection to prevent edge distortion
                p.ortho(-rect.width / 2, rect.width / 2, -rect.height / 2, rect.height / 2, 0, 5000);

                nodePositions = get3DNodePositions();
            };

            p.draw = function () {
                p.clear();
                rotation += 0.002; // Global time base

                // Centralized Lighting - Declared ONCE per frame
                p.directionalLight(255, 255, 255, 0, 0, -1);  // Front
                p.directionalLight(200, 200, 200, 0, 0, 1);   // Back
                p.directionalLight(150, 150, 150, 1, 0, 0);   // Right
                p.directionalLight(150, 150, 150, -1, 0, 0);  // Left

                // Render active modules
                letterData.forEach(item => {
                    if (item.active || item.opacity > 0.01) {
                        renderModule(p, item, rotation, nodePositions);
                    }
                });

                updateTransitions();
            };

            p.windowResized = function () {
                const rect = canvasContainer.getBoundingClientRect();
                p.resizeCanvas(rect.width, rect.height);
                p.ortho(-rect.width / 2, rect.width / 2, -rect.height / 2, rect.height / 2, 0, 5000);
                updatePositions();
            };
        };

        p5Instance = new p5(sketch, canvasContainer.id);
    }

    function updatePositions() {
        if (!canvasContainer) return;
        const containerRect = canvasContainer.getBoundingClientRect();

        letterData.forEach(item => {
            const rect = item.wrapper.getBoundingClientRect();
            // Calculate center relative to canvas container
            const centerX = rect.left + rect.width / 2 - containerRect.left;
            const centerY = rect.top + rect.height / 2 - containerRect.top;

            // Convert to WebGL coordinates (Offset from center)
            item.x = centerX - containerRect.width / 2;
            item.y = centerY - containerRect.height / 2;
        });
    }

    function updateTransitions() {
        letterData.forEach(item => {
            // Smooth Opacity & Scale Transition
            if (item.active) {
                if (item.opacity < 1) item.opacity += 0.1;
                if (item.scale < 1) item.scale += 0.1;
                if (item.opacity > 1) item.opacity = 1;
                if (item.scale > 1) item.scale = 1;
            } else {
                if (item.opacity > 0) item.opacity -= 0.1;
                if (item.scale > 0.5) item.scale -= 0.1;
                if (item.opacity < 0) item.opacity = 0;
            }

            // Toggle Text Visibility based on Module Opacity
            if (item.opacity > 0.5) {
                item.charSpan.style.opacity = '0';
            } else {
                item.charSpan.style.opacity = '1';
            }
        });
    }

    function renderModule(p, item, globalRot, nodes) {
        if (!item.char.trim()) return;

        p.push();
        p.translate(item.x, item.y, 0);
        p.scale(item.scale);

        // Organic Rotation: Unique speed and phase for every module
        // This ensures they never look "synced" or repetitive
        p.rotateY(globalRot * item.speedY + item.phaseY);
        p.rotateX(globalRot * item.speedX + item.phaseX);

        p.colorMode(p.HSB, 360, 100, 100, 1);

        const style = getBranchStyle(item.char);
        const points = getPointsForChar(item.char);
        const size = 18; // Reduced Size

        // Consistent Colors Across Themes
        // Use original palette colors regardless of theme
        let finalB = style.b;
        let strokeW = 1.5;

        // 1. Wireframe Box
        p.noFill();

        // Improve contrast in Light Mode for high-brightness colors
        let strokeB = finalB;
        if (document.body.classList.contains('light-mode') && finalB > 70) {
            strokeB = finalB * 0.8; // Darken stroke slightly for definition
        }

        p.stroke(style.h, style.s, strokeB, item.opacity);
        p.strokeWeight(strokeW);
        p.box(size);

        // 2. Corner Points
        p.push();
        p.noStroke();
        p.fill(style.h, style.s, finalB, item.opacity);

        if (points) {
            for (let i of points) {
                if (nodes[i]) {
                    let n = nodes[i];
                    p.push();
                    p.translate(n[0] * size, n[1] * size, n[2] * size);
                    p.sphere(size * 0.12);
                    p.pop();
                }
            }
        }

        p.pop();

        p.pop();
    }

    // --- SEQUENCING LOGIC ---

    async function runSequence() {
        while (isRunning) {
            // Phase 1: Sequential Sweep
            await runSweepWord(WORDS[0]);     // ALFABETO
            await wait(CONFIG.WORD_PAUSE);
            await runSweepWord(WORDS[1]);     // MODULAR

            await wait(2000);

            // Phase 2: Simultaneous Block
            setWordState(WORDS[0], true);     // Show ALFABETO
            setWordState(WORDS[1], true);     // Show MODULAR

            await wait(CONFIG.BLOCK_HOLD);    // Hold both

            setWordState(WORDS[0], false);    // Hide All
            setWordState(WORDS[1], false);

            await wait(CONFIG.RESTART_DELAY);
        }
    }

    function runSweepWord(wordDef) {
        return new Promise(resolve => {
            let current = wordDef.start;
            const interval = setInterval(() => {
                if (current > wordDef.end) {
                    clearInterval(interval);
                    setTimeout(resolve, CONFIG.SWEEP_LIFETIME / 2);
                    return;
                }

                triggerModule(current, CONFIG.SWEEP_LIFETIME);
                current++;
            }, CONFIG.SWEEP_DELAY);
        });
    }

    function setWordState(wordDef, active) {
        for (let i = wordDef.start; i <= wordDef.end; i++) {
            if (active) {
                if (letterData[i]) letterData[i].active = true;
            } else {
                if (letterData[i]) letterData[i].active = false;
            }
        }
    }

    function triggerModule(index, duration) {
        if (!letterData[index]) return;

        letterData[index].active = true;

        if (duration > 0) {
            setTimeout(() => {
                if (letterData[index]) letterData[index].active = false;
            }, duration);
        }
    }

    function wait(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    const interval = setInterval(() => {
        if (typeof getBranchStyle !== 'undefined') {
            clearInterval(interval);
            AnimatedHeader.init();
        }
    }, 50);
});
