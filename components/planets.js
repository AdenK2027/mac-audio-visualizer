class PooledPlanet {
    constructor() {
        this.img = null; 
        this.reset(true);
    }

    reset(initial = false) {
        if (this.img) availablePlanets.push(this.img);
        
        if (availablePlanets.length > 0) {
            let idx = floor(random(availablePlanets.length));
            this.img = availablePlanets.splice(idx, 1)[0];
        } else {
            this.img = planetPool[0]; 
        }
        
        // Rules: 'dust' has a storm, most planets spin, 'flat' are static stickers
        this.hasStorm = this.img.planetType === 'dust';
        this.isSpinning = this.img.planetType !== 'flat';
        this.textureOffset = random(1); // Random horizontal start
        
        this.textureYOffset = random(-0.25, 0.25);

        let weight = pow(random(0, 1), 3);
        this.z = map(weight, 0, 1, 0.1, 5);
        
        this.size = map(this.z, 0.1, 5, 50, 500); 
        this.speed = map(this.z, 0.1, 5, 0.005, 0.2);
        
        // We use the unique aspect ratio of the assigned image
        this.aspect = this.img.width / this.img.height;
        this.growDelay = map(this.size, 50, 500, 800, 200);

        this.textureOffset = random(1);
        let direction = random(1) > .5 ? -1 : 1;
        // Vary rotation speed slightly per planet for realism
        this.rotSpeed = direction*map(this.z, 0.1, 5, 0.00005, 0.0001);

        if (this.hasStorm) {
            this.stormAspect = stormImg.width / stormImg.height;
            this.stormRotationSpeed = 0.2;
            this.currentStormAngle = random(TWO_PI);
            // Give the storm a random starting position on the "map"
            this.stormXOffset = random(1); 
        }

        this.x = initial ? random(width) : width + (this.size * this.aspect) + random(200, 1000);
        this.y = random(height);
    }

    update() {
        if (this.leaving) {
            this.x = lerp(this.x, this.leaveTargetX, 0.08);
            this.y = lerp(this.y, this.leaveTargetY, 0.08);
            this.leaveScale = lerp(this.leaveScale, 4.0, 0.06);
            return;
        }

        this.x -= this.speed;
        if (this.x < -(this.size * this.aspect)) this.reset();

        if (this.isSpinning) {
            this.textureOffset += this.rotSpeed;
            if (this.textureOffset > 1.0) this.textureOffset -= 1.0;
            if (this.textureOffset < 0) this.textureOffset += 1.0;
        }

        if (this.hasStorm) {
            this.currentStormAngle += this.stormRotationSpeed * (-1/60.0);
        }
    }

    display(scale = 1.0) {
        let s = this.leaving ? this.leaveScale : scale;
        if (s <= 0) return;

        let renderX = this.leaving ? this.x : lerp(width / 2, this.x, scale);
        let renderY = this.leaving ? this.y : lerp(height / 2, this.y, scale);

        push();
        translate(renderX, renderY);
        let d = this.size * s;
        
        if (this.isSpinning) {
            drawingContext.save();
            
            // 1. Mask
            drawingContext.beginPath();
            drawingContext.arc(0, 0, d / 2, 0, Math.PI * 2);
            drawingContext.clip();

            // 2. Texture Surface
            let h = d * 1.5; 
            let w = h * this.aspect;
            let progress = this.textureOffset % 1;
            let scrollX = progress * w;

            imageMode(CORNER);
            let bleed = 2; 
            // Use this.img instead of a hardcoded texture
            image(this.img, -scrollX - w, -h/2, w + bleed, h);
            image(this.img, -scrollX,     -h/2, w + bleed, h);
            image(this.img, -scrollX + w, -h/2, w + bleed, h);

            // 3. Storm Logic (Locked to texture)
            if (this.hasStorm) {
                push();
                imageMode(CENTER);
                // Position storm relative to the scrolling texture
                let stormX = (w / 2) - ((progress + this.stormXOffset) % 1 * w);
                
                // Only draw if within reasonable distance of the "front"
                if (abs(stormX) < d * 0.6) {
                    translate(stormX, 0); 
                    rotate(this.currentStormAngle);
                    drawingContext.globalAlpha = 0.5; 
                    let stormSize = d * 0.35; 
                    image(stormImg, 0, 0, stormSize * this.stormAspect, stormSize);
                    drawingContext.globalAlpha = 1.0;
                }
                pop();
            }

            // 4. Shadow
            let shadowGrad = drawingContext.createRadialGradient(0, 0, d * 0.1, 0, 0, d * 0.5);
            shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');     
            shadowGrad.addColorStop(0.7, 'rgba(0,0,0,0.1)'); 
            shadowGrad.addColorStop(1, 'rgba(0,0,0,0.6)');   
            drawingContext.fillStyle = shadowGrad;
            drawingContext.fillRect(-d/2, -d/2, d, d);
            
            drawingContext.restore();
        } else {
            imageMode(CENTER);
            image(this.img, 0, 0, d * this.aspect, d);
        }
        pop();
    }

    startLeaving() {
        this.leaving = true;
        this.leaveScale = 1.0;
        let corners = [{x:0,y:0},{x:width,y:0},{x:0,y:height},{x:width,y:height}];
        let nearest = corners.reduce((a, b) => dist(this.x, this.y, a.x, a.y) < dist(this.x, this.y, b.x, b.y) ? a : b);
        let overshoot = this.size * 3;
        this.leaveTargetX = nearest.x + (nearest.x === 0 ? -1 : 1) * overshoot;
        this.leaveTargetY = nearest.y + (nearest.y === 0 ? -1 : 1) * overshoot;
    }
}

class Star {
    constructor() {
        this.x = random(width);
        this.y = random(height);
        // Deep parallax: stars should be 0.01 to 0.1 range
        this.z = random(0.01, 0.2); 
        this.size = map(this.z, 0.01, 0.2, 1, 3);
        this.speed = map(this.z, 0.01, 0.2, 0.0001, 0.001);
        this.brightness = random(200, 255);
        this.lastTwinkle = 0;
    }

    update() {
        this.x -= this.speed;
        // Wrap around seamlessly
        if (this.x < 0) {
            this.x = width;
            this.y = random(height);
        }
    }

    display() {
        if (warpMode != 'off') return;
        noStroke();
        
        // Subtle background twinkle so they don't go totally dark
        let idleTwinkle = sin(millis() * 0.1 * this.z) * 10;
        
        fill(255, this.brightness + idleTwinkle + 200);

        let twinkle = random(1,30);
        let pulse = twinkle > 29 ? random(0.01,2) : 0.05;
        
        // Make the stars physically grow slightly on the beat
        let pulseSize = this.size + pulse;
        
        circle(this.x, this.y, pulseSize);
    }
}