<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const sourceText = `${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial}`;

  let canvas: HTMLCanvasElement;
  let wrapperWidth = $state(0);
  let canvasWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 900);
  const canvasHeight = 600;

  let gravityStrength = $state(400);
  let bounceFactor = $state(0.35);
  let spawnRate = $state(8);
  let fontSize = $state(12);
  let mouseRepel = $state(true);
  let animFrame = 0;
  let currentCanvasWidth = 0;
  let displayCount = $state(0);
  let mouseX = -1000;
  let mouseY = -1000;

  interface Particle {
    char: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;    // 0-1, fades when settled
    settled: boolean;
    radius: number;
  }

  let particles: Particle[] = [];
  let allChars: string[] = [];
  let spawnIndex = 0;

  function extractChars() {
    const font = buildFont(fontSize, 'Inter, sans-serif');
    const prepared = prepareWithSegments(sourceText, font);
    const result = layoutWithLines(prepared, canvasWidth, Math.round(fontSize * 1.4));
    allChars = [];
    for (const line of result.lines) {
      for (const c of line.text) {
        if (c !== ' ') allChars.push(c);
      }
    }
  }

  function spawnParticles(count: number) {
    for (let i = 0; i < count; i++) {
      const char = allChars[spawnIndex % allChars.length];
      spawnIndex++;
      // Spawn from random position across the top
      particles.push({
        char,
        x: Math.random() * canvasWidth,
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 60,
        vy: Math.random() * 30,
        life: 1,
        settled: false,
        radius: fontSize * 0.4,
      });
    }
  }

  function tick() {
    const dt = 1 / 60;
    const n = particles.length;

    // Spawn new particles (up to a limit)
    if (n < 4000) {
      spawnParticles(spawnRate);
    }

    // Physics
    for (let i = 0; i < n; i++) {
      const p = particles[i];

      if (p.settled) {
        // Settled particles can still be disturbed by mouse
        if (mouseRepel && mouseX > 0) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80 && dist > 0.1) {
            const force = (80 - dist) * 8;
            p.vx += (dx / dist) * force * dt;
            p.vy += (dy / dist) * force * dt;
            p.settled = false;
            p.life = 0.8;
          }
        }
        continue;
      }

      // Gravity
      p.vy += gravityStrength * dt;

      // Mouse repulsion
      if (mouseRepel && mouseX > 0) {
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100 && dist > 0.1) {
          const force = (100 - dist) * 12;
          p.vx += (dx / dist) * force * dt;
          p.vy += (dy / dist) * force * dt;
        }
      }

      // Air resistance
      p.vx *= 0.997;
      p.vy *= 0.997;

      // Integrate
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Floor collision
      if (p.y > canvasHeight - p.radius) {
        p.y = canvasHeight - p.radius;
        p.vy *= -bounceFactor;
        p.vx *= 0.9;
        if (Math.abs(p.vy) < 5) {
          p.settled = true;
          p.vy = 0;
        }
      }

      // Wall collisions
      if (p.x < p.radius) { p.x = p.radius; p.vx *= -bounceFactor; }
      if (p.x > canvasWidth - p.radius) { p.x = canvasWidth - p.radius; p.vx *= -bounceFactor; }

      // Particle-particle collision (only check nearby settled particles below)
      // Simple: check if we're overlapping floor-level particles
      for (let j = Math.max(0, i - 80); j < i; j++) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = p.radius + q.radius;
        if (dist < minDist && dist > 0.01) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          // Push apart
          if (!q.settled) {
            p.x += nx * overlap * 0.5;
            p.y += ny * overlap * 0.5;
            q.x -= nx * overlap * 0.5;
            q.y -= ny * overlap * 0.5;
          } else {
            p.x += nx * overlap;
            p.y += ny * overlap;
          }

          // Bounce
          const relVx = p.vx - (q.settled ? 0 : q.vx);
          const relVy = p.vy - (q.settled ? 0 : q.vy);
          const relDot = relVx * nx + relVy * ny;
          if (relDot < 0) {
            p.vx -= nx * relDot * (1 + bounceFactor * 0.5);
            p.vy -= ny * relDot * (1 + bounceFactor * 0.5);
            if (!q.settled) {
              q.vx += nx * relDot * 0.3;
              q.vy += ny * relDot * 0.3;
            }
          }

          // Settle if very slow and resting on something
          if (Math.abs(p.vy) < 3 && Math.abs(p.vx) < 3 && p.y > canvasHeight - 200) {
            p.settled = true;
            p.vy = 0;
            p.vx = 0;
          }
        }
      }
    }

    displayCount = particles.length;
    render();
    animFrame = requestAnimationFrame(tick);
  }

  function resizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    currentCanvasWidth = canvasWidth;
  }

  function render() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (canvasWidth !== currentCanvasWidth) resizeCanvas();

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    ctx.fillStyle = isDark ? '#060608' : '#f8f8fc';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const font = `${fontSize}px Inter, sans-serif`;
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    for (const p of particles) {
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const speedNorm = Math.min(1, speed / 200);

      if (isDark) {
        // Falling: bright white. Settled: slightly dimmer
        const lightness = p.settled ? 55 + Math.random() * 10 : 70 + speedNorm * 30;
        const alpha = p.settled ? 0.7 : 0.5 + speedNorm * 0.5;
        ctx.fillStyle = `hsla(0, 0%, ${lightness}%, ${alpha})`;
      } else {
        const lightness = p.settled ? 30 + Math.random() * 10 : 15 + speedNorm * 15;
        const alpha = p.settled ? 0.75 : 0.4 + speedNorm * 0.6;
        ctx.fillStyle = `hsla(0, 0%, ${lightness}%, ${alpha})`;
      }

      ctx.fillText(p.char, p.x, p.y);
    }

    // Mouse indicator
    if (mouseRepel && mouseX > 0 && mouseY > 0) {
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 80, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    mouseX = e.touches[0].clientX - rect.left;
    mouseY = e.touches[0].clientY - rect.top;
  }

  function reset() {
    particles = [];
    spawnIndex = 0;
    displayCount = 0;
  }

  onMount(() => {
    extractChars();
    resizeCanvas();
    tick();
    return () => cancelAnimationFrame(animFrame);
  });
</script>

<div class="pool-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Gravity <span>{gravityStrength}</span></label>
      <input type="range" min="100" max="800" bind:value={gravityStrength} />
    </div>
    <div class="ctrl">
      <label>Bounce <span>{bounceFactor.toFixed(2)}</span></label>
      <input type="range" min="0.05" max="0.8" step="0.05" bind:value={bounceFactor} />
    </div>
    <div class="ctrl">
      <label>Spawn <span>{spawnRate}/f</span></label>
      <input type="range" min="1" max="20" bind:value={spawnRate} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="8" max="20" bind:value={fontSize} oninput={() => extractChars()} />
    </div>
    <button class="toggle-btn" class:on={mouseRepel} onclick={() => mouseRepel = !mouseRepel}>
      {mouseRepel ? 'Mouse repel on' : 'Mouse repel off'}
    </button>
    <button class="action-btn" onclick={reset}>Reset</button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{displayCount} particles</span>
    <span class="stat-pill">gravity + collision + bounce</span>
    <span class="stat-pill">move mouse to push letters</span>
  </div>

  <div class="canvas-wrap">
    <canvas
      bind:this={canvas}
      onmousemove={handleMouseMove}
      onmouseleave={() => { mouseX = -1000; mouseY = -1000; }}
      ontouchmove={handleTouchMove}
      ontouchend={() => { mouseX = -1000; mouseY = -1000; }}
    ></canvas>
  </div>
</div>

<style>
  .pool-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 80px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .toggle-btn {
    padding: 7px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); font-size: 0.76rem;
    font-weight: 600; font-family: var(--font-body); cursor: pointer;
    transition: all var(--transition-fast);
  }
  .toggle-btn.on { background: var(--accent); border-color: var(--accent); color: #fff; }

  .action-btn {
    padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid var(--accent);
    background: transparent; color: var(--accent); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .action-btn:hover { background: var(--accent); color: #fff; }

  .stats-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .canvas-wrap {
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.25);
  }
  canvas { display: block; width: 100%; }

  @media (max-width: 600px) {
    .ctrl { min-width: 60px; }
    .controls-bar { gap: var(--space-sm); }
  }
</style>
