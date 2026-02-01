// ==========================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================

// ==========================================
// NUEVO SISTEMA: LETRA -> ÍNDICE -> BINARIO 8 BITS -> PUNTOS
// ==========================================

// Orden de nodos (coincide con nodePositions):
// 0 (TL)  1 (TC)  2 (TR)
// 7 (LC)          3 (RC)
// 6 (BL)  5 (BC)  4 (BR)

function pointsFromNumber(n) {
    // Devuelve los índices de los nodos activos según binario de 8 bits
    // bit 0 -> nodo 0, bit 1 -> nodo 1, ..., bit 7 -> nodo 7
    let pts = [];
    for (let i = 0; i < 8; i++) {
        if ((n >> i) & 1) pts.push(i);
    }
    return pts;
}

function buildLetterMapping() {
    const map = {};

    // A=1 ... Z=26
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < alphabet.length; i++) {
        const letter = alphabet[i];
        const value = i + 1;
        map[letter] = pointsFromNumber(value);
    }

    map["Ñ"] = pointsFromNumber(27);

    // Números 0-9 (28-37)
    const numbers = "0123456789";
    for (let i = 0; i < numbers.length; i++) {
        map[numbers[i]] = pointsFromNumber(28 + i);
    }

    // Puntuación y símbolos básicos (38-42)
    const symbols = ".,?!-";
    for (let i = 0; i < symbols.length; i++) {
        map[symbols[i]] = pointsFromNumber(38 + i);
    }

    return map;
}

let letterMapping = buildLetterMapping();

// Variables de estado y configuración
let nodePositions; // Almacenará los vectores de posición de los puntos
let word = "Espero que tengas un buen dia"; // Texto inicial
let lettersData = []; // Datos calculados de cada letra a dibujar
let feedbackText = '';
let feedbackTimer = 0;

// Variables de diseño
let baseSize = 80;
let size;
let spacing;
let lineHeight;
let margin = 40;

// Variables de UI y DOM
let canvas;
let textInput;
let generateButton;
let saveButton;
let themeButton;

// Estado del tema
let isDarkMode = true; // Por defecto oscuro

// ==========================================
// FUNCIONES PRINCIPALES DE P5.JS
// ==========================================

/**
 * setup()
 * Función de inicialización de p5.js.
 */
function setup() {
    // Inicializar con un tamaño temporal, luego se ajustará
    canvas = createCanvas(100, 100);
    canvas.parent('canvas-container');

    updateCanvasSize(); // Ajustar al tamaño real del contenedor

    // background inicial según tema
    background(isDarkMode ? color(15, 15, 17) : color(253, 253, 253));

    setupNodePositions();
    prepareWord(word);

    // Selección de elementos del DOM
    textInput = select('#textInput');
    generateButton = select('#generateButton');
    saveButton = select('#saveButton');
    themeButton = select('#themeButton');

    // Evento: Generar nueva palabra
    if (generateButton) {
        generateButton.mousePressed(() => {
            const raw = textInput.value();
            word = normalizeForMapping(raw);
            prepareWord(word);
        });
    }

    // Evento: Guardar imagen
    if (saveButton) {
        saveButton.mousePressed(() => {
            saveCanvas('alfabeto_modular', 'png');
            feedbackText = '¡Guardado!';
            feedbackTimer = 60;
        });
    }

    // Evento: Cambiar tema
    if (themeButton) {
        themeButton.mousePressed(toggleTheme);
    }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;

    // Actualizar clase en el body para CSS
    if (isDarkMode) {
        document.body.classList.remove('light-mode');
        themeButton.html('☀'); // Icono de sol para indicar "cambiar a día"
    } else {
        document.body.classList.add('light-mode');
        themeButton.html('☾'); // Icono de luna para indicar "cambiar a noche"
    }

    // Forzar redibujado de fondo inmediato
    // Dark: #0f0f11 (15,15,17) | Light: #fdfdfd (253,253,253)
    background(isDarkMode ? color(15, 15, 17) : color(253, 253, 253));
}

/**
 * draw()
 * Bucle principal de renderizado.
 */
function draw() {
    // Color de fondo dinámico
    background(isDarkMode ? color(15, 15, 17) : color(253, 253, 253));

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
        if (mouseX > data.x && mouseX < data.x + data.size && mouseY > data.y && mouseY < data.y + data.size) {
            if (data.letter !== "empty") {
                let marginHover = data.size * 0.15;

                // Fondo del hover y texto según tema
                if (isDarkMode) {
                    fill(255, 230); // Fondo claro
                } else {
                    fill(0, 230);   // Fondo oscuro
                }

                noStroke();
                rect(data.x + marginHover, data.y + marginHover, data.size - marginHover * 2, data.size - marginHover * 2, 6);

                // Letra en texto plano sobre el recuadro
                if (isDarkMode) {
                    fill(0);   // Texto oscuro
                } else {
                    fill(255); // Texto claro
                }

                textAlign(CENTER, CENTER);
                textSize(data.size * 0.4);
                text(data.letter, data.x + data.size / 2, data.y + data.size / 2);
            }
        }
    }

    // Mostrar mensaje de feedback (ej: "Guardado") si el timer está activo
    if (feedbackTimer > 0) {
        fill(isDarkMode ? 255 : 0, map(feedbackTimer, 0, 60, 0, 255));
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(20);
        text(feedbackText, width / 2, height - 40);
        feedbackTimer--;
    }
}

/**
 * windowResized()
 * Función nativa de p5.js que se llama cuando se redimensiona la ventana.
 * Recalcula el tamaño del lienzo y vuelve a procesar la palabra para ajustar el layout.
 */
function windowResized() {
    updateCanvasSize();
    prepareWord(word);
}

/**
 * updateCanvasSize()
 * Ajusta el tamaño del canvas para que quepa dentro del contenedor CSS (#canvas-wrapper).
 * Mantiene una proporción cuadrada para el diseño del alfabeto.
 */
function updateCanvasSize() {
    const wrapper = select('#canvas-wrapper');
    if (wrapper) {
        // Obtener dimensiones disponibles en el layout flex
        let w = wrapper.elt.clientWidth;
        let h = wrapper.elt.clientHeight;

        // Calcular el cuadrado más grande que cabe, con un pequeño margen
        let s = min(w, h) - 20;

        // Evitar tamaños inválidos o 0 si el layout aún no se ha estabilizado
        if (s < 100) s = min(windowWidth, windowHeight) * 0.8;

        resizeCanvas(s, s);
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

/**
 * setupNodePositions()
 * Inicializa los vectores de posición para los puntos que forman las letras.
 * Define una cuadrícula lógica sobre la celda de la letra.
 * Utiliza coordenadas normalizadas (0 a 1) que luego se escalan.
 * 
 * NOTA: Debido al uso de `size - pos.y * size` en el renderizado,
 * una coordenada Y=1 visualmente es la parte SUPERIOR.
 */
function setupNodePositions() {
    nodePositions = [
        createVector(0, 1),   // 0: Arriba-Izquierda (Top-Left)
        createVector(0.5, 1), // 1: Arriba-Centro (Top-Center)
        createVector(1, 1),   // 2: Arriba-Derecha (Top-Right)
        createVector(1, 0.5), // 3: Centro-Derecha (Mid-Right)
        createVector(1, 0),   // 4: Abajo-Derecha (Bottom-Right)
        createVector(0.5, 0), // 5: Abajo-Centro (Bottom-Center)
        createVector(0, 0),   // 6: Abajo-Izquierda (Bottom-Left)
        createVector(0, 0.5)  // 7: Centro-Izquierda (Mid-Left)
    ];
}

/**
 * prepareWord(word)
 * Calcula el layout de la palabra: divide en líneas, ajusta tamaños y posiciones.
 *
 * @param {string} word - La frase o palabra a procesar.
 */
function prepareWord(word) {
    lettersData = []; // Reiniciar datos

    let words = word.split(' ');
    let lines = [[]];
    let currentLineLength = 0;
    // Reducimos el ancho máximo para forzar saltos de línea y facilitar multi-columnas
    let maxWidth = width * 0.45;

    // Algoritmo de ajuste de línea (Word wrapping)
    for (let w of words) {
        let wordLength = w.length;
        // Estima si la palabra cabe en la línea actual
        if ((currentLineLength + wordLength) * (baseSize * 1.4) > maxWidth) {
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
    const MAX_ROWS = 16; // CORREGIDO: 16 filas máximo
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

    // Dimensiones disponibles
    let availableWidth = width - margin * 2;
    let availableHeight = height - margin * 2;

    // Factores de tamaño
    // Ancho columna
    let columnWidthFactor = maxLineLength * 1.4 - 0.4;
    if (maxLineLength === 1) columnWidthFactor = 1;

    let columnGapFactor = 2.0;

    // Ancho total
    let totalWidthFactor = numColumns * columnWidthFactor + (numColumns - 1) * columnGapFactor;

    // Altura total del bloque más alto posible (16 filas)
    let maxRowsInCol = min(lines.length, MAX_ROWS);
    let totalHeightFactor = maxRowsInCol * 1.5;

    // Calcular SIZE óptimo
    size = min(
        availableWidth / totalWidthFactor,
        availableHeight / totalHeightFactor
    );

    // LIMITAR el tamaño
    size = min(size, 120);
    size = max(size, 8);

    spacing = size * 0.4;
    lineHeight = size * 1.5;
    let columnGap = size * columnGapFactor;
    let columnWidth = maxLineLength * size + (maxLineLength - 1) * spacing;
    if (maxLineLength === 0) columnWidth = 0;

    let totalGridWidth = numColumns * columnWidth + (numColumns - 1) * columnGap;
    // Altura total teórica del bloque completo (usado para centrar el bloque entero)
    let totalGridHeight = maxRowsInCol * lineHeight;

    let startXGlobal = (width - totalGridWidth) / 2;
    let startYGlobal = (height - totalGridHeight) / 2;

    // Generar datos para cada letra
    for (let c = 0; c < numColumns; c++) {
        let currentColumnLines = columns[c];
        let colX = startXGlobal + c * (columnWidth + columnGap);

        // Centrado Vertical de la Columna individual
        let colPhysicalHeight = currentColumnLines.length * lineHeight;
        // Si la columna es más corta que el bloque total, centrarla verticalmente
        let colY = startYGlobal + (totalGridHeight - colPhysicalHeight) / 2;

        for (let line of currentColumnLines) {
            let x = colX;
            // Alineación horizontal: Izquierda (por defecto)
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

/**
 * drawLetter(letter, x, y, size, opacity)
 * Dibuja una letra individual en la posición dada.
 *
 * @param {string} letter - El carácter a dibujar.
 * @param {number} x - Posición X.
 * @param {number} y - Posición Y.
 * @param {number} size - Tamaño de la celda.
 * @param {number} opacity - Opacidad actual (0-255).
 */
function drawLetter(letter, x, y, size, opacity = 255) {
    push();
    translate(x, y);

    let padding = 1;
    let dynamicStroke = max(size * 0.012, 0.5);

    // Color del trazo (marco)
    // Dark: Border color subtle (#444 approx) | Light: Border color subtle (#ccc approx)
    stroke(isDarkMode ? 50 : 200);
    strokeWeight(dynamicStroke);
    noFill();

    // Dibujar el marco de la letra (caja)
    let dynamicRadius = constrain(size * 0.1, 4, 16);
    rect(padding, padding, size - padding * 2, size - padding * 2, dynamicRadius);

    // Dibujar los puntos que forman la letra
    if (letter !== "empty") {
        // Color del punto
        // Dark: #e0e0e0 (224) | Light: #333333 (51)
        fill(isDarkMode ? 224 : 51, opacity);
        noStroke();
        let points = letterMapping[letter];
        if (points) {
            // Ajustar posición para que coincida con el borde visual del rectángulo
            // El rectángulo se dibuja en (padding, padding) con ancho (size - padding*2)
            // Queremos que los puntos estén centrados en ese trazo
            let rectSize = size - padding * 2;

            for (let idx of points) {
                let pos = nodePositions[idx];
                let pointSize = max(size * 0.1, 3);

                // Mapear posición (0..1) al borde del rectángulo
                let px = padding + pos.x * rectSize;
                // Invertir Y (mismo criterio anterior: 1 es arriba -> Y pequeño)
                let py = size - (padding + pos.y * rectSize);

                ellipse(px, py, pointSize);
            }
        }
    }
    pop();
}
