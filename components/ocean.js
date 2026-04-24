// ── ocean.js ──

// ─────────────────────────────────────────────
//  CONSTANTS & SHARED STATE
// ─────────────────────────────────────────────
const OCEAN_BUBBLE_COUNT   = 120;

let oceanBubbles   = [];

let _bgBuffer      = null;         // cached gradient — only rebuilt on resize
let _bgW           = 0;
let _bgH           = 0;

// ─────────────────────────────────────────────
//  INIT — called from sketch.js btnOcean handler
// ─────────────────────────────────────────────
function initOcean() {
    oceanBubbles = [];
    _bgBuffer    = null;

    for (let i = 0; i < OCEAN_BUBBLE_COUNT; i++) oceanBubbles.push(new Bubble());
}

// ─────────────────────────────────────────────
//  DRAW ENTRY POINT — replaces ocean draw calls in sketch.js
// ─────────────────────────────────────────────
function drawOceanScene() {
    // 1. Layered gradient background (cached)
    _drawOceanBackground();

    // 6. Bubbles (on top of shafts so they catch light)
    for (let b of oceanBubbles) { b.update(); b.display(); }

    // 7. Edge vignette (always last before waveforms)
    _drawVignette();
}

// Legacy aliases so existing sketch.js references keep working
function drawUnderwaterBackground() { _drawOceanBackground(); }
function drawVignette()              { _drawVignette(); }

// ─────────────────────────────────────────────
//  BACKGROUND  — four-stop gradient, cached
// ─────────────────────────────────────────────
function _drawOceanBackground() {
    if (!_bgBuffer || _bgW !== width || _bgH !== height) {
        _bgBuffer = createGraphics(width, height);
        _bgBuffer.colorMode(RGB, 255);
        _bgBuffer.noStroke();

        // Four depth zones: sunlit → mesopelagic → bathypelagic → abyss
        const stops = [
            { y: 0,      r:  8, g: 55, b: 130 },   // sunlit zone — rich teal-blue
            { y: 0.25,   r:  5, g: 35, b: 90  },   // twilight entry
            { y: 0.60,   r:  3, g: 18, b: 50  },   // mesopelagic
            { y: 1.0,    r:  4, g: 20, b: 70  },   // abyss
        ];

        for (let y = 0; y < height; y++) {
            let t   = y / height;
            let col = _interpGradient(stops, t);
            _bgBuffer.stroke(col.r, col.g, col.b);
            _bgBuffer.line(0, y, width, y);
        }

        _bgW = width;
        _bgH = height;
    }
    image(_bgBuffer, 0, 0);
}

function _interpGradient(stops, t) {
    for (let i = 0; i < stops.length - 1; i++) {
        let a = stops[i], b = stops[i + 1];
        if (t >= a.y && t <= b.y) {
            let local = map(t, a.y, b.y, 0, 1);
            return {
                r: lerp(a.r, b.r, local),
                g: lerp(a.g, b.g, local),
                b: lerp(a.b, b.b, local)
            };
        }
    }
    return stops[stops.length - 1];
}

// ─────────────────────────────────────────────
//  LIGHT SHAFTS
// ─────────────────────────────────────────────
class LightShaft {
    constructor() { this._reset(); }

    _reset() {
        this.x      = random(-100, width + 100);
        this.w      = random(180, 500);
        this.speed  = random(0.0015, 0.004);
        this.phase  = random(TWO_PI);
        this.alpha  = random(14, 38);        // higher range = more visible
        this.tilt   = random(-PI / 9, PI / 9);
        this.lenMul = random(0.6, 1.0);      // how far the shaft descends
    }

    display() {
        let xOff  = sin(frameCount * this.speed + this.phase) * 80;
        let shaftH = height * this.lenMul;

        push();
        blendMode(ADD);
        translate(this.x + xOff, 0);
        rotate(this.tilt);

        // Horizontal soft gradient (wide beam → no harsh edges)
        let grad = drawingContext.createLinearGradient(0, 0, this.w, 0);
        grad.addColorStop(0,   'rgba(180,225,255,0)');
        grad.addColorStop(0.3, `rgba(180,225,255,${(this.alpha * 0.6) / 255})`);
        grad.addColorStop(0.5, `rgba(200,235,255,${this.alpha / 255})`);
        grad.addColorStop(0.7, `rgba(180,225,255,${(this.alpha * 0.6) / 255})`);
        grad.addColorStop(1,   'rgba(180,225,255,0)');

        // Vertical fade — brighter at top, dims out
        let vGrad = drawingContext.createLinearGradient(0, 0, 0, shaftH);
        vGrad.addColorStop(0,   `rgba(255,255,255,${(this.alpha * 0.9) / 255})`);
        vGrad.addColorStop(0.5, `rgba(180,220,255,${(this.alpha * 0.4) / 255})`);
        vGrad.addColorStop(1,   'rgba(100,160,255,0)');

        drawingContext.fillStyle = grad;
        noStroke();
        rect(0, 0, this.w, shaftH);

        // Overlay vertical fade
        drawingContext.fillStyle = vGrad;
        rect(0, 0, this.w, shaftH);
        pop();
    }
}

// ─────────────────────────────────────────────
//  BUBBLES
// ─────────────────────────────────────────────
class Bubble {
    constructor() { this._reset(true); }

    _reset(fromBottom = false) {
        this.x       = random(width);
        this.y       = fromBottom ? random(height, height + 200) : random(-20, height);
        this.r       = random(1.5, 9);
        this.speedY  = random(0.4, 2.2) / sqrt(this.r); // smaller bubbles rise faster
        this.wobble  = random(TWO_PI);
        this.wobbleF = random(0.025, 0.055);
        this.wobbleA = random(0.6, 2.5);
        // Each bubble has a slight color variation
        this.hue     = random(180, 220);
        this.depth   = random(0.3, 1.0);  // parallax factor (far → slow)
    }

    update() {
        this.y -= this.speedY * this.depth;
        this.x += sin(this.wobble + frameCount * this.wobbleF) * this.wobbleA;
        if (this.y < -this.r * 2) this._reset(true);
    }

    display() {
        let alpha = map(this.depth, 0.3, 1.0, 80, 200);
        push();
        noFill();

        // Outer ambient glow (large, very faint — light scattering in water)
        if (this.r > 3) {
            stroke(this.hue, 60, 255, alpha * 0.08);
            strokeWeight(this.r * 1.2);
            circle(this.x, this.y, this.r * 2);
        }

        // Main rim
        stroke(this.hue, 50, 240, alpha * 0.55);
        strokeWeight(0.6);
        circle(this.x, this.y, this.r * 2);

        // Bottom rim darkening — refracted shadow under the bubble
        stroke(this.hue, 80, 160, alpha * 0.4);
        strokeWeight(1.0);
        arc(this.x, this.y, this.r * 2, this.r * 2, PI * 0.2, PI * 0.8);

        // Inner translucent fill — very subtle color tint (surface tension)
        noStroke();
        fill(this.hue, 30, 255, alpha * 0.06);
        circle(this.x, this.y, this.r * 2);

        // Primary specular crescent — top-left caustic highlight
        noFill();
        stroke(255, 255, 255, alpha * 0.75);
        strokeWeight(0.9);
        arc(this.x - this.r * 0.28, this.y - this.r * 0.28,
            this.r * 0.95, this.r * 0.85, PI * 1.05, PI * 1.85);

        // Secondary specular — tighter, brighter inner glint
        stroke(255, 255, 255, alpha * 0.95);
        strokeWeight(0.5);
        arc(this.x - this.r * 0.38, this.y - this.r * 0.38,
            this.r * 0.35, this.r * 0.35, PI * 1.1, PI * 1.7);

        // Bright pinpoint reflection dot
        stroke(255, 255, 255, alpha);
        strokeWeight(max(0.5, this.r * 0.18));
        point(this.x - this.r * 0.32, this.y - this.r * 0.34);

        // Transmitted light patch — opposite side, warm caustic
        stroke(this.hue, 40, 255, alpha * 0.2);
        strokeWeight(0.4);
        arc(this.x + this.r * 0.2, this.y + this.r * 0.2,
            this.r * 0.5, this.r * 0.5, PI * 0.05, PI * 0.7);
        pop();
    }
}

// ─────────────────────────────────────────────
//  VIGNETTE — deep edge darkening
// ─────────────────────────────────────────────
function _drawVignette() {
    push();
    // Radial dark vignette
    let vg = drawingContext.createRadialGradient(
        width * 0.5, height * 0.5, width * 0.08,
        width * 0.5, height * 0.5, width * 0.85
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.6, 'rgba(0,3,12,0.25)');
    vg.addColorStop(1,   'rgba(0,3,12,0.82)');
    drawingContext.fillStyle = vg;
    drawingContext.fillRect(0, 0, width, height);

    // Top shimmer bloom (light enters from surface above)
    let tg = drawingContext.createLinearGradient(0, 0, 0, height * 0.22);
    tg.addColorStop(0,   'rgba(50,120,220,0.18)');
    tg.addColorStop(1,   'rgba(0,0,0,0)');
    drawingContext.fillStyle = tg;
    drawingContext.fillRect(0, 0, width, height * 0.22);
    pop();
}

// ─────────────────────────────────────────────
//  COMPATIBILITY SHIM
//  sketch.js refers to `particles` and `shafts` in the ocean branch.
//  Point those arrays at our new objects so old code keeps working.
// ─────────────────────────────────────────────
function syncOceanLegacyRefs() {
    // Called once after initOcean() if your sketch.js still uses:
    //   for (let p of particles) p.update/display()
    //   for (let s of shafts)   s.display()
    if (typeof particles !== 'undefined') {
        particles = oceanBubbles;  // bubbles fill the particle role
    }
}

// ─────────────────────────────────────────────
//  WINDOW RESIZE — bust the cached gradient
// ─────────────────────────────────────────────
function oceanWindowResized() {
    _bgBuffer = null;
}