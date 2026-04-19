let currentLine = '';
let displayLine = '';
let lyricAlpha = 0;        // 0 = invisible, 255 = fully visible
let fadeState = 'idle';    // 'idle' | 'fadein' | 'hold' | 'fadeout'
let holdTimer = 0;
const HOLD_DURATION = 3000; // ms to hold a line before fading
const FADE_SPEED = 4;       // alpha units per frame

// Called by assemblyai.js or (later) lrc-parser.js when a new line arrives
function showLine(text) {
    if (text === currentLine) return;
    currentLine = text;

    if (fadeState === 'idle' || fadeState === 'fadeout') {
        // Snap in the new line and fade it in
        displayLine = text;
        fadeState = 'fadein';
    } else {
        // Mid-hold or mid-fadein: queue it to appear after current fades
        fadeState = 'fadeout';
        // displayLine stays until fade completes, then showLine fires again
        setTimeout(() => showLine(text), 500);
    }
}

// Called from sketch.js inside draw()
function drawLyrics() {
    if (fadeState === 'idle') return;

    // ── State machine ──
    if (fadeState === 'fadein') {
        lyricAlpha = min(lyricAlpha + FADE_SPEED, 255);
        if (lyricAlpha >= 255) {
            fadeState = 'hold';
            holdTimer = millis();
        }
    } else if (fadeState === 'hold') {
        if (millis() - holdTimer > HOLD_DURATION) {
            fadeState = 'fadeout';
        }
    } else if (fadeState === 'fadeout') {
        lyricAlpha = max(lyricAlpha - FADE_SPEED, 0);
        if (lyricAlpha <= 0) {
            fadeState = 'idle';
            displayLine = '';
        }
    }

    if (!displayLine) return;

    // ── Draw ──
    // Position: vertically centered, sitting above the waveform midpoint
    let lyricY = height * 0.38;

    push();
    colorMode(RGB); // switch out of HSB just for text
    fill(255, 255, 255, lyricAlpha);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(36);
    textStyle(BOLD);
    text(displayLine, width / 2, lyricY);
    colorMode(HSB, 360, 100, 100); // restore for waveform
    pop();
}

function drawAssemblyIndicator() {
    if (mode !== 'mic') return;

    let dotColor;
    if (assemblyStatus === 'connected') {
        dotColor = color(120, 80, 90);      // green
    } else if (assemblyStatus === 'connecting') {
        dotColor = color(40, 80, 90);       // amber
    } else if (assemblyStatus === 'error') {
        dotColor = color(0, 80, 90);        // red
    } else {
        dotColor = color(0, 0, 40);         // grey
    }

    push();
    colorMode(HSB, 360, 100, 100);
    noStroke();
    fill(dotColor);
    circle(width - 24, 24, 12);
    pop();
}