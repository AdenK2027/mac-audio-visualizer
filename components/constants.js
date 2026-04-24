// constants.js

// ── App Settings ──
const FIRE_COLS = 80;
const HISTORY_LENGTH = 4;

// ── Audio & State ──
let mic, fft, fftFire, sound;
let mode = 'mic';
let rainbow = false;
let rainbowSpeed = 20; //raise for slower
let colorMode2 = 'intense';
let pickedHue = 200;
let bars = false, slide = false, fire = false, trails = false;
let soundLoaded = false;
let smoothedWave = [];
let waveHistory = [];
let slideOffset = 0, slideSpeed = 8;
let surferImg, logsImg, surferY = 0, surferAngle = 0, planetImg;
let currentIntensity = 0;
let split = false;
let backMode = 'default';
let planets = [];
let avgAmplitude = 1;
let warpMode = 'off';  // 'off' | 'intro' | 'continuous'

// ── Fire State ──
let flameHeight = [], flameTarget = [], emberList = [];

// ── DOM References ──
let groupInput, groupColor, groupWave, groupSlide, groupTrail, groupBack;
let tabInput, tabColor, tabWave, tabSlide, tabTrail, tabBack;
let btnMic, btnMp3, btnIntense, btnRainbow, btnNormal, btnBars, btnFire;
let btnSlideOn, btnSlideOff, btnTrails, btnTrailsOff, btnSuper;
let colorPicker, fileInput, hudPaused;
let btnPrev, btnPause, btnNext;
let btnDefault, btnSpace, btnWarp, btnOcean, btnForest;
