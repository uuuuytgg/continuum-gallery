const canvas = document.getElementById("ambientCanvas");
const ctx = canvas?.getContext("2d");
const burstCanvas = document.getElementById("burstCanvas");
const transitionGl = burstCanvas?.getContext("webgl", { alpha: true, premultipliedAlpha: false });
const themeStoryToggle = document.getElementById("themeStoryToggle");
const themeLabel = document.querySelector("[data-theme-label]");
const pointer = { x: -9999, y: -9999 };

const TRANSITION_PARTICLE_COUNT = 18000;
const transitionDuration = 2160;
const themeSwapDelay = 620;
const themeRevealDelay = 1880;
const themeCleanupDelay = 2580;

let particles = [];
let transitionParticles = null;
let width = 0;
let height = 0;
let dpr = 1;
let transitionStartedAt = 0;
let transitionActive = false;
let transitionTargetTheme = "night";

function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  resizeSurface(canvas, ctx);
  resizeSurface(burstCanvas, null);
  if (transitionGl) transitionGl.viewport(0, 0, burstCanvas.width, burstCanvas.height);
  buildParticles();
}

function resizeSurface(targetCanvas, targetCtx) {
  if (!targetCanvas) return;
  targetCanvas.width = Math.round(width * dpr);
  targetCanvas.height = Math.round(height * dpr);
  targetCanvas.style.width = `${width}px`;
  targetCanvas.style.height = `${height}px`;
  targetCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function buildParticles() {
  const count = Math.min(420, Math.max(180, Math.floor((width * height) / 5200)));
  particles = Array.from({ length: count }, (_, index) => {
    const seed = index * 9973;
    return {
      x: ((seed * 17) % Math.max(1, width)),
      y: ((seed * 29) % Math.max(1, height)),
      z: 0.36 + ((seed * 7) % 100) / 140,
      drift: 0.18 + ((seed * 11) % 100) / 360,
      phase: ((seed * 13) % 628) / 100,
      warm: ((seed * 19) % 100) > 86,
    };
  });
}

function draw(now = 0) {
  drawAmbient(now);
  drawThemeTransition(now);
  requestAnimationFrame(draw);
}

function drawAmbient(now) {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
  const isNight = document.body.dataset.promoTheme === "night";
  const palette = isNight
    ? { primary: "111, 218, 255", warm: "241, 251, 255", stroke: "90, 125, 255", alpha: 1.45 }
    : { primary: "8, 43, 131", warm: "152, 115, 64", stroke: "8, 43, 131", alpha: 1 };

  for (const particle of particles) {
    const t = now * 0.001 * particle.drift + particle.phase;
    const waveX = Math.sin(t * 1.7) * 18 * particle.z;
    const waveY = Math.cos(t * 1.25) * 12 * particle.z;
    let x = (particle.x + waveX + now * 0.006 * particle.z) % (width + 80) - 40;
    let y = particle.y + waveY;

    const dx = x - pointer.x;
    const dy = y - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 160) {
      const push = (160 - distance) / 160;
      x += dx / Math.max(distance, 1) * push * 18;
      y += dy / Math.max(distance, 1) * push * 18;
    }

    const alpha = (0.026 + particle.z * 0.052 + Math.sin(t * 2.1) * 0.012) * palette.alpha;
    const size = 0.35 + particle.z * 0.78;
    ctx.fillStyle = particle.warm
      ? `rgba(${palette.warm}, ${alpha * 0.72})`
      : `rgba(${palette.primary}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    if (particle.z > 0.82) {
      ctx.strokeStyle = `rgba(${palette.stroke}, ${alpha * 0.28})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - size * 2.4, y);
      ctx.lineTo(x + size * 2.4, y);
      ctx.stroke();
    }
  }
}

function initTransitionParticles() {
  if (!transitionGl) return;

  const vertexShader = createTransitionShader(transitionGl.VERTEX_SHADER, `
    attribute vec3 a_position;
    attribute vec2 a_orbit;
    attribute float a_seed;
    attribute float a_size;
    uniform vec2 u_resolution;
    uniform vec2 u_center;
    uniform float u_radius;
    uniform float u_perspective;
    uniform float u_time;
    uniform float u_mode;
    uniform float u_burst;
    uniform float u_day;
    uniform float u_rotX;
    uniform float u_rotY;
    uniform vec2 u_pointer;
    uniform vec2 u_orbitOffset;
    uniform vec2 u_orbitVelocity;
    uniform float u_orbitEnergy;
    uniform float u_orbitScale;
    varying float v_depth;
    varying float v_seed;
    varying float v_alpha;

    mat3 rotateX(float a) {
      float s = sin(a);
      float c = cos(a);
      return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
    }

    mat3 rotateY(float a) {
      float s = sin(a);
      float c = cos(a);
      return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
    }

    void main() {
      float sphereMix = smoothstep(0.68, 1.0, u_mode);
      float orbitMix = 1.0 - smoothstep(0.0, 0.22, abs(u_mode - 0.5));
      vec3 p = a_position;
      float drift = sin(u_time * (0.32 + a_seed * 0.4) + a_seed * 21.0);
      vec3 ambient = vec3(
        p.x * 1.45 + sin(u_time * 0.11 + a_seed * 17.0) * 0.22,
        p.y * 1.12 + cos(u_time * 0.09 + a_seed * 13.0) * 0.18,
        p.z * 1.35 + drift * 0.16
      );
      vec3 sphere = normalize(p) * (0.82 + 0.16 * sin(a_seed * 33.0 + u_time * 0.5));
      p = mix(ambient, sphere, sphereMix);
      float burst = u_burst * (0.35 + a_seed * 0.42);
      p *= 1.0 + burst;
      p.xy += vec2(
        sin(a_seed * 47.0 + u_time * 4.2),
        cos(a_seed * 39.0 + u_time * 3.7)
      ) * u_burst * 0.16;
      p = rotateY(u_rotY + u_time * 0.08 * sphereMix) * rotateX(u_rotX + sin(u_time * 0.13) * 0.07 * sphereMix) * p;

      float persp = u_perspective / (u_perspective - p.z * u_radius);
      vec2 spherePixel = u_center + p.xy * u_radius * persp;
      float orbitDepth = 0.28 + fract(a_seed * 9.73) * 0.92;
      vec2 orbitBase = a_orbit;
      vec2 flowCoord = orbitBase * vec2(0.72, 1.04);
      float streamA = sin(flowCoord.x * 1.62 + flowCoord.y * 0.74 + u_time * (0.42 + orbitDepth * 0.2) + a_seed * 17.0);
      float streamB = cos(flowCoord.y * 1.44 - flowCoord.x * 0.52 + u_time * (0.34 + orbitDepth * 0.16) + a_seed * 23.0);
      float curl = sin(dot(flowCoord, vec2(1.18, -1.56)) + u_time * 0.52 + a_seed * 39.0);
      vec2 flow = vec2(streamA + curl * 0.42, streamB - curl * 0.36) * (0.13 + orbitDepth * 0.18);
      float orbitShape = length(orbitBase / vec2(5.9, 3.7));
      float wakeBand = smoothstep(1.18, 0.18, length((orbitBase + u_orbitVelocity * 0.42) / vec2(5.9, 3.7)));
      vec2 dragWake = -u_orbitVelocity * (0.2 + orbitDepth * 0.2) * u_orbitEnergy * (0.34 + wakeBand * 0.86);
      vec2 parallaxOffset = u_orbitOffset * (0.58 + orbitDepth * 0.18);
      float orbitZ = (fract(a_seed * 6.17) - 0.5) * (0.68 + orbitDepth * 0.62);
      vec3 orbit3 = vec3(
        orbitBase.x + parallaxOffset.x + flow.x + dragWake.x,
        (orbitBase.y + parallaxOffset.y + flow.y + dragWake.y) * 0.9,
        orbitZ
      );
      float orbitPersp = u_perspective / (u_perspective - orbit3.z * u_orbitScale * 0.7);
      vec2 orbitPixel = u_center + orbit3.xy * u_orbitScale * orbitPersp;
      float orbitPulse = 1.0 + sin(u_time * 1.7 + a_seed * 18.0) * (0.006 + u_orbitEnergy * 0.012);
      orbitPixel = u_center + (orbitPixel - u_center) * orbitPulse;
      vec2 pixel = mix(spherePixel, orbitPixel, orbitMix * (1.0 - sphereMix));
      vec2 pointerDelta = pixel - u_pointer;
      float push = smoothstep(220.0, 0.0, length(pointerDelta)) * 28.0;
      pixel += normalize(pointerDelta + vec2(0.001)) * push * (sphereMix + orbitMix * 0.58);
      vec2 clip = (pixel / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

      v_depth = clamp(mix((p.z + 1.25) / 2.5, (orbit3.z + 1.45) / 2.9, orbitMix * (1.0 - sphereMix)), 0.0, 1.0);
      v_seed = a_seed;
      float orbitEdge = 1.0 - smoothstep(0.86, 1.18, orbitShape);
      float orbitVeil = 0.54 + smoothstep(-0.9, 0.95, streamA * 0.65 + streamB * 0.35) * 0.46;
      v_alpha = mix(1.0, clamp(orbitEdge * orbitVeil + wakeBand * u_orbitEnergy * 0.25, 0.0, 1.0), orbitMix * (1.0 - sphereMix));
      float displayPersp = mix(persp, orbitPersp, orbitMix * (1.0 - sphereMix));
      gl_PointSize = a_size * (1.18 + v_depth * 1.95 + u_burst * 1.5 + u_orbitEnergy * orbitMix * 0.34) * (0.72 + sphereMix * 0.7 + orbitMix * 0.34 + u_day * 0.18) * displayPersp;
    }
  `);

  const fragmentShader = createTransitionShader(transitionGl.FRAGMENT_SHADER, `
    precision highp float;
    varying float v_depth;
    varying float v_seed;
    varying float v_alpha;
    uniform float u_day;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float r = length(uv);
      float core = smoothstep(0.24, 0.0, r);
      float halo = smoothstep(0.56, 0.02, r) * 0.62;
      float twinkle = 0.82 + 0.26 * sin(v_seed * 40.0);
      vec3 nightDeep = vec3(0.02, 0.14, 0.66);
      vec3 nightElectric = vec3(0.08, 0.48, 1.0);
      vec3 dayDeep = vec3(0.031, 0.169, 0.514);
      vec3 dayElectric = vec3(0.259, 0.722, 1.0);
      vec3 whiteHot = mix(vec3(0.94, 0.99, 1.0), vec3(1.0, 0.98, 0.92), u_day);
      vec3 dayPearl = vec3(0.72, 0.94, 0.90);
      vec3 deepBlue = mix(nightDeep, dayDeep, u_day);
      vec3 electric = mix(nightElectric, dayElectric, u_day);
      vec3 color = mix(deepBlue, electric, v_depth);
      color = mix(color, whiteHot, core * 0.74);
      color = mix(color, dayPearl, u_day * halo * 0.18);
      float alpha = (core + halo) * (0.46 + v_depth * 0.92 + u_day * 0.2) * twinkle * v_alpha;
      gl_FragColor = vec4(color * (0.96 + core * (1.95 + u_day * 0.42)), alpha);
    }
  `);

  const program = transitionGl.createProgram();
  transitionGl.attachShader(program, vertexShader);
  transitionGl.attachShader(program, fragmentShader);
  transitionGl.linkProgram(program);
  if (!transitionGl.getProgramParameter(program, transitionGl.LINK_STATUS)) {
    throw new Error(transitionGl.getProgramInfoLog(program) || "Promo transition program link failed");
  }

  const data = new Float32Array(TRANSITION_PARTICLE_COUNT * 7);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const orbitGrid = getPromoVirtualOrbitGrid();
  const orbitWidth = orbitGrid.cols + 3.4;
  const orbitHeight = orbitGrid.rows * 0.92 + 2.9;
  for (let index = 0; index < TRANSITION_PARTICLE_COUNT; index += 1) {
    const t = (index + 0.5) / TRANSITION_PARTICLE_COUNT;
    const y = 1 - t * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = index * golden;
    const shell = 0.68 + ((index * 29) % 100) / 100 * 0.42;
    const u = (index * 0.61803398875) % 1;
    const v = (index * 0.75487766625) % 1;
    const layer = (index % 5) / 4;
    const lane = index % Math.max(1, orbitGrid.rows);
    const laneY = (lane - (orbitGrid.rows - 1) / 2) * 0.92;
    const laneBlend = index % 5 === 0 ? 0.26 : 0.07;
    const cloudAngle = index * golden + v * 0.5;
    const cloudRadius = Math.sqrt(u) * (0.82 + Math.sin(index * 0.031) * 0.08);
    const sheetX = Math.cos(cloudAngle) * orbitWidth * 0.5 * cloudRadius;
    const sheetY = Math.sin(cloudAngle) * orbitHeight * 0.54 * cloudRadius;
    const current = Math.sin(sheetX * 1.17 + sheetY * 0.68 + index * 0.013);
    const veil = Math.cos(sheetY * 1.48 - sheetX * 0.42 + index * 0.009);
    const offset = index * 7;
    data[offset] = Math.cos(theta) * r * shell;
    data[offset + 1] = y * shell;
    data[offset + 2] = Math.sin(theta) * r * shell;
    data[offset + 3] = sheetX + current * 0.2 + Math.sin(v * Math.PI * 8.0) * 0.12;
    data[offset + 4] = sheetY * (1 - laneBlend) + laneY * laneBlend + veil * 0.16 + (layer - 0.5) * 0.12;
    data[offset + 5] = ((index * 37) % 1000) / 1000;
    data[offset + 6] = 0.75 + ((index * 17) % 100) / 100 * 1.85;
  }

  const buffer = transitionGl.createBuffer();
  transitionGl.bindBuffer(transitionGl.ARRAY_BUFFER, buffer);
  transitionGl.bufferData(transitionGl.ARRAY_BUFFER, data, transitionGl.STATIC_DRAW);
  transitionGl.enable(transitionGl.BLEND);
  transitionGl.blendFunc(transitionGl.SRC_ALPHA, transitionGl.ONE);
  transitionGl.disable(transitionGl.DEPTH_TEST);

  transitionParticles = {
    program,
    buffer,
    aPosition: transitionGl.getAttribLocation(program, "a_position"),
    aOrbit: transitionGl.getAttribLocation(program, "a_orbit"),
    aSeed: transitionGl.getAttribLocation(program, "a_seed"),
    aSize: transitionGl.getAttribLocation(program, "a_size"),
    uResolution: transitionGl.getUniformLocation(program, "u_resolution"),
    uCenter: transitionGl.getUniformLocation(program, "u_center"),
    uRadius: transitionGl.getUniformLocation(program, "u_radius"),
    uPerspective: transitionGl.getUniformLocation(program, "u_perspective"),
    uTime: transitionGl.getUniformLocation(program, "u_time"),
    uMode: transitionGl.getUniformLocation(program, "u_mode"),
    uBurst: transitionGl.getUniformLocation(program, "u_burst"),
    uDay: transitionGl.getUniformLocation(program, "u_day"),
    uRotX: transitionGl.getUniformLocation(program, "u_rotX"),
    uRotY: transitionGl.getUniformLocation(program, "u_rotY"),
    uPointer: transitionGl.getUniformLocation(program, "u_pointer"),
    uOrbitOffset: transitionGl.getUniformLocation(program, "u_orbitOffset"),
    uOrbitVelocity: transitionGl.getUniformLocation(program, "u_orbitVelocity"),
    uOrbitEnergy: transitionGl.getUniformLocation(program, "u_orbitEnergy"),
    uOrbitScale: transitionGl.getUniformLocation(program, "u_orbitScale"),
  };
}

function createTransitionShader(type, source) {
  const shader = transitionGl.createShader(type);
  transitionGl.shaderSource(shader, source);
  transitionGl.compileShader(shader);
  if (!transitionGl.getShaderParameter(shader, transitionGl.COMPILE_STATUS)) {
    throw new Error(transitionGl.getShaderInfoLog(shader) || "Promo transition shader compile failed");
  }
  return shader;
}

function getPromoVirtualOrbitGrid() {
  return { cols: 9, rows: 6 };
}

function getPromoOrbitGrid() {
  const base = width < 720 ? 82 : width < 1100 ? 98 : 116;
  return { base, cols: 9, rows: 6 };
}

function getPromoSphereMetrics() {
  const shortSide = Math.min(width, height);
  const radius = shortSide * (width < 760 ? 0.34 : 0.39);
  return {
    centerX: width / 2,
    centerY: height * 0.5,
    radius,
    perspective: Math.max(width, height) * 1.18,
  };
}

function startThemeBurst(targetTheme) {
  if (!transitionGl || !transitionParticles || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  transitionTargetTheme = targetTheme === "day" ? "day" : "night";
  transitionStartedAt = performance.now();
  transitionActive = true;
  document.body.classList.add("is-theme-bursting");
}

function drawThemeTransition(now) {
  if (!transitionGl || !transitionParticles || !transitionActive) return;
  const elapsed = now - transitionStartedAt;
  const progress = Math.min(1, Math.max(0, elapsed / transitionDuration));
  const ease = progress * progress * (3 - progress * 2);
  const revealFade = progress < 0.86 ? 1 : Math.max(0, (1 - progress) / 0.14);
  const toDay = transitionTargetTheme === "day";
  const modeBlend = toDay ? 0.5 + ease * 0.5 : 1 - ease * 0.5;
  const burst = Math.sin(progress * Math.PI) * revealFade;
  const metrics = getPromoSphereMetrics();
  const orbitGrid = getPromoOrbitGrid();

  transitionGl.clearColor(0, 0, 0, 0);
  transitionGl.clear(transitionGl.COLOR_BUFFER_BIT);
  transitionGl.useProgram(transitionParticles.program);
  transitionGl.bindBuffer(transitionGl.ARRAY_BUFFER, transitionParticles.buffer);
  transitionGl.enableVertexAttribArray(transitionParticles.aPosition);
  transitionGl.vertexAttribPointer(transitionParticles.aPosition, 3, transitionGl.FLOAT, false, 28, 0);
  transitionGl.enableVertexAttribArray(transitionParticles.aOrbit);
  transitionGl.vertexAttribPointer(transitionParticles.aOrbit, 2, transitionGl.FLOAT, false, 28, 12);
  transitionGl.enableVertexAttribArray(transitionParticles.aSeed);
  transitionGl.vertexAttribPointer(transitionParticles.aSeed, 1, transitionGl.FLOAT, false, 28, 20);
  transitionGl.enableVertexAttribArray(transitionParticles.aSize);
  transitionGl.vertexAttribPointer(transitionParticles.aSize, 1, transitionGl.FLOAT, false, 28, 24);
  transitionGl.uniform2f(transitionParticles.uResolution, burstCanvas.width, burstCanvas.height);
  transitionGl.uniform2f(transitionParticles.uCenter, metrics.centerX * dpr, metrics.centerY * dpr);
  transitionGl.uniform1f(transitionParticles.uRadius, metrics.radius * dpr);
  transitionGl.uniform1f(transitionParticles.uPerspective, metrics.perspective * dpr);
  transitionGl.uniform1f(transitionParticles.uTime, now * 0.001);
  transitionGl.uniform1f(transitionParticles.uMode, modeBlend);
  transitionGl.uniform1f(transitionParticles.uBurst, burst);
  transitionGl.uniform1f(transitionParticles.uDay, toDay ? 1 : 0);
  transitionGl.uniform1f(transitionParticles.uRotX, -0.2 + Math.sin(now * 0.0003) * 0.08);
  transitionGl.uniform1f(transitionParticles.uRotY, (toDay ? -0.36 : 0.5) + now * (toDay ? -0.00012 : 0.00018));
  transitionGl.uniform2f(transitionParticles.uPointer, pointer.x * dpr, pointer.y * dpr);
  transitionGl.uniform2f(transitionParticles.uOrbitOffset, (ease - 0.5) * (toDay ? -0.34 : 0.42), Math.sin(ease * Math.PI) * (toDay ? 0.06 : -0.08));
  transitionGl.uniform2f(transitionParticles.uOrbitVelocity, (toDay ? -1.25 : 1.8) * revealFade, (toDay ? 0.18 : -0.24) * revealFade);
  transitionGl.uniform1f(transitionParticles.uOrbitEnergy, (toDay ? 0.7 : 1.0) * revealFade);
  transitionGl.uniform1f(transitionParticles.uOrbitScale, orbitGrid.base * dpr);
  transitionGl.drawArrays(transitionGl.POINTS, 0, TRANSITION_PARTICLE_COUNT);

  if (progress >= 1) {
    transitionActive = false;
    transitionGl.clear(transitionGl.COLOR_BUFFER_BIT);
    document.body.classList.remove("is-theme-bursting");
  }
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.16 });

  items.forEach((item) => observer.observe(item));
}

function preloadThemeImages() {
  document.querySelectorAll("img[data-night-src]").forEach((image) => {
    [image.dataset.daySrc, image.dataset.nightSrc].forEach((src) => {
      if (!src) return;
      const preload = new Image();
      preload.src = src;
    });
  });
}

function setPromoTheme(theme, { animate = true } = {}) {
  const nextTheme = theme === "night" ? "night" : "day";
  if (document.body.dataset.promoTheme === nextTheme) return;
  const shouldAnimate = animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (shouldAnimate) {
    document.body.classList.add("is-theme-swapping");
    document.body.classList.remove("is-theme-revealing");
    document.body.dataset.transitionTarget = nextTheme;
    startThemeBurst(nextTheme);
  } else {
    delete document.body.dataset.transitionTarget;
  }

  window.setTimeout(() => {
    document.body.dataset.promoTheme = nextTheme;
    document.querySelectorAll("img[data-day-src][data-night-src]").forEach((image) => {
      image.src = nextTheme === "night" ? image.dataset.nightSrc : image.dataset.daySrc;
    });
    document.querySelectorAll("[data-theme-copy]").forEach((node) => {
      node.textContent = nextTheme === "night" ? node.dataset.nightText : node.dataset.dayText;
    });
    themeStoryToggle?.setAttribute("aria-pressed", String(nextTheme === "night"));
    if (themeLabel) themeLabel.textContent = nextTheme === "night" ? "回到日间" : "切到夜间";
  }, shouldAnimate ? themeSwapDelay : 0);

  if (shouldAnimate) {
    window.setTimeout(() => {
      document.body.classList.add("is-theme-revealing");
    }, themeRevealDelay);
    window.setTimeout(() => {
      document.body.classList.remove("is-theme-swapping", "is-theme-revealing");
      delete document.body.dataset.transitionTarget;
    }, themeCleanupDelay);
  }
}

function togglePromoTheme() {
  const nextTheme = document.body.dataset.promoTheme === "night" ? "day" : "night";
  setPromoTheme(nextTheme);
}

function getInitialTheme() {
  const params = new URLSearchParams(window.location.search);
  return params.get("theme") === "night" ? "night" : "day";
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
window.addEventListener("pointerleave", () => {
  pointer.x = -9999;
  pointer.y = -9999;
});
themeStoryToggle?.addEventListener("click", togglePromoTheme);

resizeCanvas();
try {
  initTransitionParticles();
  window.__promoTransitionReady = Boolean(transitionParticles);
  window.__promoTransitionError = "";
} catch (error) {
  window.__promoTransitionReady = false;
  window.__promoTransitionError = error instanceof Error ? error.message : String(error);
  console.warn("Promo WebGL transition unavailable", error);
}
initReveal();
preloadThemeImages();
setPromoTheme(getInitialTheme(), { animate: false });
requestAnimationFrame(draw);
