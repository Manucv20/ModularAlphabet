const gameSketch = (p) => {
    // ==========================================
    // CONFIGURACIÓN Y ESTADO
    // ==========================================
    const CONFIG = {
        BOUNDS_SIZE: 350,  // Radio del "mundo" cúbico (x,y,z: -350 a 350)
        CAM_DIST: 900, // Distancia cámara perspectiva
        SELECTION_COLOR: { h: 0, s: 90, b: 100 }, // ROJO (Hover/Encima)
        SUCCESS_COLOR: { h: 120, s: 90, b: 100 }, // VERDE (Acierto/Seleccionado)
        HARD_MODE_LEVEL: 4,
        ULTRA_HARD_LEVEL: 9,
        NO_COLOR_MULTIPLIER: 1.25,
        NO_COLOR_WORD_BONUS_MULTIPLIER: 1.2,
        MAX_MODULES: 10,
        WORD_CONTEXT_COUNT: 3,
        MODULE_CYCLE_INTERVAL_MS: 2000,
        TARGET_DUPLICATE_CHANCE: 0.33,
        TARGET_DUPLICATE_CHANCE_FRENZY: 0.33,
        BONUS_FRENZY_EVERY: 4,
        BONUS_BOSS_EVERY: 6,
        FRENZY_TIME_LIMIT_MS: 35000,
        BOSS_TIME_LIMIT_MS: 55000,
        FRENZY_MULTIPLIER: 2,
        FRENZY_COLOR_PENALTY_MULT: 0.75,
        BOSS_MULTIPLIER: 3,
        BASE_SCORE: 100,
        WORD_BONUS: 500,
        FRENZY_WORD_BONUS: 800,
        BOSS_WORD_BONUS: 1500,
        ERROR_PENALTY: 40,
        TIMEOUT_PENALTY: 150,
        FRENZY_COMBO_WINDOW_MS: 1800,
        FRENZY_COMBO_BONUS: 30,
        PERFECT_STREAK_STEP: 0.1,
        PERFECT_STREAK_MAX_MULT: 1.5,
        BOSS_FLAWLESS_BONUS: 800
    };

    const WORDS = ["HOLA", "MUNDO", "CODIGO", "ARTE", "DISEÑO", "FUTURO", "SOL", "LUNA", "TIEMPO", "MANU"];
    const BOSS_WORDS = ["ALFABETO", "MODULAR", "GEOMETRIA", "CODIFICACION", "EXPERIMENTO", "ALGORITMO", "ESTRUCTURA"];

    let state = {
        word: "",
        index: 0,
        score: 0,
        level: 1, // Start Level 1
        hardMode: false,
        ultraHard: false,
        roundType: "normal",
        roundEndsAt: 0,
        roundTimeoutHandled: false,
        roundErrors: 0,
        perfectStreak: 0,
        reliefRound: false,
        lastCorrectAt: 0,
        combo: 0,
        roundColorLocked: false,
        roundColorEnabled: true,
        noColorBonusEligible: true,
        roundDurationMs: 0,
        feedbackToken: 0,
        feedbackOverrideUntil: 0,
        nextCycleAt: 0,
        modules: []
    };

    let ui = {
        score: null,
        target: null,
        feedback: null,
        level: null,
        progress: null,
        label: null,
        time: null,
        streak: null,
        progressTrack: null,
        feedbackPill: null,
        timeBadge: null,
        hintBtn: null
    };
    let cam;
    let canvas; // Persist canvas reference for custom controls
    let controls; // Shared camera controls

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
        ui.level = p.select('#levelVal');
        ui.progress = p.select('#progressBar');
        ui.progressTrack = p.select('.progress-track');
        ui.label = p.select('.target-display .label');
        ui.time = p.select('#timeVal');
        ui.streak = p.select('#streakVal');
        ui.feedbackPill = p.select('#feedbackPill');
        ui.timeBadge = p.select('#feedbackTime');
        ui.hintBtn = p.select('#game-ui-container .color-toggle-btn');

        if (ui.hintBtn && ui.hintBtn.elt) {
            ui.hintBtn.elt.onclick = (e) => {
                e.preventDefault();
                handleHintToggle();
            };
        }

        // Camera setup
        cam = p.createCamera();
        cam.setPosition(0, 0, 900);
        cam.lookAt(0, 0, 0);

        // Shared camera controls (preserve existing behavior)
        controls = createOrbitController(p, {
            startZ: 900,
            minZ: 1,
            maxZ: 1200,
            rotationSpeed: 0.005,
            zoomSpeed: 0.5,
            pinchZoomSpeed: 2,
            pinchThreshold: 15,
            pinchThresholdRatio: 0.04,
            pinchStartDelayMs: 60,
            maxZoomStep: 120,
            damping: 0.1,
            allowZoomWhileDragging: false
        });
        controls.attach(canvas);

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

        updateRoundTimer();

        // Shared camera update (rotation + zoom + damping)
        if (controls) controls.updateCamera(cam);


        // Optimización de Iluminación (3-Point Setup)
        p.ambientLight(150); // Base level
        p.directionalLight(255, 255, 255, 1, 1, -1);  // Key Light (Top-Right-Front)
        p.directionalLight(100, 100, 110, -1, 0, -1); // Fill Light (Left-Front)
        p.directionalLight(50, 50, 50, 0, -1, 0);     // Rim Light (Top)
        // Removed excessive point lights for performance

        updatePhysics();
        maintainModulePool();
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
        state.roundType = getRoundType(state.level);
        state.word = state.roundType === "boss" ? p.random(BOSS_WORDS) : p.random(WORDS);
        state.index = 0;
        state.combo = 0;
        state.lastCorrectAt = 0;
        state.roundErrors = 0;
        state.hardMode = state.level >= CONFIG.HARD_MODE_LEVEL;
        state.ultraHard = state.level >= CONFIG.ULTRA_HARD_LEVEL;
        state.reliefRound = getRoundType(state.level - 1) === "boss";
        state.roundColorLocked = false;
        state.noColorBonusEligible = state.roundType !== "frenzy";
        // Default: color ON at round start (player can turn it off before playing)
        setColorHints(true);
        state.roundColorEnabled = true;
        state.nextCycleAt = Date.now() + CONFIG.MODULE_CYCLE_INTERVAL_MS;
        state.roundEndsAt = 0;
        state.roundDurationMs = 0;
        state.roundTimeoutHandled = false;
        if (state.roundType === "frenzy") {
            state.roundDurationMs = CONFIG.FRENZY_TIME_LIMIT_MS;
            state.roundEndsAt = Date.now() + state.roundDurationMs;
        } else if (state.roundType === "boss") {
            state.roundDurationMs = CONFIG.BOSS_TIME_LIMIT_MS;
            state.roundEndsAt = Date.now() + state.roundDurationMs;
        }
        spawnModules();
        updateUI();
        if (state.roundType === "frenzy") showFeedback(`BONUS FRENESÍ`, "info");
        else if (state.roundType === "boss") showFeedback(`BOSS ROUND`, "info");
        else if (state.reliefRound) showFeedback(`NIVEL ${state.level} • RONDA SUAVE`, "info");
        else showFeedback(`NIVEL ${state.level}`, "info");
    }

    function spawnModules() {
        state.modules = [];
        const targetChar = getCurrentTargetChar() || "A";
        state.modules.push(createModule(targetChar, { isTargetAnchor: true }));

        while (state.modules.length < CONFIG.MAX_MODULES) {
            spawnRandomModule(targetChar);
        }
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
                if (m1.isMatched || m2.isMatched || m1.isDespawning || m2.isDespawning) continue;

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
            if (m.isMatched || m.isDespawning) continue;

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

        if (!state.roundColorLocked) {
            state.roundColorLocked = true;
            state.roundColorEnabled = getColorHintsEnabled();
        }
        const noColorBonus = state.noColorBonusEligible && !state.roundColorEnabled;
        const frenzyColorPenalty = state.roundType === "frenzy" && state.roundColorEnabled;

        let targetChar = state.word[state.index];

        if (clicked.letter === targetChar) {
            let multiplier = 1;
            if (state.roundType === "frenzy") multiplier = CONFIG.FRENZY_MULTIPLIER;
            if (state.roundType === "boss") multiplier = CONFIG.BOSS_MULTIPLIER;

            let addScore = CONFIG.BASE_SCORE * multiplier;
            if (state.roundType === "frenzy") {
                const now = Date.now();
                if (now - state.lastCorrectAt <= CONFIG.FRENZY_COMBO_WINDOW_MS) {
                    state.combo += 1;
                } else {
                    state.combo = 1;
                }
                state.lastCorrectAt = now;
                addScore += state.combo * CONFIG.FRENZY_COMBO_BONUS;
            } else {
                state.combo = 0;
                state.lastCorrectAt = 0;
            }

            if (noColorBonus) {
                addScore = Math.round(addScore * CONFIG.NO_COLOR_MULTIPLIER);
            }
            if (frenzyColorPenalty) {
                addScore = Math.round(addScore * CONFIG.FRENZY_COLOR_PENALTY_MULT);
            }

            state.score += addScore;
            clicked.isMatched = true;
            clicked.clicked = true;
            if (state.roundType === "frenzy" && state.combo > 1) {
                showFeedback(`COMBO x${state.combo}`, "success");
            } else if (multiplier > 1) {
                showFeedback(`¡CORRECTO! x${multiplier}`, "success");
            } else {
                showFeedback("¡CORRECTO!", "success");
            }

            state.index++;
            ensureTargetAnchor();
            if (state.index >= state.word.length) {
                let wordBonus = CONFIG.WORD_BONUS;
                if (state.roundType === "frenzy") wordBonus = CONFIG.FRENZY_WORD_BONUS;
                if (state.roundType === "boss") wordBonus = CONFIG.BOSS_WORD_BONUS;
                const flawless = state.roundErrors === 0;
                const streakForBonus = flawless ? state.perfectStreak + 1 : 0;
                let streakMult = 1;
                if (flawless) {
                    streakMult = Math.min(
                        CONFIG.PERFECT_STREAK_MAX_MULT,
                        1 + streakForBonus * CONFIG.PERFECT_STREAK_STEP
                    );
                }

                let totalBonus = Math.round(wordBonus * streakMult);
                if (noColorBonus) {
                    totalBonus = Math.round(totalBonus * CONFIG.NO_COLOR_WORD_BONUS_MULTIPLIER);
                }
                if (frenzyColorPenalty) {
                    totalBonus = Math.round(totalBonus * CONFIG.FRENZY_COLOR_PENALTY_MULT);
                }
                if (state.roundType === "boss" && flawless) {
                    totalBonus += CONFIG.BOSS_FLAWLESS_BONUS;
                }

                state.score += totalBonus;
                state.perfectStreak = flawless ? streakForBonus : 0;
                state.level++;
                state.roundEndsAt = 0;
                state.roundDurationMs = 0;
                state.roundTimeoutHandled = true;
                if (flawless) {
                    let multLabel = streakMult.toFixed(2).replace(/\.00$/, '');
                    if (state.roundType === "boss") {
                        showFeedback(`BOSS PERFECTO x${multLabel} (+${totalBonus})`, "success");
                    } else {
                        showFeedback(`PERFECTO x${multLabel} (+${totalBonus})`, "success");
                    }
                } else {
                    showFeedback(`¡PALABRA COMPLETADA! (+${totalBonus})`, "success");
                }
                setTimeout(newRound, 1500);
            }
        } else {
            state.score = Math.max(0, state.score - CONFIG.ERROR_PENALTY);
            state.combo = 0;
            state.lastCorrectAt = 0;
            state.roundErrors++;
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
            this.isTargetAnchor = false;
            this.isDespawning = false;
            this.isDead = false;
        }

        update() {
            if (this.isDespawning && !this.isMatched) this.isMatched = true;

            if (this.isDespawning || this.clicked) {
                this.size = this.p.lerp(this.size, 0, 0.2);
                if (this.size < 1) {
                    this.isDead = true;
                    return;
                }
            } else if (this.size < this.targetSize) {
                this.size = this.p.lerp(this.size, this.targetSize, 0.1);
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

        setLetter(letter) {
            this.letter = letter;
            this.branchStyle = getBranchStyle(letter);
        }

        setError() {
            this.errorFrames = 60;
            this.vel.mult(3);
        }
    }



    function updateUI() {
        if (ui.score) ui.score.html(state.score);
        if (ui.level) ui.level.html(state.level);
        if (ui.progress) {
            const ratio = state.word.length > 0 ? state.index / state.word.length : 0;
            ui.progress.style('width', `${Math.min(100, Math.max(0, ratio * 100))}%`);
            const glowOn = state.perfectStreak > 0;
            if (ui.progress.elt) {
                ui.progress.elt.classList.toggle('glow', glowOn);
            }
            if (ui.progressTrack && ui.progressTrack.elt) {
                ui.progressTrack.elt.classList.toggle('glow', glowOn);
            }

            // Scale glow intensity with multiplier (gratifying feedback)
            const maxMult = CONFIG.PERFECT_STREAK_MAX_MULT;
            const currentMult = Math.min(
                maxMult,
                1 + state.perfectStreak * CONFIG.PERFECT_STREAK_STEP
            );
            const denom = Math.max(0.0001, maxMult - 1);
            const t = Math.min(1, Math.max(0, (currentMult - 1) / denom));
            const alphaLow = (0.2 + 0.3 * t).toFixed(2);
            const alphaHigh = (0.45 + 0.45 * t).toFixed(2);
            const glowSize = `${Math.round(10 + 12 * t)}px`;

            if (ui.progressTrack && ui.progressTrack.elt) {
                if (glowOn) {
                    ui.progressTrack.elt.style.setProperty('--glow-alpha', alphaLow);
                    ui.progressTrack.elt.style.setProperty('--glow-alpha-strong', alphaHigh);
                    ui.progressTrack.elt.style.setProperty('--glow-size', glowSize);
                } else {
                    ui.progressTrack.elt.style.removeProperty('--glow-alpha');
                    ui.progressTrack.elt.style.removeProperty('--glow-alpha-strong');
                    ui.progressTrack.elt.style.removeProperty('--glow-size');
                }
            }
            if (ui.progress.elt) {
                if (glowOn) {
                    ui.progress.elt.style.setProperty('--glow-alpha-strong', alphaHigh);
                } else {
                    ui.progress.elt.style.removeProperty('--glow-alpha-strong');
                }
            }
        }
        if (ui.label) {
            let labelText = "TRADUCE:";
            if (state.roundType === "boss") labelText = "TRADUCE (BOSS)";
            else if (state.roundType === "frenzy") labelText = "TRADUCE (FRENESÍ)";
            else if (state.ultraHard) labelText = "TRADUCE (ULTRA)";
            else if (state.hardMode) labelText = "TRADUCE (HARD)";

            if (!state.roundColorLocked) {
                if (state.roundType === "frenzy") labelText += " • COLOR PENALIZA";
                else labelText += " • ELIGE COLOR";
            } else if (state.noColorBonusEligible && !state.roundColorEnabled) {
                labelText += " • SIN COLOR +BONUS";
            } else if (state.roundType === "frenzy" && state.roundColorEnabled) {
                labelText += " • COLOR -PUNTOS";
            }
            if (state.reliefRound && state.roundType === "normal") {
                labelText += " • RONDA SUAVE";
            }

            ui.label.html(labelText);
        }
        if (ui.time) {
            if (state.roundEndsAt > 0) {
                const remaining = Math.max(0, state.roundEndsAt - Date.now());
                ui.time.html(formatTime(remaining));
            } else {
                ui.time.html("--");
            }
        }
        if (ui.streak) {
            const label = getStreakLabel();
            ui.streak.html(label);
            if (ui.streak.elt) {
                ui.streak.elt.title = `Racha perfecta: ${state.perfectStreak}`;
            }
        }
        if (ui.hintBtn && ui.hintBtn.elt) {
            const btn = ui.hintBtn.elt;
            const noColorBonus = state.noColorBonusEligible && !state.roundColorEnabled;
            const frenzyColorPenalty = state.roundType === "frenzy" && state.roundColorEnabled;
            btn.classList.remove('hint-mode', 'cooldown');
            btn.removeAttribute('data-hints');

            if (state.roundColorLocked) {
                btn.disabled = true;
                btn.setAttribute(
                    'title',
                    noColorBonus
                        ? 'Elección bloqueada: sin color (+bonus)'
                        : (frenzyColorPenalty ? 'Elección bloqueada: color penaliza' : 'Elección bloqueada: con color')
                );
            } else {
                btn.disabled = false;
                btn.setAttribute(
                    'title',
                    state.roundType === "frenzy"
                        ? (frenzyColorPenalty ? 'Con color (penaliza). Toca para quitar' : 'Sin color. Toca para activar (penaliza)')
                        : (noColorBonus ? 'Sin color (+bonus). Toca para activar color' : 'Con color. Toca para desactivar')
                );
            }
        }
        if (ui.target) {
            const hideFuture = state.hardMode && state.roundType !== "frenzy" && !state.reliefRound;
            let html = "";
            for (let i = 0; i < state.word.length; i++) {
                let char = state.word[i];
                if (i < state.index) {
                    html += `<span class="char-done">${char}</span>`;
                } else if (i === state.index) {
                    html += `<span class="char-current">${char}</span>`;
                } else if (hideFuture) {
                    html += `<span class="char-hidden">•</span>`;
                } else {
                    html += `<span class="char-future">${char}</span>`;
                }
            }
            ui.target.html(html);
        }
        if (ui.feedback && Date.now() > state.feedbackOverrideUntil) {
            setFeedbackToStreak();
        }
    }

    function getStreakLabel() {
        const mult = Math.min(
            CONFIG.PERFECT_STREAK_MAX_MULT,
            1 + state.perfectStreak * CONFIG.PERFECT_STREAK_STEP
        );
        return `x${mult.toFixed(2).replace(/\.00$/, '')}`;
    }

    function setFeedbackToStreak() {
        if (!ui.feedback) return;
        const label = getStreakLabel();
        ui.feedback.html(`RACHA ${label}`);
        ui.feedback.style('color', 'var(--text-color)');
    }

    function showFeedback(msg, type) {
        if (!ui.feedback) return;
        ui.feedback.html(msg);
        // Feedback State (Colored)
        ui.feedback.style('color', type === 'error' ? '#EF4444' : '#10B981');

        // Revert to streak after delay instead of vanishing
        const token = ++state.feedbackToken;
        state.feedbackOverrideUntil = Date.now() + 1500;
        setTimeout(() => {
            if (state.feedbackToken !== token) return;
            setFeedbackToStreak();
        }, 1500);
    }

    function updateTimerVisual(remaining, duration) {
        if (!ui.feedbackPill || !ui.feedbackPill.elt) return;
        const pill = ui.feedbackPill.elt;
        const badge = ui.timeBadge ? ui.timeBadge.elt : null;
        if (duration <= 0 || remaining <= 0) {
            pill.classList.remove('timer-active');
            pill.style.setProperty('--time-progress', '0');
            if (badge) badge.textContent = "";
            return;
        }

        const progress = Math.max(0, Math.min(1, remaining / duration));
        pill.classList.add('timer-active');
        pill.style.setProperty('--time-progress', progress.toFixed(3));
        if (badge) badge.textContent = formatTime(remaining);
    }

    function updateRoundTimer() {
        if (state.roundEndsAt <= 0) {
            if (ui.time) ui.time.html("--");
            updateTimerVisual(0, 0);
            return;
        }

        const remaining = state.roundEndsAt - Date.now();
        if (ui.time) ui.time.html(formatTime(Math.max(0, remaining)));
        updateTimerVisual(remaining, state.roundDurationMs);

        if (remaining <= 0 && !state.roundTimeoutHandled) {
            state.roundTimeoutHandled = true;
            state.roundErrors++;
            state.perfectStreak = 0;
            state.score = Math.max(0, state.score - CONFIG.TIMEOUT_PENALTY);
            showFeedback("TIEMPO AGOTADO", "error");
            updateUI();
            updateTimerVisual(0, 0);
            setTimeout(() => {
                newRound();
            }, 900);
        }
    }

    function maintainModulePool() {
        const now = Date.now();
        const targetChar = getCurrentTargetChar();

        // Cycle one module at a time
        if (now >= state.nextCycleAt) {
            const targetChar = getCurrentTargetChar();
            const candidates = state.modules.filter(m =>
                !m.isTargetAnchor &&
                !m.isDespawning &&
                !m.clicked &&
                !m.isHovered
            );

            if (candidates.length > 0) {
                // Prefer a duplicate of the target if it exists (fun cyclical decoy)
                let dup = targetChar ? candidates.filter(m => m.letter === targetChar) : [];
                let pick = dup.length > 0 ? p.random(dup) : p.random(candidates);
                pick.isDespawning = true;
            }
            state.nextCycleAt = now + CONFIG.MODULE_CYCLE_INTERVAL_MS;
        }

        // Cleanup
        state.modules = state.modules.filter(m => !m.isDead);

        // Enforce max
        if (state.modules.length > CONFIG.MAX_MODULES) {
            let overflow = state.modules.length - CONFIG.MAX_MODULES;
            let candidates = state.modules.filter(m => !m.isTargetAnchor && !m.isDespawning && !m.clicked);
            for (let i = 0; i < overflow && i < candidates.length; i++) {
                candidates[i].isDespawning = true;
            }
        }

        ensureTargetAnchor();
        ensureWordContextModules();

        while (state.modules.length < CONFIG.MAX_MODULES) {
            spawnRandomModule(targetChar);
        }
    }

    function getRoundType(level) {
        if (level % CONFIG.BONUS_BOSS_EVERY === 0) return "boss";
        if (level % CONFIG.BONUS_FRENZY_EVERY === 0) return "frenzy";
        return "normal";
    }

    function formatTime(ms) {
        const secs = Math.ceil(ms / 1000);
        return `${secs}s`;
    }

    function getCurrentTargetChar() {
        if (!state.word || state.index >= state.word.length) return null;
        return state.word[state.index];
    }

    function getUpcomingLetters(count) {
        let upcoming = [];
        if (!state.word) return upcoming;
        for (let i = 1; i <= count; i++) {
            let idx = state.index + i;
            if (idx >= state.word.length) break;
            upcoming.push(state.word[idx]);
        }
        return upcoming;
    }

    function createModule(char, opts = {}) {
        let range = CONFIG.BOUNDS_SIZE * 0.8;
        let m = new Module3D(
            p,
            char,
            p.random(-range, range),
            p.random(-range, range),
            p.random(-range, range)
        );
        m.isTargetAnchor = Boolean(opts.isTargetAnchor);
        return m;
    }

    function spawnRandomModule(targetChar) {
        const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZÑ";
        let char = ABC[Math.floor(p.random(ABC.length))];
        const dupChance = state.roundType === "frenzy"
            ? CONFIG.TARGET_DUPLICATE_CHANCE_FRENZY
            : CONFIG.TARGET_DUPLICATE_CHANCE;

        const hasDuplicate = targetChar
            ? state.modules.some(m => m.letter === targetChar && !m.isTargetAnchor)
            : false;

        if (targetChar && !hasDuplicate && p.random(1) < dupChance) {
            char = targetChar;
        }

        if (targetChar && char === targetChar && hasDuplicate) {
            // Avoid too many duplicates
            char = ABC[Math.floor(p.random(ABC.length))];
        }

        state.modules.push(createModule(char));
    }

    function ensureTargetAnchor() {
        const targetChar = getCurrentTargetChar();
        if (!targetChar) return;

        let anchor = state.modules.find(m => m.isTargetAnchor);
        if (anchor && anchor.letter === targetChar && !anchor.isDespawning && !anchor.clicked) return;

        if (anchor) {
            anchor.isTargetAnchor = false;
        }

        let candidate = state.modules.find(m => !m.isTargetAnchor && !m.isDespawning && !m.clicked);
        if (candidate) {
            candidate.setLetter(targetChar);
            candidate.isTargetAnchor = true;
            return;
        }

        if (state.modules.length < CONFIG.MAX_MODULES) {
            state.modules.push(createModule(targetChar, { isTargetAnchor: true }));
        } else {
            let replace = state.modules.find(m => !m.isTargetAnchor);
            if (replace) {
                replace.setLetter(targetChar);
                replace.isTargetAnchor = true;
            }
        }
    }

    function ensureWordContextModules() {
        const upcoming = getUpcomingLetters(CONFIG.WORD_CONTEXT_COUNT);
        if (upcoming.length === 0) return;

        for (let letter of upcoming) {
            let exists = state.modules.some(m =>
                !m.isTargetAnchor &&
                !m.isDespawning &&
                !m.clicked &&
                m.letter === letter
            );
            if (exists) continue;

            let candidate = state.modules.find(m =>
                !m.isTargetAnchor &&
                !m.isDespawning &&
                !m.clicked
            );

            if (candidate) {
                candidate.setLetter(letter);
                continue;
            }

            if (state.modules.length < CONFIG.MAX_MODULES) {
                state.modules.push(createModule(letter));
            }
        }
    }

    p.mousePressed = checkClick;

    p.keyPressed = function () {
        // Space or Enter selects hovered module (same as click)
        if (p.keyCode === 32 || p.keyCode === 13) {
            checkClick();
            return false;
        }
    };

    function setColorHints(enabled) {
        const isEnabled = getColorHintsEnabled();
        if (enabled !== isEnabled && typeof window.toggleColorHints === 'function') {
            window.toggleColorHints();
        }
    }

    function handleHintToggle() {
        if (state.roundColorLocked) {
            showFeedback("ELECCIÓN BLOQUEADA", "error");
            return;
        }
        if (typeof window.toggleColorHints === 'function') {
            window.toggleColorHints();
        }
        state.roundColorEnabled = getColorHintsEnabled();
        updateUI();
        if (state.roundType === "frenzy" && state.roundColorEnabled) {
            showFeedback("COLOR PENALIZA", "info");
        }
    }

    function updateCanvasSize() {
        let el = document.getElementById('canvas-wrapper');
        if (el) p.resizeCanvas(el.clientWidth, el.clientHeight);
    }

    p.windowResized = function () {
        updateCanvasSize();
    };
};
