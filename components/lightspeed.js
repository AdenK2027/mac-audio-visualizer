// lightspeed.js

const WARP_STAR_COUNT = 500;
const WARP_MIN_DIST   = 100;   // stars never spawn closer than this to center
const WARP_DURATION   = 2000;  // ms for the one-shot intro animation (space mode entry)
let shaderAlpha      = 0;

let warpStars        = [];
let warpIntroStart   = 0;

// ── Call once to start the continuous warp (warp mode button) ──
let tunnelBuffer; // We will draw the shader here
let warpActive = false;
let showShader = false;

function startWarp() {
    warpMode = 'intro'; // Set to intro first
    warpIntroStart = millis();
    showShader = false;
    shaderAlpha = 0;
    warpStars = [];
    for (let i = 0; i < WARP_STAR_COUNT; i++) {
        warpStars.push(makeWarpStar(false));
    }
    
    // Initialize the WEBGL buffer if it doesn't exist
    if (!tunnelBuffer) {
        tunnelBuffer = createGraphics(windowWidth, windowHeight, WEBGL);
        tunnelShader = tunnelBuffer.createShader(vertShader, fragShader);
    }
}

// ── Call to stop completely (default mode) ──
function stopWarp() {
    warpMode = 'off';
    warpStars = [];
}

function makeWarpStar(spread) {
    let t = pow(random(1), 0.4);
    let d = t * width * 0.7;

    let isBlue = random(1) > 0.80;
    let h   = isBlue ? 195 : 0;
    let s = isBlue ? 60  : 0;

    return {
        angle:        random(TWO_PI),
        dist:         d,
        speed:        random(18, 55),
        width:        random(0.5, 2.0),
        bright:       random(70, 100),
        minTailDist:  random(20, 180),
        h:            h,
        sat:          s
    };
}

function drawWarp() {
    if (warpMode === 'off') return;

    let cx = width / 2;
    let cy = height / 2;
    let maxDist = dist(0, 0, cx, cy) * 1.1;

    // ── 1. SHADER EXECUTION ──
    if (warpMode === 'intro-to-warp' || showShader) {
        tunnelBuffer.shader(tunnelShader);
        tunnelShader.setUniform('u_resolution', [tunnelBuffer.width, tunnelBuffer.height]);
        tunnelShader.setUniform('u_time', millis() / 1000.0);
        
        // FIX: Use the variable shaderAlpha instead of 1.0
        tunnelShader.setUniform('u_alpha', shaderAlpha); 
        
        tunnelBuffer.quad(-1, -1, 1, -1, 1, 1, -1, 1);
        
        // Use the 4-argument version of image() to stretch the low-res buffer
        image(tunnelBuffer, 0, 0, width, height);
    }

    // Stop 2D stars once we are fully in continuous mode
    if (showShader && warpMode === 'continuous') return;

    let speedMult = 1.0;
    let tailMult  = 4.5;
    let alpha2D   = 90;

    if (warpMode === 'intro-only' || warpMode === 'intro-to-warp') {
        let elapsed = millis() - warpIntroStart;
        let t = elapsed / WARP_DURATION;

        // The Cut-over Point
        if (t >= 1.0) {
            if (warpMode === 'intro-to-warp') {
                showShader = true;
                shaderAlpha = 1.0;
                warpMode = 'continuous';
            } else {
                warpMode = 'off';
                warpStars = [];
            }
            return;
        }

        // --- MANAGE THE FADE-IN TIMING ---
        if (warpMode === 'intro-to-warp') {
            // Fade shader in earlier so it's visible during the lurch
            if (t > 0.4) {
                shaderAlpha = map(t, 0.4, 0.9, 0, 1.0, true);
            } else {
                shaderAlpha = 0;
            }
        }

        if (t < 0.33) {
            speedMult = 0.05; 
            tailMult = map(t, 0, 0.33, 0, 30);
        } else {
            let lurchProgress = map(t, 0.33, 1.0, 0.25, 1);
            speedMult = 0.05 + (sin(lurchProgress)) + lurchProgress;
            tailMult = map(lurchProgress, 0, 0.1, 30, 4.5, true);
            
            // Fade out the 2D stars as the shader reaches full strength
            if (warpMode === 'intro-to-warp' && t > 0.7) {
                alpha2D = map(t, 0.7, 1.0, 90, 0);
            } else if (warpMode === 'intro-only' && t > 0.4) {
                alpha2D = map(t, 0.95, 1.0, 90, 0);
            }
        }
    }

    // ── 3. RENDER 2D STARS ──
    push();
    noFill();
    for (let s of warpStars) {
        s.dist += s.speed * speedMult;
        let tailLength = s.speed * speedMult * tailMult;
        let x1 = cx + cos(s.angle) * max(s.minTailDist, s.dist - tailLength);
        let y1 = cy + sin(s.angle) * max(s.minTailDist, s.dist - tailLength);
        let x2 = cx + cos(s.angle) * s.dist;
        let y2 = cy + sin(s.angle) * s.dist;

        if (s.dist >= s.minTailDist) {
            let distFraction = s.dist / maxDist;
            stroke(s.h, s.sat, s.bright, alpha2D * (0.4 + distFraction * 0.6));
            strokeWeight(3);
            line(x1, y1, x2, y2);
        }

        if (s.dist > maxDist) {
            s.dist = (warpMode.includes('intro')) ? random(200, 600) : 0;
            s.speed = random(18, 55);
            s.angle = random(TWO_PI);
        }
    }
    pop();
}

function startWarp() {
    warpMode = 'intro-to-warp'; 
    warpIntroStart = millis();
    showShader = false;
    warpStars = [];
    
    // Initialize stars (spread = false for center-burst look)
    for (let i = 0; i < WARP_STAR_COUNT; i++) {
        warpStars.push(makeWarpStar(false));
    }

    if (!tunnelBuffer) {
        tunnelBuffer = createGraphics(windowWidth / 2, windowHeight / 2, WEBGL);
        tunnelShader = tunnelBuffer.createShader(vertShader, fragShader);
    }
}

function startWarpIntro() {
    warpMode = 'intro-only';
    warpIntroStart = millis();
    showShader = false;
    warpStars = [];
    for (let i = 0; i < WARP_STAR_COUNT; i++) {
        warpStars.push(makeWarpStar(false));
    }
}



//hader screen thang
const vertShader = `
precision highp float;
attribute vec3 aPosition;

varying vec2 vTexCoord;

void main() {
    vTexCoord = aPosition.xy * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 1.0);
}
`;

// Fragment shader stolen from shadertoy
const fragShader = `
precision highp float;

varying vec2 vTexCoord;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_alpha;

const float TUNNEL_SIZE  = 0.5; 
const float TUNNEL_SPEED = -3.9; 

// --- PROCEDURAL 3D NOISE FUNCTIONS ---
// Generates random hash values
vec3 hash(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// 3D Perlin Noise
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);

    return mix(mix(mix(dot(hash(i + vec3(0.0,0.0,0.0)), f - vec3(0.0,0.0,0.0)), 
                       dot(hash(i + vec3(1.0,0.0,0.0)), f - vec3(1.0,0.0,0.0)), u.x),
                   mix(dot(hash(i + vec3(0.0,1.0,0.0)), f - vec3(0.0,1.0,0.0)), 
                       dot(hash(i + vec3(1.0,1.0,0.0)), f - vec3(1.0,1.0,0.0)), u.x), u.y),
               mix(mix(dot(hash(i + vec3(0.0,0.0,1.0)), f - vec3(0.0,0.0,1.0)), 
                       dot(hash(i + vec3(1.0,0.0,1.0)), f - vec3(1.0,0.0,1.0)), u.x),
                   mix(dot(hash(i + vec3(0.0,1.0,1.0)), f - vec3(0.0,1.0,1.0)), 
                       dot(hash(i + vec3(1.0,1.0,1.0)), f - vec3(1.0,1.0,1.0)), u.x), u.y), u.z);
}

// Fractal Brownian Motion (Layers of noise for cloud detail)
float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    // Reduced from 4 to 2 for massive performance gain
    for (int i = 0; i < 2; i++) {
        f += amp * noise(p);
        p *= 2.5; // Slightly higher lacunarity to keep detail
        amp *= 0.5;
    }
    return f;
}

void main() {
    // Center coordinates and fix aspect ratio
    vec2 p = -1.0 + 2.0 * vTexCoord;
    p.x *= u_resolution.x / u_resolution.y;

    float a = atan(p.y, p.x);
    float r = length(p);

    // --- INFINITE CYLINDER MAPPING ---
    // Instead of a 2D texture, we map the space into a 3D cylinder.
    // X and Y bend into a circle (seamless), Z shoots down the depth.
    vec3 pos = vec3(
        cos(a) * 1.5, // 1.5 adjusts how tight the clouds wrap around
        sin(a) * 1.5, 
        (TUNNEL_SIZE / r) - u_time * TUNNEL_SPEED // Depth mapping
    );

    // Generate the noise value (returns approx -1.0 to 1.0)
    float n = fbm(pos);
    
    // Map noise to 0.0 -> 1.0 range and add contrast
    n = n * 0.5 + 0.5;
    n = pow(n, 1.2); 

    // --- COLOR PALETTE ---
    vec3 deepBlue = vec3(0.0, 0.05, 0.4);
    vec3 brightBlue = vec3(0.0, 0.4, 1.0);
    vec3 cyan = vec3(0.7, 0.9, 1.0);

    vec3 color = vec3(0.0);
    
    // Smoothly mix the blue palette based on cloud density
    if (n < 0.5) {
        color = mix(deepBlue, brightBlue, n * 2.0);
    } else {
        color = mix(brightBlue, cyan, (n - 0.5) * 2.0);
    }

    // --- GLOWING CENTER ---
    // Exponential spike of light at the dead center
    float centerGlow = 0.06 / (r + 0.01); 
    color += vec3(centerGlow);

    // Vignette to darken outer edges slightly and focus the eye
    color *= smoothstep(2.0, 0.15, r);

    gl_FragColor = vec4(color * u_alpha, u_alpha);
}
`;


let tunnelShader;

function setup() {
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  
  let canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  canvas.style('display', 'block'); 
  
  tunnelShader = createShader(vertShader, fragShader);
  noStroke();
}

function draw() {
  shader(tunnelShader);
  
  // Pass dynamic values to the shader
  tunnelShader.setUniform('u_resolution', [width, height]);
  tunnelShader.setUniform('u_time', millis() / 1000.0);
  
  // Draw full screen quad
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}