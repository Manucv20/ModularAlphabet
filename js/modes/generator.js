const generatorSketch = (p) => {
    // ==========================================
    // CONFIGURACIÓN Y VARIABLES GLOBALES
    // ==========================================

    // ==========================================
    // VARIABLES DE ESTADO
    // ==========================================
    let nodePositions; // Almacenará los vectores de posición de los puntos
    let word = "Espero que tengas un buen dia"; // Texto inicial
    let lettersData = []; // Datos calculados de cada letra a dibujar
    let feedbackText = '';
    let feedbackTimer = 0;

    // Variables de diseño (Missing restored)
    let size;
    let spacing;
    let lineHeight;
    let margin = 40;

    // Variables de UI y DOM (Missing restored)
    let canvas;
    let textInput;
    let generateButton;
    let saveButton;

    // Estado del tema (Dynamic via globalAppState)


    // ==========================================
    // HELPERS (Ahora delegados a shared.js)
    // ==========================================

    // getPointsForChar y getBranchStyle se han movido a modes/shared.js
    // para mantener consistencia y limpieza.

    p.setup = function () {
        canvas = p.createCanvas(100, 100);
        canvas.parent('canvas-container'); // Asegurar parent correcto
        updateCanvasSize();
        let isDark = (window.globalAppState && window.globalAppState.isDarkMode !== undefined) ? window.globalAppState.isDarkMode : true;
        p.background(isDark ? p.color(15, 15, 17) : p.color(253, 253, 253));
        setupNodePositions();
        prepareWord(word);

        textInput = p.select('#textInput');
        generateButton = p.select('#generateButton');
        saveButton = p.select('#saveButton');

        // Referencia al Toggle Global
        // Color hints are now controlled by global state (window.globalColorHintsEnabled)
        // No need to select DOM element

        if (generateButton) {
            generateButton.mousePressed(() => {
                const raw = textInput.value();
                word = normalizeForMapping(raw);
                prepareWord(word);
            });
        }
        if (saveButton) {
            saveButton.mousePressed(() => {
                p.saveCanvas('alfabeto_modular', 'png');
                feedbackText = '¡Guardado!';
                feedbackTimer = 60;
            });
        }
    };

    function drawLetter(letter, x, y, size, opacity = 255) {
        p.push();
        p.translate(x, y);

        let padding = 1;
        let dynamicStroke = p.max(size * 0.012, 0.5);

        // Check toggle state (Global)
        let useHints = window.globalAppState ? window.globalAppState.colorHintsEnabled : false;

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
            // Read fresh state
            let isDark = (window.globalAppState && window.globalAppState.isDarkMode !== undefined) ? window.globalAppState.isDarkMode : true;
            strokeColor = isDark ? p.color(50) : p.color(200);
            fillColor = p.color(isDark ? 224 : 51, opacity);
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
        // Reset a RGB siempre al inicio del frame
        p.colorMode(p.RGB);

        // Leer estado global
        let globalDark = (window.globalAppState && window.globalAppState.isDarkMode !== undefined) ? window.globalAppState.isDarkMode : true;

        // Color de fondo dinámico
        p.background(globalDark ? p.color(15, 15, 17) : p.color(230, 233, 239));

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
                    if (globalDark) {
                        p.fill(0);    // Fondo Negro en modo oscuro
                    } else {
                        p.fill(255);  // Fondo Blanco en modo claro
                    }

                    p.noStroke();
                    p.rect(data.x + marginHover, data.y + marginHover, data.size - marginHover * 2, data.size - marginHover * 2, 6);

                    // Letra en texto plano sobre el recuadro
                    if (globalDark) {
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
            p.fill(isDarkMode ? 255 : 0, p.map(feedbackTimer, 0, 60, 0, 255));
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
        // En modo instancia, buscamos el contenedor por ID directamente o usamos el padre del canvas
        const wrapper = document.getElementById('canvas-wrapper');
        if (wrapper) {
            // Obtener dimensiones disponibles en el layout flex
            let w = wrapper.clientWidth;
            let h = wrapper.clientHeight;

            // Calcular el cuadrado más grande que cabe, con un pequeño margen
            let s = p.min(w, h) - 20;

            // Evitar tamaños inválidos
            if (s < 100) s = p.min(p.windowWidth, p.windowHeight) * 0.8;

            p.resizeCanvas(s, s);
        }
    }

    function normalizeForMapping(str) {
        let s = str.toUpperCase();
        // Proteger la Ñ antes de normalizar
        s = s.replace(/Ñ/g, "###NYE###");
        // Normalizar para separar acentos (Á -> A + ´) y eliminarlos
        s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Restaurar la Ñ
        s = s.replace(/###NYE###/g, "Ñ");

        // Limpiar caracteres no soportados (deja letras, Ñ, números y puntuación básica)
        s = s.replace(/[^A-ZÑ0-9\.,\?! \-]/g, " ");
        // Colapsar espacios múltiples
        s = s.replace(/\s+/g, " ").trim();

        return s;
    }


    // ==========================================
    // FUNCIONES DE LÓGICA Y CÁLCULO
    // ==========================================

    function setupNodePositions() {
        nodePositions = [
            p.createVector(0, 1),   // 0: Arriba-Izquierda
            p.createVector(0.5, 1), // 1: Arriba-Centro
            p.createVector(1, 1),   // 2: Arriba-Derecha
            p.createVector(1, 0.5), // 3: Centro-Derecha
            p.createVector(1, 0),   // 4: Abajo-Derecha
            p.createVector(0.5, 0), // 5: Abajo-Centro
            p.createVector(0, 0),   // 6: Abajo-Izquierda
            p.createVector(0, 0.5)  // 7: Centro-Izquierda
        ];
    }

    function prepareWord(word) {
        lettersData = []; // Reiniciar datos

        let words = word.split(' ');
        let lines = [[]];
        let currentLineLength = 0;
        // Reducimos el ancho máximo para forzar saltos de línea y facilitar multi-columnas
        let maxWidth = p.width * 0.45;

        // Algoritmo de ajuste de línea (Word wrapping)
        // Usamos un tamaño base estimado para el cálculo de wrapping antes de saber el tamaño final
        let estimatedSize = 50;

        for (let w of words) {
            let wordLength = w.length;
            // Estima si la palabra cabe en la línea actual
            if ((currentLineLength + wordLength) * (estimatedSize * 1.4) > maxWidth) {
                lines.push([]); // Nueva línea
                currentLineLength = 0;
            }
            // Añadir letras de la palabra a la línea actual
            for (let c of w) {
                lines[lines.length - 1].push(c.toUpperCase());
            }
            // Añadir espacio entre palabras (representado como 'empty')
            lines[lines.length - 1].push('empty');
            currentLineLength += wordLength + 1;
        }

        // Limpieza de espacios vacíos redundantes
        if (lines[lines.length - 1].length > 0 && lines[lines.length - 1][lines[lines.length - 1].length - 1] === 'empty') {
            lines[lines.length - 1].pop();
        }
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].length > 0 && lines[i][0] === 'empty') lines[i].shift();
            if (lines[i].length > 0 && lines[i][lines[i].length - 1] === 'empty') lines[i].pop();
        }
        // Eliminar líneas vacías que puedan haber quedado
        lines = lines.filter(l => l.length > 0);
        if (lines.length === 0) return;


        // ==========================================
        // LÓGICA MULTI-COLUMNA
        // ==========================================
        const MAX_ROWS = 16;
        let columns = [];

        // Dividir las líneas en columnas de máximo 16 filas
        for (let i = 0; i < lines.length; i += MAX_ROWS) {
            columns.push(lines.slice(i, i + MAX_ROWS));
        }

        let numColumns = columns.length;
        let maxLineLength = 0;

        // Calcular la línea más larga de TODAS las columnas
        for (let line of lines) {
            if (line.length > maxLineLength) maxLineLength = line.length;
        }

        // Dimensiones disponibles (usamos p.width)
        let availableWidth = p.width - margin * 2;
        let availableHeight = p.height - margin * 2;

        // Factores de tamaño
        let columnWidthFactor = maxLineLength * 1.4 - 0.4;
        if (maxLineLength === 1) columnWidthFactor = 1;

        let columnGapFactor = 2.0;

        let totalWidthFactor = numColumns * columnWidthFactor + (numColumns - 1) * columnGapFactor;

        let maxRowsInCol = p.min(lines.length, MAX_ROWS);
        let totalHeightFactor = maxRowsInCol * 1.5;

        // Calcular SIZE óptimo
        size = p.min(
            availableWidth / totalWidthFactor,
            availableHeight / totalHeightFactor
        );

        // LIMITAR el tamaño
        size = p.min(size, 120);
        size = p.max(size, 8);

        spacing = size * 0.4;
        lineHeight = size * 1.5;
        let columnGap = size * columnGapFactor;
        let columnWidth = maxLineLength * size + (maxLineLength - 1) * spacing;
        if (maxLineLength === 0) columnWidth = 0;

        let totalGridWidth = numColumns * columnWidth + (numColumns - 1) * columnGap;
        let totalGridHeight = maxRowsInCol * lineHeight;

        let startXGlobal = (p.width - totalGridWidth) / 2;
        let startYGlobal = (p.height - totalGridHeight) / 2;

        for (let c = 0; c < numColumns; c++) {
            let currentColumnLines = columns[c];
            let colX = startXGlobal + c * (columnWidth + columnGap);

            // Centrado Vertical de la Columna individual
            let colPhysicalHeight = currentColumnLines.length * lineHeight;
            let colY = startYGlobal + (totalGridHeight - colPhysicalHeight) / 2;

            for (let line of currentColumnLines) {
                let x = colX;
                for (let char of line) {
                    lettersData.push({ letter: char, x: x, y: colY, size: size, opacity: 0 });
                    x += size + spacing;
                }
                colY += lineHeight;
            }
        }
    }


    // ==========================================
    // FUNCIONES DE DIBUJO Y RENDERIZADO
    // ==========================================


    p.updateColorHints = function (enabled) {
        // Forzar redibujado
        p.loop();
    };

};
