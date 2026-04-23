let currentLineData = null; // Store the whole object from parser
let lyricAlpha = 0;
let fadeState = 'idle'; 
let holdTimer = 0;
const HOLD_DURATION = 3000;
const FADE_SPEED = 5; 
const MAX_LYRIC_ALPHA = 100; // Matches your setup(..., 100)

function showLine(lyricObj) {
    if (!lyricObj) return;
    
    // If it's the same phrase, just update the data without restarting fade
    if (currentLineData && lyricObj.fullLine === currentLineData.fullLine) {
        currentLineData = lyricObj;
        return;
    }

    // New phrase: trigger fade
    currentLineData = lyricObj;
    fadeState = 'fadein';
}

function drawLyrics() {
    if (fadeState === 'idle' || !currentLineData) return;

    // State Machine
    if (fadeState === 'fadein') {
        lyricAlpha = min(lyricAlpha + FADE_SPEED, MAX_LYRIC_ALPHA);
        if (lyricAlpha >= MAX_LYRIC_ALPHA) {
            fadeState = 'hold';
            holdTimer = millis();
        }
    } else if (fadeState === 'hold') {
        if (millis() - holdTimer > HOLD_DURATION) fadeState = 'fadeout';
    } else if (fadeState === 'fadeout') {
        lyricAlpha = max(lyricAlpha - FADE_SPEED, 0);
        if (lyricAlpha <= 0) { fadeState = 'idle'; currentLineData = null; }
    }

    if (!currentLineData) return;

    push();
    // Force RGB mode with a 0-100 alpha range to match your global setup
    colorMode(RGB, 255, 255, 255, 100); 

    textAlign(CENTER, CENTER);
    textSize(36);
    textStyle(BOLD);
    noStroke();

    let lyricY = height * 0.38;

    // 1. Draw Gray Background Line (Cumulative effect)
    fill(120, 120, 120, lyricAlpha * 0.4); // 40% opacity gray
    text(currentLineData.fullLine, width / 2, lyricY);

    // 2. Draw White Active Words
    fill(255, 255, 255, lyricAlpha); // 100% opacity white
    text(currentLineData.text, width / 2, lyricY);

    // IMPORTANT: Restore the HSB mode with the correct 4th parameter (100)
    colorMode(HSB, 360, 100, 100, 100); 
    pop();
}