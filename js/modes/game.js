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

    // ==========================================
    // CICLO DE VIDA P5 (SETUP & DRAW)
    // ==========================================

    p.setup = function () {
        // Corrección de densidad de píxeles para evitar desfases en selección
        p.pixelDensity(1);

        let canvas = p.createCanvas(100, 100, p.WEBGL);
        canvas.parent('canvas-container');

        // Inicializar
        updateCanvasSize();
        // Inicializar
        updateCanvasSize();
        // Uses shared logic for letter mapping

        // Referencias DOM
        ui.score = p.select('#scoreVal');
        ui.target = p.select('#targetWordDisplay');
        ui.feedback = p.select('#feedbackDisplay');

        // Cámara Perspectiva (Standard)
        cam = p.createCamera();
        cam.setPosition(0, 0, 900); // Overview Position
        cam.lookAt(0, 0, 0);

        // Custom Zoom Control
        p.mouseWheel = function (event) {
            // Lock Zoom while Rotating
            if (p.mouseIsPressed) return false;

            // Smooth Target Update
            targetZ += event.delta * 0.5;

            // Allow getting close (1), but cap far distance (1200)
            if (targetZ < 1) targetZ = 1;
            if (targetZ > 1200) targetZ = 1200;

            return false;
        };

        // Touch Gestures (Pinch to Zoom)
        let initialTouchDist = 0;
        canvas.touchStarted(() => {
            if (p.touches.length === 2) {
                initialTouchDist = p.dist(p.touches[0].x, p.touches[0].y, p.touches[1].x, p.touches[1].y);
                return false;
            }
        });

        canvas.touchMoved(() => {
            if (p.touches.length === 2) {
                let currentDist = p.dist(p.touches[0].x, p.touches[0].y, p.touches[1].x, p.touches[1].y);
                let delta = initialTouchDist - currentDist;

                targetZ += delta * 2;

                if (targetZ < 1) targetZ = 1;
                if (targetZ > 1200) targetZ = 1200;

                initialTouchDist = currentDist;
                return false;
            }
        });

        // Iniciar partida
        newRound();
    };

    // ==========================================
    // DRAW LOOP
    // ==========================================
    p.draw = function () {
        let isDark = getIsDarkMode();
        p.colorMode(p.RGB);
        p.clear(); // Transparencia para ver el fondo CSS suave

        // ============================
        // CÁMARA INTELIGENTE (IGUAL QUE HOME)
        // ============================

        // 1. Orbit Control (Solo rotación X/Y, Zoom Z desactivado)
        p.orbitControl(1, 1, 0);

        // 2. Strict Axis Centering (Prevent Panning Drift)
        cam.lookAt(0, 0, 0);

        // 2. Camera Interaction Logic
        // Camera stays at user-defined zoom.

        // 3. Spherical Zoom Logic (Radius-based)
        let currentPos = p.createVector(cam.eyeX, cam.eyeY, cam.eyeZ);
        let currentRadius = currentPos.mag();

        // Lerp Radius
        let smoothRadius = p.lerp(currentRadius, targetZ, 0.1);

        // Apply
        if (currentRadius > 0.1) {
            currentPos.normalize();
            currentPos.mult(smoothRadius);
            cam.setPosition(currentPos.x, currentPos.y, currentPos.z);
        }


        // Luces
        p.ambientLight(150);
        p.pointLight(255, 255, 255, 0, 0, 500);

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

                let d = p5.Vector.dist(m1.pos, m2.pos);
                let minDist = (m1.size + m2.size) * 0.7; // Buffer zone

                if (d < minDist) {
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
            this.targetSize = ui.isMobile ? 35 : 50;

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
                    h = 220; s = 20; b = 40; // Dark mode box color
                } else {
                    h = 215; s = 40; b = 30; // Light mode: Elegant Navy Blue (Matches --text-color)
                }
            }

            this.p.push();
            this.p.translate(this.pos.x, this.pos.y, this.pos.z);
            this.p.rotateX(this.rot.x);
            this.p.rotateY(this.rot.y);
            this.p.rotateZ(this.rot.z);

            this.p.noFill();

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
                this.p.strokeWeight(2);
                h = sel.h; s = sel.s; b = sel.b;
            } else {
                this.p.stroke(h, s, b);
                this.p.strokeWeight(1);
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

            this.p.noStroke();
            this.p.fill(h, s, b);

            for (let i of pts) {
                if (NODES[i]) {
                    let n = NODES[i];
                    this.p.push();
                    this.p.translate(n[0] * this.size, n[1] * this.size, n[2] * this.size);
                    this.p.sphere(this.size * 0.15);
                    this.p.pop();
                }
            }
        }
        setError() {
            this.errorFrames = 60;
            this.vel.mult(3);
        }
    }

    function drawBounds() {
        p.push();
        p.noFill();
        p.stroke(30);
        let b = CONFIG.BOUNDS_SIZE * 2;
        p.box(b);
        p.pop();
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
        ui.feedback.style('opacity', '1');
        ui.feedback.style('color', type === 'error' ? '#ff4444' : '#44ff44');
        setTimeout(() => ui.feedback.style('opacity', '0'), 1500);
    }

    p.windowResized = updateCanvasSize;
    p.mousePressed = checkClick;

    function updateCanvasSize() {
        let el = document.getElementById('canvas-wrapper');
        if (el) p.resizeCanvas(el.clientWidth, el.clientHeight);
    }
};
