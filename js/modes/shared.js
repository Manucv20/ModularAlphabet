/**
 * MODULAR ALPHABET - SHARED LOGIC
 * Centralized logic for Colors, Geometry, and Math.
 * Used by: home.js, game.js, generator.js
 */

/* =========================================
   0. UTILITY HELPERS (DRY - Don't Repeat Yourself)
   ========================================= */

/**
 * Safe accessor for global dark mode state.
 * @returns {boolean} - True if dark mode is active, defaults to true if undefined.
 */
function getIsDarkMode() {
    return (window.globalAppState && window.globalAppState.isDarkMode !== undefined)
        ? window.globalAppState.isDarkMode
        : true;
}

/**
 * Safe accessor for global color hints state.
 * @returns {boolean} - True if color hints are enabled.
 */
function getColorHintsEnabled() {
    return window.globalAppState ? window.globalAppState.colorHintsEnabled : false;
}

/* =========================================
   1. COLOR PALETTE (Modern Vibrance)
   ========================================= */

/**
 * Returns the HSB color object for a given character based on its "Branch" (Group).
 * The alphabet is divided into 7 branches, each with a specific Hue range.
 * @param {string} char - The character to style.
 * @returns {object} { h, s, b } - HSB values (p5 standard: 360, 100, 100).
 */
const BRANCH_GROUPS = [
    // A-F: Deep Rose -> Coral (Warm & Energetic)
    { chars: "ABCDEF", label: "A-F", hStart: 350, hEnd: 15, s: 95, b: 100 },

    // G-L: Warm Gold -> Amber (Rich & Bright)
    { chars: "GHIJKL", label: "G-L", hStart: 40, hEnd: 55, s: 100, b: 100 },

    // M-R: Spring Green -> Teal (Fresh & Natural)
    { chars: "MNOPQR", label: "M-R", hStart: 150, hEnd: 175, s: 90, b: 100 },

    // S-X: Sky Blue -> Deep Azure (Start of Cool Tones)
    { chars: "STUVWX", label: "S-X", hStart: 200, hEnd: 230, s: 95, b: 100 },

    // Y-Ñ: Indigo -> Electric Violet (Mysterious & Magic)
    { chars: "YZÑ", label: "Y-Ñ", hStart: 260, hEnd: 290, s: 90, b: 100 },

    // NUMBERS: Hot Pink -> Magenta (Vibrant & Playful)
    { chars: "0123456789", label: "0-9", hStart: 310, hEnd: 330, s: 90, b: 100 },

    // SYMBOLS: Neutral Gray/Blue (Low Saturation)
    { chars: ".,?!- ", label: "Signos", hStart: 195, hEnd: 195, s: 0, b: 90 }
];

function getBranchStyle(char) {
    for (let g of BRANCH_GROUPS) {
        let idx = g.chars.indexOf(char);
        if (idx !== -1) {
            let count = g.chars.length;

            // Hue Interpolation: Distribute colors evenly within the group's range.
            // Handles circular wrapping for Red (350->15).
            let hSpan = g.hEnd - g.hStart;
            if (g.hStart > g.hEnd) hSpan = (g.hEnd + 360) - g.hStart;

            let stepH = (count > 1) ? hSpan / (count - 1) : 0;
            let h = (g.hStart + (stepH * idx)) % 360;

            return { h: h, s: g.s, b: g.b };
        }
    }
    // Fallback for undefined characters
    return { h: 0, s: 0, b: 100 };
}

/* =========================================
   2. GEOMETRY (Point Mapping)
   ========================================= */

/**
 * Decodes a character into its 8-point visual representation.
 * Each character maps to a specific subset of the 8 vertices of a cube.
 * @returns {number[]} Array of indices (0-7) representing active points.
 */
function getPointsForChar(char) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let val = 0;

    // Determine numerical index for bitmask logic
    if (alphabet.includes(char)) val = alphabet.indexOf(char) + 1;
    else if (char === 'Ñ') val = 27;
    else if ("0123456789".includes(char)) val = 28 + "0123456789".indexOf(char);
    else if (".,?!-".includes(char)) val = 38 + ".,?!-".indexOf(char);

    // Convert integer value to array of bits (0-7)
    // Checks if the i-th bit is active in 'val'
    let pts = [];
    for (let i = 0; i < 8; i++) {
        if ((val >> i) & 1) pts.push(i);
    }
    return pts;
}

/* =========================================
   3. MATH & 3D HELPERS
   ========================================= */

/**
 * Projects a 3D world position to 2D screen coordinates manually.
 * Necessary because modelViewMatrix interaction in p5.js can be tricky with screenX/Y helpers.
 * @param {p5} pInst - The p5 instance.
 * @param {number|p5.Vector} x - X coordinate or Vector.
 * @param {number} y - Y coordinate.
 * @param {number} z - Z coordinate.
 * @returns {p5.Vector} 2D Vector (x, y) relative to canvas center.
 */
function screenPosition(pInst, x, y, z) {
    if (x instanceof p5.Vector) { z = x.z; y = x.y; x = x.x; }

    let renderer = pInst._renderer;
    let v = pInst.createVector(x, y, z);

    // Get Current Matrices
    let mv = renderer.uMVMatrix.copy();
    let pMat = renderer.uPMatrix.copy();

    // Transform World -> View -> Clip
    let vView = transformMat4(v, mv);
    let vClip = transformMat4(vView, pMat);

    // Perspective Division (Normalize to NDC)
    if (vClip.w !== 0) {
        vClip.x /= vClip.w;
        vClip.y /= vClip.w;
    }

    // Map NDC to Screen, adjusted for p5's center origin
    let sX = (vClip.x * pInst.width / 2);
    let sY = -(vClip.y * pInst.height / 2);

    return pInst.createVector(sX, sY, 0);
}

// =========================================
// 4. SHARED CONSTANTS & HELPERS
// =========================================

/**
 * Returns the standard 8-point node positions for a 3D Modulith.
 * Coordinates are normalized (-0.5 to 0.5) to fit within a unit box.
 */
function get3DNodePositions() {
    // Z is 0.5 to place points on the FRONT face of the cube
    return [
        [-0.5, -0.5, 0.5], [0, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0, 0.5],
        [0.5, 0.5, 0.5], [0, 0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0, 0.5]
    ];
}

/**
 * Helper to convert p5 HSB to CSS HSL string for DOM elements.
 * Maps p5 Brightness (0-100) to CSS Lightness (0-50%) for vivid colors.
 */
function hsbToCss(h, s, b) {
    let cssL = b / 2;
    return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(cssL)}%)`;
}

// Matrix Multiplication Helper for screenPosition
function transformMat4(v, m) {
    let x = v.x, y = v.y, z = v.z, w = 1;
    let mat = m.mat4;
    return {
        x: mat[0] * x + mat[4] * y + mat[8] * z + mat[12] * w,
        y: mat[1] * x + mat[5] * y + mat[9] * z + mat[13] * w,
        z: mat[2] * x + mat[6] * y + mat[10] * z + mat[14] * w,
        w: mat[3] * x + mat[7] * y + mat[11] * z + mat[15] * w
    };
}

/* =========================================
   5. CAMERA CONTROLS (Orbit + Pinch)
   ========================================= */

/**
 * Creates a shared orbit-style camera controller.
 * Preserves existing behavior: 1-finger/drag rotate, 2-finger pinch zoom,
 * mouse wheel zoom (locked while rotating), and smooth camera damping.
 * @param {p5} p - The p5 instance.
 * @param {object} options - Config overrides.
 * @returns {object} controller with attach() and updateCamera().
 */
function createOrbitController(p, options = {}) {
    const state = {
        angleX: options.angleX ?? 0,
        angleY: options.angleY ?? 0,
        targetZ: options.startZ ?? 400,
        minZ: options.minZ ?? 1,
        maxZ: options.maxZ ?? 1200,
        rotationSpeed: options.rotationSpeed ?? 0.005,
        zoomSpeed: options.zoomSpeed ?? 0.5,
        pinchZoomSpeed: options.pinchZoomSpeed ?? 2,
        pinchThreshold: options.pinchThreshold ?? 15,
        damping: options.damping ?? 0.1,
        allowZoomWhileDragging: options.allowZoomWhileDragging ?? false,
        lastDist: 0,
        pinchStarted: false,
        prevTouchX: undefined,
        prevTouchY: undefined
    };

    function clampTargetZ() {
        state.targetZ = p.constrain(state.targetZ, state.minZ, state.maxZ);
    }

    function attach(canvas) {
        if (!canvas) return;

        canvas.touchStarted(() => {
            if (p.touches.length === 2) {
                state.lastDist = p.dist(
                    p.touches[0].x, p.touches[0].y,
                    p.touches[1].x, p.touches[1].y
                );
                state.pinchStarted = false;
                return false; // Prevent default
            }
        });

        canvas.touchMoved(() => {
            if (p.touches.length === 2) {
                let currentDist = p.dist(
                    p.touches[0].x, p.touches[0].y,
                    p.touches[1].x, p.touches[1].y
                );

                if (!state.pinchStarted) {
                    if (Math.abs(currentDist - state.lastDist) > state.pinchThreshold) {
                        state.pinchStarted = true;
                        state.lastDist = currentDist; // Reset to prevent zoom jump
                    }
                }

                if (state.pinchStarted) {
                    let delta = state.lastDist - currentDist;
                    state.targetZ += delta * state.pinchZoomSpeed;
                    clampTargetZ();
                    state.lastDist = currentDist;
                }
                return false; // Prevent default
            }
        });

        p.mouseWheel = function (event) {
            if (!state.allowZoomWhileDragging && p.mouseIsPressed) return false;
            state.targetZ += event.delta * state.zoomSpeed;
            clampTargetZ();
            return false;
        };
    }

    function updateRotationFromInput() {
        // Mouse drag rotation (Desktop)
        if (p.mouseIsPressed && p.touches.length === 0) {
            let dx = p.mouseX - p.pmouseX;
            let dy = p.mouseY - p.pmouseY;
            state.angleY += dx * state.rotationSpeed;
            state.angleX -= dy * state.rotationSpeed;
        }

        // Single touch drag rotation (Mobile)
        if (p.touches.length === 1) {
            let touch = p.touches[0];
            if (typeof state.prevTouchX !== 'undefined') {
                let dx = touch.x - state.prevTouchX;
                let dy = touch.y - state.prevTouchY;
                state.angleY += dx * state.rotationSpeed;
                state.angleX -= dy * state.rotationSpeed;
            }
            state.prevTouchX = touch.x;
            state.prevTouchY = touch.y;
        } else {
            state.prevTouchX = undefined;
            state.prevTouchY = undefined;
        }

        state.angleX = p.constrain(state.angleX, -p.PI / 2, p.PI / 2);
    }

    function updateCamera(cam) {
        updateRotationFromInput();

        let radius = state.targetZ;
        let x = radius * p.sin(state.angleY) * p.cos(state.angleX);
        let y = radius * p.sin(state.angleX);
        let z = radius * p.cos(state.angleY) * p.cos(state.angleX);

        if (cam) {
            let currentPos = p.createVector(cam.eyeX, cam.eyeY, cam.eyeZ);
            let targetPos = p.createVector(x, y, z);
            let smoothPos = p5.Vector.lerp(currentPos, targetPos, state.damping);

            cam.setPosition(smoothPos.x, smoothPos.y, smoothPos.z);
            cam.lookAt(0, 0, 0);
        }
    }

    return {
        state,
        attach,
        updateCamera,
        setTargetZ: (val) => { state.targetZ = val; clampTargetZ(); },
        setAngles: (ax, ay) => { state.angleX = ax; state.angleY = ay; }
    };
}

