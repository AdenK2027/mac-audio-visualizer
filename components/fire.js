// fire.js

function drawFireStyle() {
    let playing = (mode === 'mic') ? true : (sound && sound.isPlaying());
    let spectrum = fftFire.analyze();
    let bassRaw  = fftFire.getEnergy("bass") / 255;
    let cx        = width / 2;
    let baseY     = height * 0.72;
    let flameMaxH = height * 0.55;

    let logWidth = 420;
    let logHeight = 240;
    
    // Log Rendering
    if (logsImg) {
        push();
        imageMode(CENTER);
        image(logsImg, cx, baseY - 40, logWidth, logHeight);
        pop();
    }

    // Spectrum Mapping to Columns
    let binRange = floor(spectrum.length * 0.12);
    for (let c = 0; c < FIRE_COLS; c++) {
        let binStart = floor(map(c, 0, FIRE_COLS, 0, binRange));
        let binEnd   = max(binStart + 1, floor(map(c + 1, 0, FIRE_COLS, 0, binRange)));
        let binAvg = 0;
        for (let b = binStart; b < binEnd; b++) binAvg += spectrum[b];
        binAvg /= (binEnd - binStart);

        let centre = exp(-pow((c / (FIRE_COLS - 1) - 0.5) * 3.8, 2));
        if (playing) {
            flameTarget[c] = (binAvg / 255) * centre;
        } else {
            flameTarget[c] *= 0.88; 
        }
        flameHeight[c] = lerp(flameHeight[c], flameTarget[c], 0.8);
    }

    // Ground Glow
    let glowR = 130 + bassRaw * 240;
    for (let r = glowR; r > 0; r -= 12) {
        fill(18, 90, 80, map(r, 0, glowR, 16, 0));
        ellipse(cx, baseY + 14, r * 2.6, r * 0.42);
    }

    // Drawing Flame Columns
    noStroke();
    let colW = (480) / FIRE_COLS; 
    for (let c = 0; c < FIRE_COLS; c++) {
        let h = flameHeight[c];
        if (h < 0.006) continue;
        let x    = map(c, 0, FIRE_COLS - 1, cx - 150, cx + 150);
        let colH = h * flameMaxH;
        let steps = max(5, floor(colH / 5));
        for (let s = 0; s < steps; s++) {
            let t  = s / steps;  
            let sy = baseY - t * colH;
            let sw = colW * 2.8 * (1 - t * 0.75); 
            setFireColor(t);
            ellipse(x, sy, sw, colH / steps * 1.9);
        }
    }
    updateEmbers(playing, cx, baseY, flameMaxH, bassRaw);
}

function setFireColor(t) {
    let fh, fs, fb, fa;
    if (t < 0.3) {
        fh = map(t, 0, 0.3, 48, 32); fs = map(t, 0, 0.3, 78, 100); fb = 100;
        fa = map(t, 0, 0.08, 0, 90);
    } else if (t < 0.68) {
        fh = map(t, 0.3, 0.68, 32, 10); fs = 100; fb = map(t, 0.3, 0.68, 95, 68); fa = 88;
    } else {
        fh = map(t, 0.68, 1.0, 10, 0); fs = 100; fb = map(t, 0.68, 1.0, 68, 15); fa = map(t, 0.68, 1.0, 80, 0);
    }
    fill(fh, fs, fb, fa);
}

function updateEmbers(playing, cx, baseY, flameMaxH, bassRaw) {
    if (playing && random() < 0.2 + bassRaw * 0.6) {
        let c  = floor(random(FIRE_COLS));
        let ex = map(c, 0, FIRE_COLS - 1, cx - 160, cx + 160) + random(-10, 10);
        let ey = baseY - flameHeight[c] * flameMaxH * random(0.2, 0.85);
        let life = random(25, 65);
        emberList.push({ x: ex, y: ey, vx: random(-1.3, 1.3), vy: random(-2.8, -0.8), life, maxLife: life, size: random(2, 4.5) });
    }
    let aliveE = 0;
    for (let i = 0; i < emberList.length; i++) {
        let e = emberList[i];
        e.x += e.vx + sin(e.life * 0.18) * 0.5;
        e.y += e.vy;
        e.vy *= 0.975;
        e.life--;
        if (e.life <= 0) continue;
        let t = e.life / e.maxLife;
        fill(map(t, 1, 0, 52, 8), map(t, 1, 0.3, 35, 100), map(t, 1, 0, 100, 18), map(t, 0.4, 0, 95, 0));
        ellipse(e.x, e.y, e.size, e.size);
        emberList[aliveE++] = e;
    }
    emberList.length = aliveE;
}