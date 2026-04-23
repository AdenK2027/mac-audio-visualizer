class PooledPlanet {
    constructor() {
        this.img = null; 
        this.reset(true);
    }

    reset(initial = false) {
        if (this.img) {
            availablePlanets.push(this.img);
        }
        if (availablePlanets.length > 0) {
            // Shuffle/Pick a random index from available
            let idx = floor(random(availablePlanets.length));
            this.img = availablePlanets.splice(idx, 1)[0];
        } else {
            // Fallback: If no images are available, stay off-screen or use a placeholder
            this.img = planetPool[0]; 
        }

        let weight = pow(random(0, 1), 3);
        this.z = map(weight, 0, 1, 0.1, 5);
        this.size = map(this.z, 0.1, 5, 50, 500); 
        this.speed = map(this.z, 0.1, 5, 0.005, 0.2);
        this.aspect = this.img.width / this.img.height;
        //                     size     map  big |delay |small delay
        this.growDelay = map(this.size, 50, 500, 800, 200);

        this.x = initial ? random(width) : width + (this.size * this.aspect) + random(200, 1000);
        this.y = random(height);
    }

    update() {
        if (this.leaving) {
            this.x = lerp(this.x, this.leaveTargetX, 0.08); // was 0.06
            this.y = lerp(this.y, this.leaveTargetY, 0.08);
            this.leaveScale = lerp(this.leaveScale, 4.0, 0.06);
            return;
        }
        this.x -= this.speed;
        if (this.x < -(this.size * this.aspect)) this.reset();
    }

    display(scale = 1.0) {
        let s = this.leaving ? this.leaveScale : scale;

        let cx = width / 2;
        let cy = height / 2;
        
        let renderX, renderY;
        
        if (this.leaving) {
            renderX = this.x;
            renderY = this.y;
        } else {
            // Use lerp to move from center (0.0 scale) to target x,y (1.0 scale)
            renderX = lerp(cx, this.x, scale);
            renderY = lerp(cy, this.y, scale);
        }

        push();
        translate(renderX, renderY);
        
        let d = this.size * s;
        imageMode(CENTER);
        
        // Draw your image using the calculated scale and aspect ratio
        image(this.img, 0, 0, d * this.aspect, d);
        pop();
    }
    
    startLeaving() {
        this.leaving = true;
        this.leaveScale = 1.0;

        let corners = [
            { x: 0,     y: 0      },
            { x: width, y: 0      },
            { x: 0,     y: height },
            { x: width, y: height }
        ];
        let nearest = corners.reduce((a, b) =>
            dist(this.x, this.y, a.x, a.y) < dist(this.x, this.y, b.x, b.y) ? a : b
        );

        // Push target well beyond the corner so large planets fully exit the screen
        let overshoot = this.size * 3;
        let dx = nearest.x === 0 ? -1 : 1;
        let dy = nearest.y === 0 ? -1 : 1;
        this.leaveTargetX = nearest.x + dx * overshoot;
        this.leaveTargetY = nearest.y + dy * overshoot;
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