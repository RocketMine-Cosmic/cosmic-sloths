export const ARENA_MAP = {
    'station': 0,
    'asteroid': 1,
    'nebula': 2,
    'void': 3,
    'plasma': 4,
    'crystal': 5,
    'moon': 6,
    'blackhole': 7,
    'mothership': 8,
    'dimension': 9,
    'world_boss_arena': 7 // use blackhole for world boss
};

const vertexShaderSource = `#version 300 es
in vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec2 u_camera;
uniform float u_time;
uniform int u_arenaId;

// Hash functions
float hash12(vec2 p) {
    vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.xx+p3.yz)*p3.zy);
}

// 2D Noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i + vec2(0.0,0.0)), hash12(i + vec2(1.0,0.0)), u.x),
               mix(hash12(i + vec2(0.0,1.0)), hash12(i + vec2(1.0,1.0)), u.x), u.y);
}

// FBM (5 octaves)
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.866025, -0.5, 0.5, 0.866025);
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0 + vec2(100.0);
        a *= 0.5;
    }
    return v;
}

// Voronoi for asteroid/debris field
float voronoi(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minDist = 1.0;
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash22(i + neighbor);
            vec2 diff = neighbor + point - f;
            float dist = length(diff);
            minDist = min(minDist, dist);
        }
    }
    return minDist;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec2 camDist = u_camera * 0.0005; 
    
    vec3 cBase1, cBase2, cBase3, cStarGlow;
    float asteroidDensity = 1.0;
    float starDensity = 1.0;
    float glowPower = 1.0;
    vec3 color = vec3(0.0);
    
    // Settings per arena
    if (u_arenaId == 0) { // station
        cBase1 = vec3(0.0, 0.5, 1.0); cBase2 = vec3(0.0, 0.8, 0.9); cBase3 = vec3(0.0, 0.1, 0.4); cStarGlow = vec3(0.6, 0.9, 1.0); asteroidDensity = 0.0; glowPower = 0.5;
    } else if (u_arenaId == 1) { // asteroid
        cBase1 = vec3(0.9, 0.4, 0.1); cBase2 = vec3(1.0, 0.6, 0.2); cBase3 = vec3(0.3, 0.1, 0.0); cStarGlow = vec3(1.0, 0.8, 0.5); asteroidDensity = 3.5; glowPower = 1.2;
    } else if (u_arenaId == 2) { // nebula
        cBase1 = vec3(1.0, 0.0, 0.7); cBase2 = vec3(0.6, 0.0, 1.0); cBase3 = vec3(0.2, 0.0, 0.3); cStarGlow = vec3(1.0, 0.5, 0.9); glowPower = 2.0; asteroidDensity = 0.0;
    } else if (u_arenaId == 3) { // void
        cBase1 = vec3(0.8, 0.0, 0.0); cBase2 = vec3(1.0, 0.2, 0.0); cBase3 = vec3(0.15, 0.0, 0.0); cStarGlow = vec3(1.0, 0.3, 0.2); asteroidDensity = 0.2; starDensity = 0.2; glowPower = 0.0;
    } else if (u_arenaId == 4) { // plasma
        cBase1 = vec3(1.0, 0.6, 0.0); cBase2 = vec3(1.0, 0.9, 0.2); cBase3 = vec3(0.5, 0.1, 0.0); cStarGlow = vec3(1.0, 1.0, 0.9); glowPower = 3.5; asteroidDensity = 0.0;
    } else if (u_arenaId == 5) { // crystal
        cBase1 = vec3(0.0, 1.0, 0.4); cBase2 = vec3(0.0, 0.9, 0.7); cBase3 = vec3(0.0, 0.2, 0.15); cStarGlow = vec3(0.5, 1.0, 0.8); asteroidDensity = 1.2; glowPower = 1.6;
    } else if (u_arenaId == 6) { // moon
        cBase1 = vec3(0.5, 0.6, 0.8); cBase2 = vec3(0.7, 0.8, 0.9); cBase3 = vec3(0.1, 0.15, 0.25); cStarGlow = vec3(0.8, 0.9, 1.0); asteroidDensity = 2.0; glowPower = 0.5;
    } else if (u_arenaId == 7) { // blackhole
        cBase1 = vec3(0.3, 0.0, 0.7); cBase2 = vec3(0.5, 0.0, 0.9); cBase3 = vec3(0.0, 0.0, 0.1); cStarGlow = vec3(0.7, 0.3, 1.0); glowPower = 0.0; asteroidDensity = 1.8; starDensity = 0.5;
    } else if (u_arenaId == 8) { // mothership
        cBase1 = vec3(0.0, 0.9, 0.9); cBase2 = vec3(0.9, 0.2, 0.9); cBase3 = vec3(0.0, 0.3, 0.4); cStarGlow = vec3(0.6, 1.0, 0.9); asteroidDensity = 0.0; glowPower = 0.5;
    } else if (u_arenaId == 9) { // dimension
        cBase1 = vec3(1.0, 0.0, 0.0); cBase2 = vec3(0.0, 1.0, 0.0); cBase3 = vec3(0.0, 0.0, 1.0); cStarGlow = vec3(1.0, 1.0, 1.0); glowPower = 2.0; asteroidDensity = 0.0;
    } else {
        cBase1 = vec3(0.0, 0.5, 1.0); cBase2 = vec3(0.0, 0.8, 0.9); cBase3 = vec3(0.0, 0.1, 0.4); cStarGlow = vec3(0.6, 0.9, 1.0);
    }
    
    vec2 pDistorted = p;
    if (u_arenaId == 9) { // Dimension trippy wavy distortion
        pDistorted.x += sin(p.y * 5.0 + u_time) * 0.1;
        pDistorted.y += cos(p.x * 5.0 + u_time) * 0.1;
        cBase1 = vec3(noise(pDistorted * 2.0 + u_time * 0.1), noise(pDistorted * 2.0 - u_time * 0.15 + 10.0), 1.0) * 1.5;
        cBase2 = vec3(1.0 - cBase1.x, cBase1.y, cBase1.z) * 1.5;
    } else if (u_arenaId == 2) { // Nebula swirling vortex
        float angle = atan(p.y, p.x);
        float radius = length(p);
        pDistorted = vec2(angle * 2.0 + u_time * 0.1, radius * 5.0 - u_time * 0.2);
    } else if (u_arenaId == 7) { // Blackhole accretion warp
        float distToCenter = length(p + camDist * 0.1);
        float angle = atan(p.y + camDist.y * 0.1, p.x + camDist.x * 0.1);
        pDistorted = vec2(angle * 3.0 + u_time, distToCenter * 5.0);
    }
    
    // LAYER 1: Nebula
    vec2 pNebula = pDistorted * 3.0 + camDist * 0.1 + vec2(u_time * 0.015, u_time * 0.01);
    float n1 = fbm(pNebula);
    float n2 = fbm(pNebula * 2.0 - vec2(u_time * 0.02));
    float n3 = fbm(pNebula * 4.0 + vec2(u_time * 0.03));
    
    float cloud1 = smoothstep(0.35, 0.75, n1);
    float cloud2 = smoothstep(0.45, 0.85, n2);
    float cloud3 = smoothstep(0.55, 0.95, n3);
    
    vec3 nebulaColor = mix(cBase3, cBase1, cloud1);
    nebulaColor += cBase2 * cloud2 * 1.5;
    nebulaColor += cStarGlow * cloud3 * 0.8;
    float edgeGlow = smoothstep(0.4, 0.45, n1) - smoothstep(0.45, 0.5, n1);
    nebulaColor += cBase1 * edgeGlow * 2.5;
    
    color += nebulaColor;
    
    // Custom structures per arena BEFORE stars
    if (u_arenaId == 0) { // Station Grid
        vec2 grid = fract(p * 8.0 + camDist * 0.2 + vec2(0.0, -u_time * 0.1)) - 0.5;
        float lines = smoothstep(0.46, 0.5, abs(grid.x)) + smoothstep(0.46, 0.5, abs(grid.y));
        color += cBase1 * lines * 0.8;
        
        vec2 hexGrid = fract(p * 4.0 + camDist * 0.1) - 0.5;
        float hexLines = smoothstep(0.48, 0.5, length(hexGrid));
        color += cBase2 * hexLines * 0.5;
    } 
    else if (u_arenaId == 4) { // Solar Storm Giant Sun
        vec2 sunPos = p + vec2(0.0, 0.8) + camDist * 0.05;
        float sunDist = length(sunPos);
        float sunSurface = fbm(sunPos * 10.0 - vec2(0.0, u_time * 0.2));
        if (sunDist < 0.6) {
            color = mix(cBase2, vec3(1.0, 0.9, 0.5), sunSurface);
            color += vec3(1.0, 0.5, 0.0) * pow(1.0 - (sunDist / 0.6), 2.0);
        } else {
            color += cBase1 * smoothstep(0.8, 0.6, sunDist) * 2.0;
        }
    }
    else if (u_arenaId == 6) { // Shattered Moon
        vec2 moonPos = p + vec2(0.5, -0.4) + camDist * 0.03;
        float moonDist = length(moonPos);
        if (moonDist < 0.3) {
            float crater = fbm(moonPos * 15.0);
            vec3 moonCol = mix(vec3(0.1, 0.15, 0.2), vec3(0.4, 0.45, 0.5), crater);
            // Cracks
            float cracks = smoothstep(0.02, 0.0, abs(fbm(moonPos * 8.0 + vec2(1.0)) - 0.5));
            moonCol = mix(moonCol, cBase1 * 2.0, cracks);
            // Lighting
            moonCol *= smoothstep(0.3, 0.1, moonDist);
            color = mix(color, moonCol, 1.0);
        }
        color += cBase1 * smoothstep(0.5, 0.3, moonDist) * 0.5;
    }
    else if (u_arenaId == 7) { // Blackhole Center
        vec2 bhPos = p + camDist * 0.05;
        float bhDist = length(bhPos);
        float angle = atan(bhPos.y, bhPos.x);
        float accretion = fbm(vec2(angle * 5.0 + u_time * 2.0, bhDist * 20.0));
        color += cBase2 * smoothstep(0.4, 0.15, bhDist) * accretion * 3.0;
        if (bhDist < 0.12) {
            color = vec3(0.0); // The void
        } else if (bhDist < 0.14) {
            color += vec3(1.0, 0.5, 1.0) * 2.0; // Photon ring
        }
    }
    else if (u_arenaId == 8) { // Mothership Hull
        vec2 hull = p * 5.0 + camDist * 0.2 + vec2(0.0, u_time * 0.05);
        float panels = smoothstep(0.02, 0.0, abs(fract(hull.x) - 0.5)) + smoothstep(0.02, 0.0, abs(fract(hull.y) - 0.5));
        float lights = step(0.9, hash12(floor(hull))) * step(0.8, sin(u_time * 5.0 + hash12(floor(hull))*10.0));
        color += vec3(0.05, 0.1, 0.1) * panels;
        color += cBase1 * lights * 2.0;
    }

    // LAYER 2 & 3: Stars
    if (starDensity > 0.0) {
        vec2 pStars = pDistorted * 120.0 + camDist * 0.8 + vec2(u_time * 0.05, u_time * 0.02);
        float s = hash12(floor(pStars));
        if (s > 0.98 / max(0.1, starDensity)) {
            float twinkle = 0.5 + 0.5 * sin(u_time * 5.0 + s * 100.0);
            color += cStarGlow * twinkle * smoothstep(0.5, 0.0, length(fract(pStars) - 0.5)) * 2.0;
        }

        vec2 pStars2 = pDistorted * 250.0 + camDist * 0.3 + vec2(u_time * 0.02, u_time * 0.01);
        float s2 = hash12(floor(pStars2));
        if (s2 > 0.95 / max(0.1, starDensity)) {
            float twinkle = 0.5 + 0.5 * sin(u_time * 3.0 + s2 * 50.0);
            color += vec3(1.0) * twinkle * smoothstep(0.5, 0.0, length(fract(pStars2) - 0.5));
        }
    }

    // LAYER 4: Debris / Asteroids / Crystals
    if (asteroidDensity > 0.1) {
        vec2 pAstBase = p * 22.0 + camDist * 3.5 + vec2(u_time * 0.15, -u_time * 0.08);
        vec2 astDistort = vec2(fbm(pAstBase * 1.2), fbm(pAstBase * 1.2 + vec2(10.0, 10.0))) * 3.0;
        vec2 pAst = pAstBase + astDistort; 
        
        float a = voronoi(pAst);
        float astThresh = 0.16 * min(1.0, asteroidDensity);
        float clusterNoise = fbm(pAstBase * 0.5);
        
        if (a < astThresh && clusterNoise > 0.4) {
            float z = sqrt(max(0.0, (astThresh * astThresh) - (a * a))) / astThresh;
            float surfNoise = fbm(pAstBase * 25.0) * 0.6 + fbm(pAstBase * 50.0) * 0.4;
            
            vec3 rockColor = mix(vec3(0.08, 0.06, 0.1), vec3(0.25, 0.25, 0.3), surfNoise);
            
            if (u_arenaId == 5) { // Crystal arena
                rockColor = mix(vec3(0.0, 0.2, 0.1), vec3(0.0, 0.8, 0.5), surfNoise);
                // Make them sharper, more angular instead of round
                z = 1.0 - (a / astThresh);
            } else if (u_arenaId == 3) { // Void arena
                rockColor = vec3(0.05, 0.02, 0.02); // dark red chunks
            }
            
            z *= (0.6 + 0.8 * surfNoise);
            vec3 normal = normalize(vec3(astDistort.x * 0.5 - 0.5, surfNoise - 0.5, z + 0.1));
            vec3 lightDir = normalize(vec3(-1.0, 1.0, 1.0));
            float diff = max(0.0, dot(normal, lightDir));
            
            vec3 astColor = rockColor * diff * 3.0;
            astColor += cBase1 * pow(1.0 - z, 3.0) * 1.5; // Edge glow
            
            float alphaAst = smoothstep(astThresh, astThresh * 0.5, a);
            
            if (u_arenaId == 5) {
                // Glowy core for crystals
                astColor += cBase2 * smoothstep(0.5, 1.0, z) * 2.0;
            }
            
            color = mix(color, astColor, alphaAst);
        }
    }

    // LAYER 5: Central Star Glow / Lens Flare
    if (glowPower > 0.1) {
        vec2 pStarCenter = p + camDist * 0.05 - vec2(0.2, 0.2);
        float distToStar = length(pStarCenter);
        color += cStarGlow * glowPower * 0.08 / (distToStar + 0.005);
        float angle = atan(pStarCenter.y, pStarCenter.x);
        float rays = noise(vec2(angle * 8.0, u_time * 0.1)) + noise(vec2(angle * 16.0, u_time * 0.15)) * 0.5;
        color += cStarGlow * glowPower * smoothstep(0.0, 1.0, rays) * 0.04 / (distToStar + 0.02);
    }

    // Global Tone Mapping / Contrast
    color = smoothstep(0.0, 1.1, color); 
    color = pow(color, vec3(1.0 / 1.3));

    fragColor = vec4(color, 1.0);
}
`;

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export class CosmicBackground {
    constructor(canvas, arenaId = 'station') {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
        this.arenaId = arenaId;
        this.program = null;
        if (this.gl) {
            this.init();
        }
    }

    init() {
        const gl = this.gl;
        const vs = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(this.program));
            return;
        }

        const vertices = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
            -1.0,  1.0,
             1.0, -1.0,
             1.0,  1.0
        ]);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(this.program, "position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        this.uResolution = gl.getUniformLocation(this.program, "u_resolution");
        this.uCamera = gl.getUniformLocation(this.program, "u_camera");
        this.uTime = gl.getUniformLocation(this.program, "u_time");
        this.uArenaId = gl.getUniformLocation(this.program, "u_arenaId");
    }

    draw(camX = 0, camY = 0, zoom = 1, time = 0) {
        const gl = this.gl;
        if (!gl || !this.program) return;

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.useProgram(this.program);

        gl.uniform2f(this.uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform2f(this.uCamera, camX, camY);
        gl.uniform1f(this.uTime, time);
        
        const arenaIdx = ARENA_MAP[this.arenaId] !== undefined ? ARENA_MAP[this.arenaId] : 0;
        gl.uniform1i(this.uArenaId, arenaIdx);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}