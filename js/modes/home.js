const homeSketch = (p) => {

    let modules = []; // Array de módulos flotantes
    let cam; // Variable para la cámara
    let canvas; // Persist canvas reference for custom controls
    let controls; // Shared camera controls

    // ==========================================
    // SETUP
    // ==========================================
    p.setup = function () {
        canvas = p.createCanvas(100, 100, p.WEBGL);
        canvas.parent('canvas-container');

        updateCanvasSize();

        // Camera setup
        cam = p.createCamera();
        cam.setPosition(0, 0, 400);
        cam.lookAt(0, 0, 0);

        // Shared camera controls (preserve existing behavior)
        controls = createOrbitController(p, {
            startZ: 400,
            minZ: 1,
            maxZ: 1200,
            rotationSpeed: 0.005,
            zoomSpeed: 0.5,
            pinchZoomSpeed: 2,
            pinchThreshold: 15,
            damping: 0.1,
            allowZoomWhileDragging: false
        });
        controls.attach(canvas);

        // Generate decorative letter cloud
        spawnIntroModules();

        // Generate legend grid (DOM)
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

        // Shared camera update (rotation + zoom + damping)
        if (controls) controls.updateCamera(cam);

        // Luces (Centralized)
        p.ambientLight(100);
        p.directionalLight(255, 255, 255, 0, 0, -1);  // Front
        p.directionalLight(200, 200, 200, 0, 0, 1);   // Back
        p.directionalLight(150, 150, 150, 1, 0, 0);   // Right
        p.directionalLight(150, 150, 150, -1, 0, 0);  // Left
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
    // HELPER: Generar Leyenda DOM (Chromatically Grouped)
    // ==========================================
    function generateLegendGrid() {
        const gridContainer = document.getElementById('alphabet-grid');
        if (!gridContainer || typeof BRANCH_GROUPS === 'undefined') return;

        // Clear previous content
        gridContainer.innerHTML = '';

        // Remove the separate color guide if it exists, as headers now serve that purpose
        const separateGuide = document.querySelector('.color-guide');
        if (separateGuide) separateGuide.style.display = 'none';

        // Capture preview elements
        const previewVisual = document.getElementById('previewVisual');
        const previewText = document.getElementById('previewText');
        const previewDesc = document.getElementById('previewDesc');

        // Iterate through each Chromatic Group
        BRANCH_GROUPS.forEach(group => {
            // 1. Create Group Container
            const groupSection = document.createElement('div');
            groupSection.className = 'legend-group';

            // Calculate representative color
            let hMid = (group.hStart + group.hEnd) / 2;
            if (group.hStart > group.hEnd) hMid = (group.hStart + group.hEnd + 360) / 2 % 360;
            const colorCss = hsbToCss(hMid, group.s, group.b);

            // Inject Color for CSS utilization
            groupSection.style.setProperty('--group-color', colorCss);

            // 2. Minimalist Header (Visual Anchor Only)
            // No text label by default, just a visual anchor if needed via CSS
            const header = document.createElement('div');
            header.className = 'group-header';
            header.innerHTML = `<span class="group-dot"></span>`;
            // The label is removed to force visual reliance, or hidden via CSS if present
            groupSection.appendChild(header);

            // 3. Create Flex Grid for this Group
            const groupGrid = document.createElement('div');
            groupGrid.className = 'group-grid';

            // 4. Populate with Characters
            group.chars.split('').forEach(char => {
                let cell = document.createElement('div');
                cell.className = 'alpha-cell'; // Re-use existing class for module styling

                // Create VISUAL representation
                let visual = createCSSModule(char);
                cell.appendChild(visual);

                // Interaction Handlers (Keep existing logic)
                const updatePreview = () => {
                    const branchColor = getBranchColor(char);
                    const panel = document.getElementById('char-preview-panel');

                    if (previewText) {
                        previewText.innerText = char;
                        previewText.style.color = branchColor;
                    }
                    if (previewVisual) {
                        previewVisual.innerHTML = '';
                        let largeVisual = visual.cloneNode(true);
                        previewVisual.appendChild(largeVisual);
                    }

                    // CREATIVE UNIFICATION: Color the Panel Border
                    if (panel) {
                        panel.style.borderColor = branchColor;
                        panel.style.boxShadow = `0 4px 20px ${branchColor}33`; // 20% opacity glow
                    }
                };

                cell.addEventListener('mouseenter', updatePreview);
                cell.addEventListener('mousedown', updatePreview);

                groupGrid.appendChild(cell);
            });

            groupSection.appendChild(groupGrid);
            gridContainer.appendChild(groupSection);
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

            let isDark = getIsDarkMode();
            let strokeW = isDark ? 1.6 : 1.2;

            // MARCO (usando tamaño pulsante)
            this.p.noFill();

            // Contrast fix for Light Mode
            let strokeB = this.style.b;
            if (!isDark && strokeB > 70) {
                strokeB = strokeB * 0.8;
            }

            this.p.stroke(this.style.h, this.style.s, strokeB);
            this.p.strokeWeight(strokeW);
            this.p.box(this.currentSize);

            // PUNTOS MODULARES
            this.drawModularPoints();
            this.p.pop();
        }

        drawModularPoints() {
            if (!this.points) return;

            this.p.push();
            this.p.noStroke();
            let pointS = Math.min(100, this.style.s * 1.2);
            let pointB = Math.min(100, this.style.b * 1.3);
            this.p.fill(this.style.h, pointS, pointB);

            // Nodos base en espacio local (-0.5 a 0.5)
            // Movemos Z a 0.5 para que estén en la CARA FRONTAL (Bordes/Esquinas)
            // y no en el centro de las caras laterales (Z=0)
            const NODES = get3DNodePositions();

            for (let i of this.points) {
                if (NODES[i]) {
                    let n = NODES[i];
                    this.p.push();
                    this.p.translate(n[0] * this.size, n[1] * this.size, n[2] * this.size);
                    this.p.sphere(this.size * 0.16); // Larger for better visibility
                    this.p.pop();
                }
            }

            this.p.pop();
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
