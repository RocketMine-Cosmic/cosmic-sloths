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
    mat2 rot = mat2(0.866025, -0.5, 0.5, 0.866025); // 30 deg rotation
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
    // Screen coordinates
    vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Parallax layers based on camera
    vec2 camDist = u_camera * 0.0005; 
    
    // Base colors for arenas
    vec3 cBase1, cBase2, cBase3, cStarGlow;
    float asteroidDensity = 1.0;
    float starDensity = 1.0;
    float glowPower = 1.0;
    
    if (u_arenaId == 0) { // station: Azure Expanse
        cBase1 = vec3(0.0, 0.4, 0.8); cBase2 = vec3(0.6, 0.2, 0.9); cBase3 = vec3(0.0, 0.1, 0.3); cStarGlow = vec3(0.0, 0.8, 1.0);
    } else if (u_arenaId == 1) { // asteroid: Mystic Cosmos
        cBase1 = vec3(0.8, 0.3, 0.1); cBase2 = vec3(0.5, 0.1, 0.3); cBase3 = vec3(0.2, 0.05, 0.0); cStarGlow = vec3(1.0, 0.5, 0.2); asteroidDensity = 2.5;
    } else if (u_arenaId == 2) { // nebula: Ethereal Nebula
        cBase1 = vec3(0.9, 0.1, 0.5); cBase2 = vec3(0.2, 0.0, 0.8); cBase3 = vec3(0.1, 0.0, 0.2); cStarGlow = vec3(1.0, 0.2, 0.8); glowPower = 1.5;
    } else if (u_arenaId == 3) { // void: Crimson Void
        cBase1 = vec3(0.7, 0.0, 0.0); cBase2 = vec3(0.3, 0.0, 0.0); cBase3 = vec3(0.05, 0.0, 0.0); cStarGlow = vec3(1.0, 0.1, 0.1); asteroidDensity = 0.5;
    } else if (u_arenaId == 4) { // plasma: Solar Storm
        cBase1 = vec3(1.0, 0.4, 0.0); cBase2 = vec3(1.0, 0.8, 0.1); cBase3 = vec3(0.3, 0.0, 0.0); cStarGlow = vec3(1.0, 0.9, 0.3); glowPower = 2.0;
    } else if (u_arenaId == 5) { // crystal: Emerald Galaxy
        cBase1 = vec3(0.0, 0.8, 0.4); cBase2 = vec3(0.0, 0.4, 0.6); cBase3 = vec3(0.0, 0.1, 0.2); cStarGlow = vec3(0.2, 1.0, 0.6); asteroidDensity = 1.5;
    } else if (u_arenaId == 6) { // moon: Shattered Core
        cBase1 = vec3(0.3, 0.5, 0.7); cBase2 = vec3(0.1, 0.2, 0.4); cBase3 = vec3(0.05, 0.1, 0.2); cStarGlow = vec3(0.6, 0.8, 1.0); asteroidDensity = 3.0;
    } else if (u_arenaId == 7) { // blackhole: Abyssal Vortex
        cBase1 = vec3(0.3, 0.0, 0.6); cBase2 = vec3(0.1, 0.0, 0.3); cBase3 = vec3(0.0, 0.0, 0.0); cStarGlow = vec3(0.5, 0.0, 1.0); glowPower = 0.5;
    } else if (u_arenaId == 8) { // mothership: Turquoise Drift
        cBase1 = vec3(0.0, 0.7, 0.7); cBase2 = vec3(0.7, 0.1, 0.7); cBase3 = vec3(0.1, 0.0, 0.2); cStarGlow = vec3(0.0, 1.0, 0.8);
    } else if (u_arenaId == 9) { // dimension: Rainbow Rift
        cBase1 = vec3(1.0, 0.0, 0.0); cBase2 = vec3(0.0, 1.0, 0.0); cBase3 = vec3(0.0, 0.0, 1.0); cStarGlow = vec3(1.0, 1.0, 1.0); glowPower = 2.0;
    } else {
        cBase1 = vec3(0.0, 0.4, 0.8); cBase2 = vec3(0.6, 0.2, 0.9); cBase3 = vec3(0.0, 0.1, 0.3); cStarGlow = vec3(0.0, 0.8, 1.0);
    }
    
    // Dynamic Rainbow for dimension
    if (u_arenaId == 9) {
        float r1 = noise(p * 2.0 + u_time * 0.1);
        float r2 = noise(p * 2.0 - u_time * 0.15 + 10.0);
        cBase1 = vec3(r1, r2, 1.0 - r1) * 1.5;
        cBase2 = vec3(1.0 - r2, r1, r2) * 1.5;
        cBase3 = vec3(0.1);
    }

    vec3 color = vec3(0.0);

    // LAYER 1: Slow Distant Nebula
    vec2 pNebula = p * 2.5 + camDist * 0.1 + vec2(u_time * 0.015, u_time * 0.01);
    float n1 = fbm(pNebula);
    float n2 = fbm(pNebula * 2.0 - vec2(u_time * 0.02));
    
    // Explosive vibrant nebula math
    float cloud1 = smoothstep(0.3, 0.8, n1);
    float cloud2 = smoothstep(0.4, 0.9, n2);
    
    vec3 nebulaColor = mix(cBase3, cBase1, cloud1);
    nebulaColor += cBase2 * cloud2 * 1.2;
    // Glowing edges
    float edgeGlow = smoothstep(0.4, 0.5, n1) - smoothstep(0.5, 0.6, n1);
    nebulaColor += cBase1 * edgeGlow * 1.5;
    
    color += nebulaColor;

    // LAYER 2: Mid Stars
    vec2 pStars = p * 120.0 + camDist * 0.4;
    float s = hash12(floor(pStars));
    if (s > 0.98 / starDensity) {
        float twinkle = 0.5 + 0.5 * sin(u_time * 5.0 + s * 100.0);
        float starDist = length(fract(pStars) - 0.5);
        color += cStarGlow * twinkle * smoothstep(0.5, 0.0, starDist) * 2.0;
    }

    // LAYER 3: Distant Stars
    vec2 pStars2 = p * 250.0 + camDist * 0.2;
    float s2 = hash12(floor(pStars2));
    if (s2 > 0.95 / starDensity) {
        float twinkle = 0.5 + 0.5 * sin(u_time * 3.0 + s2 * 50.0);
        float starDist = length(fract(pStars2) - 0.5);
        color += vec3(1.0) * twinkle * smoothstep(0.5, 0.0, starDist);
    }

    // LAYER 4: Close Asteroid / Debris Field
    vec2 pAstBase = p * 15.0 + camDist * 1.5 + vec2(u_time * 0.05, -u_time * 0.03);
    float nAst = fbm(pAstBase * 3.0);
    vec2 pAst = pAstBase + nAst * 0.4; // Distort space for jagged asteroids
    float a = voronoi(pAst);
    float astThresh = 0.12 * min(1.0, asteroidDensity);
    
    if (a < astThresh && asteroidDensity > 0.1) {
        float z = sqrt(max(0.0, (astThresh * astThresh) - (a * a))) / astThresh;
        float surfNoise = fbm(pAstBase * 15.0);
        z *= (0.7 + 0.6 * surfNoise);
        
        vec3 normal = normalize(vec3(nAst - 0.5, surfNoise - 0.5, z + 0.2));
        vec3 lightDir = normalize(vec3(-1.0, 1.0, 1.0));
        float diff = max(0.0, dot(normal, lightDir));
        
        vec3 rockColor = mix(vec3(0.1, 0.08, 0.12), vec3(0.2, 0.2, 0.25), surfNoise);
        vec3 astColor = rockColor * diff * 2.0;
        
        // Subtle edge lighting to blend with nebula
        astColor += cBase1 * pow(1.0 - z, 4.0) * 0.8;
        
        float alphaAst = smoothstep(astThresh, astThresh * 0.7, a);
        color = mix(color, astColor, alphaAst);
    }

    // LAYER 5: Central Star Glow / Lens Flare
    // We'll place it slightly off-center and apply parallax
    vec2 pStarCenter = p + camDist * 0.05 - vec2(0.2, 0.2);
    float distToStar = length(pStarCenter);
    
    // Core glow
    color += cStarGlow * glowPower * 0.05 / (distToStar + 0.01);
    
    // Lens Flare Rays
    float angle = atan(pStarCenter.y, pStarCenter.x);
    float rays = noise(vec2(angle * 8.0, u_time * 0.1)) + noise(vec2(angle * 16.0, u_time * 0.15)) * 0.5;
    color += cStarGlow * glowPower * smoothstep(0.0, 1.0, rays) * 0.02 / (distToStar + 0.05);

    // Global Tone Mapping / Contrast
    color = smoothstep(0.0, 1.2, color); // increase contrast slightly
    color = pow(color, vec3(1.0 / 1.2)); // gamma correction

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