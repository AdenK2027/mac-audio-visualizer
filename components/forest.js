// forest.js
let forestBuffer; 
let forestShader;
let sunCoords;

const vert = `
  precision highp float;
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vTexCoord;
  void main() {
    vTexCoord = aTexCoord;
    gl_Position = vec4(aPosition, 1.0);
  }
`;

const frag = `
  precision highp float;
  varying vec2 vTexCoord;
  uniform sampler2D u_background; 
  uniform float u_time;
  uniform float u_intensity;
  uniform vec2 u_sunPos;

  void main() {
    // Correcting for p5's Y-flip in textures
    vec2 uv = vec2(vTexCoord.x, 1.0 - vTexCoord.y);
    
    // --- REACTIVE WIND SWAY ---
    // We only apply displacement to the bottom portion of the texture
    // so the sky and distant mountains stay perfectly still.
    float swayMask = smoothstep(0.4, 0.0, uv.y); // Only bottom 40% sways
    float wind = sin(u_time * 1.2 + uv.x * 5.0) * (0.003 + u_intensity * 0.01) * swayMask;
    
    // Sample the image with the calculated wind offset
    vec2 distortedUV = vec2(uv.x + wind, uv.y);
    vec4 bg = texture2D(u_background, distortedUV);
    vec3 color = bg.rgb;

    // --- REACTIVE SUN GLOW ---
    // This pulses over the PNG to make the static image feel 'alive'
    float sunDist = distance(uv, u_sunPos);
    float glow = (0.05 / (sunDist + 0.15)) * (1.0 + u_intensity * 0.8);
    // Warm golden glow
    color += glow * vec3(1.0, 0.6, 0.3) * 0.4;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function initForest() {
    // Match the buffer to your specific window size
    forestBuffer = createGraphics(windowWidth, windowHeight, WEBGL);
    forestShader = forestBuffer.createShader(vert, frag);
    
    // Fixed sun position or random based on your preference
    sunCoords = [random(0.3, 0.7), random(0.6, 0.8)];
}

function drawForestBackground() {
    // Safety check: ensure image is loaded
    if (!forestImg) return;

    forestBuffer.shader(forestShader);
    
    // Update the GPU with the latest data
    forestShader.setUniform('u_background', forestImg);
    forestShader.setUniform('u_time', millis() / 1000.0);
    forestShader.setUniform('u_intensity', currentIntensity || 0);
    forestShader.setUniform('u_sunPos', sunCoords);
    
    // Draw the fullscreen quad
    forestBuffer.beginShape(TRIANGLES);
    forestBuffer.vertex(-1, -1, 0, 0, 0);
    forestBuffer.vertex(1, -1, 0, 1, 0);
    forestBuffer.vertex(1, 1, 0, 1, 1);
    forestBuffer.vertex(1, 1, 0, 1, 1);
    forestBuffer.vertex(-1, 1, 0, 0, 1);
    forestBuffer.vertex(-1, -1, 0, 0, 0);
    forestBuffer.endShape();

    // Paste the result to the main 2D canvas
    push();
    resetMatrix();
    image(forestBuffer, 0, 0, width, height);
    pop();
}