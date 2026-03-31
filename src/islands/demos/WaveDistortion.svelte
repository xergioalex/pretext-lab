<script lang="ts">
  import { prepareWithSegments, layoutNextLine, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import type { LayoutCursor } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const longText = `${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium}`;

  let fontSize = $state(15);
  let lineHeight = $state(24);
  let wrapperWidth = $state(0);
  let containerWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 750);
  let waveAmplitude = $state(120);
  let waveFrequency = $state(3);
  let waveSpeed = $state(1.5);
  let wavePhase = 0;
  let animFrame = 0;
  let running = $state(true);

  let lines: Array<{ text: string; x: number; y: number; maxW: number; waveOffset: number }> = $state([]);
  let totalHeight = $state(0);

  function computeFlow() {
    const font = buildFont(fontSize);
    const prepared = prepareWithSegments(longText, font);
    const margin = 16;

    lines = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = 0;
    let safety = 0;

    while (safety < 600) {
      safety++;
      const lineMid = y + lineHeight / 2;
      // Sine wave determines available width per line
      const waveVal = Math.sin((lineMid / 100) * waveFrequency + wavePhase);
      const offset = waveVal * waveAmplitude;

      let xStart = margin;
      let availWidth = containerWidth - margin * 2;

      if (offset > 0) {
        // Wave pushes from left
        xStart = margin + offset;
        availWidth = containerWidth - margin - xStart;
      } else {
        // Wave pushes from right
        availWidth = containerWidth - margin * 2 + offset;
      }

      availWidth = Math.max(40, availWidth);

      const line = layoutNextLine(prepared, cursor, availWidth);
      if (!line) break;
      lines.push({ text: line.text, x: xStart, y, maxW: availWidth, waveOffset: offset });
      cursor = line.end;
      y += lineHeight;
    }

    totalHeight = Math.max(y, 400);
  }

  function tick() {
    if (!running) return;
    wavePhase += 0.02 * waveSpeed;
    computeFlow();
    animFrame = requestAnimationFrame(tick);
  }

  onMount(() => {
    computeFlow();
    tick();
    return () => { running = false; cancelAnimationFrame(animFrame); };
  });

  $effect(() => {
    fontSize; lineHeight; containerWidth; waveAmplitude; waveFrequency;
    if (!running) computeFlow();
  });
</script>

<div class="wave-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Width <span>{containerWidth}px</span></label>
      <input type="range" min="400" max="950" bind:value={containerWidth} />
    </div>
    <div class="ctrl">
      <label>Amplitude <span>{waveAmplitude}px</span></label>
      <input type="range" min="20" max="250" bind:value={waveAmplitude} />
    </div>
    <div class="ctrl">
      <label>Frequency <span>{waveFrequency.toFixed(1)}</span></label>
      <input type="range" min="1" max="8" step="0.5" bind:value={waveFrequency} />
    </div>
    <div class="ctrl">
      <label>Speed <span>{waveSpeed.toFixed(1)}x</span></label>
      <input type="range" min="0.2" max="5" step="0.1" bind:value={waveSpeed} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="11" max="22" bind:value={fontSize} />
    </div>
    <button
      class="play-btn"
      class:active={running}
      onclick={() => { running = !running; if (running) tick(); }}
    >
      {running ? '⏸ Pause' : '▶ Play'}
    </button>
  </div>

  <div class="wave-stats">
    <span class="stat-pill">{lines.length} lines</span>
    <span class="stat-pill accent">Each line has a different width</span>
    <span class="stat-pill">Powered by <code>layoutNextLine()</code></span>
  </div>

  <div class="wave-canvas" style="width: 100%; height: {totalHeight}px;">
    <!-- Wave guide visualization -->
    {#each lines as line, i}
      {#if i % 2 === 0}
        <div
          class="wave-guide"
          style="
            left: {line.x}px;
            top: {line.y}px;
            width: {line.maxW}px;
            height: {lineHeight - 1}px;
            opacity: {0.03 + Math.abs(line.waveOffset) / waveAmplitude * 0.04};
          "
        ></div>
      {/if}
    {/each}

    <!-- Wave edge lines -->
    <svg class="wave-svg" viewBox="0 0 {containerWidth} {totalHeight}" preserveAspectRatio="none">
      <path
        d={lines.map((l, i) => `${i === 0 ? 'M' : 'L'} ${l.x} ${l.y + lineHeight / 2}`).join(' ')}
        fill="none"
        stroke="url(#waveGrad)"
        stroke-width="1.5"
        opacity="0.4"
      />
      <path
        d={lines.map((l, i) => `${i === 0 ? 'M' : 'L'} ${l.x + l.maxW} ${l.y + lineHeight / 2}`).join(' ')}
        fill="none"
        stroke="url(#waveGrad)"
        stroke-width="1.5"
        opacity="0.4"
      />
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7c6cf0" />
          <stop offset="50%" stop-color="#3ecf8e" />
          <stop offset="100%" stop-color="#7c6cf0" />
        </linearGradient>
      </defs>
    </svg>

    <!-- Text -->
    {#each lines as line}
      <div
        class="wave-line"
        style="
          left: {line.x}px;
          top: {line.y}px;
          font-size: {fontSize}px;
          line-height: {lineHeight}px;
        "
      >{line.text}</div>
    {/each}
  </div>
</div>

<style>
  .wave-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 90px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .play-btn {
    padding: 6px 16px; border-radius: var(--radius-sm); border: 1px solid var(--accent);
    background: transparent; color: var(--accent); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .play-btn:hover, .play-btn.active { background: var(--accent); color: #fff; }

  .wave-stats {
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }
  .stat-pill code { font-size: 0.72rem; color: var(--accent); background: none; padding: 0; }

  .wave-canvas {
    position: relative;
    background: var(--bg-demo);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    user-select: none;
    box-shadow: 0 12px 60px rgba(0,0,0,0.4);
  }

  .wave-guide {
    position: absolute;
    background: var(--accent);
    pointer-events: none;
    border-radius: 2px;
  }

  .wave-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .wave-line {
    position: absolute;
    white-space: nowrap;
    color: var(--text-primary);
    pointer-events: none;
  }
</style>
