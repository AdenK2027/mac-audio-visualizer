let mic, fft, sound;
let mode = 'mic';
let rainbow = false;
let soundLoaded = false;
let smoothedWave = [];

// ── DOM refs ──
const groupInput  = document.getElementById('group-input');
const groupColor  = document.getElementById('group-color');
const tabInput    = document.getElementById('tab-input');
const tabColor    = document.getElementById('tab-color');
const btnMic      = document.getElementById('btn-mic');
const btnMp3      = document.getElementById('btn-mp3');
const btnBass     = document.getElementById('btn-bass');
const btnRainbow  = document.getElementById('btn-rainbow');
const fileInput   = document.getElementById('file-input');
const hudMode     = document.getElementById('hud-mode');
const hudColor    = document.getElementById('hud-color');
const hudPaused   = document.getElementById('hud-paused');

// ── Tab toggles ──
tabInput.addEventListener('click', () => {
  groupInput.classList.toggle('open');
});

tabColor.addEventListener('click', () => {
  groupColor.classList.toggle('open');
});

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
    switchToMP3();
  });
});

// ── Color buttons ──
btnBass.addEventListener('click', () => {
  rainbow = false;
  btnBass.classList.add('active');
  btnRainbow.classList.remove('active');
  hudColor.textContent = 'COLOR: BASS';
});

btnRainbow.addEventListener('click', () => {
  rainbow = true;
  btnRainbow.classList.add('active');
  btnBass.classList.remove('active');
  hudColor.textContent = 'COLOR: RAINBOW';
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
}

function switchToMP3() {
  mode = 'mp3';
  mic.stop();
  fft.setInput(sound);
  sound.loop();
  btnMp3.classList.add('active');
  btnMic.classList.remove('active');
  hudMode.textContent = 'MODE: MP3';
}

// ── p5 sketch ──
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100);

  mic = new p5.AudioIn();
  fft = new p5.FFT(0.98, 1024);
  mic.start();
  fft.setInput(mic);

  // show paused warning if audio context not running
  if (getAudioContext().state !== 'running') {
    hudPaused.classList.remove('hidden');
  }
}

function draw() {
    background(240, 80, 10);

    let waveform = fft.waveform();
    let bass = fft.getEnergy('bass');
    let hueValue;

    if (rainbow) {
        hueValue = (millis() / 20) % 360;
    } else {
        hueValue = map(bass, 0, 255, 180, 240);
    }

    stroke(hueValue, 80, 100);
    strokeWeight(3);
    noFill();

    let ampScale = mode === 'mp3' ? 0.55 : 1.0;
    
    // Initialize the smoothed array if it's empty
    if (smoothedWave.length === 0) {
        smoothedWave = new Array(waveform.length).fill(0);
    }

    beginShape();
    for (let i = 0; i < waveform.length; i += 10) {
        // LERP: 0.1 means "only move 10% toward the target each frame"
        // Lower this number (e.g., 0.05) for even less movement
        smoothedWave[i] = lerp(smoothedWave[i], waveform[i], 0.1);

        let x = map(i, 0, waveform.length, 0, width);
        let y = map(smoothedWave[i] * ampScale*4, -1, 1, 0, height);
        curveVertex(x, y);
    }
    endShape();
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