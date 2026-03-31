<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount, untrack } from 'svelte';

  let text = $state(SAMPLE_TEXTS.editorial);
  let fontSize = $state(18);
  let width = $state(520);
  let lineHeight = $state(30);
  let showLineBoxes = $state(true);
  let showWidthMarkers = $state(true);
  let colorMode = $state<'mono' | 'rainbow' | 'heat'>('mono');
  let autoPlaying = $state(false);
  let animFrame = 0;

  let canvas: HTMLCanvasElement;
  let lineCount = $state(0);
  let totalHeight = $state(0);

  const rainbowColors = ['#7c6cf0', '#3ecf8e', '#f5a623', '#06b6d4', '#ec4899', '#8b5cf6', '#ef4444', '#10b981'];

  function getCssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function heatColor(ratio: number): string {
    const r = Math.round(255 * ratio);
    const b = Math.round(255 * (1 - ratio));
    return `rgb(${r}, 80, ${b})`;
  }

  function render() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const font = buildFont(fontSize, 'Inter, sans-serif');
    const prepared = prepareWithSegments(text, font);
    const result = layoutWithLines(prepared, width, lineHeight);

    lineCount = result.lineCount;
    totalHeight = result.height;

    const dpr = window.devicePixelRatio || 1;
    const pad = 50;
    const canvasW = width + pad + 20;
    const canvasH = result.height + 60;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
    ctx.scale(dpr, dpr);

    // Background
    const bgColor = getCssVar('--bg-demo') || '#08080e';
    const textPrimary = getCssVar('--text-primary') || '#e8e8ed';
    const textMuted = getCssVar('--text-muted') || '#5c5c6e';
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const gridAlpha = isDark ? '06' : '0a';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Subtle grid
    ctx.strokeStyle = isDark ? '#ffffff06' : '#00000008';
    for (let y = 30; y < canvasH; y += lineHeight) {
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + width, y); ctx.stroke();
    }

    const oX = pad;
    const oY = 30;

    for (let i = 0; i < result.lines.length; i++) {
      const line = result.lines[i];
      const y = oY + i * lineHeight;
      const fillRatio = line.width / width;

      // Line box
      if (showLineBoxes) {
        const boxAlpha = 0.06 + fillRatio * 0.08;
        let boxColor = `rgba(124, 108, 240, ${boxAlpha})`;
        if (colorMode === 'rainbow') {
          const c = rainbowColors[i % rainbowColors.length];
          boxColor = c + '18';
        } else if (colorMode === 'heat') {
          boxColor = heatColor(fillRatio) + '20';
        }
        ctx.fillStyle = boxColor;
        ctx.fillRect(oX, y, line.width, lineHeight - 1);
      }

      // Width fill bar
      if (showWidthMarkers) {
        let barColor = 'rgba(124, 108, 240, 0.3)';
        if (colorMode === 'rainbow') barColor = rainbowColors[i % rainbowColors.length] + '55';
        else if (colorMode === 'heat') barColor = heatColor(fillRatio) + '55';
        ctx.fillStyle = barColor;
        ctx.fillRect(oX + width + 4, y + 4, (line.width / width) * 30, lineHeight - 9);
      }

      // Text
      let textColor = textPrimary;
      if (colorMode === 'rainbow') textColor = rainbowColors[i % rainbowColors.length];
      else if (colorMode === 'heat') textColor = heatColor(fillRatio);
      ctx.font = font;
      ctx.fillStyle = textColor;
      ctx.textBaseline = 'top';
      ctx.fillText(line.text, oX, y + (lineHeight - fontSize) / 2);

      // Line number
      ctx.font = `${Math.max(9, fontSize * 0.55)}px JetBrains Mono, monospace`;
      ctx.fillStyle = textMuted;
      ctx.textAlign = 'right';
      ctx.fillText(`${i + 1}`, oX - 8, y + (lineHeight - fontSize * 0.55) / 2);
      ctx.textAlign = 'left';
    }

    // Width boundary
    ctx.strokeStyle = '#7c6cf044';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(oX + width, oY);
    ctx.lineTo(oX + width, oY + result.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Width label
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#7c6cf0';
    ctx.fillText(`${width}px`, oX + width + 4, oY - 8);
  }

  function startAutoPlay() {
    autoPlaying = true;
    let dir = 2;
    const tick = () => {
      if (!autoPlaying) return;
      width += dir;
      if (width >= 700) dir = -2;
      if (width <= 200) dir = 2;
      animFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopAutoPlay() {
    autoPlaying = false;
    cancelAnimationFrame(animFrame);
  }

  onMount(() => { render(); });

  $effect(() => {
    const _t = text;
    const _fs = fontSize;
    const _w = width;
    const _lh = lineHeight;
    const _slb = showLineBoxes;
    const _swm = showWidthMarkers;
    const _cm = colorMode;
    untrack(() => render());
  });

  onMount(() => { startAutoPlay(); return () => stopAutoPlay(); });
</script>

<div class="canvas-demo">
  <div class="controls-bar">
    <div class="ctrl" style="flex: 1; min-width: 180px;">
      <label>Text</label>
      <textarea bind:value={text} rows="2"></textarea>
    </div>
    <div class="ctrl">
      <label>Width <span>{width}px</span></label>
      <input type="range" min="200" max="800" bind:value={width} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="10" max="32" bind:value={fontSize} />
    </div>
    <div class="ctrl">
      <label>Line height <span>{lineHeight}px</span></label>
      <input type="range" min="14" max="48" bind:value={lineHeight} />
    </div>
    <div class="toggle-group">
      {#each (['mono', 'rainbow', 'heat'] as const) as mode}
        <button class:on={colorMode === mode} onclick={() => colorMode = mode}>{mode}</button>
      {/each}
    </div>
    <div class="toggle-group">
      <button class:on={showLineBoxes} onclick={() => showLineBoxes = !showLineBoxes}>Boxes</button>
      <button class:on={showWidthMarkers} onclick={() => showWidthMarkers = !showWidthMarkers}>Fill bars</button>
    </div>
    <button
      class="auto-btn"
      class:playing={autoPlaying}
      onclick={() => autoPlaying ? stopAutoPlay() : startAutoPlay()}
    >
      {autoPlaying ? '⏸ Stop' : '▶ Auto-resize'}
    </button>
  </div>

  <div class="canvas-stats">
    <span>{lineCount} lines</span>
    <span>{totalHeight}px total</span>
    <span>Rendered to <code>&lt;canvas&gt;</code> — same Pretext engine, no DOM text</span>
  </div>

  <div class="canvas-wrapper">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .canvas-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .toggle-group { display: flex; gap: 3px; }
  .toggle-group button {
    padding: 5px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); font-size: 0.72rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    text-transform: capitalize; transition: all var(--transition-fast);
  }
  .toggle-group button.on {
    background: var(--accent); color: #fff; border-color: var(--accent);
  }

  .auto-btn {
    padding: 5px 14px; border-radius: var(--radius-sm); border: 1px solid var(--accent);
    background: transparent; color: var(--accent); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .auto-btn:hover, .auto-btn.playing { background: var(--accent); color: #fff; }

  .canvas-stats {
    font-size: 0.78rem; color: var(--text-muted);
    display: flex; flex-wrap: wrap; gap: var(--space-md);
  }
  .canvas-stats code {
    font-size: 0.75rem; color: var(--accent); background: none; padding: 0;
  }

  .canvas-wrapper {
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: auto;
    max-width: 100%;
    background: var(--bg-demo);
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  }

  canvas { display: block; }
</style>
