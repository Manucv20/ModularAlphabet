const homeSketch = (p) => {

    let targetZ = 400; // Objetivo de Radio (Distancia al centro)
    let modules = []; // Array de módulos flotantes
    let autoRotateAngle = 0; // Ángulo de rotación automática
    let cam; // Variable para la cámara

    let initialTouchDist = 0; // Para Zoom Táctil

    // ==========================================
    // SETUP
    // ==========================================
    p.setup = function () {
        let canvas = p.createCanvas(100, 100, p.WEBGL);
        canvas.parent('canvas-container');

        updateCanvasSize();

        // Cámara Orbit suave
        cam = p.createCamera();
        cam.setPosition(0, 0, 400); // Start at Immersive Distance
        cam.lookAt(0, 0, 0);

        // Custom Mouse Wheel 
        p.mouseWheel = function (event) {
            // LOCK ZOOM WHILE ROTATING
            if (p.mouseIsPressed) return false;

            // Update TARGET Z, not immediate position (Smooth)
            targetZ += event.delta * 0.5;

            // Clamp Limits
            if (targetZ < 1) targetZ = 1;
            if (targetZ > 1200) targetZ = 1200;

            return false;
        };

        // Touch Gestures (Pinch to Zoom)
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

                // Activate zoom only after crossing threshold
                if (!touchZoomActive && Math.abs(delta) > PINCH_THRESHOLD) {
                    touchZoomActive = true;
                }

                // Apply zoom if gesture is active
                if (touchZoomActive) {
                    targetZ += delta * 2;
                    if (targetZ < 1) targetZ = 1;
                    if (targetZ > 1200) targetZ = 1200;
                    initialTouchDist = currentDist;
                }
                return false;
            }
            // 1 finger: allow orbitControl to handle rotation (return undefined)
        });


        // Generar Nube de Letras (Decorativa)
        spawnIntroModules();

        // Generar la GRID de la Leyenda (DOM)
        generateLegendGrid();
    };

    // ==========================================
    // DRAW
    // ==========================================
    p.draw = function () {
        // Reset a RGB para el fondo
        p.colorMode(p.RGB);

        // Usar clear() para permitir que el fondo CSS (que tiene transición suave) se vea
        p.clear();

        // CONTROL DE CÁMARA INTELIGENTE

        // 1. Orbit Control (Solo rotación X/Y, Zoom Z desactivado '0')
        p.orbitControl(1, 1, 0);

        // 2. Camera Interaction Logic
        // Camera stays at user-defined zoom (no auto-reset).

        // 3. Spherical Zoom Logic (Radius-based)
        // Calculate current radius (Magnitude of camera position vector)
        let currentPos = p.createVector(cam.eyeX, cam.eyeY, cam.eyeZ);
        let currentRadius = currentPos.mag();

        // Lerp the radius, not just Z
        let smoothRadius = p.lerp(currentRadius, targetZ, 0.1);

        // Apply new radius to the existing vector direction
        if (currentRadius > 0.1) {
            currentPos.normalize();
            currentPos.mult(smoothRadius);
            cam.setPosition(currentPos.x, currentPos.y, currentPos.z);
        }

        // Auto-rotación suave si no hay interacción

        // 4. Eje Absoluto: Siempre mirar al (0,0,0)
        // Esto corrige cualquier "Pan" accidental (Shift+Click) que desplace el eje
        cam.lookAt(0, 0, 0);

        // Auto-rotación suave si no hay interacción
        if (!p.mouseIsPressed) {
            autoRotateAngle += 0.001; // Velocidad reducida (Drift sutil)
        }
        // Aplicar rotación SIEMPRE para evitar saltos al interactuar
        p.rotateY(autoRotateAngle);

        // Luces (Restaurar)
        p.ambientLight(100);
        p.pointLight(255, 255, 255, 0, -200, 400);

        // Dibujar Módulos
        for (let m of modules) {
            m.update();
            m.draw();
        }
    };

    // ==========================================
    // HELPERS
    // ==========================================

    // Helper para DOM (necesita string CSS)
    // Ahora usa la lógica centralizada de shared.js para consistencia total

    function getBranchColor(char) {
        let style = getBranchStyle(char); // Global from shared.js
        return hsbToCss(style.h, style.s, style.b);
    }
    // ...
    // (Inside drawModularPoints - line 313)
    // Nodos base en espacio local (-0.5 a 0.5)
    const NODES = get3DNodePositions();
    // ...

    p.windowResized = function () {
        updateCanvasSize();
    };

    function updateCanvasSize() {
        const wrapper = document.getElementById('canvas-wrapper');
        if (wrapper) {
            let w = wrapper.clientWidth;
            let h = wrapper.clientHeight;
            p.resizeCanvas(w, h);
        }
    }

    function spawnIntroModules() {
        const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
        const numbers = "0123456789";
        const symbols = ".,?!";

        // 1. Ensure Variety:
        // Guarantee that at least one instance of every unique character (A-Z, 0-9, Sym) exists.
        let uniqueChars = (letters + numbers + symbols).split('');

        // 2. Fill Remainder:
        // Fill the rest of the pool (up to 60) mostly with Letters (90% chance)
        // to avoid an overabundance of numbers/symbols in the visual cloud.
        let totalCount = 60;
        let remaining = totalCount - uniqueChars.length;

        for (let i = 0; i < remaining; i++) {
            // 90% probabilidad de letra, 10% de otro
            if (p.random() < 0.9) {
                uniqueChars.push(letters[Math.floor(p.random(letters.length))]);
            } else {
                uniqueChars.push(numbers[Math.floor(p.random(numbers.length))]);
            }
        }

        // Mezclar array para que no salgan ordenados
        p.shuffle(uniqueChars, true);

        for (let char of uniqueChars) {
            let x = p.random(-300, 300);
            let y = p.random(-300, 300);
            let z = p.random(-300, 300);
            modules.push(new IntroModule(p, char, x, y, z));
        }
    }

    // ==========================================
    // HELPER: Generar Leyenda DOM (Grouped by Branch)
    // ==========================================
    function generateLegendGrid() {
        // 1. Generate Dynamic Color Guide (Source of Truth: shared.js)
        const guideContainer = document.querySelector('.color-guide');
        if (guideContainer && typeof BRANCH_GROUPS !== 'undefined') {
            guideContainer.innerHTML = ''; // Clear hardcoded HTML

            BRANCH_GROUPS.forEach(group => {
                let item = document.createElement('div');
                item.className = 'guide-item';

                // Calculate representative color (Middle of hue range)
                let hMid = (group.hStart + group.hEnd) / 2;
                // Handle wrap-around case for Red (350->15)
                if (group.hStart > group.hEnd) hMid = (group.hStart + group.hEnd + 360) / 2 % 360;

                let colorCss = hsbToCss(hMid, group.s, group.b);

                item.innerHTML = `<span class="swatch" style="background:${colorCss}"></span> ${group.label}`;
                guideContainer.appendChild(item);
            });
        }

        // 2. Generate Alphabet Grid
        const gridContainer = document.getElementById('alphabet-grid');
        if (!gridContainer) return;
        gridContainer.innerHTML = '';

        // All characters in order
        const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ0123456789.?!,-';

        // Capture preview elements by ID
        const previewVisual = document.getElementById('previewVisual');
        const previewText = document.getElementById('previewText');
        const previewDesc = document.getElementById('previewDesc');

        // Create cells for each character
        allChars.split('').forEach(char => {
            let cell = document.createElement('div');
            cell.className = 'alpha-cell';

            // Create VISUAL representation (the dots)
            let visual = createCSSModule(char);
            cell.appendChild(visual);

            // Interaction Handlers
            const updatePreview = () => {
                // 1. Update Text
                if (previewText) {
                    previewText.innerText = char;
                    previewText.style.color = getBranchColor(char);
                }

                // 2. Clone Visual Module (Dots) and put in preview
                if (previewVisual) {
                    previewVisual.innerHTML = ''; // Clear previous
                    let largeVisual = visual.cloneNode(true); // Clone the DOM node
                    previewVisual.appendChild(largeVisual);
                }

                // 3. Update Description (Find which group it belongs to)
                if (previewDesc && typeof BRANCH_GROUPS !== 'undefined') {
                    let group = BRANCH_GROUPS.find(g => g.chars.includes(char));
                    let label = group ? group.label : "Desconocido";

                    // Add specific type context if needed
                    if ("0123456789".includes(char)) label += " (Número)";
                    else if (".,?!-".includes(char)) label += " (Signo)";
                    else label += " (Letra)";

                    previewDesc.innerText = label;
                    previewDesc.style.color = getBranchColor(char);
                }
            };

            cell.addEventListener('mouseenter', updatePreview);
            cell.addEventListener('mousedown', updatePreview); // click/tap

            gridContainer.appendChild(cell);
        });
    }


    function createCSSModule(char) {
        let wrapper = document.createElement('div');
        wrapper.style.width = '24px';
        wrapper.style.height = '24px';
        wrapper.style.position = 'relative';

        // Use branch color for border
        let branchColor = getBranchColor(char);
        wrapper.style.border = `1px solid ${branchColor}`;
        wrapper.style.borderRadius = '4px';
        wrapper.style.opacity = '0.9';

        let pts = getPointsForChar(char);
        const mapPos = [
            { l: 0, t: 0 }, { l: 50, t: 0 }, { l: 100, t: 0 },
            { l: 100, t: 50 }, { l: 100, t: 100 }, { l: 50, t: 100 },
            { l: 0, t: 100 }, { l: 0, t: 50 }
        ];

        pts.forEach(idx => {
            let dot = document.createElement('div');
            dot.style.position = 'absolute';
            dot.style.width = '6px';
            dot.style.height = '6px';
            dot.style.background = branchColor;
            dot.style.borderRadius = '50%';
            dot.style.transform = 'translate(-50%, -50%)';
            dot.style.boxShadow = `0 0 3px ${branchColor}`;
            let p = mapPos[idx];
            dot.style.left = p.l + '%';
            dot.style.top = p.t + '%';
            wrapper.appendChild(dot);
        });
        return wrapper;
    }

    // ==========================================
    // CLASE INTRO MODULE (Visual Only)
    // ==========================================
    class IntroModule {
        constructor(p, char, x, y, z) {
            this.p = p;
            this.char = char;
            this.pos = p.createVector(x, y, z);
            this.vel = p5.Vector.random3D().mult(0.5);
            this.size = 60;

            // Pre-calcular puntos
            this.points = getPointsForChar(char);

            // Usar nueva lógica HSB con profundidad
            this.style = getBranchStyle(char);

            // Estado de animación
            this.angleX = p.random(p.TWO_PI);
            this.angleY = p.random(p.TWO_PI);
            this.spinVel = 0;
            this.currentSize = this.size;

            // Física de Interacción
            this.repulsion = p.createVector(0, 0, 0);
        }

        update() {
            // Aplicar velocidad base + Repulsión
            this.pos.add(this.vel);
            this.pos.add(this.repulsion);
            this.repulsion.mult(0.9); // Fricción suave

            // Interacción con Ratón (Repulsión)
            if (this.p.mouseIsPressed) {
                // Shared screenPosition requires (pInstance, x, y, z) or (pInstance, vector)
                let sPos = screenPosition(this.p, this.pos);
                // Mouse coordinates relative to center
                let mx = this.p.mouseX - this.p.width / 2;
                let my = this.p.mouseY - this.p.height / 2;

                let d = this.p.dist(mx, my, sPos.x, sPos.y);
                let radius = 300; // Radio de efecto un poco más amplio

                if (d < radius) {
                    // Fuerza vectorial 2D en pantalla
                    let force = this.p.createVector(sPos.x - mx, sPos.y - my);
                    force.normalize();

                    // "Curva de Aceleración Real"
                    // 1. La fuerza depende de la distancia (más cerca = más fuerte)
                    // 2. La magnitud es mucho menor para que la velocidad se construya (Inercia)
                    // Lerp inverso: 0 (lejos) -> 1 (cerca)
                    let strength = this.p.map(d, 0, radius, 2, 0);

                    // Aplicar fuerza (Aceleración)
                    force.mult(strength * 0.5); // Multiplicador bajo para buildup suave

                    this.repulsion.add(force.x, force.y, 0);
                }
            }

            // WORLD BOUNDS
            // Soft bounce or reset if particles drift too far
            if (this.pos.mag() > 800) {
                this.pos = p5.Vector.random3D().mult(200);
            }

            // ANIMATION: WOBBLE & PULSE
            // 1. Rhythmic Size Variation (Jelly Effect)
            // Offset based on position so they don't all pulse in sync.
            let pulse = Math.sin(this.p.frameCount * 0.1 + this.pos.x * 0.01) * 2;
            this.currentSize = this.size + pulse;

            // 2. Coordinate Wave Rotation
            // Rotational speed is influenced by a spatial wave, creating a "Chain Reaction" look.
            let wave = Math.sin(this.p.frameCount * 0.02 + this.pos.x * 0.005 + this.pos.y * 0.005);
            let rotSpeed = 0.002 + (wave * 0.003);

            // 3. Random Twitches
            // Very rare probability (0.05%) for a sudden spin impulse.
            if (this.p.random() < 0.0005) {
                this.spinVel = 0.05;
            }

            this.spinVel *= 0.95; // Decay
            if (this.spinVel < 0.001) this.spinVel = 0;

            this.angleY += rotSpeed + this.spinVel;
            this.angleX += rotSpeed * 0.5 + this.spinVel; // X rotates slower for visual stability
        }

        draw() {
            this.p.push();
            this.p.translate(this.pos.x, this.pos.y, this.pos.z);

            // Forzar HSB localmente
            this.p.colorMode(this.p.HSB);

            // Aplicar Rotaciones Acumuladas
            this.p.rotateY(this.angleY);
            this.p.rotateX(this.angleX);

            // MARCO (usando tamaño pulsante)
            this.p.noFill();
            this.p.stroke(this.style.h, this.style.s, this.style.b);
            this.p.strokeWeight(1);
            this.p.box(this.currentSize);

            // PUNTOS MODULARES
            this.drawModularPoints();
            this.p.pop();
        }

        drawModularPoints() {
            if (!this.points) return;

            this.p.noStroke();
            this.p.fill(this.style.h, this.style.s, this.style.b); // Usar el mismo color de rama

            // Nodos base en espacio local (-0.5 a 0.5)
            // Movemos Z a 0.5 para que estén en la CARA FRONTAL (Bordes/Esquinas)
            // y no en el centro de las caras laterales (Z=0)
            const NODES = get3DNodePositions();

            for (let i of this.points) {
                if (NODES[i]) {
                    let n = NODES[i];
                    this.p.push();
                    this.p.translate(n[0] * this.size, n[1] * this.size, n[2] * this.size);
                    this.p.sphere(this.size * 0.12);
                    this.p.pop();
                }
            }
        }
    }

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
};
