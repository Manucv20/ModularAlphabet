/**
 * MODULAR ALPHABET - SHARED LOGIC
 * Centralized logic for Colors, Geometry, and Math.
 */

/* =========================================
   1. COLOR PALETTE (Modern Vibrance)
   ========================================= */
function getBranchStyle(char) {
    const groups = [
        // NUMBERS: Hot Pink -> Magenta (Vibrant & Playful)
        { chars: "0123456789", hStart: 310, hEnd: 330, s: 80, b: 100 },

        // A-F: Deep Rose -> Coral (Warm & Energetic)
        { chars: "ABCDEF", hStart: 350, hEnd: 15, s: 90, b: 100 },

        // G-L: Warm Gold -> Amber (Rich & Bright)
        { chars: "GHIJKL", hStart: 40, hEnd: 55, s: 100, b: 100 },

        // M-R: Spring Green -> Teal (Fresh & Natural)
        { chars: "MNOPQR", hStart: 150, hEnd: 175, s: 85, b: 100 },

        // S-X: Sky Blue -> Deep Azure (Calm & Deep)
        { chars: "STUVWX", hStart: 200, hEnd: 230, s: 90, b: 100 },

        // Y-Ñ: Indigo -> Electric Violet (Mysterious & Magic)
        { chars: "YZÑ", hStart: 260, hEnd: 290, s: 85, b: 100 },

        // SYMBOLS: Neutral Gray/Blue
        { chars: ".,?!- ", hStart: 195, hEnd: 195, s: 0, b: 80 }
    ];

    for (let g of groups) {
        let idx = g.chars.indexOf(char);
        if (idx !== -1) {
            let count = g.chars.length;

            // Hue Interpolation (Gradient within the group)
            // Handles wrapping for Red (350->15) if needed, but direct linear works for small ranges
            let hSpan = g.hEnd - g.hStart;
            // Correction for wrapping 350->15: 15 is actually 375 in continuous space
            if (g.hStart > g.hEnd) hSpan = (g.hEnd + 360) - g.hStart;

            let stepH = (count > 1) ? hSpan / (count - 1) : 0;
            let h = (g.hStart + (stepH * idx)) % 360;

            // Saturation & Brightness
            // Slight boost for later items to keep them distinct? 
            // Or Keep plain for harmony. Protocol says "Vivid Colors".
            // Let's keep S and B constant as per latest request for "Prettier" colors, 
            // relying on Hue Shift for distinction unless it's a very long group.

            return { h: h, s: g.s, b: g.b };
        }
    }
    // Fallback
    return { h: 0, s: 0, b: 100 };
}

/* =========================================
   2. GEOMETRY (Point Mapping)
   ========================================= */
// Generates point indices (0-7) for a given character based on bitmask or mapping
function getPointsForChar(char) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let val = 0;

    // Mapping logic
    if (alphabet.includes(char)) val = alphabet.indexOf(char) + 1;
    else if (char === 'Ñ') val = 27;
    else if ("0123456789".includes(char)) val = 28 + "0123456789".indexOf(char);
    else if (".,?!-".includes(char)) val = 38 + ".,?!-".indexOf(char);

    // Convert integer value to array of bits (0-7)
    let pts = [];
    for (let i = 0; i < 8; i++) {
        if ((val >> i) & 1) pts.push(i);
    }
    return pts;
}

/* =========================================
   3. MATH & 3D HELPERS
   ========================================= */
// Projects a 3D world position to 2D screen coordinates
function screenPosition(pInst, x, y, z) {
    // Handle Vector input
    if (x instanceof p5.Vector) { z = x.z; y = x.y; x = x.x; }

    let renderer = pInst._renderer;
    let v = pInst.createVector(x, y, z);

    // Get Matrices
    let mv = renderer.uMVMatrix.copy();
    let pMat = renderer.uPMatrix.copy();

    // Transform
    let vView = transformMat4(v, mv);
    let vClip = transformMat4(vView, pMat);

    // Perspective Division
    if (vClip.w !== 0) {
        vClip.x /= vClip.w;
        vClip.y /= vClip.w;
    }

    // Map to Screen (Center Relative)
    let sX = (vClip.x * pInst.width / 2);
    let sY = -(vClip.y * pInst.height / 2);

    return pInst.createVector(sX, sY, 0);
}

// =========================================
// 4. SHARED CONSTANTS & HELPERS
// =========================================

// Returns the standard 8-point node positions for a 3D Modulith
// Coordinates are centered relative to the block (range -0.5 to 0.5)
function get3DNodePositions() {
    // Z is 0.5 to place points on the FRONT face
    return [
        [-0.5, -0.5, 0.5], [0, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0, 0.5],
        [0.5, 0.5, 0.5], [0, 0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0, 0.5]
    ];
}

// Converts standard p5 HSB (360, 100, 100) to CSS HSL string
function hsbToCss(h, s, b) {
    // Approximation: 
    // p5 Brightness (0-100) -> CSS Lightness (0-50%) for "full color" mapping
    // We Map B 100 -> L 50 (Vivid). B 0 -> L 0 (Black).
    let cssL = b / 2;
    return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(cssL)}%)`;
}

// Matrix Multiplication Helper
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

// =========================================
// 5. ACCESSIBILITY & BRANCH LOGIC
// =========================================

// Definition of Branches (Groups), their IDs, tick positions, and colors
const BRANCH_DEFS = {
    FIRE: { id: 'FIRE', tick: 'TL', label: 'A-F', hue: 0 },
    GOLD: { id: 'GOLD', tick: 'TR', label: 'G-L', hue: 45 },
    GREEN: { id: 'GREEN', tick: 'BR', label: 'M-R', hue: 160 },
    OCEAN: { id: 'OCEAN', tick: 'BL', label: 'S-X', hue: 200 },
    EDGE: { id: 'EDGE', tick: 'TC', label: 'Y-Ñ', hue: 270 },
    NUMS: { id: 'NUMS', tick: 'BC', label: '0-9', hue: 320 },
    SYMS: { id: 'SYMS', tick: 'CC', label: 'Sym', hue: 0 } // Center Center (Optional)
};

// Returns the Branch Info object for a given char
function getBranchInfo(char) {
    const code = char.codePointAt(0); // Simple check

    // Manual mapping based on groups defined in getBranchStyle (duplicated logic avoided by abstraction?)
    // Actually, getBranchStyle defines the groups. Let's sync them.
    // Ideally getBranchStyle should USE this map, but let's just make a fast lookup here.

    if ("ABCDEF".includes(char)) return BRANCH_DEFS.FIRE;
    if ("GHIJKL".includes(char)) return BRANCH_DEFS.GOLD;
    if ("MNOPQR".includes(char)) return BRANCH_DEFS.GREEN;
    if ("STUVWX".includes(char)) return BRANCH_DEFS.OCEAN;
    if ("YZÑ".includes(char)) return BRANCH_DEFS.EDGE;
    if ("0123456789".includes(char)) return BRANCH_DEFS.NUMS;
    if (".,?!- ".includes(char)) return BRANCH_DEFS.SYMS;

    return null;
}

// Returns relative Tick Position [x, y] (0-1 range) for a given Tick Type
function getTickPosition(tickType) {
    const POS = {
        TL: [0, 0],   // Top-Left
        TR: [1, 0],   // Top-Right
        BR: [1, 1],   // Bottom-Right
        BL: [0, 1],   // Bottom-Left
        TC: [0.5, 0], // Top-Center
        BC: [0.5, 1], // Bottom-Center
        CC: [0.5, 0.5] // Center (for symbols?)
    };
    return POS[tickType] || null;
}
