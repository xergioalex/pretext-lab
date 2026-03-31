<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const text = 'Programmable text layout changes everything. Prepare once, layout at any width. Text flows like water around obstacles. Every line break is a decision you can observe and control. The DOM couples measurement to rendering. Pretext decouples them entirely.';

  let canvas: HTMLCanvasElement;
  let wrapperWidth = $state(0);
  let canvasWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 800);
  const canvasHeight = 600;
  let fontSize = $state(18);

  interface Particle {
    char: string;
    homeX: number;
    homeY: number;
    x: number;
    y: number;
    angle: number;     // current angle in vortex
    radius: number;    // current radius from center
    homeAngle: number;
    homeRadius: number;
    width: number;
    rotation: number;
  }

  let particles: Particle[] = $state([]);
  let mode = $state<'text' | 'vortex' | 'spiral' | 'circle'>('vortex');
  let time = 0;
  let animFrame = 0;
  let transitionProgress = $state(0); // 0 = vortex, 1 = text
  let targetProgress = $state(0);

  function initParticles() {
    const font = buildFont(fontSize, 'Inter, sans-serif');
    const lh = fontSize * 1.5;
    const margin = 40;
    const maxW = canvasWidth - margin * 2;
    const prepared = prepareWithSegments(text, font);
    const result = layoutWithLines(prepared, maxW, lh);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.font = font;

    particles = [];
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    for (let li = 0; li < result.lines.length; li++) {
      const line = result.lines[li];
      const y = margin + li * lh + (canvasHeight - result.height) / 2 - margin;
      let x = margin;

      for (const char of line.text) {
        const charW = tempCtx.measureText(char).width;
        if (char.trim()) {
          const dx = x - cx;
          const dy = y - cy;
          const angle = Math.atan2(dy, dx);
          const radius = Math.sqrt(dx * dx + dy * dy);

          particles.push({
            char,
            homeX: x,
            homeY: y,
            x, y,
            angle: Math.random() * Math.PI * 2,
            radius: 50 + Math.random() * 200,
            homeAngle: angle,
            homeRadius: radius,
            width: charW,
            rotation: 0,
          });
        }
        x += charW;
      }
    }
  }

  function tick() {
    time += 0.016;

    // Smooth transition
    const speed = 0.03;
    if (transitionProgress < targetProgress) {
      transitionProgress = Math.min(targetProgress, transitionProgress + speed);
    } else if (transitionProgress > targetProgress) {
      transitionProgress = Math.max(targetProgress, transitionProgress - speed);
    }

    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const t = transitionProgress;

    for (const p of particles) {
      if (mode === 'vortex' || mode === 'spiral') {
        // Spin in vortex
        p.angle += 0.02 + (1 - t) * 0.03;
        if (mode === 'spiral') {
          p.radius = 30 + ((p.radius - 30 + 1) % 250);
        }
      } else if (mode === 'circle') {
        p.angle += 0.015;
      }

      // Interpolate between vortex position and home position
      const vortexX = cx + Math.cos(p.angle) * p.radius;
      const vortexY = cy + Math.sin(p.angle) * p.radius;

      p.x = vortexX * (1 - t) + p.homeX * t;
      p.y = vortexY * (1 - t) + p.homeY * t;
      p.rotation = (1 - t) * Math.sin(time * 2 + p.angle) * 0.5;
    }

    render();
    animFrame = requestAnimationFrame(tick);
  }

  function render() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    ctx.scale(dpr, dpr);

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    ctx.fillStyle = isDark ? '#08080e' : '#f5f5fa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Center glow
    const t = transitionProgress;
    if (t < 0.8) {
      const glowRadius = 200 * (1 - t);
      const gradient = ctx.createRadialGradient(
        canvasWidth / 2, canvasHeight / 2, 0,
        canvasWidth / 2, canvasHeight / 2, glowRadius
      );
      gradient.addColorStop(0, 'rgba(124, 108, 240, 0.15)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Render particles
    const font = buildFont(fontSize, 'Inter, sans-serif');
    ctx.textBaseline = 'top';

    for (const p of particles) {
      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + fontSize / 2);
      ctx.rotate(p.rotation);

      // Color: spinning chars are accent-colored, settled chars are normal
      const spinAmount = 1 - t;
      if (spinAmount > 0.1) {
        const hue = (p.angle * 180 / Math.PI + time * 50) % 360;
        ctx.fillStyle = `hsla(${hue}, 60%, ${isDark ? 70 : 45}%, ${0.6 + t * 0.4})`;
      } else {
        ctx.fillStyle = isDark ? '#e8e8ed' : '#1a1a2e';
      }

      ctx.font = font;
      ctx.fillText(p.char, -p.width / 2, -fontSize / 2);
      ctx.restore();
    }

    // Trail lines connecting nearby particles when spinning
    if (t < 0.5) {
      ctx.strokeStyle = isDark ? 'rgba(124,108,240,0.06)' : 'rgba(91,76,219,0.06)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length - 1; i += 3) {
        const a = particles[i];
        const b = particles[i + 1];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (dx * dx + dy * dy < 3000) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  function setMode(m: typeof mode) {
    mode = m;
    targetProgress = m === 'text' ? 1 : 0;
    if (m === 'text') targetProgress = 1;
  }

  onMount(() => {
    initLetters();
    tick();
    return () => cancelAnimationFrame(animFrame);
  });

  function initLetters() {
    initParticles();
    targetProgress = 0;
    transitionProgress = 0;
  }
</script>

<div class="vortex-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="14" max="32" bind:value={fontSize} oninput={() => initLetters()} />
    </div>
    <div class="btn-group">
      <button class:active={mode === 'vortex'} onclick={() => setMode('vortex')}>Vortex</button>
      <button class:active={mode === 'spiral'} onclick={() => setMode('spiral')}>Spiral</button>
      <button class:active={mode === 'circle'} onclick={() => setMode('circle')}>Circle</button>
      <button class:active={mode === 'text'} onclick={() => setMode('text')}>Reassemble</button>
    </div>
  </div>

  <div class="vortex-info">
    <span class="stat-pill">{particles.length} characters</span>
    <span class="stat-pill accent">{mode === 'text' ? 'Reassembling...' : 'Spinning'}</span>
    <span class="stat-pill">Home positions from <code>layoutWithLines()</code></span>
  </div>

  <div class="canvas-wrap">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .vortex-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 80px; }
  .ctrl label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .btn-group { display: flex; gap: 4px; }
  .btn-group button {
    padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-secondary); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .btn-group button.active { background: var(--accent); color: #fff; border-color: var(--accent); }

  .vortex-info { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }
  .stat-pill code { font-size: 0.72rem; color: var(--accent); background: none; padding: 0; }

  .canvas-wrap {
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.2);
  }
  canvas { display: block; width: 100%; }
</style>
