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

        this.aspect = this.img.width / this.img.height;

        this.z = random(0.1, 5);

        this.size = map(this.z, 0.1, 1.0, 50, 100); 
        this.speed = map(this.z, 0.1, 5, 0.005, 0.2); 

        this.x = initial ? random(width) : width + (this.size * this.aspect) + random(200, 1000);
        this.y = random(height);
    }

    update() {
        this.x -= this.speed;
        if (this.x < -(this.size * this.aspect)) {
            this.reset();
        }
    }

    display() {
        push();
        translate(this.x, this.y);
        
        // Music reaction scaled by Z so closer planets pulse more
        let pulseFactor = currentIntensity * (5 * this.z);
        let d = this.size + pulseFactor;
        
        let finalW = d * this.aspect;
        let finalH = d;

        imageMode(CENTER);
        image(this.img, 0, 0, finalW, finalH); 
        pop();
    }
}

class Star {
    constructor() {
        this.x = random(width);
        this.y = random(height);
        // Deep parallax: stars should be 0.01 to 0.1 range
        this.z = random(0.01, 0.2); 
        this.size = map(this.z, 0.01, 0.2, 0.5, 3);
        this.speed = map(this.z, 0.01, 0.2, 0.0001, 0.001);
        this.brightness = random(150, 255);
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
        noStroke();
        // Twinkle effect using sine wave + intensity
        let twinkle = sin(millis() * 0.01 * this.z) * 20;
        fill(255, this.brightness + twinkle);
        circle(this.x, this.y, this.size);
    }
}