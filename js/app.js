/**
 * app.js - Global App logic: UI, Themes, and Mode Navigation.
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
        if (metaTheme) metaTheme.setAttribute('content', '#0B0C15');
    } else {
        document.body.classList.add('light-mode');
        if (btn) btn.innerHTML = '☾'; // Icono Luna (para cambiar a noche)
        if (btn) btn.setAttribute('title', 'Cambiar a Modo Noche');
        // Update mobile browser bar color (Clean Slate White)
        if (metaTheme) metaTheme.setAttribute('content', '#F8FAFC');
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
    const btns = document.querySelectorAll('.color-toggle-btn');

    btns.forEach(btn => {
        if (AppState.colorHintsEnabled) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (AppState.currentP5 && typeof AppState.currentP5.updateColorHints === 'function') {
        AppState.currentP5.updateColorHints(AppState.colorHintsEnabled);
    }
}

// ==========================================
// LEGEND UI
// ==========================================

function toggleGuide() {
    const content = document.getElementById('guide-content');

    if (content) {
        content.classList.toggle('collapsed');
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

    // Update body class for mode-specific styling (like button positioning)
    document.body.classList.remove('mode-home', 'mode-generator', 'mode-game');
    document.body.classList.add(`mode-${AppState.currentMode}`);

    // RELOCATE THEME BUTTON
    const themeBtn = document.getElementById('themeButton');
    if (themeBtn) {
        if (AppState.currentMode === 'home') {
            // Very small button in footer for clean look
            const footer = document.querySelector('footer');
            if (footer) {
                footer.appendChild(themeBtn);
                themeBtn.classList.remove('floating-btn');
            }
        } else if (AppState.currentMode === 'generator') {
            // Inside control bar util group
            const utilGroup = document.getElementById('gen-util-group');
            if (utilGroup) {
                utilGroup.appendChild(themeBtn);
                themeBtn.classList.remove('floating-btn');
            }
        } else if (AppState.currentMode === 'game') {
            // Inside game HUD, opposite to color button
            const targetWrapper = document.querySelector('.target-wrapper');
            if (targetWrapper) {
                // Insert at the beginning (opposite to color button which is at the end)
                targetWrapper.insertBefore(themeBtn, targetWrapper.firstChild);
                themeBtn.classList.remove('floating-btn');

                // Remove ghost spacer if it exists to let theme button take its place
                const spacer = targetWrapper.querySelector('.ghost-spacer');
                if (spacer) spacer.style.display = 'none';
            }
        }
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
window.toggleGuide = toggleGuide;
