/**
 * main.js - Manejo global de la aplicación, UI, sistema de temas y navegación
 */

// Estado Global - Definido inmediatamente
const AppState = {
    currentMode: 'home',
    isDarkMode: true,
    colorHintsEnabled: false,
    currentP5: null
};

// Exponer INMEDIATAMENTE para que los sketches lo vean al cargar
window.globalAppState = AppState;

// ==========================================
// TEMA (DARK/LIGHT MODE)
// ==========================================

function updateBodyTheme() {
    const btn = document.getElementById('themeButton');

    // Aplicar clase al body
    if (AppState.isDarkMode) {
        document.body.classList.remove('light-mode');
        if (btn) btn.innerHTML = '☀'; // Icono Sol (para cambiar a día)
        if (btn) btn.setAttribute('title', 'Cambiar a Modo Día');
    } else {
        document.body.classList.add('light-mode');
        if (btn) btn.innerHTML = '☾'; // Icono Luna (para cambiar a noche)
        if (btn) btn.setAttribute('title', 'Cambiar a Modo Noche');
    }
}

function toggleGlobalTheme() {
    // Invertir estado
    AppState.isDarkMode = !AppState.isDarkMode;

    // Actualizar UI
    updateBodyTheme();

    console.log(`Theme toggled. Dark Mode: ${AppState.isDarkMode}`);
}

// ==========================================
// COLOR HINTS
// ==========================================

function toggleColorHints() {
    AppState.colorHintsEnabled = !AppState.colorHintsEnabled;
    const btn = document.getElementById('colorHintsButton');

    if (btn) {
        if (AppState.colorHintsEnabled) {
            btn.innerHTML = '🎨';
            btn.style.background = 'var(--accent-color)';
            btn.style.color = 'white';
        } else {
            btn.innerHTML = '⚫';
            btn.style.background = 'none';
            btn.style.color = 'var(--text-color)';
        }
    }

    if (AppState.currentP5 && typeof AppState.currentP5.updateColorHints === 'function') {
        AppState.currentP5.updateColorHints(AppState.colorHintsEnabled);
    }
}

// ==========================================
// LEGEND UI
// ==========================================

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.toggle('collapsed');
    }
}

// ==========================================
// NAVEGACIÓN Y MODOS
// ==========================================

function loadMode(mode) {
    // 1. Limpiar instancia anterior
    if (AppState.currentP5) {
        AppState.currentP5.remove();
        AppState.currentP5 = null;
    }

    // 2. Limpiar contenedor
    const container = document.getElementById('canvas-container');
    if (container) container.innerHTML = '';

    // 3. Cargar nuevo sketch
    let sketchFunction = null;

    if (mode === 'generator' && typeof generatorSketch !== 'undefined') {
        sketchFunction = generatorSketch;
    } else if (mode === 'game' && typeof gameSketch !== 'undefined') {
        sketchFunction = gameSketch;
    } else if (mode === 'home' && typeof homeSketch !== 'undefined') {
        sketchFunction = homeSketch;
    }

    if (sketchFunction) {
        AppState.currentP5 = new p5(sketchFunction, 'canvas-container');
        AppState.currentMode = mode;
        updateUI();
    } else {
        console.error(`Sketch for mode '${mode}' not found.`);
    }
}

function updateUI() {
    // Actualizar tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        if (tab.dataset.mode === AppState.currentMode) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Actualizar contenedores UI
    // Actualizar contenedores UI
    document.querySelectorAll('.mode-ui').forEach(ui => {
        if (ui.dataset.mode === AppState.currentMode) {
            ui.classList.add('active'); // CSS handles display type (flex/block)
        } else {
            ui.classList.remove('active');
        }
    });

    // Visibilidad del botón de hints
    const colorHintsButton = document.getElementById('colorHintsButton');
    if (colorHintsButton) {
        colorHintsButton.style.display = (AppState.currentMode === 'home') ? 'none' : 'flex';
    }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Tema visualmente
    updateBodyTheme();

    // Listeners de navegación
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            if (mode && mode !== AppState.currentMode) {
                loadMode(mode);
            }
        });
    });

    // Cargar Home por defecto
    loadMode('home');
});

// Global Error Handler for p5 or script failures
window.onerror = function (msg, url, line) {
    console.error(`Global Error: ${msg} in ${url}:${line}`);
    // Optional: Show user feedback
};

// Exponer funciones globales
window.toggleGlobalTheme = toggleGlobalTheme;
window.toggleColorHints = toggleColorHints;
window.toggleSection = toggleSection;

// Debug log
console.log('App.js loaded. State initialized.');
