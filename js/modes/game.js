const gameSketch = (p) => {
    // ==========================================
    // CONFIGURACIÓN Y ESTADO
    // ==========================================
    const CONFIG = {
        BOUNDS_SIZE: 350,  // Radio del "mundo" cúbico (x,y,z: -350 a 350)
        CAM_DIST: 900, // Distancia cámara perspectiva
        SELECTION_COLOR: { h: 0, s: 90, b: 100 }, // ROJO (Hover/Encima)
        SUCCESS_COLOR: { h: 120, s: 90, b: 100 } // VERDE (Acierto/Seleccionado)
    };

    const WORDS = ["HOLA", "MUNDO", "CODIGO", "ARTE", "DISEÑO", "FUTURO", "SOL", "LUNA", "TIEMPO", "MANU"];

    let state = {
        word: "",
        index: 0,
        score: 0,
        level: 1, // Start Level 1
        modules: []
    };

    let ui = {
        score: null,
        target: null,
        feedback: null
    };
    let cam;
    let targetZ = 900; // Start at Overview (900)
    let canvas; // Persist canvas reference for custom controls

    // ==========================================
    // CICLO DE VIDA P5 (SETUP & DRAW)
    // ==========================================

    p.setup = function () {
        // Corrección de densidad de píxeles para evitar desfases en selección
        p.pixelDensity(1);

        canvas = p.createCanvas(100, 100, p.WEBGL);
        canvas.parent('canvas-container');

        updateCanvasSize();

        // Referencias DOM
        ui.score = p.select('#scoreVal');
        ui.target = p.select('#targetWordDisplay');
        ui.feedback = p.select('#feedbackDisplay');

        // Camera setup
        cam = p.createCamera();
        cam.setPosition(0, 0, 900);
        cam.lookAt(0, 0, 0);

        // Custom Pinch Zoom (with threshold to prevent false positives)
        let lastDist = 0;
        let pinchStarted = false;
        const PINCH_THRESHOLD = 15; // Pixels of movement required before zoom activates

        canvas.touchStarted(() => {
            if (p.touches.length === 2) {
                lastDist = p.dist(p.touches[0].x, p.touches[0].y, p.touches[1].x, p.touches[1].y);
                pinchStarted = false; // Reset - wait for movement
                return false; // Prevent default
            }
        });

        canvas.touchMoved(() => {
            if (p.touches.length === 2) {
                let currentDist = p.dist(p.touches[0].x, p.touches[0].y, p.touches[1].x, p.touches[1].y);

                // Only start zooming after threshold is crossed
                if (!pinchStarted) {
                    if (Math.abs(currentDist - lastDist) > PINCH_THRESHOLD) {
                        pinchStarted = true;
                        lastDist = currentDist; // Reset to prevent zoom jump
                    }
                }

                // Apply zoom only if pinch gesture is confirmed
                if (pinchStarted) {
                    let delta = lastDist - currentDist;
                    targetZ += delta * 2;
                    targetZ = p.constrain(targetZ, 1, 1200);
                    lastDist = currentDist;
                }
                return false; // Prevent default
            }
        });

        // Mouse wheel zoom (locks during rotation to prevent conflicts)
        p.mouseWheel = function (event) {
            if (p.mouseIsPressed) return false; // Prevent zoom while rotating

            targetZ += event.delta * 0.5;
            targetZ = p.constrain(targetZ, 1, 1200);
            return false;
        };

        // Start new round
        newRound();
    };

    // ==========================================
    // DRAW LOOP
    // ==========================================
    p.draw = function () {
        let isDark = getIsDarkMode();
        p.colorMode(p.RGB);
        p.clear();

        // CUSTOM CAMERA CONTROL (No orbitControl - eliminates 2-touch requirement)

        // Track rotation angles
        if (typeof p.angleX === 'undefined') {
            p.angleX = 0;
            p.angleY = 0;
        }

        // Mouse drag rotation (Desktop)
        if (p.mouseIsPressed && p.touches.length === 0) {
            let dx = p.mouseX - p.pmouseX;
            let dy = p.mouseY - p.pmouseY;
            p.angleY += dx * 0.005;
            p.angleX -= dy * 0.005;
            p.angleX = p.constrain(p.angleX, -p.PI / 2, p.PI / 2);
        }

        // Single touch drag rotation (Mobile - 1 finger)
        if (p.touches.length === 1) {
            let touch = p.touches[0];
            if (typeof p.prevTouchX !== 'undefined') {
                let dx = touch.x - p.prevTouchX;
                let dy = touch.y - p.prevTouchY;
                p.angleY += dx * 0.005;
                p.angleX -= dy * 0.005;
                p.angleX = p.constrain(p.angleX, -p.PI / 2, p.PI / 2);
            }
            p.prevTouchX = touch.x;
            p.prevTouchY = touch.y;
        } else {
            p.prevTouchX = undefined;
            p.prevTouchY = undefined;
        }

        // Apply rotation to camera position
        let radius = targetZ;
        let x = radius * p.sin(p.angleY) * p.cos(p.angleX);
        let y = radius * p.sin(p.angleX);
        let z = radius * p.cos(p.angleY) * p.cos(p.angleX);

        // Smooth camera movement
        let currentPos = p.createVector(cam.eyeX, cam.eyeY, cam.eyeZ);
        let targetPos = p.createVector(x, y, z);
        let smoothPos = p5.Vector.lerp(currentPos, targetPos, 0.1);

        cam.setPosition(smoothPos.x, smoothPos.y, smoothPos.z);
        cam.lookAt(0, 0, 0);


        // Optimización de Iluminación (3-Point Setup)
        p.ambientLight(150); // Base level
        p.directionalLight(255, 255, 255, 1, 1, -1);  // Key Light (Top-Right-Front)
        p.directionalLight(100, 100, 110, -1, 0, -1); // Fill Light (Left-Front)
        p.directionalLight(50, 50, 50, 0, -1, 0);     // Rim Light (Top)
        // Removed excessive point lights for performance

        updatePhysics();
        handleHover();

        // Bounds - Enhanced visibility for both themes
        p.noFill();
        p.strokeWeight(isDark ? 2 : 3); // Thicker lines in light mode for contrast
        p.stroke(isDark ? 50 : 100); // Much darker stroke for light mode visibility
        p.box(CONFIG.BOUNDS_SIZE * 2);

        // Z-sorting
        state.modules.sort((a, b) => {
            let distA = p.dist(a.pos.x, a.pos.y, a.pos.z, cam.eyeX, cam.eyeY, cam.eyeZ);
            let distB = p.dist(b.pos.x, b.pos.y, b.pos.z, cam.eyeX, cam.eyeY, cam.eyeZ);
            return distB - distA;
        });

        for (let m of state.modules) {
            m.draw();
        }
    };

    // ==========================================
    // STATE UPDATE HANDLERS
    // ==========================================

    /**
     * Called when color hints toggle changes.
     * Forces re-render to update module colors.
     */
    p.updateColorHints = function (enabled) {
        // State is already updated in global, just force redraw
        // Modules will read fresh state on next draw cycle
    };

    function newRound() {
        state.word = p.random(WORDS);
        state.index = 0;
        spawnModules();
        updateUI();
        showFeedback(`NIVEL ${state.level}`, "info");
    }

    function spawnModules() {
        state.modules = [];
        let pool = state.word.split('');
        let extraCount = 4 + (state.level - 1) * 2;
        if (extraCount > 40) extraCount = 40;

        const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZÑ";
        for (let i = 0; i < extraCount; i++) {
            pool.push(ABC[Math.floor(p.random(ABC.length))]);
        }

        let range = CONFIG.BOUNDS_SIZE * 0.8;
        for (let char of pool) {
            let x = p.random(-range, range);
            let y = p.random(-range, range);
            let z = p.random(-range, range);
            state.modules.push(new Module3D(p, char, x, y, z));
        }
        state.modules.sort(() => Math.random() - 0.5);
    }

    function updatePhysics() {
        // Simple Impulse-based Collision Resolution
        // Iterate through all pairs of modules to prevent overlapping.
        for (let i = 0; i < state.modules.length; i++) {
            let m1 = state.modules[i];
            m1.update();

            for (let j = i + 1; j < state.modules.length; j++) {
                let m2 = state.modules[j];
                // Ignore matched modules (they might disappear or stay static)
                if (m1.isMatched || m2.isMatched) continue;

                // MANUAL DISTANCE SQUARED (Optimized & Safe)
                let dx = m1.pos.x - m2.pos.x;
                let dy = m1.pos.y - m2.pos.y;
                let dz = m1.pos.z - m2.pos.z;
                let dSq = (dx * dx) + (dy * dy) + (dz * dz);

                let minDist = (m1.size + m2.size) * 0.7;
                let minDistSq = minDist * minDist;

                if (dSq < minDistSq) {
                    let d = Math.sqrt(dSq);
                    // Calculate push vector (Normal)
                    let push = p5.Vector.sub(m1.pos, m2.pos).normalize();
                    let overlap = (minDist - d) * 0.05; // Soft correction factor

                    // Separate them
                    m1.pos.add(p5.Vector.mult(push, overlap));
                    m2.pos.sub(p5.Vector.mult(push, overlap));

                    // Exchange Momentum (Elastic collision approximation)
                    let vTemp = m1.vel.copy();
                    m1.vel = m2.vel.copy().mult(0.95); // Damping
                    m2.vel = vTemp.mult(0.95);
                }
            }
        }
    }

    function handleHover() {
        let mx = p.mouseX - p.width / 2;
        let my = p.mouseY - p.height / 2;
        let hoverRadius = 45;
        let camPos = p.createVector(cam.eyeX, cam.eyeY, cam.eyeZ);
        let candidates = [];

        for (let m of state.modules) {
            m.isHovered = false;
            if (m.isMatched) continue;

            // Updated to shared helper
            let sPos = screenPosition(p, m.pos);
            let d = p.dist(mx, my, sPos.x, sPos.y);

            if (d < hoverRadius) candidates.push(m);
        }

        let bestMod = null;
        let minDistCam = Infinity;

        for (let m of candidates) {
            let distToCam = p5.Vector.dist(m.pos, camPos);
            if (distToCam < minDistCam) {
                minDistCam = distToCam;
                bestMod = m;
            }
        }
        if (bestMod) bestMod.isHovered = true;
    }

    function checkClick() {
        let clicked = state.modules.find(m => m.isHovered && !m.isMatched);
        if (!clicked) return;

        let targetChar = state.word[state.index];

        if (clicked.letter === targetChar) {
            state.score += 100;
            clicked.isMatched = true;
            clicked.clicked = true;
            showFeedback("¡CORRECTO!", "success");
            setTimeout(() => {
                let range = CONFIG.BOUNDS_SIZE * 0.8;
                state.modules.push(new Module3D(p, clicked.letter, p.random(-range, range), p.random(-range, range), p.random(-range, range)));
            }, 1000);

            state.index++;
            if (state.index >= state.word.length) {
                state.score += 500;
                state.level++;
                showFeedback("¡PALABRA COMPLETADA! (+500)", "success");
                setTimeout(newRound, 1500);
            }
        } else {
            state.score -= 50;
            clicked.setError();
            showFeedback(`ERROR: ${clicked.letter}`, "error");
            if (ui.score) ui.score.addClass('error');
            setTimeout(() => ui.score.removeClass('error'), 300);
        }
        updateUI();
    }

    // ==========================================
    // CLASES Y HELPERS
    // ==========================================

    class Module3D {
        constructor(p, letter, x, y, z) {
            this.p = p;
            this.letter = letter;
            this.pos = p.createVector(x, y, z);
            this.vel = p5.Vector.random3D().mult(p.random(0.2, 0.8));
            this.rot = p.createVector(p.random(p.TWO_PI), p.random(p.TWO_PI), 0);
            this.rotVel = p.createVector(p.random(-0.02, 0.02), p.random(-0.02, 0.02), 0);

            this.size = 0;
            this.targetSize = p.width < 600 ? 35 : 50; // Dynamic mobile detection

            // Updated to use shared logic
            this.branchStyle = getBranchStyle(letter);

            this.clicked = false;
            this.isHovered = false;
            this.errorFrames = 0;
        }

        update() {
            if (this.size < this.targetSize) {
                this.size = this.p.lerp(this.size, this.targetSize, 0.1);
            }
            if (this.clicked) {
                this.size = this.p.lerp(this.size, 0, 0.2);
                if (this.size < 1) return;
            }
            if (this.errorFrames > 0) this.errorFrames--;

            this.pos.add(this.vel);
            this.rot.add(this.rotVel);

            let b = CONFIG.BOUNDS_SIZE;
            if (this.pos.x > b || this.pos.x < -b) this.vel.x *= -1;
            if (this.pos.y > b || this.pos.y < -b) this.vel.y *= -1;
            if (this.pos.z > b || this.pos.z < -b) this.vel.z *= -1;
        }

        draw() {
            if (this.size < 1) return;
            this.p.colorMode(this.p.HSB);

            const useHints = getColorHintsEnabled();
            let h, s, b;

            if (useHints) {
                h = this.branchStyle.h;
                s = this.branchStyle.s;
                b = this.branchStyle.b;
            } else {
                // Tema dinámico para las cajas
                let isDark = getIsDarkMode();
                if (isDark) {
                    // Dark Mode: Deep Glassy Indigo (Brighter than before: 40->70)
                    h = 240; s = 40; b = 60;
                } else {
                    // Light Mode: Solid Slate (Darker for contrast against white BG)
                    h = 220; s = 40; b = 30;
                }
            }

            this.p.push();
            this.p.translate(this.pos.x, this.pos.y, this.pos.z);
            this.p.rotateX(this.rot.x);
            this.p.rotateY(this.rot.y);
            this.p.rotateZ(this.rot.z);

            this.p.noFill();

            // Contrast Stroke Logic
            let baseStroke = getIsDarkMode() ? 1.5 : 1.2;

            if (this.errorFrames > 0) {
                this.p.stroke(0, 90, 90);
                this.p.strokeWeight(3);
                h = 0; s = 90; b = 90;
            } else if (this.clicked) {
                let suc = CONFIG.SUCCESS_COLOR;
                this.p.stroke(suc.h, suc.s, suc.b);
                this.p.strokeWeight(3);
                h = suc.h; s = suc.s; b = suc.b;
            } else if (this.isHovered) {
                let sel = CONFIG.SELECTION_COLOR;
                this.p.stroke(sel.h, sel.s, sel.b);
                this.p.strokeWeight(2.5);
                h = sel.h; s = sel.s; b = sel.b;
            } else {
                let isDark = getIsDarkMode();
                let strokeB = b;
                if (!isDark && b > 70) {
                    strokeB = b * 0.8;
                }
                this.p.stroke(h, s, strokeB);
                this.p.strokeWeight(baseStroke);
            }

            this.p.box(this.size);
            this.drawPoints(h, s, b);
            this.p.pop();
        }

        drawPoints(h, s, b) {
            // Updated to shared logic
            let pts = getPointsForChar(this.letter);
            if (!pts) return;

            const NODES = get3DNodePositions(); // Shared geometry

            // Add lights from multiple directions for uniform illumination
            this.p.push();
            this.p.noStroke();
            let pointS = Math.min(100, s * 1.2);
            let pointB = Math.min(100, b * 1.3);
            this.p.fill(h, pointS, pointB);

            for (let i of pts) {
                if (NODES[i]) {
                    let n = NODES[i];
                    this.p.push();
                    this.p.translate(n[0] * this.size, n[1] * this.size, n[2] * this.size);
                    this.p.sphere(this.size * 0.18);
                    this.p.pop();
                }
            }

            this.p.pop();
        }
        setError() {
            this.errorFrames = 60;
            this.vel.mult(3);
        }
    }



    function updateUI() {
        if (ui.score) ui.score.html(state.score);
        if (ui.target) {
            let html = "";
            for (let i = 0; i < state.word.length; i++) {
                let char = state.word[i];
                if (i < state.index) html += `<span class="char-done">${char}</span>`;
                else if (i === state.index) html += `<span class="char-current">${char}</span>`;
                else html += `<span class="char-future">${char}</span>`;
            }
            ui.target.html(html);
        }
    }

    function showFeedback(msg, type) {
        if (!ui.feedback) return;
        ui.feedback.html(msg);
        // Feedback State (Colored)
        ui.feedback.style('color', type === 'error' ? '#EF4444' : '#10B981');

        // Revert to "Game Status" after delay instead of vanishing
        setTimeout(() => {
            ui.feedback.html(`NIVEL ${state.level}`);
            ui.feedback.style('color', 'var(--text-color)');
        }, 1500);
    }

    p.mousePressed = checkClick;

    function updateCanvasSize() {
        let el = document.getElementById('canvas-wrapper');
        if (el) p.resizeCanvas(el.clientWidth, el.clientHeight);
    }

    p.windowResized = function () {
        updateCanvasSize();
    };
};
