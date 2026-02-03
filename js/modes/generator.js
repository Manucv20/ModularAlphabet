const generatorSketch = (p) => {
    // ==========================================
    // STATE VARIABLES
    // ==========================================
    let nodePositions; // Position vectors for modular points
    let word = "Espero que tengas un buen dia"; // Initial text
    let lettersData = []; // Computed data for each letter
    let feedbackText = '';
    let feedbackTimer = 0;

    // DOM elements
    let canvas;
    let textInput;
    let generateButton;
    let saveButton;

    p.setup = function () {
        canvas = p.createCanvas(100, 100);
        canvas.parent('canvas-container'); // Asegurar parent correcto
        updateCanvasSize();
        p.clear(); // Transparente para ver el fondo fixed
        setupNodePositions();
        prepareWord(word);

        textInput = p.select('#textInput');
        generateButton = p.select('#generateButton');
        saveButton = p.select('#saveButton');

        // Referencia al Toggle Global
        // Color hints are now controlled by global state (window.globalColorHintsEnabled)
        // No need to select DOM element

        if (generateButton) {
            // Use native onclick to overwrite potential previous listeners from older instances
            generateButton.elt.onclick = () => {
                const raw = textInput.value();
                word = normalizeForMapping(raw);
                prepareWord(word);
            };
        }
        if (saveButton) {
            saveButton.elt.onclick = () => {
                p.saveCanvas('alfabeto_modular', 'png');
                feedbackText = '¡Guardado!';
                feedbackTimer = 60;
            };
        }
    };

    function drawLetter(letter, x, y, size, opacity = 255) {
        p.push();
        p.translate(x, y);

        let padding = 1;
        let dynamicStroke = p.max(size * 0.012, 0.5);

        // Check toggle state (Global)
        let useHints = getColorHintsEnabled();

        let strokeColor, fillColor;

        if (useHints && letter !== "empty") {
            p.colorMode(p.HSB);
            let style = getBranchStyle(letter);

            strokeColor = p.color(style.h, style.s, style.b);
            let alpha = opacity / 255.0;
            if (alpha > 1) alpha = 1;
            fillColor = p.color(style.h, style.s, style.b, alpha);
        } else {
            p.colorMode(p.RGB);
            let isDark = getIsDarkMode();
            // Slate 400 (#94a3b8) = RGB(148, 163, 184) - Light Mode Stroke
            // Slate 500 (#64748B) = RGB(100, 116, 139) - Light Mode Text (Softer than pure black)
            // Slate 100 (#F1F5F9) = RGB(241, 245, 249) - Dark Mode Text

            strokeColor = isDark ? p.color(60) : p.color(148, 163, 184);

            // Exact CSS Variable Match
            if (isDark) {
                fillColor = p.color(241, 245, 249, opacity); // --text-color
            } else {
                fillColor = p.color(30, 41, 59, opacity); // --text-color (Slate 800) matches CSS
            }
        }

        p.stroke(strokeColor);
        p.strokeWeight(dynamicStroke);
        p.noFill();
        let dynamicRadius = p.constrain(size * 0.1, 4, 16);
        p.rect(padding, padding, size - padding * 2, size - padding * 2, dynamicRadius);

        if (letter !== "empty") {
            p.fill(fillColor);
            p.noStroke();
            let points = getPointsForChar(letter);

            if (points) {
                let rectSize = size - padding * 2;
                for (let idx of points) {
                    let pos = nodePositions[idx];
                    let pointSize = p.max(size * 0.1, 3);
                    let px = padding + pos.x * rectSize;
                    let py = size - (padding + pos.y * rectSize);
                    p.ellipse(px, py, pointSize);
                }
            }
        }
        p.pop();
    }
    // ==========================================
    // DRAW LOOP
    // ==========================================
    /**
     * draw()
     * Bucle principal de renderizado.
     */
    p.draw = function () {
        // Read theme state once per frame for consistency
        let isDark = getIsDarkMode();

        p.colorMode(p.RGB);
        p.clear(); // Transparente para revelar fondo de pantalla completa

        // Dibujar todas las letras
        for (let data of lettersData) {
            // Animación de entrada (fade-in)
            if (data.opacity < 255) {
                data.opacity += 5;
            }
            drawLetter(data.letter, data.x, data.y, data.size, data.opacity);
        }

        // Dibujar interacción hover (cuando el ratón pasa por encima)
        for (let data of lettersData) {
            if (p.mouseX > data.x && p.mouseX < data.x + data.size && p.mouseY > data.y && p.mouseY < data.y + data.size) {
                if (data.letter !== "empty") {
                    let marginHover = data.size * 0.15;

                    // Fondo del hover y texto según tema (High Contrast)
                    if (isDark) {
                        p.fill(0);    // Fondo Negro en modo oscuro
                    } else {
                        p.fill(255);  // Fondo Blanco en modo claro
                    }

                    p.noStroke();
                    p.rect(data.x + marginHover, data.y + marginHover, data.size - marginHover * 2, data.size - marginHover * 2, 6);

                    // Letra en texto plano sobre el recuadro
                    if (isDark) {
                        p.fill(255);  // Texto Blanco en modo oscuro
                    } else {
                        p.fill(0);    // Texto Negro en modo claro
                    }

                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(data.size * 0.4);
                    p.text(data.letter, data.x + data.size / 2, data.y + data.size / 2);
                }
            }
        }

        // Mostrar mensaje de feedback (ej: "Guardado") si el timer está activo
        if (feedbackTimer > 0) {
            p.fill(isDark ? 255 : 0, p.map(feedbackTimer, 0, 60, 0, 255));
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(20);
            p.text(feedbackText, p.width / 2, p.height - 40);
            feedbackTimer--;
        }
    };

    /**
     * windowResized()
     */
    p.windowResized = function () {
        updateCanvasSize();
        prepareWord(word);
    };

    /**
     * updateCanvasSize()
     */
    function updateCanvasSize() {
        const wrapper = document.getElementById('canvas-wrapper');
        if (wrapper) {
            let w = wrapper.clientWidth;
            // Subtract header/footer space if needed, but flex layout usually handles this.
            // Let's take full available height.
            let h = wrapper.clientHeight;

            // Use Full Rect, not Square
            p.resizeCanvas(w, h);
        }
    }

    function prepareWord(word) {
        lettersData = []; // Reiniciar datos

        let words = word.split(' ');
        let lines = [[]];
        let currentLineLength = 0;

        // SQUARE VISUAL LOGIC
        // Instead of filling the screen width, we calculate a target line length
        // that produces a roughly square block of text.

        // 1. Calculate Total Chars (approximation including spaces)
        let totalChars = 0;
        words.forEach(w => totalChars += w.length + 1);

        // 2. Determine ideal characters per line for a 1:1 aspect ratio
        // N_chars ≈ N_lines.  Total = N * N.  => N = Sqrt(Total)
        let targetLineChars = Math.ceil(Math.sqrt(totalChars));

        // Ensure strictly minimum width for very short words
        if (targetLineChars < 4) targetLineChars = 4; // Min width

        // 3. Wrap words based on this "Visual Target"
        for (let w of words) {
            let wordLength = w.length;

            // If current line is already "full enough" (>= target), wrap.
            // OR if adding this word would make it significantly wider than target (heuristic)
            let willExceed = (currentLineLength + wordLength) > targetLineChars;
            let isFirstInLine = (currentLineLength === 0);
            // Soft-Wrap Heuristic:
            // If we are already near the target, start a new line to keep it square if possible.
            // Unless it's the first word, then we must accept it.
            if (willExceed && !isFirstInLine) {
                // Clean up previous line trailing space
                let prevLine = lines[lines.length - 1];
                if (prevLine.length > 0 && prevLine[prevLine.length - 1] === 'empty') {
                    prevLine.pop();
                }

                lines.push([]);
                currentLineLength = 0;
            }

            // Add characters
            for (let c of w) {
                lines[lines.length - 1].push(c.toUpperCase());
            }
            // Add logical space
            lines[lines.length - 1].push('empty');
            currentLineLength += wordLength + 1;
        }

        // Cleanup empty spaces
        if (lines[lines.length - 1].length > 0 && lines[lines.length - 1][lines[lines.length - 1].length - 1] === 'empty') {
            lines[lines.length - 1].pop();
        }
        lines = lines.filter(l => l.length > 0);
        if (lines.length === 0) return;

        // ==========================================
        // LÓGICA MULTI-COLUMNA
        // ==========================================
        const MAX_ROWS = 12; // Start new column sooner to fill horizontal space
        let columns = [];

        for (let i = 0; i < lines.length; i += MAX_ROWS) {
            columns.push(lines.slice(i, i + MAX_ROWS));
        }

        let numColumns = columns.length;
        let maxLineLength = 0;
        for (let line of lines) {
            if (line.length > maxLineLength) maxLineLength = line.length;
        }

        // Reduced Margins = More Space
        let margin = p.min(20, p.width * 0.05);

        let availableWidth = p.width - margin * 2;
        let availableHeight = p.height - margin * 2;

        // Factores de tamaño
        let columnWidthFactor = maxLineLength * 1.4 - 0.4;
        if (maxLineLength === 1) columnWidthFactor = 1;

        let columnGapFactor = 1.0; // Tighter columns

        let totalWidthFactor = numColumns * columnWidthFactor + (numColumns - 1) * columnGapFactor;

        let maxRowsInCol = 0;
        for (let col of columns) if (col.length > maxRowsInCol) maxRowsInCol = col.length;

        let totalHeightFactor = maxRowsInCol * 1.5;

        // Calcular SIZE óptimo (Rectangular fit)
        let size = p.min(
            availableWidth / totalWidthFactor,
            availableHeight / totalHeightFactor
        );

        // Limit size intelligently
        size = p.min(size, 150); // Allow bigger max size
        size = p.max(size, 12);  // Readable min size


        let spacing = size * 0.4;
        let lineHeight = size * 1.5;
        let columnGap = size * columnGapFactor;
        let columnWidth = maxLineLength * size + (maxLineLength - 1) * spacing;
        if (maxLineLength === 0) columnWidth = 0;

        let totalGridWidth = numColumns * columnWidth + (numColumns - 1) * columnGap;
        let totalGridHeight = maxRowsInCol * lineHeight;

        let startXGlobal = (p.width - totalGridWidth) / 2;
        let startYGlobal = (p.height - totalGridHeight) / 2;

        // Vertical optical adjustment
        if (lines.length < 3) startYGlobal -= size * 0.5;

        for (let c = 0; c < numColumns; c++) {
            let currentColumnLines = columns[c];
            let colX = startXGlobal + c * (columnWidth + columnGap);
            let colPhysicalHeight = currentColumnLines.length * lineHeight;
            let colY = startYGlobal + (totalGridHeight - colPhysicalHeight) / 2;

            for (let line of currentColumnLines) {
                let lineX = colX;
                for (let char of line) {
                    lettersData.push({ letter: char, x: lineX, y: colY, size: size, opacity: 0 });
                    lineX += size + spacing;
                }
                colY += lineHeight;
            }
        }
    }

    // ==========================================
    // HELPERS (SKETCH SCOPE)
    // ==========================================

    function normalizeForMapping(str) {
        let s = str.toUpperCase();
        s = s.replace(/Ñ/g, "###NYE###");
        s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        s = s.replace(/###NYE###/g, "Ñ");
        s = s.replace(/[^A-ZÑ0-9\.,\?! \-]/g, " ");
        s = s.replace(/\s+/g, " ").trim();
        return s;
    }

    function setupNodePositions() {
        nodePositions = [
            p.createVector(0, 1),   // 0: TL
            p.createVector(0.5, 1), // 1: TC
            p.createVector(1, 1),   // 2: TR
            p.createVector(1, 0.5), // 3: CR
            p.createVector(1, 0),   // 4: BR
            p.createVector(0.5, 0), // 5: BC
            p.createVector(0, 0),   // 6: BL
            p.createVector(0, 0.5)  // 7: CL
        ];
    }








    p.updateColorHints = function (enabled) {
        // Force complete re-render to update all colors
        prepareWord(word);
    };

};
