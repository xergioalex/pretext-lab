<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const text = `${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.long}`;

  let canvas: HTMLCanvasElement;
  let wrapperWidth = $state(0);
  let canvasWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 800);
  const canvasHeight = 560;
  let waveStrength = $state(50);
  let waveSpeed = $state(1.2);
  let wind = $state(40);
  let fontSize = $state(14);
  let animFrame = 0;
  let phase = 0;
  let currentCanvasWidth = 0;

  interface Letter {
    char: string;
    x: number;
    y: number;
    targetY: number;
    vy: number;
    width: number;
    baseX: number;
    hue: number;
  }

  let letters: Letter[] = [];
  let boatX = 0;
  let boatY = 0;
  let boatTilt = 0;
  let letterCount = $state(0);

  function initLetters() {
    const font = buildFont(fontSize, 'Inter, sans-serif');
    const lh = Math.round(fontSize * 1.4);
    const prepared = prepareWithSegments(text, font);
    const result = layoutWithLines(prepared, canvasWidth - 40, lh);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.font = font;

    letters = [];
    // Place letters densely to fill the "ocean" area (bottom 65% of canvas)
    const oceanTop = canvasHeight * 0.35;

    for (let li = 0; li < result.lines.length; li++) {
      const line = result.lines[li];
      let x = 20;
      // Stack letters in rows filling the ocean zone
      const row = li;
      const baseY = oceanTop + (row % 18) * (fontSize + 2) + Math.random() * 4;

      for (const char of line.text) {
        if (char === ' ') { x += fontSize * 0.3; continue; }
        const charW = tempCtx.measureText(char).width;
        letters.push({
          char,
          x: x + (Math.random() - 0.5) * 6,
          y: baseY + Math.random() * 20,
          targetY: baseY,
          vy: 0,
          width: charW,
          baseX: x,
          hue: 190 + Math.random() * 40, // ocean blues
        });
        x += charW + 0.5;
      }
    }
    letterCount = letters.length;
    boatX = canvasWidth * 0.3;
  }

  function getWaveSurface(x: number): number {
    // Multi-frequency wave at position x
    const xNorm = x / canvasWidth;
    const w1 = Math.sin(xNorm * Math.PI * 3 + phase) * waveStrength * 0.7;
    const w2 = Math.sin(xNorm * Math.PI * 5.5 - phase * 0.7) * waveStrength * 0.3;
    const w3 = Math.cos(xNorm * Math.PI * 8 + phase * 1.3) * waveStrength * 0.15;
    const windPush = Math.sin(xNorm * Math.PI * 2 + phase * 0.3) * wind * 0.2;
    return canvasHeight * 0.38 + w1 + w2 + w3 + windPush;
  }

  function tick() {
    phase += 0.02 * waveSpeed;

    // Update letter positions — they follow the wave surface
    for (const l of letters) {
      const surface = getWaveSurface(l.x);
      // Letters settle into rows below the wave surface
      const depth = (l.y - surface);
      if (depth < 0) {
        // Above surface: push down
        l.vy += 0.8;
      } else {
        // Below surface: damped spring toward a layered target
        const layerOffset = ((l.baseX * 7.3) % (fontSize * 12));
        l.targetY = surface + (layerOffset % (canvasHeight * 0.55));
        l.vy += (l.targetY - l.y) * 0.03;
      }
      l.vy *= 0.92; // damping
      l.y += l.vy;

      // Gentle horizontal sway from wind
      l.x += Math.sin(phase + l.baseX * 0.01) * wind * 0.005;

      // Keep in bounds
      if (l.y > canvasHeight + 10) l.y = canvasHeight;
      if (l.x < -20) l.x = canvasWidth + 10;
      if (l.x > canvasWidth + 20) l.x = -10;
    }

    // Boat follows wave surface
    boatX += wind * 0.015;
    if (boatX > canvasWidth + 60) boatX = -60;
    const surfaceAtBoat = getWaveSurface(boatX);
    boatY += (surfaceAtBoat - fontSize * 2 - boatY) * 0.12; // smooth follow
    const slopeLeft = getWaveSurface(boatX - 20);
    const slopeRight = getWaveSurface(boatX + 20);
    const targetTilt = Math.atan2(slopeRight - slopeLeft, 40) * (180 / Math.PI);
    boatTilt += (targetTilt - boatTilt) * 0.1;

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

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight * 0.4);
    if (isDark) {
      skyGrad.addColorStop(0, '#0a1628');
      skyGrad.addColorStop(1, '#0f2440');
    } else {
      skyGrad.addColorStop(0, '#87CEEB');
      skyGrad.addColorStop(1, '#b0d8f0');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Ocean background below wave surface
    const oceanGrad = ctx.createLinearGradient(0, canvasHeight * 0.35, 0, canvasHeight);
    if (isDark) {
      oceanGrad.addColorStop(0, '#0c2a4a');
      oceanGrad.addColorStop(0.5, '#081c34');
      oceanGrad.addColorStop(1, '#05111f');
    } else {
      oceanGrad.addColorStop(0, '#4a9fd4');
      oceanGrad.addColorStop(0.5, '#3080b8');
      oceanGrad.addColorStop(1, '#1a5a8a');
    }
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, canvasHeight * 0.32, canvasWidth, canvasHeight * 0.68);

    // Draw wave surface line
    ctx.beginPath();
    ctx.moveTo(0, getWaveSurface(0));
    for (let x = 4; x <= canvasWidth; x += 4) {
      ctx.lineTo(x, getWaveSurface(x));
    }
    ctx.strokeStyle = isDark ? 'rgba(120, 200, 255, 0.3)' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw all letters (the ocean body)
    const font = buildFont(fontSize, 'Inter, sans-serif');
    ctx.font = font;
    ctx.textBaseline = 'top';

    for (const l of letters) {
      const surface = getWaveSurface(l.x);
      const depth = l.y - surface;
      const aboveSurface = depth < 0;

      if (aboveSurface) {
        // Spray/splash letters above surface — brighter, smaller opacity
        const alpha = Math.max(0.1, 0.6 - Math.abs(depth) * 0.015);
        ctx.fillStyle = isDark
          ? `hsla(${l.hue}, 80%, 80%, ${alpha})`
          : `hsla(${l.hue}, 70%, 40%, ${alpha})`;
      } else {
        // Submerged letters — fade with depth
        const depthFade = Math.max(0.15, 1 - depth * 0.003);
        const lightness = isDark ? 65 + depth * 0.02 : 35 - depth * 0.01;
        ctx.fillStyle = isDark
          ? `hsla(${l.hue}, 75%, ${Math.min(80, lightness)}%, ${depthFade})`
          : `hsla(${l.hue}, 60%, ${Math.max(20, lightness)}%, ${depthFade})`;
      }

      ctx.fillText(l.char, l.x, l.y);
    }

    // Draw foam at wave crests
    ctx.fillStyle = isDark ? 'rgba(200, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.3)';
    for (let x = 0; x < canvasWidth; x += 8) {
      const s = getWaveSurface(x);
      const next = getWaveSurface(x + 8);
      if (s < next) { // crest
        ctx.fillRect(x, s - 1, 8, 2);
      }
    }

    // Draw boat ON TOP
    ctx.save();
    ctx.translate(boatX, boatY);
    ctx.rotate(boatTilt * Math.PI / 180);

    // Hull shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 30, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hull
    ctx.beginPath();
    ctx.moveTo(-28, 4);
    ctx.quadraticCurveTo(-20, 18, -12, 18);
    ctx.lineTo(12, 18);
    ctx.quadraticCurveTo(20, 18, 28, 4);
    ctx.lineTo(22, 12);
    ctx.quadraticCurveTo(0, 20, -22, 12);
    ctx.closePath();
    const hullGrad = ctx.createLinearGradient(-28, 0, 28, 18);
    hullGrad.addColorStop(0, '#2a3652');
    hullGrad.addColorStop(1, '#1a2238');
    ctx.fillStyle = hullGrad;
    ctx.fill();
    ctx.strokeStyle = '#4a5a80';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Mast
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(0, 6);
    ctx.strokeStyle = '#c8c8d8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Main sail
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.quadraticCurveTo(22 + wind * 0.1, -12, 18, 2);
    ctx.lineTo(0, 2);
    ctx.closePath();
    const sailGrad = ctx.createLinearGradient(0, -40, 18, 2);
    sailGrad.addColorStop(0, '#fff8e0');
    sailGrad.addColorStop(1, '#f0d898');
    ctx.fillStyle = sailGrad;
    ctx.fill();
    ctx.strokeStyle = '#e8d8a0';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Jib
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.quadraticCurveTo(-14 - wind * 0.06, -8, -12, 2);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(180, 210, 255, 0.85)';
    ctx.fill();

    // Portholes
    ctx.fillStyle = '#70c8ff';
    ctx.beginPath(); ctx.arc(-6, 10, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, 10, 1.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    // Wake trail behind boat
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = isDark ? '#88d4ff' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 80; i++) {
      const wx = boatX - i * 2 - 30;
      const wy = getWaveSurface(wx) + Math.sin(i * 0.3 + phase * 3) * (2 + i * 0.08);
      if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
    ctx.restore();
  }

  onMount(() => {
    initLetters();
    resizeCanvas();
    boatX = canvasWidth * 0.3;
    boatY = canvasHeight * 0.32;
    tick();
    return () => cancelAnimationFrame(animFrame);
  });
</script>

<div class="regatta-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Waves <span>{waveStrength}</span></label>
      <input type="range" min="10" max="100" bind:value={waveStrength} />
    </div>
    <div class="ctrl">
      <label>Speed <span>{waveSpeed.toFixed(1)}x</span></label>
      <input type="range" min="0.3" max="3" step="0.1" bind:value={waveSpeed} />
    </div>
    <div class="ctrl">
      <label>Wind <span>{wind}</span></label>
      <input type="range" min="5" max="80" bind:value={wind} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="10" max="20" bind:value={fontSize} oninput={() => initLetters()} />
    </div>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{letterCount} ocean letters</span>
    <span class="stat-pill">wave physics + boat dynamics</span>
    <span class="stat-pill">wind drives sail + current</span>
  </div>

  <div class="canvas-wrap">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .regatta-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 80px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .stats-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .canvas-wrap {
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.2);
  }
  canvas { display: block; width: 100%; }

  @media (max-width: 600px) {
    .ctrl { min-width: 60px; }
    .controls-bar { gap: var(--space-sm); }
  }
</style>
