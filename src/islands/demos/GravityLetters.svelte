<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const text = 'Pretext turns text layout into a programmable primitive. Prepare once, layout at any width. No DOM reflows. Pure arithmetic. This changes everything for interactive UIs.';

  let canvas: HTMLCanvasElement;
  let wrapperWidth = $state(0);
  let canvasWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 800);
  const canvasHeight = 500;
  let fontSize = $state(22);

  interface Letter {
    char: string;
    // Text position
    homeX: number;
    homeY: number;
    // Physics position
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    vr: number;
    // State
    fallen: boolean;
    width: number;
  }

  let letters: Letter[] = $state([]);
  let gravityX = $state(0);
  let gravityY = $state(0);
  let isPhysicsMode = $state(false);
  let animFrame = 0;
  let shakeIntensity = $state(0);

  function initLetters() {
    const font = buildFont(fontSize, 'Inter, sans-serif');
    const lh = fontSize * 1.5;
    const margin = 30;
    const maxW = canvasWidth - margin * 2;
    const prepared = prepareWithSegments(text, font);
    const result = layoutWithLines(prepared, maxW, lh);

    letters = [];
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.font = font;

    for (let li = 0; li < result.lines.length; li++) {
      const line = result.lines[li];
      const y = margin + li * lh;
      let x = margin;

      for (const char of line.text) {
        const charW = tempCtx.measureText(char).width;
        letters.push({
          char,
          homeX: x,
          homeY: y,
          x,
          y,
          vx: 0,
          vy: 0,
          rotation: 0,
          vr: 0,
          fallen: false,
          width: charW,
        });
        x += charW;
      }
    }
  }

  function triggerGravity(gx: number, gy: number) {
    gravityX = gx;
    gravityY = gy;
    isPhysicsMode = true;

    for (const letter of letters) {
      letter.fallen = true;
      // Add random initial velocity for natural feel
      letter.vx += (Math.random() - 0.5) * 2;
      letter.vy += (Math.random() - 0.5) * 2;
      letter.vr = (Math.random() - 0.5) * 0.15;
    }
  }

  function resetLetters() {
    isPhysicsMode = false;
    for (const letter of letters) {
      letter.fallen = false;
      letter.x = letter.homeX;
      letter.y = letter.homeY;
      letter.vx = 0;
      letter.vy = 0;
      letter.rotation = 0;
      letter.vr = 0;
    }
  }

  function explode() {
    isPhysicsMode = true;
    for (const letter of letters) {
      letter.fallen = true;
      const cx = canvasWidth / 2;
      const cy = canvasHeight / 2;
      const dx = letter.x - cx;
      const dy = letter.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      letter.vx = (dx / dist) * (8 + Math.random() * 6);
      letter.vy = (dy / dist) * (8 + Math.random() * 6);
      letter.vr = (Math.random() - 0.5) * 0.3;
    }
    gravityX = 0;
    gravityY = 2;
  }

  function shake() {
    shakeIntensity = 15;
    isPhysicsMode = true;
    for (const letter of letters) {
      letter.fallen = true;
      letter.vx += (Math.random() - 0.5) * 12;
      letter.vy += (Math.random() - 0.5) * 12;
      letter.vr = (Math.random() - 0.5) * 0.2;
    }
    gravityX = 0;
    gravityY = 3;
  }

  function tick() {
    if (isPhysicsMode) {
      const damping = 0.98;
      const bounce = 0.6;

      if (shakeIntensity > 0) shakeIntensity *= 0.95;

      for (const letter of letters) {
        if (!letter.fallen) continue;

        letter.vx += gravityX * 0.3;
        letter.vy += gravityY * 0.3;
        letter.vx *= damping;
        letter.vy *= damping;

        letter.x += letter.vx;
        letter.y += letter.vy;
        letter.rotation += letter.vr;
        letter.vr *= 0.98;

        // Bounce off walls
        if (letter.x < 0) { letter.x = 0; letter.vx *= -bounce; }
        if (letter.x > canvasWidth - letter.width) { letter.x = canvasWidth - letter.width; letter.vx *= -bounce; }
        if (letter.y < 0) { letter.y = 0; letter.vy *= -bounce; }
        if (letter.y > canvasHeight - fontSize) { letter.y = canvasHeight - fontSize; letter.vy *= -bounce; letter.vr *= 0.8; }
      }
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

    // Apply shake
    if (shakeIntensity > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * shakeIntensity,
        (Math.random() - 0.5) * shakeIntensity
      );
    }

    // Background
    ctx.fillStyle = isDark ? '#08080e' : '#f5f5fa';
    ctx.fillRect(-10, -10, canvasWidth + 20, canvasHeight + 20);

    // Letters
    const font = buildFont(fontSize, 'Inter, sans-serif');
    ctx.textBaseline = 'top';

    for (const letter of letters) {
      ctx.save();
      ctx.translate(letter.x + letter.width / 2, letter.y + fontSize / 2);
      ctx.rotate(letter.rotation);

      // Color based on velocity (faster = more accent colored)
      const speed = Math.sqrt(letter.vx * letter.vx + letter.vy * letter.vy);
      if (speed > 2) {
        ctx.fillStyle = `hsl(256, 70%, ${55 + Math.min(speed * 3, 30)}%)`;
        ctx.shadowColor = '#7c6cf0';
        ctx.shadowBlur = Math.min(speed * 2, 16);
      } else {
        ctx.fillStyle = isDark ? '#e8e8ed' : '#1a1a2e';
        ctx.shadowBlur = 0;
      }

      ctx.font = font;
      ctx.fillText(letter.char, -letter.width / 2, -fontSize / 2);
      ctx.restore();
    }
  }

  onMount(() => {
    initLetters();
    tick();
    return () => cancelAnimationFrame(animFrame);
  });
</script>

<div class="gravity-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="14" max="36" bind:value={fontSize} oninput={() => { resetLetters(); initLetters(); }} />
    </div>
    <div class="btn-group">
      <button class="action-btn" onclick={() => triggerGravity(0, 5)}>Fall down</button>
      <button class="action-btn" onclick={() => triggerGravity(0, -5)}>Fall up</button>
      <button class="action-btn" onclick={() => triggerGravity(5, 2)}>Fall right</button>
      <button class="action-btn" onclick={() => triggerGravity(-5, 2)}>Fall left</button>
      <button class="action-btn accent" onclick={explode}>Explode</button>
      <button class="action-btn accent" onclick={shake}>Shake</button>
      <button class="action-btn reset" onclick={() => { resetLetters(); }}>Reset</button>
    </div>
  </div>

  <div class="gravity-info">
    <span class="stat-pill">{letters.length} individual letters</span>
    <span class="stat-pill accent">{isPhysicsMode ? 'Physics active' : 'Text mode'}</span>
    <span class="stat-pill">Positions from <code>layoutWithLines()</code></span>
  </div>

  <div class="canvas-wrap">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .gravity-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 80px; }
  .ctrl label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .btn-group { display: flex; flex-wrap: wrap; gap: 4px; }
  .action-btn {
    padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-secondary); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .action-btn:hover { border-color: var(--accent); color: var(--accent); }
  .action-btn.accent { border-color: var(--accent); color: var(--accent); }
  .action-btn.accent:hover { background: var(--accent); color: #fff; }
  .action-btn.reset { border-color: var(--success); color: var(--success); }
  .action-btn.reset:hover { background: var(--success); color: #fff; }

  .gravity-info { display: flex; flex-wrap: wrap; gap: 8px; }
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
