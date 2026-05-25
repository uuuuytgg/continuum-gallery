const stage = document.getElementById("stage");
const gallery = document.getElementById("gallery");
const grainCanvas = document.getElementById("grainCanvas");
const grainCtx = grainCanvas.getContext("2d");
const modeButtons = document.getElementById("modeButtons");
const modeLabel = document.getElementById("modeLabel");
const modeToast = document.getElementById("modeToast");
const immersiveButton = document.getElementById("immersiveButton");
const focusButton = document.getElementById("focusButton");
const googleButton = document.getElementById("googleButton");
const photosPanel = document.getElementById("photosPanel");
const photosPanelClose = document.getElementById("photosPanelClose");
const googleClientIdInput = document.getElementById("googleClientId");
const saveClientButton = document.getElementById("saveClientButton");
const importPhotosButton = document.getElementById("importPhotosButton");
const photosStatus = document.getElementById("photosStatus");
const viewer = document.getElementById("viewer");
const viewerImage = document.getElementById("viewerImage");
const viewerTitle = document.getElementById("viewerTitle");
const viewerMeta = document.getElementById("viewerMeta");
const viewerClose = document.getElementById("viewerClose");

const MODES = ["waterfall", "orbit", "sphere"];
const GOOGLE_CLIENT_ID_KEY = "continuum-gallery.googleClientId";
const GOOGLE_PHOTOS_SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const GOOGLE_PHOTOS_API = "https://photospicker.googleapis.com";
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
  orbit: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
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
};

const items = createItems();
const cards = [];
let spherePoints = [];
let physics = [];
let grainParticles = [];
let resizeTimer = 0;

init();

function init() {
  googleClientIdInput.value = localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || "";
  setGoogleStatus(googleClientIdInput.value ? "Client ID ready" : "Add Client ID");
  renderCards();
  buildSpherePoints();
  resizeCanvas();
  applyLayout({ immediate: true });
  requestAnimationFrame(tick);

  window.addEventListener("resize", handleResize);
  modeButtons.addEventListener("click", handleModeButton);
  immersiveButton.addEventListener("click", handleImmersive);
  focusButton.addEventListener("click", () => openViewer(state.selected));
  googleButton.addEventListener("click", openPhotosPanel);
  photosPanelClose.addEventListener("click", closePhotosPanel);
  saveClientButton.addEventListener("click", saveGoogleClientId);
  importPhotosButton.addEventListener("click", startGooglePhotosImport);
  gallery.addEventListener("click", handleCardClick);
  stage.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  stage.addEventListener("wheel", handleWheel, { passive: false });
  viewerClose.addEventListener("click", closeViewer);
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) closeViewer();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && viewer.classList.contains("is-open")) closeViewer();
  });
}

function createItems() {
  const ratios = [1.22, 0.78, 1.45, 0.92, 1.08, 1.58, 0.72, 1.34, 0.84, 1.18];
  const generated = Array.from({ length: 39 }, (_, index) => {
    const ratio = ratios[index % ratios.length];
    return {
      title: titles[index % titles.length],
      place: places[index % places.length],
      ratio,
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
    ["#dd5b4c", "#e0b747", "#266f78", "#14110e"],
    ["#2c9f93", "#f2d36a", "#7d4cc2", "#17130f"],
    ["#d64b78", "#f09a5a", "#285c8f", "#100f10"],
    ["#76b7b2", "#f3c84b", "#df6a4f", "#1b1713"],
    ["#4267ac", "#d5b345", "#43a47b", "#151515"],
  ][index % 5];

  canvas.width = width;
  canvas.height = height;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(0.42, palette[1]);
  gradient.addColorStop(0.76, palette[2]);
  gradient.addColorStop(1, palette[3]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(
    width * (0.25 + ((index * 17) % 45) / 100),
    height * (0.18 + ((index * 11) % 42) / 100),
    12,
    width * 0.5,
    height * 0.38,
    width * 0.72,
  );
  glow.addColorStop(0, "rgba(255,255,255,0.48)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "multiply";
  for (let i = 0; i < 9; i += 1) {
    ctx.fillStyle = `rgba(12, 10, 8, ${0.08 + i * 0.012})`;
    ctx.beginPath();
    const y = height * (0.58 + i * 0.055);
    ctx.moveTo(0, y);
    for (let x = 0; x <= width + 40; x += 40) {
      const wave = Math.sin((x * 0.018) + index + i) * (22 + i * 4);
      ctx.lineTo(x, y + wave);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 18; i += 1) {
    const x = ((index * 97 + i * 71) % width);
    const y = ((index * 53 + i * 89) % height);
    const radius = 16 + ((index + i * 5) % 52);
    ctx.fillStyle = `rgba(255,255,255,${0.025 + (i % 4) * 0.018})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 1600; i += 1) {
    const shade = 180 + ((i + index * 19) % 70);
    ctx.fillStyle = `rgba(${shade}, ${shade - 10}, ${shade - 26}, 0.045)`;
    ctx.fillRect((i * 37) % width, (i * 61) % height, 1, 1);
  }

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.font = "700 52px system-ui, sans-serif";
  ctx.fillText(String(index + 1).padStart(2, "0"), 28, height - 34);

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
    <img alt="${item.title}" draggable="false" src="${item.src}">
    <span class="caption">
      <strong>${item.title}</strong>
      <span>${item.place}</span>
    </span>
  `;

  const image = card.querySelector("img");
  image.addEventListener("load", () => {
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      item.ratio = image.naturalHeight / image.naturalWidth;
      if (state.mode === "waterfall") applyLayout({ immediate: true });
    }
  });

  return card;
}

function appendPhotoItems(newItems) {
  if (!newItems.length) return;
  const startIndex = items.length;
  const fragment = document.createDocumentFragment();

  newItems.forEach((item, offset) => {
    const index = startIndex + offset;
    items.push(item);
    const card = createPhotoCard(item, index);
    cards.push(card);
    fragment.appendChild(card);
  });

  gallery.appendChild(fragment);
  buildSpherePoints();
  state.selected = startIndex;
  if (state.mode === "orbit") {
    centerOrbitOn(startIndex);
    applyLayout({ immediate: false });
  } else {
    setMode("orbit", { focusIndex: startIndex });
  }
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

  grainParticles = Array.from({ length: 170 }, (_, index) => ({
    a: index * 0.78,
    r: 0.15 + ((index * 17) % 100) / 100,
    drift: 0.35 + ((index * 7) % 100) / 180,
    size: 0.75 + ((index * 13) % 8) / 10,
  }));
}

function handleResize() {
  resizeCanvas();
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    applyLayout({ immediate: true });
  }, 80);
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  grainCanvas.width = Math.round(window.innerWidth * dpr);
  grainCanvas.height = Math.round(window.innerHeight * dpr);
  grainCanvas.style.width = `${window.innerWidth}px`;
  grainCanvas.style.height = `${window.innerHeight}px`;
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

    appendPhotoItems(importedItems);
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
  const requestId = crypto.randomUUID ? crypto.randomUUID() : makeRequestId();
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
  const photos = pickedItems.filter((item) => item.type === "PHOTO" && item.mediaFile?.baseUrl);
  const imported = [];

  for (let index = 0; index < photos.length; index += 1) {
    const item = photos[index];
    const file = item.mediaFile;
    const meta = file.mediaFileMetadata || {};
    const width = Number(meta.width || 1600);
    const height = Number(meta.height || 1000);
    setGoogleStatus(`Loading ${index + 1}/${photos.length}`);

    try {
      const blob = await googlePhotosBlob(`${file.baseUrl}=w1800-h1800`);
      const objectUrl = URL.createObjectURL(blob);
      state.google.objectUrls.push(objectUrl);
      imported.push({
        title: cleanFilename(file.filename || `Google Photo ${index + 1}`),
        place: "Google Photos",
        ratio: height / width,
        src: objectUrl,
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
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (character) => (
    Number(character) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(character) / 4
  ).toString(16));
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

  state.isPointerDown = true;
  state.didDrag = false;
  state.lastX = event.clientX;
  state.lastY = event.clientY;
  state.pointerX = event.clientX;
  state.pointerY = event.clientY;
  document.body.classList.add("is-dragging");
  stage.setPointerCapture?.(event.pointerId);
}

function handlePointerMove(event) {
  state.pointerX = event.clientX;
  state.pointerY = event.clientY;
  if (!state.isPointerDown) return;

  const dx = event.clientX - state.lastX;
  const dy = event.clientY - state.lastY;
  if (Math.abs(dx) + Math.abs(dy) > 4) state.didDrag = true;

  if (state.mode === "orbit") {
    state.orbit.x += dx;
    state.orbit.y += dy;
    state.orbit.vx = dx;
    state.orbit.vy = dy;
  }

  if (state.mode === "sphere") {
    state.sphere.rotY += dx * 0.008;
    state.sphere.rotX -= dy * 0.006;
    state.sphere.vy = dx * 0.00018;
    state.sphere.vx = -dy * 0.00014;
    state.sphere.radiusBoost = Math.min(26, state.sphere.radiusBoost + Math.hypot(dx, dy) * 0.08);
  }

  state.lastX = event.clientX;
  state.lastY = event.clientY;
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
  state.mode = nextMode;
  if (typeof options.focusIndex === "number") state.selected = options.focusIndex;

  if (nextMode === "orbit") centerOrbitOn(state.selected);

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

function centerOrbitOn(index) {
  const grid = getOrbitGrid();
  const point = getOrbitPoint(index, grid);
  state.orbit.x = -point.x;
  state.orbit.y = -point.y;
  state.orbit.vx = 0;
  state.orbit.vy = 0;
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
  gallery.style.height = `${height}px`;

  cards.forEach((card, index) => {
    const point = getOrbitPoint(index, grid);
    const fieldX = point.x + state.orbit.x;
    const fieldY = point.y + state.orbit.y;
    const distance = Math.hypot(fieldX, fieldY);
    const lens = 1 + Math.max(0, 1 - distance / 430) * 0.18;
    const screenX = centerX + fieldX * lens;
    const screenY = centerY + fieldY * lens;
    const scale = clamp(1.18 - distance / 560, 0.44, 1.18);
    const size = Math.round(base * scale);
    const isSelected = index === state.selected;

    setCardStyle(card, {
      x: screenX - size / 2,
      y: screenY - size / 2,
      width: size,
      height: size,
      opacity: distance > Math.max(width, height) * 0.82 ? 0.2 : 1,
      z: Math.round(scale * 1000) + (isSelected ? 2000 : 0),
      radius: size / 2,
      filter: isSelected ? "saturate(1.14) brightness(1.07)" : "none",
    });
  });
}

function getOrbitGrid() {
  const base = stage.clientWidth < 540 ? 68 : stage.clientWidth < 920 ? 82 : 96;
  const cols = Math.ceil(Math.sqrt(items.length) * 1.25);
  const rows = Math.ceil(items.length / cols);
  return { base, cols, rows };
}

function getOrbitPoint(index, grid) {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  const offset = row % 2 ? grid.base * 0.34 : 0;
  return {
    x: (col - (grid.cols - 1) / 2) * grid.base + offset,
    y: (row - (grid.rows - 1) / 2) * grid.base * 0.88,
  };
}

function applySphereLayout({ seedPhysics = false } = {}) {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.34 + state.sphere.radiusBoost;
  const perspective = Math.max(width, height) * 1.05;
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
    const targetSize = clamp(19 + depth * 28, 18, 48);
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
      opacity: clamp(0.36 + depth * 0.78, 0.28, 1),
      z: Math.round(depth * 1000),
      radius: body.size / 2,
      filter: `saturate(${0.9 + depth * 0.34}) brightness(${0.72 + depth * 0.42})`,
    });
  });
}

function setCardStyle(card, layout) {
  const transform = `translate3d(${layout.x.toFixed(2)}px, ${layout.y.toFixed(2)}px, 0)`;
  card.style.setProperty("--card-transform", transform);
  card.style.transform = transform;
  card.style.width = `${Math.max(1, layout.width).toFixed(2)}px`;
  card.style.height = `${Math.max(1, layout.height).toFixed(2)}px`;
  card.style.opacity = layout.opacity.toFixed(3);
  card.style.zIndex = String(layout.z);
  card.style.borderRadius = `${layout.radius}px`;
  card.style.filter = layout.filter;
}

function tick() {
  const now = performance.now();

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
    drawGrain(now);
  } else {
    clearGrain();
  }

  requestAnimationFrame(tick);
}

function drawGrain(now) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  grainCtx.clearRect(0, 0, width, height);
  grainCtx.save();
  grainCtx.globalCompositeOperation = "screen";
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.34;

  for (const particle of grainParticles) {
    const wobble = Math.sin(now * 0.0012 * particle.drift + particle.a) * 0.055;
    const angle = particle.a + state.sphere.rotY * 0.8 + wobble;
    const band = Math.sin(particle.a * 1.7 + state.sphere.rotX);
    const r = radius * particle.r * (0.74 + Math.abs(band) * 0.34);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * 0.72 + band * radius * 0.32;
    const alpha = 0.09 + Math.abs(band) * 0.12;
    grainCtx.fillStyle = `rgba(246, 225, 183, ${alpha})`;
    grainCtx.beginPath();
    grainCtx.arc(x, y, particle.size, 0, Math.PI * 2);
    grainCtx.fill();
  }
  grainCtx.restore();
}

function clearGrain() {
  if (!grainCanvas.width) return;
  grainCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function openViewer(index) {
  const card = cards[index];
  if (!card) return;
  state.selected = index;
  const item = items[index];
  const sourceRect = card.getBoundingClientRect();

  viewerTitle.textContent = item.title;
  viewerMeta.textContent = item.place;
  viewerImage.src = item.src;
  viewerImage.alt = item.title;
  viewerImage.classList.remove("is-visible");
  viewer.classList.add("is-open");
  viewer.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
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
    const imageReady = viewerImage.decode ? viewerImage.decode().catch(() => {}) : Promise.resolve();
    Promise.all([flight.finished, imageReady]).finally(() => {
      clone.remove();
      viewerImage.classList.add("is-visible");
    });
  });
}

function closeViewer() {
  if (!viewer.classList.contains("is-open")) return;
  const card = cards[state.selected];
  const sourceRect = viewerImage.getBoundingClientRect();
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
  const frame = viewer.querySelector(".viewer-frame");
  const frameRect = frame.getBoundingClientRect();
  const ratio = clamp(item.ratio || 1, 0.45, 1.9);
  let width = frameRect.width;
  let height = width * ratio;

  if (height > frameRect.height) {
    height = frameRect.height;
    width = height / ratio;
  }

  return {
    left: frameRect.left + (frameRect.width - width) / 2,
    top: frameRect.top + (frameRect.height - height) / 2,
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
