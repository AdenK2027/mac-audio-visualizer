let mic, fft, sound;
let mode = 'mic';
let rainbow = false;
let rainbowSpeed = 10;
let colorMode2 = 'intense';
let pickedHue = 200;
let bars = false;
let slide = false;
let soundLoaded = false;
let smoothedWave = [];
let slideBuffer = [];
let lyricsStarted = false;
let pg;
let waveHistory = [];
const HISTORY_LENGTH = 4;
const SLIDE_LENGTH = 1024;
let slideOffset = 0;
let slideSpeed = 8;
let surferImg;
let surferY = 0;
let surferAngle = 0;

function preload() {
    surferImg = loadImage('public/SpaceSurfer.png');
}

// ── DOM refs ──
const groupInput  = document.getElementById('group-input');
const groupColor  = document.getElementById('group-color');
const groupWave   = document.getElementById('group-wave');
const groupSlide  = document.getElementById('group-slide');
const tabInput    = document.getElementById('tab-input');
const tabColor    = document.getElementById('tab-color');
const tabWave     = document.getElementById('tab-wave');
const tabSlide    = document.getElementById('tab-slide');
const btnMic      = document.getElementById('btn-mic');
const btnMp3      = document.getElementById('btn-mp3');
const btnIntense  = document.getElementById('btn-intense');
const btnRainbow  = document.getElementById('btn-rainbow');
const btnNormal   = document.getElementById('btn-normal');
const btnBars     = document.getElementById('btn-bars');
const btnSlideOn  = document.getElementById('btn-slide-on');
const btnSlideOff = document.getElementById('btn-slide-off');
const fileInput   = document.getElementById('file-input');
const hudMode     = document.getElementById('hud-mode');
const hudPaused   = document.getElementById('hud-paused');
const btnSuper  = document.getElementById('btn-super');
const colorPicker = document.getElementById('color-picker');

// ── Tab toggles ──
tabInput.addEventListener('click', () => groupInput.classList.toggle('open'));
tabColor.addEventListener('click', () => groupColor.classList.toggle('open'));
tabWave.addEventListener('click', () => groupWave.classList.toggle('open'));
tabSlide.addEventListener('click', () => groupSlide.classList.toggle('open'));

// ── Input buttons ──
btnMic.addEventListener('click', switchToMic);

btnMp3.addEventListener('click', () => {
    if (!soundLoaded) {
        fileInput.click();
    } else {
        switchToMP3();
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (sound) sound.stop();
    soundLoaded = false;
    sound = loadSound(url, () => {
        soundLoaded = true;
        btnMp3.textContent = 'MP3';
        fft.setInput(sound);
        switchToMP3();
        userStartAudio().then(() => { sound.play(); });
    });
});

// ── Color buttons ──
btnIntense.addEventListener('click', () => {
    colorMode2 = 'intense';
    rainbow = false;
    btnIntense.classList.add('active');
    btnRainbow.classList.remove('active');
    btnSuper.classList.remove('active');
});

btnRainbow.addEventListener('click', () => {
    colorMode2 = 'rainbow';
    rainbow = true;
    btnRainbow.classList.add('active');
    btnIntense.classList.remove('active');
    btnSuper.classList.remove('active');
});

btnSuper.addEventListener('click', () => {
    colorMode2 = 'super';
    btnSuper.classList.add('active');
    btnIntense.classList.remove('active');
    btnRainbow.classList.remove('active');
});

colorPicker.addEventListener('input', (e) => {
    colorMode2 = 'pick';
    btnIntense.classList.remove('active');
    btnRainbow.classList.remove('active');
    btnSuper.classList.remove('active');
    // Convert hex to HSB hue
    let c = color(e.target.value);
    colorMode(HSB, 360, 100, 100, 100);
    pickedHue = hue(c);
});

// ── Wave buttons ──
btnNormal.addEventListener('click', () => {
    bars = false;
    waveHistory = [];
    btnNormal.classList.add('active');
    btnBars.classList.remove('active');
});

btnBars.addEventListener('click', () => {
    bars = true;
    btnBars.classList.add('active');
    btnNormal.classList.remove('active');
});

// ── Slide buttons ──
btnSlideOn.addEventListener('click', () => {
    slide = true;
    slideBuffer = [];
    btnSlideOn.classList.add('active');
    btnSlideOff.classList.remove('active');
});

btnSlideOff.addEventListener('click', () => {
    slide = false;
    slideBuffer = [];
    btnSlideOff.classList.add('active');
    btnSlideOn.classList.remove('active');
});

// ── Audio switching ──
function switchToMic() {
    mode = 'mic';
    if (sound && sound.isPlaying()) sound.stop();
    mic.start();
    fft.setInput(mic);
    btnMic.classList.add('active');
    btnMp3.classList.remove('active');
    hudMode.textContent = 'MODE: MICROPHONE';
    if (!lyricsStarted) {
        startAssemblyAI((text) => showLine(text));
        lyricsStarted = true;
    }
}

function switchToMP3() {
    mode = 'mp3';
    if (mic) mic.stop();
    if (sound) {
        fft.setInput(sound);
        if (!sound.isPlaying()) sound.play();
    }
    btnMp3.classList.add('active');
    btnMic.classList.remove('active');
    hudMode.textContent = 'MODE: MP3';
    stopAssemblyAI();
    lyricsStarted = false;
}

// ── p5 sketch ──
function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100, 100);

    pg = createGraphics(windowWidth, windowHeight);
    pg.colorMode(HSB, 360, 100, 100, 100);
    pg.clear();

    mic = new p5.AudioIn();
    fft = new p5.FFT(0.98, 1024);
    mic.start();
    fft.setInput(mic);

    if (getAudioContext().state !== 'running') {
        hudPaused.classList.remove('hidden');
    }
    startAssemblyAI((text) => showLine(text));
    lyricsStarted = true;
}

function draw() {
    background(240, 80, 10);

    let waveform = fft.waveform();
    let intensity = fft.getEnergy("mid");
    let ampScale = (mode === 'mp3' ? 0.55 : 1.0) * 6;

    if (smoothedWave.length === 0) smoothedWave = new Array(waveform.length).fill(0);
    for (let i = 0; i < waveform.length; i++) {
        smoothedWave[i] = lerp(smoothedWave[i], waveform[i], slide ? 0.03 : 0.08);
    }

    let currentHue;
    if (colorMode2 === 'rainbow') {
        currentHue = (millis() / rainbowSpeed) % 360;
    } else if (colorMode2 === 'super') {
        let totalAmplitude = 0;
        for (let i = 0; i < waveform.length; i++) totalAmplitude += abs(waveform[i]);
        let average = totalAmplitude / waveform.length;
        currentHue = map(average, 0, 0.1, 0, 360);
        console.log(currentHue);
    } else if (colorMode2 === 'pick') {
        currentHue = pickedHue;
    } else {
        // intense — original behavior
        let totalAmplitude = 0;
        for (let i = 0; i < waveform.length; i++) totalAmplitude += abs(waveform[i]);
        let average = totalAmplitude / waveform.length;
        currentHue = map(average, 0, 0.2, 100, 300);
        console.log(currentHue);
    }

    if (slide) {
        drawSlide(waveform, currentHue, ampScale);
    } else {
        waveHistory.push({
            data: [...smoothedWave],
            hue: currentHue,
            bright: map(intensity, 0, 255, 40, 100)
        });
        if (waveHistory.length > HISTORY_LENGTH) waveHistory.shift();

        for (let h = 0; h < waveHistory.length; h++) {
            let alpha = pow(map(h, 0, waveHistory.length - 1, 0, 1), 2) * 100;
            if (bars) {
                drawBarsStyle(waveHistory[h].data, alpha, waveHistory[h].hue, ampScale);
            } else {
                drawSineStyle(waveHistory[h].data, alpha, waveHistory[h].hue, ampScale);
            }
        }
    }

    drawLyrics();
    drawAssemblyIndicator();
}

function drawSlide(waveform, hueValue, ampScale) {
    slideOffset = (slideOffset + slideSpeed) % smoothedWave.length;

    stroke(hueValue, 80, 100);
    strokeWeight(7);
    noFill();

    let centerIdx = (Math.floor(smoothedWave.length / 2) + slideOffset) % smoothedWave.length;
    let rawY = map(smoothedWave[centerIdx] * ampScale, -1, 1, 0, height);

    let prevIdx = (Math.floor(smoothedWave.length / 2) + slideOffset - 4 + smoothedWave.length) % smoothedWave.length;
    let nextIdx = (Math.floor(smoothedWave.length / 2) + slideOffset + 4) % smoothedWave.length;
    let prevY = map(smoothedWave[prevIdx] * ampScale, -1, 1, 0, height);
    let nextY = map(smoothedWave[nextIdx] * ampScale, -1, 1, 0, height);
    let rawAngle = atan2(nextY - prevY, width / smoothedWave.length * 8);

    // Smooth position and angle independently — higher lerp = more responsive, lower = floatier
    surferY = lerp(surferY, rawY, 0.1);
    surferAngle = lerp(surferAngle, rawAngle, 0.1);

    beginShape();
    curveVertex(0, map(smoothedWave[slideOffset % smoothedWave.length] * ampScale, -1, 1, 0, height));
    for (let i = 0; i < smoothedWave.length; i += 10) {
        let idx = (i + slideOffset) % smoothedWave.length;
        let x = map(i, 0, smoothedWave.length, 0, width);
        let y = map(smoothedWave[idx] * ampScale, -1, 1, 0, height);
        curveVertex(x, y);
    }
    curveVertex(width, map(smoothedWave[(slideOffset + smoothedWave.length - 1) % smoothedWave.length] * ampScale, -1, 1, 0, height));
    endShape();

    if (surferImg) {
        let surferW = 250;
        let surferH = 250;
        push();
        translate(width / 2, surferY - surferH / 2);
        rotate(surferAngle);
        imageMode(CENTER);
        image(surferImg, 0, 0, surferW, surferH);
        pop();
    }
}

function drawSineStyle(wave, alpha, hueValue, ampScale) {
    stroke(hueValue, 80, 100, alpha);
    strokeWeight(7);
    noFill();
    beginShape();
    curveVertex(0, map(wave[0] * ampScale, -1, 1, 0, height));
    for (let i = 0; i < wave.length; i += 10) {
        let x = map(i, 0, wave.length, 0, width);
        let y = map(wave[i] * ampScale, -1, 1, 0, height);
        curveVertex(x, y);
    }
    curveVertex(width, map(wave[wave.length - 1] * ampScale, -1, 1, 0, height));
    endShape();
}

function drawBarsStyle(wave, alpha, hueValue, ampScale) {
    stroke(hueValue, 80, 100, alpha);
    strokeWeight(4);
    for (let i = 0; i < wave.length; i += 20) {
        let x = map(i, 0, wave.length, 0, width);
        let h = map(wave[i] * ampScale, -1, 1, 0, height);
        line(x, height / 2, x, h);
    }
}

function mousePressed() {
    if (getAudioContext().state !== 'running') {
        getAudioContext().resume().then(() => {
            hudPaused.classList.add('hidden');
        });
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}