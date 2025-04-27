// Boceto en p5.js: Sistema Modular de Letras Mejorado (con corrección de bordes vacíos)

let letterMapping = {
    'A': [0, 1, 2], 'B': [1, 3, 5], 'C': [0, 6], 'D': [2, 3, 5], 'E': [0, 1, 5],
    'F': [0, 1, 7], 'G': [0, 5, 6], 'H': [1, 3, 7], 'I': [1, 5], 'J': [2, 4, 5],
    'K': [0, 2, 7], 'L': [6, 5], 'M': [0, 2, 7], 'N': [0, 2, 6], 'Ñ': [0, 2, 6],
    'O': [0, 2, 4, 6], 'P': [0, 1, 3], 'Q': [0, 2, 4], 'R': [0, 1, 3, 5],
    'S': [0, 1, 5], 'T': [1, 5, 7], 'U': [0, 4, 6], 'V': [0, 5, 2], 'W': [0, 4, 2],
    'X': [0, 2, 5], 'Y': [1, 3, 5], 'Z': [0, 2, 5]
};

let nodePositions;
let word = "EJERCICIO DE ALFABETO MODULAR";
let baseSize = 80;
let size;
let spacing;
let saveButton;
let feedbackText = '';
let feedbackTimer = 0;
let lettersData = [];
let margin = 40;
let lineHeight;
let canvas;

function setup() {
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.style('pointer-events', 'none');
    canvas.style('z-index', '-1');
    background(255);
    setupNodePositions();
    prepareWord(word);

    textInput = createInput('HOLA MUNDO MODULAR');
    textInput.style('position', 'fixed');
    textInput.style('top', '20px');
    textInput.style('right', '180px');
    textInput.style('padding', '8px 14px');
    textInput.style('font-family', 'Inter, sans-serif');
    textInput.style('font-size', '14px');
    textInput.style('border', '1px solid #ccc');
    textInput.style('border-radius', '8px');
    textInput.style('min-width', '200px');
    textInput.style('z-index', '100');

    generateButton = createButton('Generar');
    generateButton.style('position', 'fixed');
    generateButton.style('top', '20px');
    generateButton.style('right', '20px');
    generateButton.style('padding', '8px 14px');
    generateButton.style('background-color', '#0ff');
    generateButton.style('color', '#111');
    generateButton.style('font-family', 'Inter, sans-serif');
    generateButton.style('font-size', '14px');
    generateButton.style('border', 'none');
    generateButton.style('border-radius', '8px');
    generateButton.style('cursor', 'pointer');
    generateButton.style('box-shadow', '0 2px 6px rgba(0,0,0,0.1)');
    generateButton.style('z-index', '100');
    generateButton.mousePressed(() => {
        word = textInput.value().toUpperCase();
        prepareWord(word);
    });

    saveButton = createButton('Descargar Imagen');
    saveButton.style('position', 'fixed');
    saveButton.style('top', '20px');
    saveButton.style('left', '20px');
    saveButton.style('padding', '8px 14px');
    saveButton.style('background-color', '#ffffff');
    saveButton.style('color', '#333');
    saveButton.style('border', '1px solid #ccc');
    saveButton.style('border-radius', '8px');
    saveButton.style('cursor', 'pointer');
    saveButton.style('box-shadow', '0 2px 6px rgba(0, 0, 0, 0.1)');
    saveButton.style('font-family', 'Inter, sans-serif');
    saveButton.style('font-size', '14px');
    saveButton.style('min-width', '140px');
    saveButton.style('min-height', '42px');
    saveButton.style('display', 'flex');
    saveButton.style('align-items', 'center');
    saveButton.style('justify-content', 'center');
    saveButton.style('z-index', '100');
    saveButton.mousePressed(() => {
        saveCanvas('alfabeto_modular', 'png');
        feedbackText = '¡Guardado!';
        feedbackTimer = 60;
    });
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    prepareWord(word);
}

function setupNodePositions() {
    nodePositions = [
        createVector(0, 1), createVector(0.5, 1), createVector(1, 1), createVector(1, 0.5),
        createVector(1, 0), createVector(0.5, 0), createVector(0, 0), createVector(0, 0.5)
    ];
}

function prepareWord(word) {
    lettersData = [];

    let words = word.split(' ');
    let lines = [[]];
    let currentLineLength = 0;
    let maxWidth = width * 0.8;

    for (let w of words) {
        let wordLength = w.length;
        if ((currentLineLength + wordLength) * (baseSize * 1.4) > maxWidth) {
            lines.push([]);
            currentLineLength = 0;
        }
        for (let c of w) {
            lines[lines.length - 1].push(c.toUpperCase());
        }
        lines[lines.length - 1].push('empty');
        currentLineLength += wordLength + 1;
    }

    if (lines[lines.length - 1][lines[lines.length - 1].length - 1] === 'empty') {
        lines[lines.length - 1].pop();
    }

    // Eliminar 'empty' al inicio o al final de líneas
    for (let i = 0; i < lines.length; i++) {
        if (lines[i][0] === 'empty') lines[i].shift();
        if (lines[i][lines[i].length - 1] === 'empty') lines[i].pop();
    }

    let maxLineLength = max(lines.map(l => l.length));

    let availableWidth = width - margin * 2;
    let availableHeight = height - margin * 2;

    size = min(
        availableWidth / (maxLineLength + (maxLineLength - 1) * 0.4),
        availableHeight / (lines.length + (lines.length - 1) * 0.5)
    );

    spacing = size * 0.4;
    lineHeight = size * 1.5;

    let gridWidth = maxLineLength * size + (maxLineLength - 1) * spacing;
    let gridHeight = lines.length * lineHeight;

    let startX = (width - gridWidth) / 2;
    let startY = (height - gridHeight) / 2;

    let y = startY;

    for (let line of lines) {
        let x = startX;
        for (let c of line) {
            lettersData.push({ letter: c, x: x, y: y, size: size, opacity: 0 });
            x += size + spacing;
        }
        y += lineHeight;
    }
}

function drawLetter(letter, x, y, size, opacity = 255) {
    push();
    translate(x, y);
    stroke(180);
    strokeWeight(1);
    noFill();
    let padding = 1; // margen interno pequeño
    rect(padding, padding, size - padding * 2, size - padding * 2, 8);


    if (letter !== "empty") {
        fill(0, opacity);
        noStroke();
        let points = letterMapping[letter];
        if (points) {
            for (let idx of points) {
                let pos = nodePositions[idx];
                ellipse(pos.x * size, size - pos.y * size, size * 0.1);
            }
        }
    }
    pop();
}

function draw() {
    background(255);

    for (let data of lettersData) {
        if (data.opacity < 255) {
            data.opacity += 5;
        }
        drawLetter(data.letter, data.x, data.y, data.size, data.opacity);
    }

    for (let data of lettersData) {
        if (mouseX > data.x && mouseX < data.x + data.size && mouseY > data.y && mouseY < data.y + data.size) {
            if (data.letter !== "empty") {
                let marginHover = data.size * 0.15;
                fill(0, 230);
                noStroke();
                rect(data.x + marginHover, data.y + marginHover, data.size - marginHover * 2, data.size - marginHover * 2, 6);
                fill(255);
                textAlign(CENTER, CENTER);
                textSize(data.size * 0.4);
                text(data.letter, data.x + data.size / 2, data.y + data.size / 2);
            }
        }
    }

    if (feedbackTimer > 0) {
        fill(0, map(feedbackTimer, 0, 60, 0, 255));
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(20);
        text(feedbackText, width / 2, height - 40);
        feedbackTimer--;
    }
}