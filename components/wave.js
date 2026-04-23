// waves.js

function drawSineStyle(wave, alpha, hueValue, ampScale) {
    stroke(hueValue, 80, 100, alpha);
    strokeWeight(7);
    noFill();
    beginShape();
    curveVertex(0, map(wave[0] * ampScale, -1, 1, 0, height));
    for (let i = 0; i < wave.length; i += 10) {
        curveVertex(map(i, 0, wave.length, 0, width), map(wave[i] * ampScale, -1, 1, 0, height));
    }
    curveVertex(width, map(wave[wave.length - 1] * ampScale, -1, 1, 0, height));
    endShape();
}

function drawBarsStyle(wave, alpha, hueValue, ampScale) {
    stroke(hueValue, 80, 100, alpha);
    strokeWeight(4);
    let cy = height / 2;
    for (let i = 0; i < wave.length; i += 20) {
        let x = map(i, 0, wave.length, 0, width);
        line(x, cy, x, map(wave[i] * ampScale, -1, 1, 0, height));
    }
}

function drawSlide(waveform, hueValue, ampScale) {
    slideOffset = (slideOffset + slideSpeed) % smoothedWave.length;
    stroke(hueValue, 80, 100);
    strokeWeight(7);
    noFill();

    let halfLen  = Math.floor(smoothedWave.length / 2);
    let rawY     = map(smoothedWave[(halfLen + slideOffset) % smoothedWave.length] * ampScale, -1, 1, 0, height);
    let prevY    = map(smoothedWave[(halfLen + slideOffset - 4 + smoothedWave.length) % smoothedWave.length] * ampScale, -1, 1, 0, height);
    let nextY    = map(smoothedWave[(halfLen + slideOffset + 4) % smoothedWave.length] * ampScale, -1, 1, 0, height);

    surferY     = lerp(surferY, rawY, 0.1);
    surferAngle = lerp(surferAngle, atan2(nextY - prevY, width / smoothedWave.length * 8), 0.1);

    beginShape();
    curveVertex(0, map(smoothedWave[slideOffset % smoothedWave.length] * ampScale, -1, 1, 0, height));
    for (let i = 0; i < smoothedWave.length; i += 10) {
        curveVertex(map(i, 0, smoothedWave.length, 0, width), map(smoothedWave[(i + slideOffset) % smoothedWave.length] * ampScale, -1, 1, 0, height));
    }
    curveVertex(width, map(smoothedWave[(slideOffset + smoothedWave.length - 1) % smoothedWave.length] * ampScale, -1, 1, 0, height));
    endShape();

    if (surferImg) {
        push();
        translate(width / 2, surferY - 50);
        rotate(surferAngle);
        imageMode(CENTER);
        image(surferImg, 0, 0, 100, 100);
        pop();
    }
}

let smoothBass = 0;
let smoothMid = 0;
let smoothHigh = 0;

function drawSplitStyle(spectrum, currentHue, ampScale) {
    // 1. Capture energy for three distinct "instrument" groups
    smoothBass = lerp(smoothBass, fft.getEnergy("bass"), 0.1);
    smoothMid  = lerp(smoothMid,  fft.getEnergy("mid"), 0.1);
    smoothHigh = lerp(smoothHigh, fft.getEnergy("treble"), 0.1);

    let bassPart = spectrum.slice(0, 40);
    let midPart  = spectrum.slice(40, 200);
    let highPart = spectrum.slice(200, 500);

                    //data      hue         position    width sens max
    drawSpectrumWave(bassPart, currentHue, height * .75, 8, 1.9, 550);
    
    // MIDS: Medium weight, very active
    drawSpectrumWave(midPart, currentHue + 40, height * 0.35, 4, 1.2, 250);

    // HIGHS: Thin, jittery, delicate
    drawSpectrumWave(highPart, currentHue + 80, height * 0.1, 2, .8, 200);
}

function drawSpectrumWave(data, h, yOffset, strokeW, sens, maxH) {
    push();
    noFill();
    stroke(h % 360, 80, 100, 100);
    strokeWeight(strokeW);
    
    beginShape();
    for (let i = 0; i < data.length; i++) {
        let x = map(i, 0, data.length, 0, width);
        
        // Use the custom maxH passed from drawSplitStyle
        // We divide by 2 because the wave spreads UP and DOWN from the center
        let displacement = constrain((data[i] * sens) / 2, 0, maxH / 2);
        
        // Alternate points for that vibrating "envelope" look
        let y = (i % 2 === 0) ? yOffset - displacement : yOffset + displacement;

        curveVertex(x, y);
    }
    endShape();
    pop();
}