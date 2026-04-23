// lightspeed.js

const WARP_STAR_COUNT = 2000;
const WARP_MIN_DIST   = 100;   // stars never spawn closer than this to center
const WARP_DURATION   = 2000;  // ms for the one-shot intro animation (space mode entry)

let warpStars        = [];
let warpIntroStart   = 0;

// ── Call once to start the continuous warp (warp mode button) ──
function startWarp() {
    warpMode = 'continuous';
    warpStars = [];
    for (let i = 0; i < WARP_STAR_COUNT; i++) {
        warpStars.push(makeWarpStar(true)); // true = spread across full screen
    }
}

function startWarpIntro() {
    warpMode = 'intro-only';
    warpIntroStart = millis();
    warpStars = [];
    for (let i = 0; i < WARP_STAR_COUNT; i++) {
        warpStars.push(makeWarpStar(false));
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

    // Determine color: 50% chance for Blue, 50% for "White" (Low Saturation Gold)
    let isBlue = random(1) > 0.10;
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

// ── Draw every frame ──
function drawWarp() {
    if (warpMode === 'off') return;

    let cx = width / 2;
    let cy = height / 2;
    let maxDist = dist(0, 0, cx, cy) * 1.1;

    let speedMult = 1.0;
    let alpha     = 90;

    if (warpMode === 'intro' || warpMode === 'intro-only') {
        let elapsed = millis() - warpIntroStart;
        if (elapsed >= WARP_DURATION) {
            if (warpMode === 'intro-only') {
                warpMode = 'off';  // stop after intro
                warpStars = [];
                return;
            } else {
                warpMode = 'continuous'; // warp button — keep going
            }
        } else {
            let t = elapsed / WARP_DURATION;
            speedMult = t < 0.4 ? map(t, 0, 0.4, 0.05, 1.0) : 1.0;
            alpha     = t < 0.15 ? map(t, 0, 0.15, 0, 90) : 90;
        }
    }

    push();
    noFill();
    for (let s of warpStars) {
        s.dist += s.speed * speedMult;
        let minTailDist = 60; // tails never start this close to center

        if (s.dist > maxDist) {
            let t = pow(random(1), 0.4);
            s.dist        = t * 180;
            s.speed       = random(18, 55);
            s.angle       = random(TWO_PI);
            
            // Re-roll the color for the recycled star
            let isBlue = random(1) > 0.5;
            s.h = isBlue ? 200 : 55;
            s.sat = isBlue ? 80 : 10;

            s.width       = random(0.5, 2.0);
            s.bright      = random(70, 100);
            s.minTailDist = random(20, 180);
        }

        let tailLength = s.speed * speedMult * 4.5;
        let tailDist   = max(s.minTailDist, s.dist - tailLength);
        let x1 = cx + cos(s.angle) * tailDist;
        let y1 = cy + sin(s.angle) * tailDist;
        let x2 = cx + cos(s.angle) * s.dist;
        let y2 = cy + sin(s.angle) * s.dist;

        if (s.dist < s.minTailDist) continue;

        let distFraction = s.dist / maxDist;
        let sw = s.width * (0.5 + distFraction * 2.5);

        stroke(s.h, s.sat, s.bright, alpha * (0.4 + distFraction * 0.6));

        strokeWeight(sw);
        line(x1, y1, x2, y2);
    }
    pop();
}