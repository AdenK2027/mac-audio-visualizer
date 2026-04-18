let mic;
let fft;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // This creates an audio input
  mic = new p5.AudioIn();
  mic.start();
  
  // This analyzes the audio
  fft = new p5.FFT();
  fft.setInput(mic);
}

function draw() {
  background(20); // Dark grey background

  // Get the waveform data
  let waveform = fft.waveform();

  // Style the line
  noFill();
  stroke(0, 255, 255); // Neon Cyan
  strokeWeight(3);

  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    // Map the audio data to screen coordinates
    let x = map(i, 0, waveform.length, 0, width);
    let y = map(waveform[i], -1, 1, 0, height);
    vertex(x, y);
  }
  endShape();
}

// Browser security requires a click to start audio
function touchStarted() {
  getAudioContext().resume();
}