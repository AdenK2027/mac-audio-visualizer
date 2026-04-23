// sketch.js

let planetPool = [];
let availablePlanets = [];
const TOTAL_PLANETS = 6;
function preload() {
    surferImg = loadImage('SpaceSurfer.png');
    logsImg = loadImage('logs.png');
    for (let i = 1; i <= TOTAL_PLANETS; i++) {
        planetPool.push(loadImage(`planet${i}.png`));
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100, 100);

    mic = new p5.AudioIn();

    //adjust smoothing, bins
    fft = new p5.FFT(0.98, 1024);
    fftFire = new p5.FFT(0.1, 1024);

    mic.start();
    fft.setInput(mic);
    fftFire.setInput(mic);

    flameHeight = new Array(FIRE_COLS).fill(0);
    flameTarget = new Array(FIRE_COLS).fill(0);

    // Initialize DOM elements and button listeners
    initUI(); 
    
    if (getAudioContext().state !== 'running') {
        hudPaused.classList.remove('hidden');
    }

    availablePlanets = [...planetPool];
    planets = []; 
    let planetCount = min(8, availablePlanets.length);
    for (let i = 0; i < planetCount; i++) {
        planets.push(new PooledPlanet());
    }

    stars = []
    for (let i = 0; i < 40; i++) {
        stars.push(new Star());
    }
}

function draw() {
    background(240, 80, 10);
    if (backMode === 'space') {
        for (let s of stars) {
            s.update();
            s.display();
        }
        for (let p of planets) {
            p.update();
            p.display();
        }
    }

    // ── LYRIC SYNC ENGINE ──
    if (mode === 'mp3' && sound && sound.isPlaying()) {
        // Get the full object from lrc-parser.js
        let lyricObj = getCurrentLyricLine(sound.currentTime());
        if (lyricObj) {
            showLine(lyricObj); // Pass the whole object
        }
    }

    //grabbing sound data
    let waveform = fft.waveform();
    let spectrumNormal = fft.analyze();
    let spectrumFast = fftFire.analyze();

    currentIntensity = fft.getEnergy("mid") / 255;
    let ampScale = (mode === 'mp3' ? 0.25 : 1.0)*4;

    if (smoothedWave.length === 0) smoothedWave = new Array(waveform.length).fill(0);
    let totalAmplitude = 0;
    for (let i = 0; i < waveform.length; i++) {
        smoothedWave[i] = lerp(smoothedWave[i], waveform[i], slide ? 0.03 : 0.08);
        totalAmplitude += abs(waveform[i]);
    }
    let avgAmplitude = totalAmplitude / waveform.length;

    let currentHue = calculateHue(avgAmplitude);

    // Rendering from modular files (fire.js / waves.js)
    if (slide) {
        drawSlide(waveform, currentHue, ampScale);
    } else if (split) {
        drawSplitStyle(spectrumFast, currentHue, ampScale);
    } else if (fire) {
        waveHistory = [];
        drawFireStyle(); 
    } else if (trails) {
        handleTrails(currentHue, ampScale);
    } else {
        waveHistory = [];
        if (bars) drawBarsStyle([...smoothedWave], 100, currentHue, ampScale);
        else      drawSineStyle([...smoothedWave], 100, currentHue, ampScale);
    }

    drawLyrics();
    updatePlaybackUI();
    initTabsToggle();
}

function calculateHue(avg) {
    if (colorMode2 === 'rainbow') return (millis() / rainbowSpeed) % 360;
    if (colorMode2 === 'super')   return map(avg, 0, 0.15, 0, 360);
    if (colorMode2 === 'pick')    return pickedHue;
    return map(avg, 0, 0.3, 100, 360);
}

function handleTrails(currentHue, ampScale) {
    waveHistory.push({ data: [...smoothedWave], hue: currentHue });
    if (waveHistory.length > HISTORY_LENGTH) waveHistory.shift();
    for (let h = 0; h < waveHistory.length; h++) {
        let alpha = map(h, 0, waveHistory.length - 1, 25, 100);
        if (bars) drawBarsStyle(waveHistory[h].data, alpha, waveHistory[h].hue, ampScale);
        else      drawSineStyle(waveHistory[h].data, alpha, waveHistory[h].hue, ampScale);
    }
}

// ── UI Initialization ──
function initUI() {
    // 1. Link the variables in constants.js to actual HTML elements
    groupInput   = document.getElementById('group-input');
    groupColor   = document.getElementById('group-color');
    groupWave    = document.getElementById('group-wave');
    groupSlide   = document.getElementById('group-slide');
    groupTrail   = document.getElementById('group-trail');
    groupBack = document.getElementById('group-back');
    tabInput     = document.getElementById('tab-input');
    tabColor     = document.getElementById('tab-color');
    tabWave      = document.getElementById('tab-wave');
    tabSlide     = document.getElementById('tab-slide');
    tabTrail     = document.getElementById('tab-trail');
    tabBack = document.getElementById('tab-back');
    btnMic       = document.getElementById('btn-mic');
    btnMp3       = document.getElementById('btn-mp3');
    btnIntense   = document.getElementById('btn-intense');
    btnRainbow   = document.getElementById('btn-rainbow');
    btnNormal    = document.getElementById('btn-normal');
    btnBars      = document.getElementById('btn-bars');
    btnFire      = document.getElementById('btn-fire');
    btnSlideOn   = document.getElementById('btn-slide-on');
    btnSlideOff  = document.getElementById('btn-slide-off');
    btnTrails    = document.getElementById('btn-trails');
    btnTrailsOff = document.getElementById('btn-no-trails');
    btnSuper     = document.getElementById('btn-super');
    colorPicker  = document.getElementById('color-picker');
    fileInput    = document.getElementById('file-input');
    hudPaused    = document.getElementById('hud-paused');
    btnPrev      = document.getElementById('btn-prev');
    btnPause     = document.getElementById('btn-pause');
    btnNext      = document.getElementById('btn-next');
    btnSplit = document.getElementById('btn-split');
    btnDefault = document.getElementById('btn-default');
    btnSpace = document.getElementById('btn-space');

    // 2. Add Event Listeners
    tabInput.addEventListener('click',  () => groupInput.classList.toggle('open'));
    tabColor.addEventListener('click',  () => groupColor.classList.toggle('open'));
    tabWave.addEventListener('click',   () => groupWave.classList.toggle('open'));
    tabSlide.addEventListener('click',  () => groupSlide.classList.toggle('open'));
    tabTrail.addEventListener('click',  () => groupTrail.classList.toggle('open'));
    tabBack.addEventListener('click', () => groupBack.classList.toggle('open'));

    btnMic.addEventListener('click', switchToMic);
    btnMp3.addEventListener('click', () => { if (!soundLoaded) fileInput.click(); else switchToMP3(); });

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
            fftFire.setInput(sound);
            switchToMP3();

            // AUTO-LOAD MATCHING LRC
            let lrcName = file.name.split('.').slice(0, -1).join('.') + '.lrc';
            fetch(`songs/${lrcName}`)
                .then(r => r.text())
                .then(data => {
                    parsedLyrics = parseLRC(data);
                    console.log("Lyrics paired successfully.");
                })
                .catch(err => console.log("LRC file not found in /songs"));
        });
    });

    btnIntense.addEventListener('click', () => setColorMode('intense'));
    btnRainbow.addEventListener('click', () => setColorMode('rainbow'));
    btnSuper.addEventListener('click',   () => setColorMode('super'));
    
    colorPicker.addEventListener('input', (e) => {
        colorMode2 = 'pick';
        btnIntense.classList.remove('active');
        btnRainbow.classList.remove('active');
        btnSuper.classList.remove('active');
        let c = color(e.target.value);
        colorMode(HSB, 360, 100, 100, 100);
        pickedHue = hue(c);
    });

    btnNormal.addEventListener('click', () => setWaveMode('normal'));
    btnBars.addEventListener('click',   () => setWaveMode('bars'));
    btnFire.addEventListener('click',   () => setWaveMode('fire'));
    btnSplit.addEventListener('click', () => setWaveMode('split'));


    btnSlideOn.addEventListener('click', () => {
        slide = true; btnSlideOn.classList.add('active'); btnSlideOff.classList.remove('active');
    });
    btnSlideOff.addEventListener('click', () => {
        slide = false; btnSlideOff.classList.add('active'); btnSlideOn.classList.remove('active');
    });

    btnTrails.addEventListener('click', () => {
        trails = true; btnTrails.classList.add('active'); btnTrailsOff.classList.remove('active');
    });
    btnTrailsOff.addEventListener('click', () => {
        trails = false; btnTrailsOff.classList.add('active'); btnTrails.classList.remove('active');
    });

    btnPrev.addEventListener('click', () => {
        if (sound && sound.isPlaying()) sound.jump(max(0, sound.currentTime() - 5));
    });
    btnPause.addEventListener('click', () => {
        if (!sound) return;
        if (sound.isPlaying()) { sound.pause(); btnPause.textContent = 'Play'; }
        else { sound.play(); btnPause.textContent = 'Pause'; }
    });
    btnNext.addEventListener('click', () => {
        if (sound && sound.isPlaying()) sound.jump(min(sound.duration(), sound.currentTime() + 5));
    });

    btnDefault.addEventListener('click', () => {
        backMode = 'default';
        btnDefault.classList.add('active');
        btnSpace.classList.remove('active');
    });

    btnSpace.addEventListener('click', () => {
        backMode = 'space';
        btnSpace.classList.add('active');
        btnDefault.classList.remove('active');
    });
}

// ── Shared Audio/Visual Setters ──
function setColorMode(m) {
    colorMode2 = m;
    rainbow = (m === 'rainbow');
    btnIntense.classList.toggle('active', m === 'intense');
    btnRainbow.classList.toggle('active', m === 'rainbow');
    btnSuper.classList.toggle('active',   m === 'super');
}

function setWaveMode(m) {
    bars = (m === 'bars');
    fire = (m === 'fire');
    split = (m === 'split');
    if (!fire) { flameHeight = new Array(FIRE_COLS).fill(0); emberList = []; }
    waveHistory = [];
    btnNormal.classList.toggle('active', m === 'normal');
    btnBars.classList.toggle('active',   m === 'bars');
    btnFire.classList.toggle('active',   m === 'fire');
    btnSplit.classList.toggle('active', m === 'split');
}

function switchToMic() {
    mode = 'mic';
    if (sound && sound.isPlaying()) sound.stop();
    mic.start();
    fft.setInput(mic);
    fftFire.setInput(mic);
    btnMic.classList.add('active');
    btnMp3.classList.remove('active');
}

function switchToMP3() {
    mode = 'mp3';
    mic.stop();
    if (sound) {
        fft.setInput(sound);
        fftFire.setInput(sound);
        if (!sound.isPlaying() && !sound.isPaused()) sound.play();
    }
    btnMp3.classList.add('active');
    btnMic.classList.remove('active');
}

function updatePlaybackUI() {
    const controls = document.getElementById('controls');
    if (controls) {
        controls.classList.toggle('visible', mode === 'mp3' && mouseX < 250 && mouseY < 80);
    }

    const showTabs = document.getElementById('show-tabs');
    if (showTabs) {
        const mouseInRightZone = (mouseX > width - 120 && mouseY < 40);
        showTabs.classList.toggle('visible', mouseInRightZone);
    }
}

function initTabsToggle() {
    const showTabsBtn = document.getElementById('show-tabs-btn');
    const tabBar = document.getElementById('tab-bar');

    if (showTabsBtn && tabBar) {
        showTabsBtn.addEventListener('click', () => {
            tabBar.classList.toggle('hidden');
            if (tabBar.classList.contains('hidden')) {
                showTabsBtn.textContent = 'Show Tabs';
            } else {
                showTabsBtn.textContent = 'Hide Tabs';
            }
        });
    }
}

function mousePressed() {
    if (getAudioContext().state !== 'running') {
        getAudioContext().resume().then(() => hudPaused.classList.add('hidden'));
    }
}

function keyPressed() {
  if (key === 'f' || key === 'F') {
    let fs = fullscreen();
    fullscreen(!fs);
  }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }