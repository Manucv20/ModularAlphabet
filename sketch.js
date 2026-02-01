// ==========================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================

// Mapeo de letras a índices de nodos (retícula de 8 puntos del borde)
// 6 (TL)  5 (TC)  4 (TR)
// 7 (LC)          3 (RC)
// 0 (BL)  1 (BC)  2 (BR)
let letterMapping = {
    'A': [0, 6, 5, 4, 2, 7, 3],   // A: Sides + Top
    'B': [0, 6, 5, 3, 1, 7],      // B: Left + Right bumps
    'C': [6, 7, 0, 1, 5],         // C: Left + Top/Bot Centers
    'D': [0, 6, 5, 3, 1],         // D: Left + Right Curve
    'E': [6, 7, 0, 5, 1],         // E: Left Col + Top/Bot Centers
    'F': [6, 7, 0, 5],            // F: Left Col + Top Center
    'G': [6, 7, 0, 1, 3, 5],      // G: C shape + inward hook
    'H': [0, 6, 2, 4, 7, 3],      // H: Sides + Mid connectors
    'I': [1, 5],                  // I: Vertical Center
    'J': [0, 1, 2, 4],            // J: Hook
    'K': [0, 6, 7, 3, 4, 2],      // K: Left + Chevron right?
    'L': [6, 0, 1],               // L: Left + Bottom
    'M': [0, 6, 5, 4, 2],         // M: Arch
    'N': [0, 6, 4, 2],            // N: Corners
    'Ñ': [0, 6, 4, 2, 5],         // Ñ: Corners + Top
    'O': [0, 6, 5, 4, 2, 1, 7, 3], // O: Full Box
    'P': [0, 6, 5, 3, 7],         // P: P shape
    'Q': [0, 6, 5, 4, 2, 1, 7, 3], // Q: Full Box (same as O? maybe add distinct dot?)
    'R': [0, 6, 5, 3, 7, 2],      // R: P + Leg
    'S': [4, 5, 7, 2, 1],         // S: Zig-Zag (TR, TC, LC, BR, BC)
    'T': [6, 5, 4, 1],            // T: Top Bar + Bot Center
    'U': [0, 6, 2, 4, 1],         // U: Sides + Bot Center
    'V': [6, 4, 1],               // V: Top corners + Bot Center
    'W': [6, 0, 1, 2, 4],         // W: Inverted Arch
    'X': [0, 4, 6, 2],            // X: Corners
    'Y': [6, 4, 1, 5],            // Y: Top corners + Center stalk
    'Z': [6, 4, 3, 7, 0, 2]       // Z: Top/Bot corners + Mid cross
};

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


// ==========================================
// FUNCIONES PRINCIPALES DE P5.JS
// ==========================================

/**
 * setup()
 * Función de inicialización de p5.js.
 * Configura el lienzo, inicializa posiciones, procesa la palabra inicial
 * y configura los eventos de los elementos del DOM (botones e input).
 */
function setup() {
    // Calcular tamaño del canvas según el dispositivo
    let aspectRatio = windowWidth / windowHeight;
    let canvasSize;

    if (aspectRatio > 1.2) {
        // Pantalla ancha (ordenador)
        canvasSize = min(windowWidth * 0.92, windowHeight * 0.85);
    } else {
        // Pantalla estrecha (móvil, tablet)
        canvasSize = min(windowWidth * 0.9, windowHeight * 0.7);
    }

    canvas = createCanvas(canvasSize, canvasSize);
    canvas.parent('canvas-container');

    background(255);
    setupNodePositions();
    prepareWord(word);

    // Selección de elementos del DOM (asumiendo que existen en el HTML)
    textInput = select('#textInput');
    generateButton = select('#generateButton');
    saveButton = select('#saveButton');

    // Evento: Generar nueva palabra
    if (generateButton) {
        generateButton.mousePressed(() => {
            word = textInput.value().toUpperCase();
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
}

/**
 * draw()
 * Bucle principal de renderizado.
 * Se ejecuta continuamente (por defecto a 60 fps).
 * Dibuja las letras, maneja las animaciones de opacidad y el hover del ratón.
 */
function draw() {
    background(255);

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
                // Fondo oscuro semitransparente
                fill(0, 230);
                noStroke();
                rect(data.x + marginHover, data.y + marginHover, data.size - marginHover * 2, data.size - marginHover * 2, 6);

                // Letra en texto plano sobre el recuadro
                fill(255);
                textAlign(CENTER, CENTER);
                textSize(data.size * 0.4);
                text(data.letter, data.x + data.size / 2, data.y + data.size / 2);
            }
        }
    }

    // Mostrar mensaje de feedback (ej: "Guardado") si el timer está activo
    if (feedbackTimer > 0) {
        fill(0, map(feedbackTimer, 0, 60, 0, 255));
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
    let aspectRatio = windowWidth / windowHeight;
    let canvasSize;

    if (aspectRatio > 1.2) {
        canvasSize = min(windowWidth * 0.92, windowHeight * 0.85);
    } else {
        canvasSize = min(windowWidth * 0.9, windowHeight * 0.7);
    }

    resizeCanvas(canvasSize, canvasSize);
    prepareWord(word);
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
    let maxWidth = width * 0.8; // Ancho máximo del texto

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

    // Limpieza de espacios vacíos redundantes al final de la última línea
    if (lines[lines.length - 1][lines[lines.length - 1].length - 1] === 'empty') {
        lines[lines.length - 1].pop();
    }

    // Eliminar 'empty' al inicio o al final de todas las líneas para limpiar bordes
    for (let i = 0; i < lines.length; i++) {
        if (lines[i][0] === 'empty') lines[i].shift();
        if (lines[i][lines[i].length - 1] === 'empty') lines[i].pop();
    }

    // Calcular dimensiones finales basadas en la línea más larga
    let maxLineLength = max(lines.map(l => l.length));

    let availableWidth = width - margin * 2;
    let availableHeight = height - margin * 2;

    // Calcular tamaño dinámico de la letra para que quepa en pantalla
    size = min(
        availableWidth / (maxLineLength + (maxLineLength - 1) * 0.4),
        availableHeight / (lines.length + (lines.length - 1) * 0.5)
    );

    spacing = size * 0.4;
    lineHeight = size * 1.5;

    // Calcular dimensiones totales del bloque de texto para centrarlo
    let gridWidth = maxLineLength * size + (maxLineLength - 1) * spacing;
    let gridHeight = lines.length * lineHeight;

    let startX = (width - gridWidth) / 2;
    let startY = (height - gridHeight) / 2;

    let y = startY;

    // Generar los objetos de datos para cada letra (posición, tamaño, opacidad inicial)
    for (let line of lines) {
        let x = startX;
        for (let c of line) {
            lettersData.push({ letter: c, x: x, y: y, size: size, opacity: 0 });
            x += size + spacing;
        }
        y += lineHeight;
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
    stroke(180);
    strokeWeight(dynamicStroke);
    noFill();

    // Dibujar el marco de la letra (caja)
    let dynamicRadius = constrain(size * 0.1, 4, 16);
    rect(padding, padding, size - padding * 2, size - padding * 2, dynamicRadius);

    // Dibujar los puntos que forman la letra
    if (letter !== "empty") {
        fill(0, opacity);
        noStroke();
        let points = letterMapping[letter];
        if (points) {
            for (let idx of points) {
                let pos = nodePositions[idx];
                let pointSize = max(size * 0.1, 3);
                // Dibujar punto (nota: coordenada Y invertida visualmente porque SVG/Canvas Y crece hacia abajo)
                // Se ajusta para que coincida con el diseño visual esperado
                ellipse(pos.x * size, size - pos.y * size, pointSize);
            }
        }
    }
    pop();
}
