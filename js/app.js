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
    const metaTheme = document.querySelector('meta[name="theme-color"]');

    // Aplicar clase al body
    if (AppState.isDarkMode) {
        document.body.classList.remove('light-mode');
        if (btn) btn.innerHTML = '☀'; // Icono Sol (para cambiar a día)
        if (btn) btn.setAttribute('title', 'Cambiar a Modo Día');
        // Update mobile browser bar color (dark)
        if (metaTheme) metaTheme.setAttribute('content', '#0f0f11');
    } else {
        document.body.classList.add('light-mode');
        if (btn) btn.innerHTML = '☾'; // Icono Luna (para cambiar a noche)
        if (btn) btn.setAttribute('title', 'Cambiar a Modo Noche');
        // Update mobile browser bar color (warm beige)
        if (metaTheme) metaTheme.setAttribute('content', '#ebe8e3');
    }
}

function toggleGlobalTheme() {
    // Invertir estado
    AppState.isDarkMode = !AppState.isDarkMode;

    // Actualizar UI
    updateBodyTheme();

    // CRITICAL: Notify active sketch of theme change
    // Sketches like generator.js cache colors and need to force re-render
    if (AppState.currentP5 && typeof AppState.currentP5.updateColorHints === 'function') {
        AppState.currentP5.updateColorHints(AppState.colorHintsEnabled);
    }
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
    // 1. Cleanup Previous Instance
    // Essential to prevent memory leaks and multiple canvas contexts running simultaneously.
    if (AppState.currentP5) {
        AppState.currentP5.remove();
        AppState.currentP5 = null;
    }

    // 2. Reset Container
    const container = document.getElementById('canvas-container');
    if (container) container.innerHTML = '';

    // 3. Initialize New Sketch
    // Selects the factory function based on mode string.
    let sketchFunction = null;

    if (mode === 'generator' && typeof generatorSketch !== 'undefined') {
        sketchFunction = generatorSketch;
    } else if (mode === 'game' && typeof gameSketch !== 'undefined') {
        sketchFunction = gameSketch;
    } else if (mode === 'home' && typeof homeSketch !== 'undefined') {
        sketchFunction = homeSketch;
    }

    if (sketchFunction) {
        // 1. Update UI STATE FIRST 
        // This ensures DOM elements (like panels) are hidden/shown BEFORE p5 measures canvas size.
        AppState.currentMode = mode;
        updateUI();

        // 2. Create new p5 instance (triggers setup() -> updateCanvasSize())
        AppState.currentP5 = new p5(sketchFunction, 'canvas-container');
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
