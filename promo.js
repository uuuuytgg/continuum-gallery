const canvas = document.getElementById("ambientCanvas");
const ctx = canvas?.getContext("2d");
const pointer = { x: -9999, y: -9999 };
let particles = [];
let width = 0;
let height = 0;
let dpr = 1;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildParticles();
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
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

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

    const alpha = 0.026 + particle.z * 0.052 + Math.sin(t * 2.1) * 0.012;
    const size = 0.35 + particle.z * 0.78;
    ctx.fillStyle = particle.warm
      ? `rgba(152, 115, 64, ${alpha * 0.72})`
      : `rgba(8, 43, 131, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    if (particle.z > 0.82) {
      ctx.strokeStyle = `rgba(8, 43, 131, ${alpha * 0.28})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - size * 2.4, y);
      ctx.lineTo(x + size * 2.4, y);
      ctx.stroke();
    }
  }

  requestAnimationFrame(draw);
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

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
window.addEventListener("pointerleave", () => {
  pointer.x = -9999;
  pointer.y = -9999;
});

resizeCanvas();
initReveal();
requestAnimationFrame(draw);
