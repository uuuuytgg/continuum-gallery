const stage = document.getElementById("stage");
const gallery = document.getElementById("gallery");
const particleCanvas = document.getElementById("particleCanvas");
const grainCanvas = document.getElementById("grainCanvas");
const grainCtx = grainCanvas.getContext("2d");
const particleGl = particleCanvas.getContext("webgl", {
  alpha: true,
  antialias: true,
  depth: false,
  premultipliedAlpha: false,
});
const modeButtons = document.getElementById("modeButtons");
const modeLabel = document.getElementById("modeLabel");
const modeToast = document.getElementById("modeToast");
const immersiveButton = document.getElementById("immersiveButton");
const focusButton = document.getElementById("focusButton");
const googleButton = document.getElementById("googleButton");
const gestureButton = document.getElementById("gestureButton");
const themeButton = document.getElementById("themeButton");
const gestureVideo = document.getElementById("gestureVideo");
const photosPanel = document.getElementById("photosPanel");
const photosPanelClose = document.getElementById("photosPanelClose");
const googleClientIdInput = document.getElementById("googleClientId");
const saveClientButton = document.getElementById("saveClientButton");
const importPhotosButton = document.getElementById("importPhotosButton");
const copyOriginButton = document.getElementById("copyOriginButton");
const photosStatus = document.getElementById("photosStatus");
const viewer = document.getElementById("viewer");
const viewerImage = document.getElementById("viewerImage");
const viewerTitle = document.getElementById("viewerTitle");
const viewerMeta = document.getElementById("viewerMeta");
const viewerClose = document.getElementById("viewerClose");
const viewerFrame = document.getElementById("viewerFrame");
const viewerImageStage = document.getElementById("viewerImageStage");
const viewerZoomOut = document.getElementById("viewerZoomOut");
const viewerZoomReset = document.getElementById("viewerZoomReset");
const viewerZoomIn = document.getElementById("viewerZoomIn");

const MODES = ["waterfall", "orbit", "sphere"];
const THEME_KEY = "continuum-gallery.theme";
const GOOGLE_CLIENT_ID_KEY = "continuum-gallery.googleClientId";
const GOOGLE_PHOTOS_SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const GOOGLE_PHOTOS_API = "https://photospicker.googleapis.com";
const PHOTO_DB_NAME = "continuum-gallery.photos";
const PHOTO_DB_VERSION = 1;
const PHOTO_STORE_NAME = "albums";
const ACTIVE_ALBUM_ID = "active-google-photos";
const SACRED_PARTICLE_COUNT = 1480;
const WEBGL_PARTICLE_COUNT = 18000;
const MEDIAPIPE_TASKS_VERSION = "0.10.35";
const GESTURE_CAMERA_WIDTH = 424;
const GESTURE_CAMERA_HEIGHT = 240;
const GESTURE_DETECTION_FPS = 15;
const GESTURE_DETECTION_INTERVAL = 1000 / GESTURE_DETECTION_FPS;
const GESTURE_SWITCH_DETECTION_PAUSE = 1120;
const GESTURE_STABLE_FRAMES = 7;
const GESTURE_SWITCH_COOLDOWN = 1350;
const GESTURE_DRAG_SCALE = 1.45;
const GESTURE_DRAG_LERP = 0.34;
const GESTURE_DRAG_EPSILON = 0.18;
const MODE_NAMES = {
  waterfall: "瀑布流",
  orbit: "球形滑动",
  sphere: "粒子球",
};

const titles = [
  "潮汐", "暮野", "冷焰", "雾港", "蓝径", "赤桥", "金屿", "霓窗",
  "回声", "云井", "石歌", "松影", "夜航", "镜湖", "风塔", "花火",
  "远山", "沙时", "微光", "白昼", "深巷", "长坡", "星幕", "玻璃",
  "雨台", "旧梦", "轻轨", "野餐", "晴面", "流金", "群青", "新雪",
  "环岛", "低云", "暖墙", "细浪", "纸月", "暗房", "海盐", "慢坡",
];

const places = [
  "城市", "海边", "旷野", "屋顶", "清晨", "黄昏", "雨后", "山口",
  "街角", "展厅", "天台", "湖畔",
];

const state = {
  mode: "waterfall",
  selected: 0,
  isPointerDown: false,
  didDrag: false,
  lastX: 0,
  lastY: 0,
  pointerX: -9999,
  pointerY: -9999,
  transitionUntil: 0,
  lastZoomSwitch: 0,
  viewport: {
    isMobile: false,
    zoomLockScale: 1,
    zoomLockInverse: 1,
  },
  viewer: {
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    lastX: 0,
    lastY: 0,
  },
  orbit: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    fieldX: 0,
    fieldY: 0,
    fieldVx: 0,
    fieldVy: 0,
    fieldEnergy: 0,
  },
  sphere: {
    rotX: -0.22,
    rotY: 0.34,
    vx: 0.0018,
    vy: 0.0024,
    radiusBoost: 0,
  },
  google: {
    tokenClient: null,
    accessToken: "",
    tokenExpiresAt: 0,
    isImporting: false,
    objectUrls: [],
  },
  particleTransition: {
    fromMode: "waterfall",
    toMode: "waterfall",
    startedAt: 0,
    duration: 980,
  },
  gesture: {
    active: false,
    loading: false,
    stream: null,
    landmarker: null,
    raf: 0,
    lastVideoTime: -1,
    lastDetectAt: 0,
    detectCost: 0,
    suspendUntil: 0,
    lastCenterX: null,
    anchorX: null,
    lastSwitchAt: -GESTURE_SWITCH_COOLDOWN,
    stableGesture: "open",
    stableFrames: 0,
    commandReady: true,
    neutralFrames: 0,
    dragActive: false,
    dragX: 0,
    dragY: 0,
    dragTargetX: 0,
    dragTargetY: 0,
    lastAction: "none",
  },
};

const items = createItems();
const cards = [];
const cardLayouts = new WeakMap();
let spherePoints = [];
let physics = [];
let grainParticles = [];
let webglParticles = null;
let resizeTimer = 0;
let imageLayoutTimer = 0;

init();

function init() {
  updateViewportMode();
  applyTheme(localStorage.getItem(THEME_KEY) === "night" ? "night" : "day");
  googleClientIdInput.value = localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || "";
  setGoogleStatus(googleClientIdInput.value ? "Client ID ready" : "Add Client ID");
  renderCards();
  buildSpherePoints();
  initWebglParticles();
  resizeCanvas();
  applyLayout({ immediate: true });
  requestAnimationFrame(tick);
  restorePersistedPhotos();

  window.addEventListener("resize", handleResize);
  window.addEventListener("pageshow", handleResize);
  window.visualViewport?.addEventListener("resize", handleResize);
  window.addEventListener("wheel", preventBrowserPageZoom, { passive: false, capture: true });
  window.addEventListener("keydown", preventBrowserZoomShortcut, { capture: true });
  modeButtons.addEventListener("click", handleModeButton);
  immersiveButton.addEventListener("click", handleImmersive);
  focusButton.addEventListener("click", () => openViewer(state.selected));
  googleButton.addEventListener("click", openPhotosPanel);
  gestureButton.addEventListener("click", toggleGestureControl);
  themeButton.addEventListener("click", toggleTheme);
  photosPanelClose.addEventListener("click", closePhotosPanel);
  saveClientButton.addEventListener("click", saveGoogleClientId);
  importPhotosButton.addEventListener("click", startGooglePhotosImport);
  copyOriginButton.addEventListener("click", copyGoogleOrigin);
  gallery.addEventListener("click", handleCardClick);
  stage.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  stage.addEventListener("wheel", handleWheel, { passive: false });
  viewerClose.addEventListener("click", closeViewer);
  viewerZoomOut.addEventListener("click", () => zoomViewerBy(0.8));
  viewerZoomReset.addEventListener("click", resetViewerTransform);
  viewerZoomIn.addEventListener("click", () => zoomViewerBy(1.25));
  viewerFrame.addEventListener("wheel", handleViewerWheel, { passive: false });
  viewerFrame.addEventListener("pointerdown", handleViewerPointerDown);
  viewerFrame.addEventListener("dblclick", handleViewerDoubleClick);
  window.addEventListener("pointermove", handleViewerPointerMove);
  window.addEventListener("pointerup", handleViewerPointerUp);
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) closeViewer();
  });
  window.addEventListener("keydown", (event) => {
    if (!viewer.classList.contains("is-open")) return;
    if (event.key === "Escape") closeViewer();
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomViewerBy(1.2);
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomViewerBy(0.84);
    }
    if (event.key === "0") {
      event.preventDefault();
      resetViewerTransform();
    }
  });
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "night" ? "day" : "night";
  applyTheme(nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
}

function applyTheme(theme) {
  const normalized = theme === "night" ? "night" : "day";
  document.body.dataset.theme = normalized;
  if (!themeButton) return;
  const isNight = normalized === "night";
  themeButton.setAttribute("aria-label", isNight ? "切换日间模式" : "切换夜间模式");
  themeButton.title = isNight ? "切换日间模式" : "切换夜间模式";
  const label = themeButton.querySelector("span");
  if (label) label.textContent = isNight ? "日" : "夜";
}

function createItems() {
  const ratios = [1.22, 0.78, 1.45, 0.92, 1.08, 1.58, 0.72, 1.34, 0.84, 1.18];
  const generated = Array.from({ length: 39 }, (_, index) => {
    const ratio = ratios[index % ratios.length];
    return {
      title: titles[index % titles.length],
      place: places[index % places.length],
      ratio,
      source: "demo",
      src: makeArtwork(index, ratio),
    };
  });

  return generated;
}

function makeArtwork(index, ratio) {
  const width = 520;
  const height = Math.max(360, Math.round(width * ratio));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const palette = [
    ["8, 43, 131", "120, 197, 214", "244, 239, 230"],
    ["6, 21, 63", "184, 226, 220", "247, 242, 234"],
    ["38, 83, 164", "216, 197, 158", "238, 229, 215"],
    ["8, 43, 131", "255, 250, 240", "232, 223, 209"],
    ["48, 71, 143", "120, 197, 214", "241, 235, 224"],
  ][index % 5];

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = `rgb(${palette[2]})`;
  ctx.fillRect(0, 0, width, height);

  const baseGlow = ctx.createLinearGradient(0, 0, width, height);
  baseGlow.addColorStop(0, `rgba(${palette[0]}, 0.18)`);
  baseGlow.addColorStop(0.38, "rgba(255, 250, 240, 0.24)");
  baseGlow.addColorStop(0.68, `rgba(${palette[1]}, 0.18)`);
  baseGlow.addColorStop(1, "rgba(6, 21, 63, 0.24)");
  ctx.fillStyle = baseGlow;
  ctx.fillRect(0, 0, width, height);

  const inkWash = ctx.createLinearGradient(width, 0, 0, height);
  inkWash.addColorStop(0, "rgba(8, 43, 131, 0.13)");
  inkWash.addColorStop(0.48, "rgba(255, 250, 240, 0)");
  inkWash.addColorStop(1, "rgba(6, 21, 63, 0.18)");
  ctx.fillStyle = inkWash;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "multiply";
  for (let layer = 0; layer < 7; layer += 1) {
    const y = height * (0.16 + layer * 0.12);
    const alpha = 0.15 - layer * 0.01;
    ctx.strokeStyle = `rgba(${layer % 2 ? palette[1] : palette[0]}, ${alpha})`;
    ctx.lineWidth = 1.1 + layer * 0.3;
    ctx.beginPath();
    ctx.moveTo(-30, y);
    for (let x = -30; x <= width + 30; x += 28) {
      const wave = Math.sin(index * 0.7 + layer + x * 0.017) * (16 + layer * 3);
      ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 16; i += 1) {
    const x = ((index * 73 + i * 47) % width);
    const bandWidth = 1 + i % 3;
    ctx.fillStyle = `rgba(${i % 2 ? palette[1] : palette[0]}, ${0.05 + (i % 4) * 0.014})`;
    ctx.fillRect(x, 0, bandWidth, height);
  }

  for (let i = 0; i < 2200; i += 1) {
    const tone = 80 + ((i + index * 19) % 84);
    const alpha = i % 11 === 0 ? 0.062 : 0.026;
    ctx.fillStyle = `rgba(${tone}, ${tone - 8}, ${tone - 18}, ${alpha})`;
    ctx.fillRect((i * 31) % width, (i * 67) % height, 1, 1);
  }

  ctx.strokeStyle = "rgba(8,43,131,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i += 1) {
    const y = height * (0.12 + i * 0.075);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + Math.sin(index + i) * 22);
    ctx.stroke();
  }

  return canvas.toDataURL("image/jpeg", 0.86);
}

function renderCards() {
  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const card = createPhotoCard(item, index);
    cards.push(card);
    fragment.appendChild(card);
  });
  gallery.appendChild(fragment);
}

function createPhotoCard(item, index) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "photo-card";
  card.dataset.index = String(index);
  card.setAttribute("aria-label", `${item.title} ${item.place}`);
  card.innerHTML = `
    <img alt="${item.title}" draggable="false" loading="lazy" decoding="async" src="${getCardImageSrc(item)}">
    <span class="caption">
      <strong>${item.title}</strong>
      <span>${item.place}</span>
    </span>
  `;

  const image = card.querySelector("img");
  image.addEventListener("load", () => {
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      item.ratio = image.naturalHeight / image.naturalWidth;
      if (state.mode === "waterfall") scheduleWaterfallRelayout();
    }
  });

  return card;
}

function getCardImageSrc(item) {
  return item.previewSrc || item.src;
}

function updateCardPreview(index) {
  const card = cards[index];
  const item = items[index];
  if (!card || !item) return;
  const image = card.querySelector("img");
  const src = getCardImageSrc(item);
  if (image && image.src !== src) image.src = src;
}

function scheduleWaterfallRelayout() {
  window.clearTimeout(imageLayoutTimer);
  imageLayoutTimer = window.setTimeout(() => {
    if (state.mode === "waterfall") applyLayout({ immediate: true });
  }, 80);
}

function replacePhotoItems(newItems) {
  if (!newItems.length) return;
  const fragment = document.createDocumentFragment();
  releaseDisplayedObjectUrls();
  cards.length = 0;
  items.length = 0;
  gallery.replaceChildren();

  newItems.forEach((item, index) => {
    items.push(item);
    const card = createPhotoCard(item, index);
    cards.push(card);
    fragment.appendChild(card);
  });

  gallery.appendChild(fragment);
  buildSpherePoints();
  state.selected = 0;
  if (state.mode === "orbit") {
    centerOrbitOn(0);
    applyLayout({ immediate: false });
  } else {
    setMode("orbit", { focusIndex: 0 });
  }
}

function restorePhotoItems(newItems) {
  if (!newItems.length) return;
  const fragment = document.createDocumentFragment();
  releaseDisplayedObjectUrls();
  cards.length = 0;
  items.length = 0;
  gallery.replaceChildren();

  newItems.forEach((item, index) => {
    items.push(item);
    const card = createPhotoCard(item, index);
    cards.push(card);
    fragment.appendChild(card);
  });

  gallery.appendChild(fragment);
  buildSpherePoints();
  state.selected = 0;
  applyLayout({ immediate: true });
}

function releaseDisplayedObjectUrls() {
  items.forEach((item) => {
    if (item.source !== "demo" && typeof item.src === "string" && item.src.startsWith("blob:")) {
      URL.revokeObjectURL(item.src);
    }
    if (item.source !== "demo" && typeof item.previewSrc === "string" && item.previewSrc.startsWith("blob:")) {
      URL.revokeObjectURL(item.previewSrc);
    }
  });
}

function buildSpherePoints() {
  const golden = Math.PI * (3 - Math.sqrt(5));
  spherePoints = items.map((_, index) => {
    const y = 1 - (index / Math.max(1, items.length - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * index;
    return {
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
    };
  });

  physics = items.map(() => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 36,
  }));

  grainParticles = Array.from({ length: SACRED_PARTICLE_COUNT }, (_, index) => makeSacredParticle(index));
}

function initWebglParticles() {
  if (!particleGl) return;

  const vertexShader = createParticleShader(particleGl.VERTEX_SHADER, `
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
      gl_PointSize = a_size * (1.18 + v_depth * 1.95 + u_burst * 1.5 + u_orbitEnergy * orbitMix * 0.34) * (0.72 + sphereMix * 0.7 + orbitMix * 0.34) * displayPersp;
    }
  `);

  const fragmentShader = createParticleShader(particleGl.FRAGMENT_SHADER, `
    precision mediump float;
    varying float v_depth;
    varying float v_seed;
    varying float v_alpha;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float r = length(uv);
      float core = smoothstep(0.24, 0.0, r);
      float halo = smoothstep(0.56, 0.02, r) * 0.62;
      float twinkle = 0.82 + 0.26 * sin(v_seed * 40.0);
      vec3 deepBlue = vec3(0.02, 0.14, 0.66);
      vec3 electric = vec3(0.08, 0.48, 1.0);
      vec3 whiteHot = vec3(0.94, 0.99, 1.0);
      vec3 color = mix(deepBlue, electric, v_depth);
      color = mix(color, whiteHot, core * 0.74);
      float alpha = (core + halo) * (0.42 + v_depth * 0.88) * twinkle * v_alpha;
      gl_FragColor = vec4(color * (0.92 + core * 1.9), alpha);
    }
  `);

  const program = particleGl.createProgram();
  particleGl.attachShader(program, vertexShader);
  particleGl.attachShader(program, fragmentShader);
  particleGl.linkProgram(program);
  if (!particleGl.getProgramParameter(program, particleGl.LINK_STATUS)) {
    console.warn("Particle program link failed", particleGl.getProgramInfoLog(program));
    return;
  }

  const data = new Float32Array(WEBGL_PARTICLE_COUNT * 7);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const orbitGrid = getVirtualOrbitGrid();
  const orbitWidth = orbitGrid.cols + 3.4;
  const orbitHeight = orbitGrid.rows * 0.92 + 2.9;
  for (let index = 0; index < WEBGL_PARTICLE_COUNT; index += 1) {
    const t = (index + 0.5) / WEBGL_PARTICLE_COUNT;
    const y = 1 - t * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = index * golden;
    const shell = 0.68 + ((index * 29) % 100) / 100 * 0.42;
    const u = ((index * 0.61803398875) % 1);
    const v = ((index * 0.75487766625) % 1);
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
    const orbitX = sheetX + current * 0.2 + Math.sin(v * Math.PI * 8.0) * 0.12;
    const orbitY = sheetY * (1 - laneBlend) + laneY * laneBlend + veil * 0.16 + (layer - 0.5) * 0.12;
    const offset = index * 7;
    data[offset] = Math.cos(theta) * r * shell;
    data[offset + 1] = y * shell;
    data[offset + 2] = Math.sin(theta) * r * shell;
    data[offset + 3] = orbitX;
    data[offset + 4] = orbitY;
    data[offset + 5] = ((index * 37) % 1000) / 1000;
    data[offset + 6] = 0.75 + ((index * 17) % 100) / 100 * 1.85;
  }

  const buffer = particleGl.createBuffer();
  particleGl.bindBuffer(particleGl.ARRAY_BUFFER, buffer);
  particleGl.bufferData(particleGl.ARRAY_BUFFER, data, particleGl.STATIC_DRAW);
  particleGl.enable(particleGl.BLEND);
  particleGl.blendFunc(particleGl.SRC_ALPHA, particleGl.ONE);
  particleGl.disable(particleGl.DEPTH_TEST);

  webglParticles = {
    program,
    buffer,
    aPosition: particleGl.getAttribLocation(program, "a_position"),
    aOrbit: particleGl.getAttribLocation(program, "a_orbit"),
    aSeed: particleGl.getAttribLocation(program, "a_seed"),
    aSize: particleGl.getAttribLocation(program, "a_size"),
    uResolution: particleGl.getUniformLocation(program, "u_resolution"),
    uCenter: particleGl.getUniformLocation(program, "u_center"),
    uRadius: particleGl.getUniformLocation(program, "u_radius"),
    uPerspective: particleGl.getUniformLocation(program, "u_perspective"),
    uTime: particleGl.getUniformLocation(program, "u_time"),
    uMode: particleGl.getUniformLocation(program, "u_mode"),
    uBurst: particleGl.getUniformLocation(program, "u_burst"),
    uRotX: particleGl.getUniformLocation(program, "u_rotX"),
    uRotY: particleGl.getUniformLocation(program, "u_rotY"),
    uPointer: particleGl.getUniformLocation(program, "u_pointer"),
    uOrbitOffset: particleGl.getUniformLocation(program, "u_orbitOffset"),
    uOrbitVelocity: particleGl.getUniformLocation(program, "u_orbitVelocity"),
    uOrbitEnergy: particleGl.getUniformLocation(program, "u_orbitEnergy"),
    uOrbitScale: particleGl.getUniformLocation(program, "u_orbitScale"),
  };
}

function createParticleShader(type, source) {
  const shader = particleGl.createShader(type);
  particleGl.shaderSource(shader, source);
  particleGl.compileShader(shader);
  if (!particleGl.getShaderParameter(shader, particleGl.COMPILE_STATUS)) {
    console.warn("Particle shader compile failed", particleGl.getShaderInfoLog(shader));
  }
  return shader;
}

function makeSacredParticle(index) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const t = (index + 0.5) / SACRED_PARTICLE_COUNT;
  const y = 1 - t * 2;
  const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = index * golden;
  const shell = 0.74 + ((index * 37) % 100) / 100 * 0.28;

  return {
    x: Math.cos(theta) * ringRadius * shell,
    y: y * shell,
    z: Math.sin(theta) * ringRadius * shell,
    a: theta,
    drift: 0.45 + ((index * 7) % 100) / 130,
    size: 0.72 + ((index * 17) % 100) / 100 * 1.75,
    tone: index % 6,
    pulse: ((index * 19) % 100) / 100,
    lane: index % 11,
  };
}

function handleResize() {
  updateViewportMode();
  resizeCanvas();
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    applyLayout({ immediate: true });
  }, 80);
}

function updateViewportMode() {
  const root = document.documentElement;
  const isMobile = detectMobileUa();
  const viewportWidth = Math.max(1, window.innerWidth || root.clientWidth || 1);
  const desktopReferenceWidth = Math.max(
    window.screen?.availWidth || 0,
    window.screen?.width || 0,
    window.outerWidth || 0,
  );
  const zoomRatio = desktopReferenceWidth > 0 ? desktopReferenceWidth / viewportWidth : 1;
  const zoomLockScale = !isMobile && desktopReferenceWidth >= 900 && zoomRatio > 1.34
    ? clamp(1 / zoomRatio, 0.18, 1)
    : 1;
  const zoomLockInverse = 1 / zoomLockScale;

  state.viewport.isMobile = isMobile;
  state.viewport.zoomLockScale = zoomLockScale;
  state.viewport.zoomLockInverse = zoomLockInverse;
  root.classList.toggle("is-mobile-ua", isMobile);
  root.classList.toggle("is-desktop-ua", !isMobile);
  root.classList.toggle("is-desktop-zoom-locked", zoomLockScale < 0.999);
  root.style.setProperty("--desktop-zoom-lock-scale", zoomLockScale.toFixed(5));
  root.style.setProperty("--desktop-zoom-lock-inverse", zoomLockInverse.toFixed(5));
}

function detectMobileUa() {
  const ua = navigator.userAgent || "";
  const uaDataMobile = Boolean(navigator.userAgentData?.mobile);
  const classicMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const iPadDesktopUa = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return uaDataMobile || classicMobile || iPadDesktopUa;
}

function getStageSize() {
  return {
    width: Math.max(1, stage.clientWidth || window.innerWidth || 1),
    height: Math.max(1, stage.clientHeight || window.innerHeight || 1),
  };
}

function getRenderDpr() {
  const effectiveDpr = (window.devicePixelRatio || 1) * (state.viewport.zoomLockScale || 1);
  return clamp(effectiveDpr, 1, 2);
}

function toLayoutPoint(clientX, clientY) {
  const scale = state.viewport.zoomLockScale || 1;
  return {
    x: clientX / scale,
    y: clientY / scale,
  };
}

function preventBrowserPageZoom(event) {
  if (!event.ctrlKey) return;
  event.preventDefault();
}

function preventBrowserZoomShortcut(event) {
  if (!event.ctrlKey && !event.metaKey) return;
  if (!["+", "=", "-", "_", "0"].includes(event.key)) return;
  if (viewer.classList.contains("is-open")) return;
  event.preventDefault();
}

function resizeCanvas() {
  const { width, height } = getStageSize();
  const dpr = getRenderDpr();
  particleCanvas.width = Math.round(width * dpr);
  particleCanvas.height = Math.round(height * dpr);
  particleCanvas.style.width = `${width}px`;
  particleCanvas.style.height = `${height}px`;
  if (particleGl) particleGl.viewport(0, 0, particleCanvas.width, particleCanvas.height);
  grainCanvas.width = Math.round(width * dpr);
  grainCanvas.height = Math.round(height * dpr);
  grainCanvas.style.width = `${width}px`;
  grainCanvas.style.height = `${height}px`;
  grainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function handleModeButton(event) {
  const button = event.target.closest("button[data-mode]");
  if (!button) return;
  setMode(button.dataset.mode);
}

function handleImmersive() {
  if (state.mode === "orbit") {
    setMode("waterfall");
    return;
  }
  if (state.mode === "sphere") {
    setMode("orbit", { focusIndex: state.selected });
    return;
  }
  openViewer(state.selected);
}

function openPhotosPanel() {
  photosPanel.classList.add("is-open");
  photosPanel.setAttribute("aria-hidden", "false");
  googleClientIdInput.value = localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || googleClientIdInput.value;
  googleClientIdInput.focus();
}

function closePhotosPanel() {
  photosPanel.classList.remove("is-open");
  photosPanel.setAttribute("aria-hidden", "true");
}

function saveGoogleClientId() {
  const clientId = googleClientIdInput.value.trim();
  if (!clientId) {
    localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
    state.google.tokenClient = null;
    setGoogleStatus("Client ID cleared");
    return;
  }

  localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId);
  state.google.tokenClient = null;
  state.google.accessToken = "";
  setGoogleStatus("Client ID saved");
}

async function copyGoogleOrigin() {
  const origin = "https://uuuuytgg.github.io";
  try {
    await navigator.clipboard.writeText(origin);
    setGoogleStatus("Origin copied");
  } catch {
    googleClientIdInput.value = origin;
    googleClientIdInput.select();
    setGoogleStatus("Copy origin manually");
  }
}

async function startGooglePhotosImport() {
  if (state.google.isImporting) return;
  const clientId = getGoogleClientId();
  if (!clientId) {
    openPhotosPanel();
    setGoogleStatus("Add Client ID first");
    return;
  }

  state.google.isImporting = true;
  importPhotosButton.disabled = true;
  saveClientButton.disabled = true;
  setGoogleStatus("Authorizing...");

  const pickerWindow = window.open("", "googlePhotosPicker", "popup,width=1060,height=780");

  try {
    await requestGoogleAccessToken(clientId);
    setGoogleStatus("Creating picker...");
    const session = await createGooglePhotosSession();
    const pickerUrl = `${session.pickerUri}/autoclose`;
    openPickerWindow(pickerWindow, pickerUrl);
    setGoogleStatus("Waiting for selection...");
    await pollGooglePhotosSession(session);
    const pickedItems = await listGooglePhotosItems(session.id);
    setGoogleStatus(`Loading ${pickedItems.length} items...`);
    const importedItems = await materializeGooglePhotosItems(pickedItems);
    await deleteGooglePhotosSession(session.id).catch(() => {});

    if (!importedItems.length) {
      setGoogleStatus("No photos imported");
      return;
    }

    await savePersistedPhotos(importedItems);
    replacePhotoItems(importedItems);
    closePhotosPanel();
    showToast(`Google Photos +${importedItems.length}`);
    setGoogleStatus(`Imported ${importedItems.length}`);
  } catch (error) {
    pickerWindow?.close?.();
    setGoogleStatus(error.message || "Google Photos failed");
  } finally {
    state.google.isImporting = false;
    importPhotosButton.disabled = false;
    saveClientButton.disabled = false;
  }
}

function getGoogleClientId() {
  return (googleClientIdInput.value.trim() || localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || "").trim();
}

function requestGoogleAccessToken(clientId) {
  const now = Date.now();
  if (state.google.accessToken && state.google.tokenExpiresAt - now > 60000) {
    return Promise.resolve(state.google.accessToken);
  }

  if (!window.google?.accounts?.oauth2) {
    return Promise.reject(new Error("Google Identity not loaded"));
  }

  return new Promise((resolve, reject) => {
    state.google.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_PHOTOS_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        state.google.accessToken = response.access_token;
        state.google.tokenExpiresAt = Date.now() + Number(response.expires_in || 3600) * 1000;
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(new Error(error.message || error.type || "OAuth popup failed"));
      },
    });

    state.google.tokenClient.requestAccessToken({ prompt: state.google.accessToken ? "" : "consent" });
  });
}

async function createGooglePhotosSession() {
  const requestId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : makeRequestId();
  return googlePhotosJson(`/v1/sessions?requestId=${encodeURIComponent(requestId)}`, {
    method: "POST",
    body: JSON.stringify({
      pickingConfig: {
        maxItemCount: "180",
      },
    }),
  });
}

async function pollGooglePhotosSession(session) {
  let elapsed = 0;
  let pollEvery = parseDuration(session.pollingConfig?.pollInterval, 3000);
  let timeout = parseDuration(session.pollingConfig?.timeoutIn, 300000);

  while (elapsed <= timeout) {
    await delay(pollEvery);
    elapsed += pollEvery;
    const current = await googlePhotosJson(`/v1/sessions/${encodeURIComponent(session.id)}`);
    if (current.mediaItemsSet) return current;

    pollEvery = parseDuration(current.pollingConfig?.pollInterval, pollEvery);
    timeout = parseDuration(current.pollingConfig?.timeoutIn, timeout - elapsed);
  }

  throw new Error("Picker timed out");
}

async function listGooglePhotosItems(sessionId) {
  const allItems = [];
  let pageToken = "";

  do {
    const query = new URLSearchParams({
      sessionId,
      pageSize: "100",
    });
    if (pageToken) query.set("pageToken", pageToken);

    const page = await googlePhotosJson(`/v1/mediaItems?${query.toString()}`);
    allItems.push(...(page.mediaItems || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);

  return allItems;
}

async function materializeGooglePhotosItems(pickedItems) {
  const photos = pickedItems
    .filter((item) => item.type === "PHOTO" && item.mediaFile?.baseUrl)
    .reverse();
  const imported = [];

  for (let index = 0; index < photos.length; index += 1) {
    const item = photos[index];
    const file = item.mediaFile;
    const meta = file.mediaFileMetadata || {};
    const width = Number(meta.width || 1600);
    const height = Number(meta.height || 1000);
    setGoogleStatus(`Loading ${index + 1}/${photos.length}`);

    try {
      const [blob, previewBlob] = await Promise.all([
        googlePhotosBlob(`${file.baseUrl}=w1800-h1800`),
        googlePhotosBlob(`${file.baseUrl}=w520-h520`),
      ]);
      const objectUrl = URL.createObjectURL(blob);
      const previewUrl = URL.createObjectURL(previewBlob);
      state.google.objectUrls.push(objectUrl);
      state.google.objectUrls.push(previewUrl);
      imported.push({
        id: item.id || `${Date.now()}-${index}`,
        title: cleanFilename(file.filename || `Google Photo ${index + 1}`),
        place: "Google Photos",
        ratio: height / width,
        source: "google",
        blob,
        previewBlob,
        src: objectUrl,
        previewSrc: previewUrl,
      });
    } catch (error) {
      console.warn("Skipping Google Photos item", error);
    }
  }

  return imported;
}

async function deleteGooglePhotosSession(sessionId) {
  return googlePhotosJson(`/v1/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

async function restorePersistedPhotos() {
  try {
    const records = await loadPersistedPhotos();
    if (!records.length) return;

    const restored = records.map((record, index) => {
      const src = URL.createObjectURL(record.blob);
      const previewSrc = record.previewBlob ? URL.createObjectURL(record.previewBlob) : "";
      state.google.objectUrls.push(src);
      if (previewSrc) state.google.objectUrls.push(previewSrc);
      return {
        id: record.id || `restored-${index}`,
        title: record.title || `Google Photo ${index + 1}`,
        place: record.place || "Google Photos",
        ratio: record.ratio || 1,
        source: "google",
        blob: record.blob,
        previewBlob: record.previewBlob,
        src,
        previewSrc,
      };
    });

    restorePhotoItems(restored);
    hydrateMissingPreviews(restored);
    setGoogleStatus(`Restored ${restored.length} photos`);
  } catch (error) {
    console.warn("Could not restore persisted photos", error);
  }
}

function hydrateMissingPreviews(photoItems) {
  if (!("createImageBitmap" in window)) return;
  const pending = photoItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.blob instanceof Blob && !item.previewBlob);

  if (!pending.length) return;

  const run = async () => {
    let didCreatePreview = false;
    for (const { item, index } of pending) {
      try {
        const previewBlob = await makePreviewBlob(item.blob);
        if (!previewBlob) continue;
        const previewSrc = URL.createObjectURL(previewBlob);
        item.previewBlob = previewBlob;
        item.previewSrc = previewSrc;
        state.google.objectUrls.push(previewSrc);
        updateCardPreview(index);
        didCreatePreview = true;
        await delay(16);
      } catch (error) {
        console.warn("Could not build preview", error);
      }
    }
    if (didCreatePreview) savePersistedPhotos(photoItems).catch(() => {});
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => run(), { timeout: 1800 });
  } else {
    window.setTimeout(run, 600);
  }
}

async function makePreviewBlob(blob) {
  const bitmap = await createImageBitmap(blob);
  const maxSide = 560;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.76);
  });
}

async function savePersistedPhotos(photoItems) {
  if (!("indexedDB" in window)) return;
  const records = photoItems
    .filter((item) => item.blob instanceof Blob)
    .map((item, index) => ({
      id: item.id || `photo-${index}`,
      title: item.title,
      place: item.place,
      ratio: item.ratio,
      source: item.source,
      blob: item.blob,
      previewBlob: item.previewBlob,
    }));

  if (!records.length) return;
  const db = await openPhotoDb();
  await writePhotoDb(db, (store) => {
    store.put({
      id: ACTIVE_ALBUM_ID,
      updatedAt: Date.now(),
      photos: records,
    });
  });
  db.close();
}

async function loadPersistedPhotos() {
  if (!("indexedDB" in window)) return [];
  const db = await openPhotoDb();
  const album = await readPhotoDb(db, (store) => store.get(ACTIVE_ALBUM_ID));
  db.close();
  return album?.photos || [];
}

function openPhotoDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_DB_NAME, PHOTO_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        db.createObjectStore(PHOTO_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readPhotoDb(db, action) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE_NAME, "readonly");
    const store = transaction.objectStore(PHOTO_STORE_NAME);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function writePhotoDb(db, action) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PHOTO_STORE_NAME);
    action(store);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function googlePhotosJson(path, options = {}) {
  const response = await googlePhotosFetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) return {};
  return response.json();
}

async function googlePhotosBlob(url) {
  const response = await googlePhotosFetch(url, {}, true);
  return response.blob();
}

async function googlePhotosFetch(pathOrUrl, options = {}, absolute = false) {
  const url = absolute ? pathOrUrl : `${GOOGLE_PHOTOS_API}${pathOrUrl}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${state.google.accessToken}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Google Photos ${response.status}`;
    try {
      const body = await response.json();
      message = body.error?.message || message;
    } catch {
      // Keep the HTTP status message.
    }
    if (response.status === 401) {
      state.google.accessToken = "";
      state.google.tokenExpiresAt = 0;
    }
    throw new Error(message);
  }

  return response;
}

function openPickerWindow(pickerWindow, pickerUrl) {
  if (pickerWindow) {
    pickerWindow.location.href = pickerUrl;
    pickerWindow.focus();
    return;
  }

  const link = document.createElement("a");
  link.href = pickerUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.click();
}

function setGoogleStatus(text) {
  photosStatus.value = text;
}

function parseDuration(value, fallback) {
  if (!value || typeof value !== "string") return fallback;
  const seconds = Number(value.replace("s", ""));
  return Number.isFinite(seconds) ? Math.max(500, seconds * 1000) : fallback;
}

function makeRequestId() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = bytes[6] & 0x0f | 0x40;
  bytes[8] = bytes[8] & 0x3f | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function cleanFilename(filename) {
  return filename.replace(/\.[a-z0-9]{2,5}$/i, "").slice(0, 42);
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function handleCardClick(event) {
  const card = event.target.closest(".photo-card");
  if (!card || state.didDrag) return;
  const index = Number(card.dataset.index);
  state.selected = index;

  if (state.mode === "sphere") {
    setMode("orbit", { focusIndex: index });
    return;
  }

  openViewer(index);
}

function handlePointerDown(event) {
  if (viewer.classList.contains("is-open")) return;
  if (state.mode === "waterfall") return;

  const point = toLayoutPoint(event.clientX, event.clientY);
  state.isPointerDown = true;
  state.didDrag = false;
  state.lastX = point.x;
  state.lastY = point.y;
  state.pointerX = point.x;
  state.pointerY = point.y;
  document.body.classList.add("is-dragging");
  stage.setPointerCapture?.(event.pointerId);
}

function handlePointerMove(event) {
  const point = toLayoutPoint(event.clientX, event.clientY);
  state.pointerX = point.x;
  state.pointerY = point.y;
  if (!state.isPointerDown) return;

  const dx = point.x - state.lastX;
  const dy = point.y - state.lastY;
  if (Math.abs(dx) + Math.abs(dy) > 4) state.didDrag = true;

  if (state.mode === "orbit") {
    state.orbit.x += dx;
    state.orbit.y += dy;
    state.orbit.vx = dx;
    state.orbit.vy = dy;
    state.orbit.fieldEnergy = Math.min(1, state.orbit.fieldEnergy + Math.hypot(dx, dy) / 160);
  }

  if (state.mode === "sphere") {
    state.sphere.rotY += dx * 0.008;
    state.sphere.rotX -= dy * 0.006;
    state.sphere.vy = dx * 0.00018;
    state.sphere.vx = -dy * 0.00014;
    state.sphere.radiusBoost = Math.min(26, state.sphere.radiusBoost + Math.hypot(dx, dy) * 0.08);
  }

  state.lastX = point.x;
  state.lastY = point.y;
}

function handlePointerUp() {
  if (!state.isPointerDown) return;
  state.isPointerDown = false;
  document.body.classList.remove("is-dragging");
  window.setTimeout(() => {
    state.didDrag = false;
  }, 40);
}

function handleWheel(event) {
  const now = performance.now();
  const isZoomIntent = event.ctrlKey;

  if (isZoomIntent && now - state.lastZoomSwitch > 620) {
    event.preventDefault();
    const current = MODES.indexOf(state.mode);
    const nextIndex = event.deltaY > 0
      ? Math.min(MODES.length - 1, current + 1)
      : Math.max(0, current - 1);
    if (nextIndex !== current) {
      state.lastZoomSwitch = now;
      setMode(MODES[nextIndex]);
    }
    return;
  }

  if (state.mode === "orbit") {
    event.preventDefault();
    state.orbit.x -= event.deltaX * 0.75;
    state.orbit.y -= event.deltaY * 0.75;
    state.orbit.vx = -event.deltaX * 0.08;
    state.orbit.vy = -event.deltaY * 0.08;
  }

  if (state.mode === "sphere") {
    event.preventDefault();
    state.sphere.radiusBoost = clamp(state.sphere.radiusBoost + event.deltaY * 0.025, -22, 34);
  }
}

function setMode(nextMode, options = {}) {
  if (!MODES.includes(nextMode) || nextMode === state.mode) return;
  const previousMode = state.mode;
  state.mode = nextMode;
  if (typeof options.focusIndex === "number") state.selected = options.focusIndex;

  if (nextMode === "orbit") {
    if (typeof options.focusIndex === "number") {
      centerOrbitOn(state.selected);
    } else {
      centerOrbitField();
    }
  }

  startParticleTransition(previousMode, nextMode);
  document.body.dataset.mode = nextMode;
  document.body.classList.add("is-switching");
  state.transitionUntil = performance.now() + 920;
  updateModeChrome();
  applyLayout({ immediate: false });
  showToast(MODE_NAMES[nextMode]);

  window.setTimeout(() => {
    document.body.classList.remove("is-switching");
    applyLayout({ immediate: true });
  }, 930);
}

function startParticleTransition(fromMode, toMode) {
  state.particleTransition.fromMode = fromMode;
  state.particleTransition.toMode = toMode;
  state.particleTransition.startedAt = performance.now();
}

function updateModeChrome() {
  modeLabel.textContent = MODE_NAMES[state.mode];
  for (const button of modeButtons.querySelectorAll("button[data-mode]")) {
    button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode));
  }
  immersiveButton.textContent = state.mode === "waterfall" ? "观赏" : "沉浸";
}

function showToast(text) {
  modeToast.textContent = text;
  modeToast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    modeToast.classList.remove("is-visible");
  }, 620);
}

async function toggleGestureControl() {
  if (state.gesture.loading) return;
  if (state.gesture.active) {
    stopGestureControl();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("手势不可用");
    return;
  }

  state.gesture.loading = true;
  gestureButton.disabled = true;
  showToast("手势加载中");

  try {
    const [{ FilesetResolver, HandLandmarker }, stream] = await Promise.all([
      import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VERSION}/+esm`),
      navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: GESTURE_CAMERA_WIDTH },
          height: { ideal: GESTURE_CAMERA_HEIGHT },
          frameRate: { ideal: 24, max: 30 },
          facingMode: "user",
        },
        audio: false,
      }),
    ]);

    const vision = await FilesetResolver.forVisionTasks(
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VERSION}/wasm`
    );

    const landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 1,
    });

    state.gesture.stream = stream;
    state.gesture.landmarker = landmarker;
    state.gesture.active = true;
    state.gesture.lastVideoTime = -1;
    state.gesture.lastDetectAt = 0;
    state.gesture.detectCost = 0;
    state.gesture.suspendUntil = 0;
    state.gesture.lastCenterX = null;
    state.gesture.anchorX = null;
    resetGestureState();
    gestureVideo.srcObject = stream;
    await gestureVideo.play();
    document.body.classList.add("gesture-active");
    gestureButton.setAttribute("aria-pressed", "true");
    gestureButton.title = "关闭手势切换";
    showToast("手势已启用");
    runGestureFrame();
  } catch (error) {
    console.warn("Gesture control unavailable", error);
    stopGestureControl();
    showToast("手势不可用");
  } finally {
    state.gesture.loading = false;
    gestureButton.disabled = false;
  }
}

function stopGestureControl() {
  window.cancelAnimationFrame(state.gesture.raf);
  state.gesture.raf = 0;
  if (state.gesture.stream) {
    for (const track of state.gesture.stream.getTracks()) track.stop();
  }
  state.gesture.stream = null;
  state.gesture.active = false;
  state.gesture.lastCenterX = null;
  state.gesture.anchorX = null;
  resetGestureState();
  gestureVideo.srcObject = null;
  document.body.classList.remove("gesture-active");
  gestureButton.removeAttribute("aria-pressed");
  gestureButton.title = "手势切换";
  showToast("手势关闭");
}

function runGestureFrame() {
  if (!state.gesture.active || !state.gesture.landmarker) return;

  const now = performance.now();
  advanceGestureDrag();

  if (gestureVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      gestureVideo.currentTime !== state.gesture.lastVideoTime &&
      now >= state.gesture.suspendUntil &&
      now - state.gesture.lastDetectAt >= GESTURE_DETECTION_INTERVAL) {
    state.gesture.lastDetectAt = now;
    state.gesture.lastVideoTime = gestureVideo.currentTime;
    const detectStartedAt = performance.now();
    const result = state.gesture.landmarker.detectForVideo(gestureVideo, now);
    state.gesture.detectCost = state.gesture.detectCost * 0.82 + (performance.now() - detectStartedAt) * 0.18;
    handleGestureResult(result);
  }

  state.gesture.raf = requestAnimationFrame(runGestureFrame);
}

function resetGestureState() {
  state.gesture.stableGesture = "open";
  state.gesture.stableFrames = 0;
  state.gesture.commandReady = true;
  state.gesture.neutralFrames = 0;
  state.gesture.lastSwitchAt = performance.now() - GESTURE_SWITCH_COOLDOWN;
  state.gesture.dragActive = false;
  state.gesture.dragX = 0;
  state.gesture.dragY = 0;
  state.gesture.dragTargetX = 0;
  state.gesture.dragTargetY = 0;
  state.gesture.lastDetectAt = 0;
  state.gesture.detectCost = 0;
  state.gesture.suspendUntil = 0;
  state.gesture.lastAction = "none";
}

function legacyHandleGestureResult(result) {
  const landmarks = result.landmarks?.[0];
  if (!landmarks) {
    state.gesture.lastCenterX = null;
    return;
  }

  let centerX = 0;
  let centerY = 0;
  for (const point of landmarks) {
    centerX += point.x / landmarks.length;
    centerY += point.y / landmarks.length;
  }

  const screenX = 1 - centerX;
  const { width, height } = getStageSize();
  state.pointerX = screenX * width;
  state.pointerY = centerY * height;
  state.sphere.radiusBoost = Math.min(40, state.sphere.radiusBoost + 0.55);

  const now = performance.now();
  if (state.gesture.anchorX === null) state.gesture.anchorX = screenX;
  if (now - state.gesture.lastSwitchAt > 950) {
    const delta = screenX - state.gesture.anchorX;
    if (Math.abs(delta) > 0.18) {
      const direction = delta > 0 ? 1 : -1;
      const current = MODES.indexOf(state.mode);
      const nextIndex = clamp(current + direction, 0, MODES.length - 1);
      if (nextIndex !== current) {
        state.gesture.lastSwitchAt = now;
        state.gesture.anchorX = screenX;
        setMode(MODES[nextIndex]);
        showToast(`手势 ${MODE_NAMES[MODES[nextIndex]]}`);
      }
    }
  }

  state.gesture.lastCenterX = screenX * 0.72 + (state.gesture.lastCenterX ?? screenX) * 0.28;
}

function handleGestureResult(result) {
  const landmarks = result.landmarks?.[0];
  if (!landmarks) {
    state.gesture.lastCenterX = null;
    state.gesture.neutralFrames += 1;
    if (state.gesture.neutralFrames > 4) state.gesture.commandReady = true;
    endGestureDrag();
    return;
  }

  let centerX = 0;
  let centerY = 0;
  for (const point of landmarks) {
    centerX += point.x / landmarks.length;
    centerY += point.y / landmarks.length;
  }

  const screenX = 1 - centerX;
  const { width, height } = getStageSize();
  state.pointerX = screenX * width;
  state.pointerY = centerY * height;
  state.sphere.radiusBoost = Math.min(40, state.sphere.radiusBoost + 0.35);

  const now = performance.now();
  const gesture = classifyHandGesture(landmarks);
  updateStableGesture(gesture);

  if (gesture === "fist") {
    state.gesture.neutralFrames = 0;
    state.gesture.commandReady = true;
    simulateGestureDrag(screenX, centerY);
    state.gesture.lastCenterX = screenX;
    return;
  }

  endGestureDrag();

  const isCommand = gesture === "v" || gesture === "thumb";
  if (!isCommand) {
    state.gesture.neutralFrames += 1;
    if (state.gesture.neutralFrames > 5) state.gesture.commandReady = true;
    state.gesture.lastCenterX = screenX;
    return;
  }

  state.gesture.neutralFrames = 0;
  const isStableCommand = state.gesture.stableGesture === gesture &&
    state.gesture.stableFrames >= GESTURE_STABLE_FRAMES;
  if (isStableCommand && state.gesture.commandReady && now - state.gesture.lastSwitchAt > GESTURE_SWITCH_COOLDOWN) {
    const direction = gesture === "v" ? 1 : -1;
    const current = MODES.indexOf(state.mode);
    const nextIndex = clamp(current + direction, 0, MODES.length - 1);
    if (nextIndex !== current) {
      scheduleGestureModeSwitch(MODES[nextIndex], gesture, now);
    }
  }

  state.gesture.lastCenterX = screenX * 0.72 + (state.gesture.lastCenterX ?? screenX) * 0.28;
}

function scheduleGestureModeSwitch(nextMode, gesture, now = performance.now()) {
  state.gesture.lastSwitchAt = now;
  state.gesture.commandReady = false;
  state.gesture.lastAction = gesture;
  state.gesture.suspendUntil = now + GESTURE_SWITCH_DETECTION_PAUSE;
  state.gesture.lastDetectAt = now;
  endGestureDrag();

  requestAnimationFrame(() => {
    if (!state.gesture.active) return;
    state.gesture.suspendUntil = Math.max(
      state.gesture.suspendUntil,
      performance.now() + GESTURE_SWITCH_DETECTION_PAUSE
    );
    setMode(nextMode);
  });
}

function updateStableGesture(gesture) {
  if (gesture === state.gesture.stableGesture) {
    state.gesture.stableFrames += 1;
    return;
  }

  state.gesture.stableGesture = gesture;
  state.gesture.stableFrames = 1;
}

function classifyHandGesture(landmarks) {
  const fingers = getFingerStates(landmarks);
  const extendedCount = [fingers.index, fingers.middle, fingers.ring, fingers.pinky].filter(Boolean).length;
  const thumbOnly = fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky;
  const vSign = fingers.index && fingers.middle && !fingers.ring && !fingers.pinky &&
    distance2d(landmarks[8], landmarks[12]) > distance2d(landmarks[5], landmarks[9]) * 0.82;
  const fist = !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky && !fingers.thumb;

  if (vSign) return "v";
  if (thumbOnly) return "thumb";
  if (fist || extendedCount === 0 && !fingers.thumb) return "fist";
  return "open";
}

function getFingerStates(landmarks) {
  const wrist = landmarks[0];
  const palmScale = Math.max(0.001, distance2d(wrist, landmarks[9]));
  const isExtended = (tip, pip, mcp) => {
    const tipDistance = distance2d(wrist, landmarks[tip]);
    const pipDistance = distance2d(wrist, landmarks[pip]);
    const mcpDistance = distance2d(wrist, landmarks[mcp]);
    return tipDistance > pipDistance + palmScale * 0.08 &&
      tipDistance > mcpDistance + palmScale * 0.22;
  };
  const thumbSpread = distance2d(landmarks[4], landmarks[9]) / palmScale;
  const thumbTip = distance2d(wrist, landmarks[4]);
  const thumbIp = distance2d(wrist, landmarks[3]);

  return {
    thumb: thumbSpread > 0.82 && thumbTip > thumbIp + palmScale * 0.05,
    index: isExtended(8, 6, 5),
    middle: isExtended(12, 10, 9),
    ring: isExtended(16, 14, 13),
    pinky: isExtended(20, 18, 17),
  };
}

function simulateGestureDrag(screenX, screenY) {
  const { width, height } = getStageSize();
  const x = screenX * width;
  const y = screenY * height;

  if (!state.gesture.dragActive) {
    state.gesture.dragActive = true;
    state.gesture.dragX = x;
    state.gesture.dragY = y;
    state.gesture.dragTargetX = x;
    state.gesture.dragTargetY = y;
    state.isPointerDown = true;
    state.didDrag = false;
    document.body.classList.add("is-dragging");
    return;
  }

  state.gesture.dragTargetX = x;
  state.gesture.dragTargetY = y;
}

function advanceGestureDrag() {
  if (!state.gesture.dragActive) return;

  const nextX = state.gesture.dragX + (state.gesture.dragTargetX - state.gesture.dragX) * GESTURE_DRAG_LERP;
  const nextY = state.gesture.dragY + (state.gesture.dragTargetY - state.gesture.dragY) * GESTURE_DRAG_LERP;
  const dx = (nextX - state.gesture.dragX) * GESTURE_DRAG_SCALE;
  const dy = (nextY - state.gesture.dragY) * GESTURE_DRAG_SCALE;

  if (Math.abs(dx) + Math.abs(dy) > GESTURE_DRAG_EPSILON) {
    applyVirtualDrag(dx, dy);
  }

  state.gesture.dragX = nextX;
  state.gesture.dragY = nextY;
}

function endGestureDrag() {
  if (!state.gesture.dragActive) return;
  state.gesture.dragActive = false;
  state.isPointerDown = false;
  state.gesture.dragTargetX = state.gesture.dragX;
  state.gesture.dragTargetY = state.gesture.dragY;
  document.body.classList.remove("is-dragging");
  window.setTimeout(() => {
    state.didDrag = false;
  }, 40);
}

function applyVirtualDrag(dx, dy) {
  if (Math.abs(dx) + Math.abs(dy) > 4) state.didDrag = true;

  if (state.mode === "waterfall") {
    stage.scrollTop -= dy;
  }

  if (state.mode === "orbit") {
    state.orbit.x += dx;
    state.orbit.y += dy;
    state.orbit.vx = dx;
    state.orbit.vy = dy;
    state.orbit.fieldEnergy = Math.min(1, state.orbit.fieldEnergy + Math.hypot(dx, dy) / 160);
  }

  if (state.mode === "sphere") {
    state.sphere.rotY += dx * 0.008;
    state.sphere.rotX -= dy * 0.006;
    state.sphere.vy = dx * 0.00018;
    state.sphere.vx = -dy * 0.00014;
    state.sphere.radiusBoost = Math.min(26, state.sphere.radiusBoost + Math.hypot(dx, dy) * 0.08);
  }
}

function distance2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function centerOrbitOn(index) {
  const grid = getOrbitGrid();
  const point = getOrbitPoint(index, grid);
  state.orbit.x = -point.x;
  state.orbit.y = -point.y;
  state.orbit.vx = 0;
  state.orbit.vy = 0;
  syncOrbitParticleField(true);
}

function centerOrbitField() {
  state.orbit.x = 0;
  state.orbit.y = 0;
  state.orbit.vx = 0;
  state.orbit.vy = 0;
  syncOrbitParticleField(true);
}

function syncOrbitParticleField(immediate = false) {
  if (immediate) {
    state.orbit.fieldX = state.orbit.x;
    state.orbit.fieldY = state.orbit.y;
    state.orbit.fieldVx = 0;
    state.orbit.fieldVy = 0;
    state.orbit.fieldEnergy = 0;
    return;
  }

  const dx = state.orbit.x - state.orbit.fieldX;
  const dy = state.orbit.y - state.orbit.fieldY;
  state.orbit.fieldVx = state.orbit.fieldVx * 0.82 + dx * 0.055 + state.orbit.vx * 0.055;
  state.orbit.fieldVy = state.orbit.fieldVy * 0.82 + dy * 0.055 + state.orbit.vy * 0.055;
  state.orbit.fieldX += state.orbit.fieldVx;
  state.orbit.fieldY += state.orbit.fieldVy;
  const motion = Math.hypot(state.orbit.vx, state.orbit.vy) + Math.hypot(state.orbit.fieldVx, state.orbit.fieldVy) * 0.45;
  const targetEnergy = clamp(motion / 38, 0, 1);
  state.orbit.fieldEnergy += (targetEnergy - state.orbit.fieldEnergy) * 0.12;
}

function applyLayout({ immediate = false } = {}) {
  if (immediate) cards.forEach((card) => card.classList.remove("is-settling"));
  if (state.mode === "waterfall") applyWaterfallLayout();
  if (state.mode === "orbit") applyOrbitLayout();
  if (state.mode === "sphere") applySphereLayout({ seedPhysics: true });
}

function applyWaterfallLayout() {
  const width = stage.clientWidth;
  const gap = width < 700 ? 12 : 16;
  const side = width < 700 ? 12 : 24;
  const top = width < 700 ? 82 : 96;
  const bottom = 116;
  const columnCount = width >= 1360 ? 5 : width >= 1080 ? 4 : width >= 760 ? 3 : width >= 520 ? 2 : 1;
  const cardWidth = Math.floor((width - side * 2 - gap * (columnCount - 1)) / columnCount);
  const columns = Array.from({ length: columnCount }, () => top);

  cards.forEach((card, index) => {
    const item = items[index];
    const column = columns.indexOf(Math.min(...columns));
    const x = side + column * (cardWidth + gap);
    const y = columns[column];
    const height = Math.round(cardWidth * clamp(item.ratio, 0.68, 1.62));
    columns[column] += height + gap;
    setCardStyle(card, {
      x,
      y,
      width: cardWidth,
      height,
      opacity: 1,
      z: 1,
      radius: 8,
      filter: "none",
    });
  });

  gallery.style.height = `${Math.max(stage.clientHeight, Math.max(...columns) + bottom)}px`;
}

function applyOrbitLayout() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const base = width < 540 ? 58 : width < 920 ? 70 : 82;
  const grid = getOrbitGrid();
  const now = performance.now();
  gallery.style.height = `${height}px`;

  cards.forEach((card, index) => {
    const point = getOrbitPoint(index, grid);
    const fieldX = point.x + state.orbit.x;
    const fieldY = point.y + state.orbit.y;
    const distance = Math.hypot(fieldX, fieldY);
    const depthWave = Math.sin(index * 1.91 + state.orbit.fieldX * 0.006 + now * 0.00065) * 0.5 + 0.5;
    const lens = 1 + Math.max(0, 1 - distance / 430) * 0.16;
    const driftX = Math.sin(now * 0.00072 + index * 1.7) * 4;
    const driftY = Math.cos(now * 0.00062 + index * 1.23) * 3;
    const screenX = centerX + fieldX * lens + driftX;
    const screenY = centerY + fieldY * lens + driftY;
    const scale = clamp(1.16 - distance / 580 + depthWave * 0.08, 0.42, 1.16);
    const depth = clamp(1 - distance / 720 + depthWave * 0.18, 0, 1);
    const size = Math.round(base * scale);
    const isSelected = index === state.selected;
    const body = physics[index];
    const targetX = screenX - size / 2;
    const targetY = screenY - size / 2;
    const unseeded = body.x === 0 && body.y === 0;

    if (unseeded || performance.now() < state.transitionUntil) {
      body.x = targetX;
      body.y = targetY;
      body.size = size;
      body.vx = 0;
      body.vy = 0;
    } else {
      const dx = targetX - body.x;
      const dy = targetY - body.y;
      body.vx = body.vx * 0.72 + dx * 0.16 + state.orbit.vx * 0.012;
      body.vy = body.vy * 0.72 + dy * 0.16 + state.orbit.vy * 0.012;

      const cardCenterX = body.x + body.size / 2;
      const cardCenterY = body.y + body.size / 2;
      const pointerDistance = Math.hypot(cardCenterX - state.pointerX, cardCenterY - state.pointerY);
      const pointerRange = 92 + depth * 54;
      if (pointerDistance < pointerRange) {
        const force = (pointerRange - pointerDistance) / pointerRange;
        const angle = Math.atan2(cardCenterY - state.pointerY, cardCenterX - state.pointerX);
        body.vx += Math.cos(angle) * force * (1.1 + depth * 1.2);
        body.vy += Math.sin(angle) * force * (1.1 + depth * 1.2);
        state.orbit.fieldEnergy = Math.min(1, state.orbit.fieldEnergy + force * 0.015);
      }

      body.x += body.vx;
      body.y += body.vy;
      body.size += (size - body.size) * 0.18;
    }

    setCardStyle(card, {
      x: body.x,
      y: body.y,
      width: body.size,
      height: body.size,
      opacity: distance > Math.max(width, height) * 0.76 ? 0.12 : clamp(0.32 + depth * 0.78, 0.24, 1),
      z: Math.round(depth * 1600 + scale * 500) + (isSelected ? 2000 : 0),
      radius: body.size / 2,
      filter: isSelected
        ? "saturate(1.18) brightness(1.1)"
        : `saturate(${0.86 + depth * 0.38}) brightness(${0.68 + depth * 0.36})`,
    });
  });
}

function getOrbitGrid() {
  const base = stage.clientWidth < 540 ? 68 : stage.clientWidth < 920 ? 82 : 96;
  const cols = Math.ceil(Math.sqrt(items.length) * 1.25);
  const rows = Math.ceil(items.length / cols);
  return { base, cols, rows };
}

function getVirtualOrbitGrid() {
  const cols = Math.ceil(Math.sqrt(Math.max(1, items.length)) * 1.25);
  const rows = Math.ceil(Math.max(1, items.length) / cols);
  return { cols, rows };
}

function getOrbitPoint(index, grid) {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  const offset = row % 2 ? grid.base * 0.34 : 0;
  const jitterX = Math.sin(index * 12.9898) * grid.base * 0.18;
  const jitterY = Math.cos(index * 7.233) * grid.base * 0.14;
  return {
    x: (col - (grid.cols - 1) / 2) * grid.base + offset + jitterX,
    y: (row - (grid.rows - 1) / 2) * grid.base * 0.88 + jitterY,
  };
}

function applySphereLayout({ seedPhysics = false } = {}) {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const metrics = getSacredSphereMetrics(width, height);
  const centerX = metrics.centerX;
  const centerY = metrics.centerY;
  const radius = metrics.radius + state.sphere.radiusBoost;
  const perspective = metrics.perspective;
  gallery.style.height = `${height}px`;

  const sinX = Math.sin(state.sphere.rotX);
  const cosX = Math.cos(state.sphere.rotX);
  const sinY = Math.sin(state.sphere.rotY);
  const cosY = Math.cos(state.sphere.rotY);

  cards.forEach((card, index) => {
    const point = spherePoints[index];
    const x1 = point.x * cosY - point.z * sinY;
    const z1 = point.x * sinY + point.z * cosY;
    const y1 = point.y * cosX - z1 * sinX;
    const z2 = point.y * sinX + z1 * cosX;
    const depth = (z2 + 1) / 2;
    const projected = perspective / (perspective - z2 * radius);
    const targetX = centerX + x1 * radius * projected;
    const targetY = centerY + y1 * radius * projected;
    const targetSize = clamp(metrics.cardMin + depth * metrics.cardDepth, metrics.cardMin, metrics.cardMax);
    const body = physics[index];

    if (seedPhysics || body.x === 0 && body.y === 0) {
      body.x = targetX;
      body.y = targetY;
      body.size = targetSize;
      body.vx = 0;
      body.vy = 0;
    } else {
      const dx = targetX - body.x;
      const dy = targetY - body.y;
      body.vx = body.vx * 0.78 + dx * 0.085;
      body.vy = body.vy * 0.78 + dy * 0.085 + Math.max(0, 0.22 - depth * 0.18);

      const pointerDistance = Math.hypot(body.x - state.pointerX, body.y - state.pointerY);
      if (pointerDistance < 105) {
        const force = (105 - pointerDistance) / 105;
        const angle = Math.atan2(body.y - state.pointerY, body.x - state.pointerX);
        body.vx += Math.cos(angle) * force * 2.2;
        body.vy += Math.sin(angle) * force * 2.2 + force * 0.35;
      }

      body.x += body.vx;
      body.y += body.vy;
      body.size += (targetSize - body.size) * 0.14;
    }

    setCardStyle(card, {
      x: body.x - body.size / 2,
      y: body.y - body.size / 2,
      width: body.size,
      height: body.size,
      opacity: clamp(0.2 + depth * 0.9, 0.18, 1),
      z: Math.round(depth * 1000),
      radius: body.size / 2,
      filter: `saturate(${1.02 + depth * 0.26}) brightness(${0.82 + depth * 0.32})`,
    });
  });
}

function getSacredSphereMetrics(width, height) {
  const shortSide = Math.min(width, height);
  const radius = shortSide * (width < 700 ? 0.31 : 0.36);
  return {
    centerX: width / 2,
    centerY: height * (width < 700 ? 0.5 : 0.51),
    radius,
    perspective: Math.max(width, height) * 1.18,
    cardMin: width < 700 ? 30 : 40,
    cardMax: width < 700 ? 58 : 82,
    cardDepth: width < 700 ? 32 : 52,
  };
}

function setCardStyle(card, layout) {
  const transform = `translate3d(${layout.x.toFixed(2)}px, ${layout.y.toFixed(2)}px, 0)`;
  const widthValue = Math.max(1, layout.width);
  const heightValue = Math.max(1, layout.height);
  const opacity = layout.opacity.toFixed(3);
  const radiusValue = layout.radius;
  const z = String(layout.z);
  const cached = cardLayouts.get(card) || {};

  if (cached.transform !== transform) {
    card.style.setProperty("--card-transform", transform);
    card.style.transform = transform;
    cached.transform = transform;
  }
  if (cached.widthValue === undefined || Math.abs(cached.widthValue - widthValue) > 1) {
    card.style.width = `${widthValue.toFixed(2)}px`;
    cached.widthValue = widthValue;
  }
  if (cached.heightValue === undefined || Math.abs(cached.heightValue - heightValue) > 1) {
    card.style.height = `${heightValue.toFixed(2)}px`;
    cached.heightValue = heightValue;
  }
  if (cached.opacity !== opacity) {
    card.style.opacity = opacity;
    cached.opacity = opacity;
  }
  if (cached.z !== z) {
    card.style.zIndex = z;
    cached.z = z;
  }
  if (cached.radiusValue === undefined || Math.abs(cached.radiusValue - radiusValue) > 1) {
    card.style.borderRadius = `${radiusValue.toFixed(2)}px`;
    cached.radiusValue = radiusValue;
  }
  if (cached.filter !== layout.filter) {
    card.style.filter = layout.filter;
    cached.filter = layout.filter;
  }

  cardLayouts.set(card, cached);
}

function tick() {
  const now = performance.now();
  syncOrbitParticleField(state.mode !== "orbit" && now > state.transitionUntil);

  if (state.mode === "orbit" && now > state.transitionUntil) {
    if (!state.isPointerDown) {
      state.orbit.x += state.orbit.vx;
      state.orbit.y += state.orbit.vy;
      state.orbit.vx *= 0.9;
      state.orbit.vy *= 0.9;
    }
    applyOrbitLayout();
  }

  if (state.mode === "sphere") {
    if (now > state.transitionUntil) {
      if (!state.isPointerDown) {
        state.sphere.rotX += state.sphere.vx;
        state.sphere.rotY += state.sphere.vy;
        state.sphere.vx *= 0.985;
        state.sphere.vy *= 0.985;
        state.sphere.vy += 0.000012;
      }
      state.sphere.radiusBoost *= 0.94;
      applySphereLayout();
    }
    drawWebglParticles(now);
    drawParticleField(now);
  } else {
    drawWebglParticles(now);
    drawParticleField(now);
  }

  requestAnimationFrame(tick);
}

function drawWebglParticles(now) {
  if (!particleGl || !webglParticles) return;
  const dpr = getRenderDpr();
  const { width, height } = getStageSize();
  const metrics = getSacredSphereMetrics(width, height);
  const transition = getParticleTransition(now);
  particleGl.clearColor(0, 0, 0, 0);
  particleGl.clear(particleGl.COLOR_BUFFER_BIT);
  particleGl.useProgram(webglParticles.program);
  particleGl.bindBuffer(particleGl.ARRAY_BUFFER, webglParticles.buffer);
  particleGl.enableVertexAttribArray(webglParticles.aPosition);
  particleGl.vertexAttribPointer(webglParticles.aPosition, 3, particleGl.FLOAT, false, 28, 0);
  particleGl.enableVertexAttribArray(webglParticles.aOrbit);
  particleGl.vertexAttribPointer(webglParticles.aOrbit, 2, particleGl.FLOAT, false, 28, 12);
  particleGl.enableVertexAttribArray(webglParticles.aSeed);
  particleGl.vertexAttribPointer(webglParticles.aSeed, 1, particleGl.FLOAT, false, 28, 20);
  particleGl.enableVertexAttribArray(webglParticles.aSize);
  particleGl.vertexAttribPointer(webglParticles.aSize, 1, particleGl.FLOAT, false, 28, 24);
  particleGl.uniform2f(webglParticles.uResolution, particleCanvas.width, particleCanvas.height);
  particleGl.uniform2f(webglParticles.uCenter, metrics.centerX * dpr, metrics.centerY * dpr);
  particleGl.uniform1f(webglParticles.uRadius, metrics.radius * dpr);
  particleGl.uniform1f(webglParticles.uPerspective, metrics.perspective * dpr);
  particleGl.uniform1f(webglParticles.uTime, now * 0.001);
  particleGl.uniform1f(webglParticles.uMode, transition.modeBlend);
  particleGl.uniform1f(webglParticles.uBurst, transition.burst);
  particleGl.uniform1f(webglParticles.uRotX, state.sphere.rotX);
  particleGl.uniform1f(webglParticles.uRotY, state.sphere.rotY);
  particleGl.uniform2f(webglParticles.uPointer, state.pointerX * dpr, state.pointerY * dpr);
  const orbitGrid = getOrbitGrid();
  particleGl.uniform2f(webglParticles.uOrbitOffset, state.orbit.fieldX / orbitGrid.base, state.orbit.fieldY / orbitGrid.base);
  particleGl.uniform2f(webglParticles.uOrbitVelocity, state.orbit.fieldVx / orbitGrid.base, state.orbit.fieldVy / orbitGrid.base);
  particleGl.uniform1f(webglParticles.uOrbitEnergy, state.orbit.fieldEnergy);
  particleGl.uniform1f(webglParticles.uOrbitScale, orbitGrid.base * dpr);
  particleGl.drawArrays(particleGl.POINTS, 0, WEBGL_PARTICLE_COUNT);
}

function getParticleTransition(now) {
  const transition = state.particleTransition;
  const elapsed = now - transition.startedAt;
  const progress = clamp(elapsed / transition.duration, 0, 1);
  const eased = progress * progress * (3 - progress * 2);
  const fromBlend = getParticleModeValue(transition.fromMode);
  const toBlend = getParticleModeValue(transition.toMode);
  const modeBlend = fromBlend + (toBlend - fromBlend) * eased;
  const burst = Math.sin(progress * Math.PI) * (transition.fromMode === transition.toMode ? 0 : 1);
  return { modeBlend, burst };
}

function getParticleModeValue(mode) {
  if (mode === "orbit") return 0.5;
  if (mode === "sphere") return 1;
  return 0;
}

function drawParticleField(now) {
  const { width, height } = getStageSize();
  grainCtx.clearRect(0, 0, width, height);
  grainCtx.save();
  grainCtx.globalCompositeOperation = "screen";
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.34;
  const palette = [
    "56, 178, 255",
    "111, 218, 255",
    "190, 244, 255",
    "74, 112, 255",
    "232, 252, 255",
    "24, 92, 210",
  ];

  for (let lane = 0; lane < 7; lane += 1) {
    const y = height * (0.14 + lane * 0.14);
    const shift = (now * 0.006 * (lane + 1)) % (width + 300);
    const alpha = state.mode === "sphere" ? 0.12 : 0.052;
    grainCtx.strokeStyle = `rgba(${palette[lane % palette.length]}, ${alpha})`;
    grainCtx.lineWidth = state.mode === "sphere" ? 1.4 : 1;
    grainCtx.beginPath();
    grainCtx.moveTo(-260 + shift, y);
    grainCtx.lineTo(width + shift, y + Math.sin(now * 0.00036 + lane) * 24);
    grainCtx.stroke();
  }

  if (state.mode === "waterfall") {
    drawAmbientParticles(now, width, height, cx, cy, radius, palette);
  }

  grainCtx.restore();
}

function drawAmbientParticles(now, width, height, cx, cy, radius, palette) {
  const limit = Math.min(220, grainParticles.length);
  for (let index = 0; index < limit; index += 1) {
    const particle = grainParticles[index];
    const angle = particle.a + now * 0.00008 * particle.drift;
    const laneOffset = (particle.lane - 5) * height * 0.046;
    const r = radius * (0.45 + Math.abs(particle.z) * 1.12);
    const x = (Math.cos(angle) * r + cx + now * particle.drift * 0.018) % (width + 180) - 90;
    const y = cy + laneOffset + Math.sin(angle * 1.8) * 38;
    grainCtx.fillStyle = `rgba(${palette[particle.tone]}, 0.05)`;
    grainCtx.beginPath();
    grainCtx.arc(x, y, particle.size * 0.55, 0, Math.PI * 2);
    grainCtx.fill();
  }
}

function drawSacredParticleSphere(now, width, height, palette) {
  const metrics = getSacredSphereMetrics(width, height);
  const radius = metrics.radius + state.sphere.radiusBoost * 0.72;
  const cx = metrics.centerX;
  const cy = metrics.centerY;
  const sinX = Math.sin(state.sphere.rotX + Math.sin(now * 0.00021) * 0.08);
  const cosX = Math.cos(state.sphere.rotX + Math.sin(now * 0.00021) * 0.08);
  const sinY = Math.sin(state.sphere.rotY + now * 0.00009);
  const cosY = Math.cos(state.sphere.rotY + now * 0.00009);
  const projected = [];

  const halo = grainCtx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius * 1.42);
  halo.addColorStop(0, "rgba(230, 252, 255, 0.32)");
  halo.addColorStop(0.18, "rgba(111, 218, 255, 0.24)");
  halo.addColorStop(0.52, "rgba(44, 118, 255, 0.13)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  grainCtx.fillStyle = halo;
  grainCtx.beginPath();
  grainCtx.arc(cx, cy, radius * 1.44, 0, Math.PI * 2);
  grainCtx.fill();

  for (let ring = 0; ring < 8; ring += 1) {
    const ringRadius = radius * (0.42 + ring * 0.112 + Math.sin(now * 0.001 + ring) * 0.008);
    const alpha = 0.24 - ring * 0.016;
    grainCtx.strokeStyle = `rgba(${palette[(ring + 1) % palette.length]}, ${alpha})`;
    grainCtx.lineWidth = ring === 3 ? 1.9 : 1.15;
    grainCtx.beginPath();
    grainCtx.ellipse(cx, cy, ringRadius, ringRadius * (0.27 + ring * 0.038), state.sphere.rotY * 0.42 + ring * 0.44, 0, Math.PI * 2);
    grainCtx.stroke();
  }

  for (const particle of grainParticles) {
    const localX = particle.x + Math.sin(now * 0.00032 * particle.drift + particle.a) * 0.014;
    const localY = particle.y + Math.cos(now * 0.00028 * particle.drift + particle.a) * 0.012;
    const localZ = particle.z;
    const x1 = localX * cosY - localZ * sinY;
    const z1 = localX * sinY + localZ * cosY;
    const y1 = localY * cosX - z1 * sinX;
    const z2 = localY * sinX + z1 * cosX;
    const depth = (z2 + 1.12) / 2.24;
    const perspective = metrics.perspective / (metrics.perspective - z2 * radius);

    projected.push({
      index: projected.length,
      x: cx + x1 * radius * perspective,
      y: cy + y1 * radius * perspective,
      z: z2,
      depth,
      particle,
    });
  }

  drawParticleFilaments(projected, radius, palette);

  projected.sort((a, b) => a.z - b.z);

  for (const point of projected) {
    const twinkle = 0.72 + Math.sin(now * 0.0024 * point.particle.drift + point.particle.pulse * Math.PI * 2) * 0.28;
    const alpha = clamp(0.18 + point.depth * 0.74, 0.1, 0.92) * twinkle;
    const size = point.particle.size * (0.72 + point.depth * 1.26);
    grainCtx.fillStyle = `rgba(${palette[point.particle.tone]}, ${alpha})`;
    grainCtx.beginPath();
    grainCtx.arc(point.x, point.y, size, 0, Math.PI * 2);
    grainCtx.fill();

    if (point.depth > 0.76 && point.particle.pulse > 0.9) {
      grainCtx.fillStyle = `rgba(226, 252, 255, ${0.15 * twinkle})`;
      grainCtx.beginPath();
      grainCtx.arc(point.x, point.y, size * 2.4, 0, Math.PI * 2);
      grainCtx.fill();
    }
  }
}

function drawParticleFilaments(projected, radius, palette) {
  grainCtx.save();
  grainCtx.globalCompositeOperation = "screen";
  for (let index = 0; index < projected.length; index += 11) {
    const point = projected[index];
    if (point.depth < 0.34) continue;
    const linked = projected[(index + 89) % projected.length];
    if (!linked || linked.depth < 0.34) continue;
    const distance = Math.hypot(point.x - linked.x, point.y - linked.y);
    if (distance > radius * 0.34) continue;
    const alpha = clamp((1 - distance / (radius * 0.34)) * (point.depth + linked.depth) * 0.24, 0, 0.28);
    grainCtx.strokeStyle = `rgba(${palette[(index + 2) % palette.length]}, ${alpha})`;
    grainCtx.lineWidth = 0.55 + Math.max(point.depth, linked.depth) * 0.7;
    grainCtx.beginPath();
    grainCtx.moveTo(point.x, point.y);
    grainCtx.lineTo(linked.x, linked.y);
    grainCtx.stroke();
  }
  grainCtx.restore();
}

function clearGrain() {
  if (!grainCanvas.width) return;
  const { width, height } = getStageSize();
  grainCtx.clearRect(0, 0, width, height);
}

function resetViewerTransform() {
  state.viewer.zoom = 1;
  state.viewer.panX = 0;
  state.viewer.panY = 0;
  state.viewer.isPanning = false;
  document.body.classList.remove("viewer-panning");
  updateViewerTransform();
}

function updateViewerTransform() {
  const zoom = state.viewer.zoom.toFixed(3);
  const panX = `${state.viewer.panX.toFixed(1)}px`;
  const panY = `${state.viewer.panY.toFixed(1)}px`;
  viewerImage.style.setProperty("--viewer-zoom", zoom);
  viewerImage.style.setProperty("--viewer-pan-x", panX);
  viewerImage.style.setProperty("--viewer-pan-y", panY);
  viewerImage.style.transform = `translate3d(${panX}, ${panY}, 0) scale(${zoom})`;
  viewer.dataset.zoomed = state.viewer.zoom > 1.01 ? "true" : "false";
  viewerZoomReset.textContent = `${Math.round(state.viewer.zoom * 100)}%`;
}

function zoomViewerBy(multiplier, event) {
  zoomViewerTo(state.viewer.zoom * multiplier, event);
}

function zoomViewerTo(nextZoom, event) {
  const previousZoom = state.viewer.zoom;
  const zoom = clamp(nextZoom, 1, 5);
  if (Math.abs(zoom - previousZoom) < 0.001) return;

  if (event && viewerImageStage) {
    const rect = viewerImageStage.getBoundingClientRect();
    const originX = event.clientX - rect.left - rect.width / 2 - state.viewer.panX;
    const originY = event.clientY - rect.top - rect.height / 2 - state.viewer.panY;
    const ratio = zoom / previousZoom;
    state.viewer.panX -= originX * (ratio - 1);
    state.viewer.panY -= originY * (ratio - 1);
  }

  state.viewer.zoom = zoom;
  boundViewerPan();
  updateViewerTransform();
}

function boundViewerPan() {
  if (state.viewer.zoom <= 1.01 || !viewerImageStage) {
    state.viewer.panX = 0;
    state.viewer.panY = 0;
    return;
  }

  const rect = viewerImageStage.getBoundingClientRect();
  const maxX = rect.width * (state.viewer.zoom - 1) * 0.5;
  const maxY = rect.height * (state.viewer.zoom - 1) * 0.5;
  state.viewer.panX = clamp(state.viewer.panX, -maxX, maxX);
  state.viewer.panY = clamp(state.viewer.panY, -maxY, maxY);
}

function handleViewerWheel(event) {
  if (!viewer.classList.contains("is-open")) return;
  event.preventDefault();

  const panIntent = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.25;
  if (panIntent && state.viewer.zoom > 1.01) {
    state.viewer.panX -= event.deltaX || event.deltaY;
    state.viewer.panY -= event.shiftKey ? 0 : event.deltaY;
    boundViewerPan();
    updateViewerTransform();
    return;
  }

  const multiplier = Math.exp(-event.deltaY * 0.0014);
  zoomViewerBy(multiplier, event);
}

function handleViewerPointerDown(event) {
  if (!viewer.classList.contains("is-open")) return;
  const isMiddleButton = event.button === 1;
  const canPan = state.viewer.zoom > 1.01 || isMiddleButton || event.pointerType === "touch";
  if (!canPan) return;

  event.preventDefault();
  state.viewer.isPanning = true;
  state.viewer.lastX = event.clientX;
  state.viewer.lastY = event.clientY;
  document.body.classList.add("viewer-panning");
  viewerFrame.setPointerCapture?.(event.pointerId);
}

function handleViewerPointerMove(event) {
  if (!state.viewer.isPanning) return;
  const dx = event.clientX - state.viewer.lastX;
  const dy = event.clientY - state.viewer.lastY;
  state.viewer.panX += dx;
  state.viewer.panY += dy;
  state.viewer.lastX = event.clientX;
  state.viewer.lastY = event.clientY;
  boundViewerPan();
  updateViewerTransform();
}

function handleViewerPointerUp() {
  if (!state.viewer.isPanning) return;
  state.viewer.isPanning = false;
  document.body.classList.remove("viewer-panning");
}

function handleViewerDoubleClick(event) {
  event.preventDefault();
  if (state.viewer.zoom > 1.01) {
    resetViewerTransform();
  } else {
    zoomViewerTo(2.2, event);
  }
}

function openViewer(index) {
  const card = cards[index];
  if (!card) return;
  state.selected = index;
  const item = items[index];
  const sourceRect = card.getBoundingClientRect();

  resetViewerTransform();
  viewerTitle.textContent = item.title;
  viewerMeta.textContent = item.place;
  viewerImage.src = item.src;
  viewerImage.alt = item.title;
  viewerImage.classList.remove("is-visible");
  viewer.classList.add("is-open");
  viewer.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    const imageReady = viewerImage.decode ? viewerImage.decode().catch(() => {}) : Promise.resolve();
    imageReady.finally(() => {
      const targetRect = getViewerTargetRect(item);
      const clone = makeFlightClone(item.src, sourceRect);
      document.body.appendChild(clone);
      const flight = clone.animate(
        [
          rectKeyframe(sourceRect, 0.98),
          rectKeyframe(targetRect, 1),
        ],
        {
          duration: 720,
          easing: "cubic-bezier(0.2, 0.82, 0.18, 1)",
          fill: "forwards",
        },
      );
      flight.finished.finally(() => {
        clone.remove();
        viewerImage.classList.add("is-visible");
      });
    });
  });
}

function closeViewer() {
  if (!viewer.classList.contains("is-open")) return;
  const card = cards[state.selected];
  const sourceRect = state.viewer.zoom > 1.01
    ? viewerImage.getBoundingClientRect()
    : getViewerTargetRect(items[state.selected] || {});
  const targetRect = card ? card.getBoundingClientRect() : sourceRect;
  const clone = makeFlightClone(viewerImage.src, sourceRect);
  document.body.appendChild(clone);
  viewerImage.classList.remove("is-visible");

  clone.animate(
    [
      rectKeyframe(sourceRect, 1),
      rectKeyframe(targetRect, 0.98),
    ],
    {
      duration: 620,
      easing: "cubic-bezier(0.2, 0.82, 0.18, 1)",
      fill: "forwards",
    },
  ).finished.finally(() => {
    clone.remove();
    resetViewerTransform();
    viewer.classList.remove("is-open");
    viewer.setAttribute("aria-hidden", "true");
  });
}

function makeFlightClone(src, rect) {
  const clone = document.createElement("div");
  clone.className = "flight-clone";
  clone.innerHTML = `<img alt="" src="${src}">`;
  Object.assign(clone.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  return clone;
}

function getViewerTargetRect(item) {
  const stageRect = (viewerImageStage || viewerFrame).getBoundingClientRect();
  const naturalRatio = viewerImage.naturalWidth > 0 && viewerImage.naturalHeight > 0
    ? viewerImage.naturalHeight / viewerImage.naturalWidth
    : item.ratio || 1;
  const ratio = clamp(naturalRatio, 0.08, 8);
  let width = stageRect.width;
  let height = width * ratio;

  if (height > stageRect.height) {
    height = stageRect.height;
    width = height / ratio;
  }

  return {
    left: stageRect.left + (stageRect.width - width) / 2,
    top: stageRect.top + (stageRect.height - height) / 2,
    width,
    height,
  };
}

function rectKeyframe(rect, scale) {
  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    transform: `scale(${scale})`,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
  window.__galleryDebug = {
    state,
    webgl: webglParticles,
    getParticleTransition: () => getParticleTransition(performance.now()),
    handleGestureResult,
    classifyHandGesture,
    advanceGestureDrag,
    scheduleGestureModeSwitch,
  };
}
